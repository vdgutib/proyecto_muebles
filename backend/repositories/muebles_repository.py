import mysql.connector
from database import get_db_connection

class MueblesRepository:
    @staticmethod
    def get_or_create_categoria(nombre_categoria):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")
        
        cursor = None
        try:
            cursor = conexion.cursor()
            cursor.execute("SELECT id_categoria FROM categorias WHERE nombre_categoria = %s", (nombre_categoria,))
            cat = cursor.fetchone()
            if cat:
                categoria_id = cat[0]
            else:
                cursor.execute("INSERT INTO categorias (nombre_categoria) VALUES (%s)", (nombre_categoria,))
                categoria_id = cursor.lastrowid
            
            conexion.commit()
            return categoria_id
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def upsert_mueble(sku, nombre, imagen, medidas, precio_costo, peso_kg, bultos, observaciones, id_categoria):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")
        
        cursor = None
        try:
            cursor = conexion.cursor()
            sql_mueble = """
            INSERT INTO muebles (sku, nombre, imagen, medidas, precio_costo, peso_kg, bultos, observaciones, id_categoria)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            nombre=VALUES(nombre), medidas=VALUES(medidas), precio_costo=VALUES(precio_costo), 
            peso_kg=VALUES(peso_kg), bultos=VALUES(bultos), observaciones=VALUES(observaciones), id_categoria=VALUES(id_categoria)
            """
            valores = (sku, nombre, imagen, medidas, precio_costo, peso_kg, bultos, observaciones, id_categoria)
            cursor.execute(sql_mueble, valores)
            conexion.commit()
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
            pass
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
                if mueble['peso_kg'] is not None:
                    mueble['peso_kg'] = float(mueble['peso_kg'])
                if mueble['precio_costo'] is not None:
                    mueble['precio_costo'] = float(mueble['precio_costo'])
                if mueble['precio_venta'] is not None:
                    mueble['precio_venta'] = float(mueble['precio_venta'])
            
            return muebles
        finally:
            if cursor:
                cursor.close()
            conexion.close()
