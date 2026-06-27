import mysql.connector
from config import Config

def get_db_connection():
    try:
        connection = mysql.connector.connect(**Config.DB_CONFIG)
        return connection
    except mysql.connector.Error as err:
        print(f"Error de conexión a la BD: {err}")
        return None
