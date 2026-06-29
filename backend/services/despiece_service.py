import logging

logger = logging.getLogger(__name__)

# Límites que coinciden con la precisión de las columnas DECIMAL de
# `calculos_medidas` / `detalle_calculo` (no se modifica el esquema, pero
# validamos antes de llegar a la BD para devolver 400 en vez de un 500
# por "Out of range value" de MySQL).
LIMITE_DIMENSION_CM = 9999.99
LIMITE_GROSOR_MM = 99.99


class DespieceError(ValueError):
    """Error de validación de los datos de entrada del despiece (-> HTTP 400)."""


class DespieceService:
    """
    Módulo de cálculo de medidas (CU-005).

    *** NOTA IMPORTANTE PARA EL EQUIPO ***
    El informe de Análisis y Diseño no especifica la fórmula exacta de
    despiece (depende de la técnica de ensamblaje / tipo de mueble del
    taller). Para dejar el endpoint funcional implementé una fórmula
    estándar de "caja simple" en melamina (2 laterales + techo/base + 1
    fondo trasero) a modo de placeholder. Ajusta `_calcular_piezas` con la
    fórmula real de carpintería antes de pasar a producción.
    """

    @staticmethod
    def _validar_numero_positivo(valor, nombre_campo):
        try:
            numero = float(valor)
        except (TypeError, ValueError):
            raise DespieceError(f"El campo '{nombre_campo}' debe ser numérico")
        if numero <= 0:
            raise DespieceError(f"El campo '{nombre_campo}' debe ser mayor a 0")
        return numero

    @classmethod
    def validar_entrada(cls, datos):
        alto = cls._validar_numero_positivo(datos.get('alto'), 'alto')
        ancho = cls._validar_numero_positivo(datos.get('ancho'), 'ancho')
        profundidad = cls._validar_numero_positivo(datos.get('profundidad'), 'profundidad')
        grosor = cls._validar_numero_positivo(datos.get('grosor'), 'grosor')

        if alto > LIMITE_DIMENSION_CM or ancho > LIMITE_DIMENSION_CM or profundidad > LIMITE_DIMENSION_CM:
            raise DespieceError(f"Las dimensiones no pueden superar {LIMITE_DIMENSION_CM} cm")

        if grosor > LIMITE_GROSOR_MM:
            raise DespieceError(f"El grosor no puede superar {LIMITE_GROSOR_MM} mm")

        if grosor >= ancho or grosor >= alto:
            raise DespieceError("El grosor no puede ser mayor o igual que el alto/ancho del mueble")

        return alto, ancho, profundidad, grosor

    @staticmethod
    def _calcular_piezas(alto_cm, ancho_cm, profundidad_cm, grosor_cm):
        # Conversión a mm para el detalle de corte
        alto_mm = alto_cm * 10
        ancho_mm = ancho_cm * 10
        profundidad_mm = profundidad_cm * 10
        grosor_mm = grosor_cm * 10
        
        # Margen de tolerancia física (hoja de sierra / tapacantos)
        tolerancia_mm = 2

        return [
            {
                "nombre_pieza": "Lateral",
                "cantidad": 2,
                "largo_mm": round(alto_mm - tolerancia_mm, 1),
                "ancho_mm": round(profundidad_mm - tolerancia_mm, 1),
            },
            {
                "nombre_pieza": "Techo/Base",
                "cantidad": 2,
                "largo_mm": round(ancho_mm - (2 * grosor_mm) - tolerancia_mm, 1),
                "ancho_mm": round(profundidad_mm - tolerancia_mm, 1),
            },
            {
                "nombre_pieza": "Fondo",
                "cantidad": 1,
                "largo_mm": round(alto_mm - grosor_mm - tolerancia_mm, 1),
                "ancho_mm": round(ancho_mm - (2 * grosor_mm) - tolerancia_mm, 1),
            },
        ]

    @classmethod
    def calcular(cls, datos):
        alto, ancho, profundidad, grosor = cls.validar_entrada(datos)
        piezas = cls._calcular_piezas(alto, ancho, profundidad, grosor)
        return alto, ancho, profundidad, grosor, piezas