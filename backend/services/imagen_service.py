import os
import logging
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
    def guardar_imagenes(archivos):
 
        os.makedirs(Config.IMAGENES_DIR, exist_ok=True)
        directorio_destino = os.path.realpath(Config.IMAGENES_DIR)

        guardadas = []
        rechazadas = []

        for archivo in archivos:
            filename_original = archivo.filename or ''

            if filename_original == '':
                continue

            if not ImagenService._extension_permitida(filename_original):
                rechazadas.append({
                    "archivo": filename_original,
                    "motivo": "Extensión no permitida (solo .jpg, .jpeg, .png)"
                })
                continue

            nombre_seguro = secure_filename(filename_original)
            if not nombre_seguro:
                rechazadas.append({
                    "archivo": filename_original,
                    "motivo": "Nombre de archivo inválido"
                })
                continue

            destino = os.path.realpath(os.path.join(directorio_destino, nombre_seguro))

            if os.path.commonpath([directorio_destino, destino]) != directorio_destino:
                logger.warning("Intento de path traversal bloqueado: %s", filename_original)
                rechazadas.append({
                    "archivo": filename_original,
                    "motivo": "Ruta de destino inválida"
                })
                continue

            archivo.save(destino)
            guardadas.append(nombre_seguro)

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