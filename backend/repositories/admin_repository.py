from database import get_db_connection


class AdminRepository:
    @staticmethod
    def get_by_username(nombre_usuario):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor(dictionary=True)
            cursor.execute(
                "SELECT id_admin, nombre_usuario, password FROM administrador WHERE nombre_usuario = %s",
                (nombre_usuario,)
            )
            return cursor.fetchone()
        finally:
            if cursor:
                cursor.close()
            conexion.close()