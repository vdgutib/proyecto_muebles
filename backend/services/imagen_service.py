import os
import logging
import uuid
import re
from werkzeug.utils import secure_filename

from config import Config

logger = logging.getLogger(__name__)


class ImagenService:
    @staticmethod
    def _extension_permitida(filename):
        return (
            '.' in filename
            and filename.rsplit('.', 1)[1].lower() in Config.EXTENSIONES_IMAGEN_PERMITIDAS
        )

    @staticmethod
    def _tipo_real_valido(header):
        if header.startswith(b'\xff\xd8'): return 'jpg'
        if header.startswith(b'\x89PNG\r\n\x1a\n'): return 'png'
        if header.startswith(b'RIFF') and header[8:12] == b'WEBP': return 'webp'
        return None

    @staticmethod
    def limpiar_imagenes_previas_sku(sku, extension_a_conservar=None):
        """
        Elimina en Config.IMAGENES_DIR cualquier archivo con el mismo SKU base
        (ej. {sku}.jpg, {sku}.png, {sku}.webp) cuya extensión difiera de la que se va a conservar.
        Garantiza que no existan duplicados en disco con diferentes formatos para un mismo producto.
        """
        if not sku:
            return
        directorio = os.path.realpath(Config.IMAGENES_DIR)
        if not os.path.exists(directorio):
            return

        sku_str = str(sku).strip()
        extensiones = ['jpg', 'jpeg', 'png', 'webp', 'emf']
        ext_conservar = (extension_a_conservar or '').lower().lstrip('.')

        for ext in extensiones:
            if ext_conservar and ext == ext_conservar:
                continue
            posible_archivo = os.path.join(directorio, f"{sku_str}.{ext}")
            if os.path.exists(posible_archivo):
                try:
                    os.remove(posible_archivo)
                    logger.info("Imagen previa redundante eliminada en disco para SKU %s: %s", sku_str, posible_archivo)
                except Exception as e:
                    logger.warning("No se pudo eliminar imagen redundante %s: %s", posible_archivo, e)

    @staticmethod
    def depurar_imagenes_huerfanas():
        """
        Elimina archivos de imagen en Config.IMAGENES_DIR que no estén referenciados
        ni en la tabla 'muebles' ni en 'muebles_propios_imagenes'.
        Protege archivos reservados del sistema como 'producto-placeholder.jpg'.
        Devuelve el total de archivos eliminados.
        """
        directorio = os.path.realpath(Config.IMAGENES_DIR)
        if not os.path.exists(directorio):
            return 0

        from database import get_db_connection
        conexion = get_db_connection()
        if not conexion:
            return 0

        eliminados = 0
        try:
            cur = conexion.cursor()
            cur.execute("SELECT imagen FROM muebles WHERE imagen IS NOT NULL AND imagen != ''")
            muebles_imgs = set(row[0].strip() for row in cur.fetchall() if row[0])

            cur.execute("SELECT imagen_url FROM muebles_propios_imagenes WHERE imagen_url IS NOT NULL AND imagen_url != ''")
            propios_imgs = set(row[0].strip() for row in cur.fetchall() if row[0])

            imagenes_activas = muebles_imgs | propios_imgs

            archivos_disco = os.listdir(directorio)
            for archivo in archivos_disco:
                if archivo.startswith('producto-placeholder'):
                    continue
                if archivo not in imagenes_activas:
                    try:
                        os.remove(os.path.join(directorio, archivo))
                        eliminados += 1
                        logger.info("Archivo huérfano depurado: %s", archivo)
                    except Exception as err:
                        logger.warning("No se pudo eliminar archivo huérfano %s: %s", archivo, err)
        except Exception as e:
            logger.error("Error depurando imágenes huérfanas: %s", e)
        finally:
            conexion.close()

        return eliminados

    @staticmethod
    def guardar_imagenes(archivos, tipo='general'):
        """
        Guarda las imágenes recibidas.
        Si tipo == 'catalogo':
          - Exige que el nombre base sea numérico (SKU numérico).
          - Exige que el SKU exista en la tabla 'muebles'.
          - Si no cumple, rechaza el archivo y no guarda nada.
          - Si cumple, limpia archivos previos de ese SKU en disco, guarda la imagen
            y actualiza la base de datos con el nuevo archivo.
        Si tipo != 'catalogo' (ej. Muebles Propios):
          - Comportamiento estándar con nombres únicos (UUID).
        """
        os.makedirs(Config.IMAGENES_DIR, exist_ok=True)
        directorio_destino = os.path.realpath(Config.IMAGENES_DIR)

        guardadas = []
        rechazadas = []
        asociadas = []
        MAX_SIZE = 10 * 1024 * 1024  # 10MB

        es_catalogo = (str(tipo).strip().lower() == 'catalogo')

        for archivo in archivos:
            filename_original = archivo.filename or ''
            if filename_original == '':
                continue

            archivo.seek(0, os.SEEK_END)
            size = archivo.tell()
            archivo.seek(0)

            if size > MAX_SIZE:
                rechazadas.append({"archivo": filename_original, "motivo": "Excede tamaño máximo de 10MB"})
                continue

            header = archivo.read(512)
            archivo.seek(0)
            
            ext_real = ImagenService._tipo_real_valido(header)
            if not ext_real:
                try:
                    from PIL import Image
                    img = Image.open(archivo)
                    img.verify()
                    archivo.seek(0)
                    ext_real = 'png' if getattr(img, 'format', '') in ('PNG', 'WEBP') else 'jpg'
                except Exception:
                    archivo.seek(0)
                    rechazadas.append({
                        "archivo": filename_original,
                        "motivo": "El contenido no es una imagen válida (debe ser JPG, PNG o WEBP)"
                    })
                    continue

            nombre_base = os.path.splitext(secure_filename(filename_original))[0].strip()

            if es_catalogo:
                # 1. Validar que el nombre sea estrictamente numérico
                if not re.match(r'^\d+$', nombre_base):
                    rechazadas.append({
                        "archivo": filename_original,
                        "motivo": f"El nombre del archivo debe ser únicamente el SKU numérico del producto (ej: '10102054.{ext_real}'). Se recibió '{nombre_base}'."
                    })
                    continue

                # 2. Validar que el SKU exista en el catálogo de muebles
                mueble = None
                try:
                    from repositories.muebles_repository import MueblesRepository
                    mueble = MueblesRepository.get_mueble_by_sku(nombre_base)
                except Exception as e:
                    logger.error("Error al consultar mueble por SKU %s: %s", nombre_base, e)

                if not mueble:
                    rechazadas.append({
                        "archivo": filename_original,
                        "motivo": f"El SKU '{nombre_base}' no existe en el catálogo de muebles. Sube primero el Excel o verifica el número."
                    })
                    continue

                # 3. Eliminar cualquier imagen anterior con otra extensión para este SKU (evitar duplicados)
                ImagenService.limpiar_imagenes_previas_sku(nombre_base, extension_a_conservar=ext_real)

                nuevo_nombre = f"{nombre_base}.{ext_real}"
                destino = os.path.realpath(os.path.join(directorio_destino, nuevo_nombre))
                archivo.save(destino)

                # 4. Actualizar registro en base de datos
                try:
                    from repositories.muebles_repository import MueblesRepository
                    MueblesRepository.update_imagen_by_sku(nombre_base, nuevo_nombre)
                    logger.info("Imagen asignada al SKU %s: %s", nombre_base, nuevo_nombre)
                except Exception as e:
                    logger.error("Fallo al actualizar BD para SKU %s: %s", nombre_base, e)

                guardadas.append(nuevo_nombre)
                asociadas.append({
                    "sku": nombre_base,
                    "archivo": nuevo_nombre,
                    "nombre_producto": mueble.get('nombre')
                })

            else:
                # Subida estándar (Muebles Propios)
                nuevo_nombre = f"{uuid.uuid4().hex}.{ext_real}"
                destino = os.path.realpath(os.path.join(directorio_destino, nuevo_nombre))
                archivo.save(destino)
                guardadas.append(nuevo_nombre)

        return guardadas, rechazadas, asociadas

    @staticmethod
    def eliminar_imagen(nombre_archivo):
        """Elimina físicamente una imagen del directorio público, si existe.
        Devuelve True si se eliminó un archivo, False en caso contrario."""
        if not nombre_archivo:
            return False

        nombre_seguro = secure_filename(nombre_archivo)
        directorio_destino = os.path.realpath(Config.IMAGENES_DIR)
        destino = os.path.realpath(os.path.join(directorio_destino, nombre_seguro))

        if os.path.commonpath([directorio_destino, destino]) != directorio_destino:
            logger.warning("Intento de path traversal bloqueado al eliminar: %s", nombre_archivo)
            return False

        if os.path.exists(destino):
            os.remove(destino)
            return True
        return False
