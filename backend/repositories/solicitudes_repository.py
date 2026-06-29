import logging
from database import get_connection
from repositories.muebles_repository import MueblesRepository

logger = logging.getLogger(__name__)

class SolicitudesRepository:
    @staticmethod
    def guardar_solicitud(producto_nombre, nombre, direccion, contacto, pago, mensaje=None):
        conexion = get_connection()
        if not conexion:
            raise Exception("No hay conexión a la base de datos")
            
        try:
            # Buscar el ID del producto por su nombre
            producto_id = None
            if producto_nombre:
                # Buscamos en la BD el mueble para obtener su ID
                with conexion.cursor(dictionary=True) as cursor_prod:
                    cursor_prod.execute("SELECT id_mueble FROM muebles WHERE nombre = %s LIMIT 1", (producto_nombre,))
                    row = cursor_prod.fetchone()
                    if row:
                        producto_id = row['id_mueble']

            with conexion.cursor() as cursor:
                # Creación de tabla si no existe para asegurar persistencia (Alineado al diagrama ER)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS solicitudes (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        nombre_cliente VARCHAR(255),
                        telefono VARCHAR(100),
                        direccion VARCHAR(255),
                        metodo_pago VARCHAR(50),
                        mensaje TEXT,
                        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                        estado VARCHAR(50) DEFAULT 'PENDIENTE',
                        producto_id INT
                    )
                """)
                
                query = """
                    INSERT INTO solicitudes (nombre_cliente, telefono, direccion, metodo_pago, mensaje, producto_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """
                cursor.execute(query, (nombre, contacto, direccion, pago, mensaje, producto_id))
            conexion.commit()
            return cursor.lastrowid
        except Exception as e:
            logger.exception("Error guardando solicitud en DB")
            conexion.rollback()
            raise e
        finally:
            conexion.close()
