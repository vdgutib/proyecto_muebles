import logging
import mysql.connector
from database import get_db_connection

logger = logging.getLogger(__name__)

class MueblesPropiosRepository:

    # ==========================
    # CATEGORIAS PROPIAS
    # ==========================
    
    @staticmethod
    def get_categorias(activas_solo=False):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor(dictionary=True)
            sql = "SELECT * FROM categorias_propias"
            if activas_solo:
                sql += " WHERE activa = TRUE"
            sql += " ORDER BY orden ASC, nombre ASC"
            cursor.execute(sql)
            return cursor.fetchall()
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def create_categoria(nombre, orden=0):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "INSERT INTO categorias_propias (nombre, orden) VALUES (%s, %s)"
            cursor.execute(sql, (nombre, orden))
            conexion.commit()
            return cursor.lastrowid
        except mysql.connector.Error as e:
            conexion.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def update_categoria(id_cat, data):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            campos = []
            valores = []
            for k, v in data.items():
                campos.append(f"{k} = %s")
                valores.append(v)
                
            if not campos:
                return True
                
            valores.append(id_cat)
            sql = f"UPDATE categorias_propias SET {', '.join(campos)} WHERE id = %s"
            cursor.execute(sql, tuple(valores))
            conexion.commit()
            return cursor.rowcount > 0
        except mysql.connector.Error as e:
            conexion.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def delete_categoria(id_cat):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            cursor.execute("DELETE FROM categorias_propias WHERE id = %s", (id_cat,))
            conexion.commit()
            return cursor.rowcount > 0
        except mysql.connector.Error as e:
            conexion.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    # ==========================
    # MUEBLES PROPIOS
    # ==========================
    
    @staticmethod
    def get_all(activos_solo=True):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor(dictionary=True)
            sql = """
                SELECT mp.*, cp.nombre as nombre_categoria
                FROM muebles_propios mp
                JOIN categorias_propias cp ON mp.categoria_id = cp.id
            """
            if activos_solo:
                sql += " WHERE mp.activo = TRUE"
            sql += " ORDER BY mp.id DESC"
            cursor.execute(sql)
            muebles = cursor.fetchall()
            
            # Fetch imágenes
            muebles_ids = [m['id'] for m in muebles]
            if muebles_ids:
                format_strings = ','.join(['%s'] * len(muebles_ids))
                cursor.execute(f"SELECT * FROM muebles_propios_imagenes WHERE mueble_id IN ({format_strings}) ORDER BY orden ASC", tuple(muebles_ids))
                imagenes = cursor.fetchall()
                
                # Agrupar por mueble
                img_dict = {}
                for img in imagenes:
                    mid = img['mueble_id']
                    if mid not in img_dict:
                        img_dict[mid] = []
                    img_dict[mid].append(img['imagen_url'])
                    
                for m in muebles:
                    m['imagenes'] = img_dict.get(m['id'], [])
                    m['tipo'] = 'propio' # discriminador para el frontend
            else:
                for m in muebles:
                    m['imagenes'] = []
                    m['tipo'] = 'propio'
                    
            return muebles
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def get_by_id(mueble_id):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor(dictionary=True)
            sql = """
                SELECT mp.*, cp.nombre as nombre_categoria
                FROM muebles_propios mp
                JOIN categorias_propias cp ON mp.categoria_id = cp.id
                WHERE mp.id = %s
            """
            cursor.execute(sql, (mueble_id,))
            mueble = cursor.fetchone()
            
            if mueble:
                cursor.execute("SELECT imagen_url FROM muebles_propios_imagenes WHERE mueble_id = %s ORDER BY orden ASC", (mueble_id,))
                mueble['imagenes'] = [img['imagen_url'] for img in cursor.fetchall()]
                mueble['tipo'] = 'propio'
                
            return mueble
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def create(data, imagenes):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            sql = """
                INSERT INTO muebles_propios 
                (nombre, descripcion, video_url, medidas, precio, categoria_id, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['nombre'],
                data.get('descripcion', ''),
                data.get('video_url', ''),
                data.get('medidas', ''),
                data['precio'],
                data['categoria_id'],
                data.get('activo', True)
            ))
            mueble_id = cursor.lastrowid
            
            if imagenes:
                img_sql = "INSERT INTO muebles_propios_imagenes (mueble_id, imagen_url, orden) VALUES (%s, %s, %s)"
                img_data = [(mueble_id, url, idx) for idx, url in enumerate(imagenes)]
                cursor.executemany(img_sql, img_data)
                
            conexion.commit()
            return mueble_id
        except mysql.connector.Error as e:
            conexion.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def update(mueble_id, data, imagenes=None):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            
            campos = []
            valores = []
            for k, v in data.items():
                if k in ['nombre', 'descripcion', 'video_url', 'medidas', 'precio', 'categoria_id', 'activo']:
                    campos.append(f"{k} = %s")
                    valores.append(v)
                
            if campos:
                valores.append(mueble_id)
                sql = f"UPDATE muebles_propios SET {', '.join(campos)} WHERE id = %s"
                cursor.execute(sql, tuple(valores))
            
            # Si se envían imagenes, reemplazamos todas
            if imagenes is not None:
                cursor.execute("DELETE FROM muebles_propios_imagenes WHERE mueble_id = %s", (mueble_id,))
                if imagenes:
                    img_sql = "INSERT INTO muebles_propios_imagenes (mueble_id, imagen_url, orden) VALUES (%s, %s, %s)"
                    img_data = [(mueble_id, url, idx) for idx, url in enumerate(imagenes)]
                    cursor.executemany(img_sql, img_data)
                    
            conexion.commit()
            return True
        except mysql.connector.Error as e:
            conexion.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            conexion.close()

    @staticmethod
    def delete(mueble_id, fisico=False):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()
            if fisico:
                cursor.execute("DELETE FROM muebles_propios WHERE id = %s", (mueble_id,))
            else:
                cursor.execute("UPDATE muebles_propios SET activo = FALSE WHERE id = %s", (mueble_id,))
            conexion.commit()
            return cursor.rowcount > 0
        except mysql.connector.Error as e:
            conexion.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            conexion.close()
