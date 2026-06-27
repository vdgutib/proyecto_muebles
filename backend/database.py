import logging
import mysql.connector
from config import Config

logger = logging.getLogger(__name__)


def get_db_connection():
    try:
        connection = mysql.connector.connect(**Config.DB_CONFIG)
        return connection
    except mysql.connector.Error as err:
        logger.error("Error de conexión a la BD: %s", err)
        return None