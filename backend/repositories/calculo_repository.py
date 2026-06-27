from database import get_db_connection


class CalculoRepository:
    @staticmethod
    def guardar_calculo(descripcion, alto, ancho, profundidad, grosor, id_admin, piezas):
        conexion = get_db_connection()
        if not conexion:
            raise Exception("No se pudo conectar a la base de datos")

        cursor = None
        try:
            cursor = conexion.cursor()

            cursor.execute(
                """
                INSERT INTO calculos_medidas
                    (descripcion_mueble, alto_base, ancho_base, profundidad_base, grosor_melamina_mm, id_admin)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (descripcion, alto, ancho, profundidad, grosor, id_admin)
            )
            id_calculo = cursor.lastrowid

            if piezas:
                filas_detalle = [
                    (id_calculo, p['nombre_pieza'], p['cantidad'], p['largo_mm'], p['ancho_mm'])
                    for p in piezas
                ]
                cursor.executemany(
                    """
                    INSERT INTO detalle_calculo (id_calculo, nombre_pieza, cantidad, largo_mm, ancho_mm)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    filas_detalle
                )

            conexion.commit()
            return id_calculo
        except Exception:
            conexion.rollback()
            raise
        finally:
            if cursor:
                cursor.close()
            conexion.close()