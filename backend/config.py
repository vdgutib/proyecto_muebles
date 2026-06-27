import os
import logging
from dotenv import load_dotenv

# Cargar variables desde el archivo .env
load_dotenv()

logger = logging.getLogger(__name__)


class Config:
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'tienda_muebles')
    DB_PORT = int(os.getenv('DB_PORT', 3306))

    DB_CONFIG = {
        'host': DB_HOST,
        'port': DB_PORT,
        'user': DB_USER,
        'password': DB_PASSWORD,
        'database': DB_NAME
    }

    BATCH_CHUNK_SIZE = int(os.getenv('BATCH_CHUNK_SIZE', 500))

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        JWT_SECRET_KEY = os.urandom(32).hex()
        logger.warning(
            "JWT_SECRET_KEY no está definido en el .env. Se generó una clave "
            "temporal en memoria: TODOS los tokens emitidos se invalidarán "
            "al reiniciar el servidor. Define JWT_SECRET_KEY en tu .env "
            "antes de pasar a producción."
        )

    JWT_ACCESS_TOKEN_EXPIRES_MIN = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MIN', 60))
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    IMAGENES_DIR = os.path.join(BASE_DIR, 'frontend', 'imagenes', 'public')
    EXTENSIONES_IMAGEN_PERMITIDAS = {'jpg', 'jpeg', 'png'}