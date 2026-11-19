"""Validación y normalización de los datos de un mueble propio.

Se usa tanto al crear/editar uno como al crear varios a la vez, de modo que las reglas
sean siempre las mismas aunque la petición no venga de la interfaz.
"""
import re

PRECIO_MIN = 14_000          # ningún mueble cuesta menos que esto
PRECIO_MAX = 20_000_000
NOMBRE_MAX = 150            # VARCHAR(150) en la BD
MEDIDA_MIN_CM = 1
MEDIDA_MAX_CM = 600         # 6 m por lado ya es más de lo razonable para un mueble

_FACTOR_A_CM = {'cm': 1, 'm': 100, 'mm': 0.1}
_PATRON_MEDIDAS = re.compile(
    r'^\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)(?:\s*[xX×]\s*(\d+(?:[.,]\d+)?))?\s*(cm|mm|m)?\s*$',
    re.IGNORECASE,
)


def _formatear_numero(n):
    n = round(n, 1)
    return str(int(n)) if n == int(n) else f"{n:.1f}"


def validar_nombre(valor):
    nombre = str(valor or '').strip()
    if not nombre:
        raise ValueError("El nombre es obligatorio")
    if len(nombre) > NOMBRE_MAX:
        raise ValueError(f"El nombre no puede superar los {NOMBRE_MAX} caracteres")
    return nombre


def validar_precio(valor):
    """Devuelve el precio como entero, o lanza ValueError con un mensaje para el usuario."""
    try:
        if isinstance(valor, bool) or valor is None or str(valor).strip() == '':
            raise ValueError()
        precio = int(str(valor).strip())
    except (TypeError, ValueError):
        raise ValueError("El precio debe ser un número entero, sin puntos ni símbolos")
    if precio < PRECIO_MIN:
        raise ValueError(
            f"El precio mínimo es ${PRECIO_MIN:,}".replace(',', '.') +
            f". Recibido: ${precio:,}".replace(',', '.') + ". ¿Faltan ceros?"
        )
    if precio > PRECIO_MAX:
        raise ValueError(f"El precio máximo es ${PRECIO_MAX:,}".replace(',', '.'))
    return precio


def normalizar_medidas(valor):
    """Devuelve las medidas en el formato 'ANCHOxPROFxALTO cm' (o '' si no hay).

    Acepta 2 o 3 dimensiones separadas por x/×, con coma o punto decimal y unidad opcional
    (cm por defecto, también m o mm). Lanza ValueError si el texto no se puede interpretar.
    """
    texto = str(valor or '').strip()
    if not texto:
        return ''
    m = _PATRON_MEDIDAS.match(texto)
    if not m:
        raise ValueError("Medidas inválidas. Usa el formato ancho x profundidad x alto en cm, por ejemplo 120x80x40 cm")
    factor = _FACTOR_A_CM[(m.group(4) or 'cm').lower()]
    dims = [float(g.replace(',', '.')) * factor for g in m.groups()[:3] if g is not None]
    for d in dims:
        if d < MEDIDA_MIN_CM or d > MEDIDA_MAX_CM:
            raise ValueError(f"Cada medida debe estar entre {MEDIDA_MIN_CM} y {MEDIDA_MAX_CM} cm")
    return 'x'.join(_formatear_numero(d) for d in dims) + ' cm'
