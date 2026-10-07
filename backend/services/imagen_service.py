import os
import logging
import uuid
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
    def guardar_imagenes(archivos):
        os.makedirs(Config.IMAGENES_DIR, exist_ok=True)
        directorio_destino = os.path.realpath(Config.IMAGENES_DIR)

        guardadas = []
        rechazadas = []
        MAX_SIZE = 5 * 1024 * 1024  # 5MB

        for archivo in archivos:
            filename_original = archivo.filename or ''
            if filename_original == '':
                continue

            archivo.seek(0, os.SEEK_END)
            size = archivo.tell()
            archivo.seek(0)

            if size > MAX_SIZE:
                rechazadas.append({"archivo": filename_original, "motivo": "Excede tamaño máximo de 5MB"})
                continue

            header = archivo.read(512)
            archivo.seek(0)
            
            ext_real = ImagenService._tipo_real_valido(header)
            if not ext_real:
                rechazadas.append({"archivo": filename_original, "motivo": "El contenido no es una imagen válida (jpg, png, webp)"})
                continue

            nuevo_nombre = f"{uuid.uuid4().hex}.{ext_real}"
            destino = os.path.realpath(os.path.join(directorio_destino, nuevo_nombre))

            archivo.save(destino)
            guardadas.append(nuevo_nombre)

        return guardadas, rechazadas

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