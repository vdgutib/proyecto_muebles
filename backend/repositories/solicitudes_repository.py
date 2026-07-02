import logging
import mysql.connector
from database import get_db_connection

logger = logging.getLogger(__name__)


class SolicitudesRepository:

    @staticmethod
    def guardar_solicitud(producto_id, producto_nombre, nombre, direccion, contacto, pago, mensaje=None):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No hay conexión a la base de datos")

        cursor_prod = None
        cursor = None
        try:
            # Si no se proporciona producto_id, buscar por nombre (best-effort, nullable FK)
            if not producto_id and producto_nombre:
                cursor_prod = conexion.cursor(dictionary=True)
                cursor_prod.execute(
                    "SELECT id_mueble FROM muebles WHERE nombre = %s LIMIT 1",
                    (producto_nombre,)
                )
                row = cursor_prod.fetchone()
                if row:
                    producto_id = row['id_mueble']
                cursor_prod.close()
                cursor_prod = None

            cursor = conexion.cursor()
            cursor.execute(
                """
                INSERT INTO solicitudes
                    (nombre_cliente, telefono, direccion, metodo_pago, mensaje, producto_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (nombre, contacto, direccion or None, pago or None, mensaje or None, producto_id)
            )
            conexion.commit()
            return cursor.lastrowid   # ← leído ANTES de cerrar el cursor

        except (mysql.connector.Error, Exception):
            logger.exception("Error guardando solicitud en DB")
            conexion.rollback()
            raise
        finally:
            if cursor_prod:
                cursor_prod.close()
            if cursor:
                cursor.close()
            conexion.close()