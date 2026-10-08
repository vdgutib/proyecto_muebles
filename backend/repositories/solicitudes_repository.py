import logging
import mysql.connector
from database import get_db_connection

logger = logging.getLogger(__name__)


class SolicitudesRepository:

    @staticmethod
    def _parse_producto_id(valor):
        """El catálogo envía 'E_<id>' (mueble externo) o 'P_<id>' (mueble propio).
        También acepta un entero plano por compatibilidad.
        Devuelve (id_mueble_externo, id_mueble_propio); None cuando no aplica."""
        texto = str(valor or '').strip()
        prefijo, numero = texto[:2].upper(), texto[2:]
        if prefijo == 'P_' and numero.isdigit():
            return None, int(numero)
        if prefijo == 'E_' and numero.isdigit():
            return int(numero), None
        if texto.isdigit():
            return int(texto), None
        return None, None

    @staticmethod
    def _existe(cursor, tabla, columna, id_):
        # tabla y columna son constantes internas, nunca vienen del usuario
        cursor.execute(f"SELECT 1 FROM {tabla} WHERE {columna} = %s", (id_,))
        return len(cursor.fetchall()) > 0

    @staticmethod
    def guardar_solicitud(producto_id, producto_nombre, nombre, direccion, contacto, pago, mensaje=None):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No hay conexión a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            externo_id, propio_id = SolicitudesRepository._parse_producto_id(producto_id)

            # Si el mueble ya no existe (p. ej. se reemplazó el inventario), la solicitud
            # se guarda igual, solo que sin vínculo al producto.
            if externo_id and not SolicitudesRepository._existe(cursor, 'muebles', 'id_mueble', externo_id):
                externo_id = None
            if propio_id and not SolicitudesRepository._existe(cursor, 'muebles_propios', 'id', propio_id):
                propio_id = None

            # Sin id válido: buscar por nombre entre los muebles externos (best-effort)
            if not externo_id and not propio_id and producto_nombre:
                cursor.execute(
                    "SELECT id_mueble FROM muebles WHERE nombre = %s LIMIT 1",
                    (producto_nombre,)
                )
                filas = cursor.fetchall()
                if filas:
                    externo_id = filas[0][0]

            cursor.execute(
                """
                INSERT INTO solicitudes
                    (nombre_cliente, telefono, direccion, metodo_pago, mensaje, producto_id, mueble_propio_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (nombre, contacto, direccion or None, pago or None, mensaje or None, externo_id, propio_id)
            )
            conexion.commit()
            return cursor.lastrowid   # ← leído ANTES de cerrar el cursor

        except (mysql.connector.Error, Exception):
            logger.exception("Error guardando solicitud en DB")
            conexion.rollback()
            raise
        finally:
            if cursor:
                cursor.close()
            conexion.close()