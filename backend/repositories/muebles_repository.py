import logging
import mysql.connector
from database import get_db_connection
from config import Config

logger = logging.getLogger(__name__)


class MueblesRepository:

    @staticmethod
    def resolve_categorias_batch(nombres_categorias):

        nombres_unicos = list(dict.fromkeys(
            n.strip().upper() for n in nombres_categorias if n and n.strip()
        ))
        if not nombres_unicos:
            return {}

        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()

            # 1) Traer en un solo viaje las categorías que ya existen
            formato = ','.join(['%s'] * len(nombres_unicos))
            cursor.execute(
                f"SELECT id_categoria, nombre_categoria FROM categorias "
                f"WHERE nombre_categoria IN ({formato})",
                tuple(nombres_unicos)
            )
            mapa = {nombre: id_cat for id_cat, nombre in cursor.fetchall()}

            # 2) Crear en bloque las que falten
            faltantes = [n for n in nombres_unicos if n not in mapa]
            if faltantes:
                cursor.executemany(
                    "INSERT IGNORE INTO categorias (nombre_categoria) VALUES (%s)",
                    [(n,) for n in faltantes]
                )
                conexion.commit()

                # 3) Releer los IDs recién asignados (un solo viaje más)
                formato_faltantes = ','.join(['%s'] * len(faltantes))
                cursor.execute(
                    f"SELECT id_categoria, nombre_categoria FROM categorias "
                    f"WHERE nombre_categoria IN ({formato_faltantes})",
                    tuple(faltantes)
                )
                for id_cat, nombre in cursor.fetchall():
                    mapa[nombre] = id_cat

            return mapa
        except mysql.connector.Error:
            conexion.rollback()
            raise
        finally:
            if cursor:
                cursor.close()
            conexion.close()


    @staticmethod
    def upsert_muebles_batch(muebles):
        """
        muebles: lista de tuplas
            (sku, nombre, imagen, medidas, precio_costo, peso_kg, bultos,
             observaciones, id_categoria)

        Devuelve la cantidad de filas procesadas (insertadas o actualizadas).
        """
        if not muebles:
            return 0

        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        sql = """
            INSERT INTO muebles
                (sku, nombre, imagen, medidas, precio_costo, peso_kg, bultos, observaciones, id_categoria)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                imagen = VALUES(imagen),
                medidas = VALUES(medidas),
                precio_costo = VALUES(precio_costo),
                precio_venta = ROUND(VALUES(precio_costo) * 1.60),
                peso_kg = VALUES(peso_kg),
                bultos = VALUES(bultos),
                observaciones = VALUES(observaciones),
                id_categoria = VALUES(id_categoria)
        """

        cursor = None
        total_procesados = 0
        try:
            cursor = conexion.cursor()
            chunk_size = Config.BATCH_CHUNK_SIZE
            for inicio in range(0, len(muebles), chunk_size):
                lote = muebles[inicio:inicio + chunk_size]
                cursor.executemany(sql, lote)
                total_procesados += len(lote)
            conexion.commit()
            return total_procesados
        except mysql.connector.Error:
            conexion.rollback()
            raise
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def registrar_inventario(id_admin):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            cursor.execute("INSERT INTO inventario (id_admin) VALUES (%s)", (id_admin,))
            conexion.commit()
        except mysql.connector.Error:
            # Antes este error se silenciaba con `pass`. Lo registramos para
            # poder detectar problemas (ej. id_admin inválido) sin tumbar el
            # flujo principal de carga del Excel.
            logger.exception("No se pudo registrar el inventario para id_admin=%s", id_admin)
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def get_all_muebles():
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor(dictionary=True)
            sql = """
                SELECT m.id_mueble, m.sku, m.nombre, m.imagen, m.medidas,
                       m.precio_costo, m.precio_venta, m.peso_kg, m.bultos,
                       m.observaciones, c.nombre_categoria
                FROM muebles m
                LEFT JOIN categorias c ON m.id_categoria = c.id_categoria
                ORDER BY c.nombre_categoria, m.nombre;
            """
            cursor.execute(sql)
            muebles = cursor.fetchall()

            for mueble in muebles:
                MueblesRepository._castear_decimales(mueble)

            return muebles
        finally:
            if cursor:
                cursor.close()
            conexion.close()

  
    @staticmethod
    def get_mueble_by_sku(sku):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor(dictionary=True)
            sql = """
                SELECT m.id_mueble, m.sku, m.nombre, m.imagen, m.medidas,
                       m.precio_costo, m.precio_venta, m.peso_kg, m.bultos,
                       m.observaciones, c.id_categoria, c.nombre_categoria
                FROM muebles m
                LEFT JOIN categorias c ON m.id_categoria = c.id_categoria
                WHERE m.sku = %s
            """
            cursor.execute(sql, (sku,))
            mueble = cursor.fetchone()

            if mueble:
                MueblesRepository._castear_decimales(mueble)

            return mueble
        finally:
            if cursor:
                cursor.close()
            conexion.close()

  
    @staticmethod
    def get_imagen_by_sku(sku):
        """
        Devuelve el nombre del archivo de imagen asociado al SKU, '' si el
        mueble no tiene imagen registrada, o None si el SKU no existe.
        Se usa antes de borrar para saber qué archivo físico eliminar.
        """
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            cursor.execute("SELECT imagen FROM muebles WHERE sku = %s", (sku,))
            fila = cursor.fetchone()
            if fila is None:
                return None
            return fila[0] or ''
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def delete_mueble(sku):
        """Elimina el registro del mueble. Devuelve True si existía."""
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            cursor.execute("DELETE FROM muebles WHERE sku = %s", (sku,))
            conexion.commit()
            return cursor.rowcount > 0
        except mysql.connector.Error:
            conexion.rollback()
            raise
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def _castear_decimales(mueble):
        if mueble.get('peso_kg') is not None:
            mueble['peso_kg'] = float(mueble['peso_kg'])
        if mueble.get('precio_costo') is not None:
            mueble['precio_costo'] = float(mueble['precio_costo'])
        if mueble.get('precio_venta') is not None:
            mueble['precio_venta'] = float(mueble['precio_venta'])