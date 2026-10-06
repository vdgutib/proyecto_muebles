import logging
import re
import pandas as pd

from repositories.muebles_repository import MueblesRepository

logger = logging.getLogger(__name__)


class ExcelService:
    @staticmethod
    def procesar_archivo_excel(archivo, id_admin_actual=1):
        try:
            # 🚀 ARREGLO 1: Agregamos .fillna("") para que NINGUNA celda vacía se vuelva 'float' (NaN)
            df_raw = pd.read_excel(archivo, header=None, dtype=str).fillna("")

            header_idx = 0
            for i, row in df_raw.iterrows():
                row_strs = [str(val).upper().strip() for val in row.values]
                if 'SKU' in row_strs or 'NOMBRE' in row_strs:
                    header_idx = i
                    break

            df = df_raw.copy()
            df.columns = df.iloc[header_idx]
            df = df.iloc[header_idx + 1:].reset_index(drop=True)

            # Limpiamos los nombres de las columnas
            df.columns = df.columns.astype(str).str.replace('\n', ' ').str.replace('\r', ' ').str.strip().str.upper()
            df.columns = df.columns.str.replace(r'\s+', ' ', regex=True)

            columnas = list(df.columns)
            has_nombre = 'NOMBRE' in columnas
            has_medidas = 'MEDIDAS' in columnas
            
            # 🚀 ARREGLO 2: str(col) por si algún nombre de columna vacío se coló y quiere chocar
            has_precio = any('PRECIO' in str(col) for col in columnas)

            if not (has_nombre and has_medidas and has_precio):
                return {
                    "status": "error",
                    "error": "Esquema de archivo inválido. Faltan columnas obligatorias (Nombre, Precio, Medidas).",
                    "columnas_encontradas": columnas
                }

            filas_muebles = []
            categoria_actual_nombre = None

            for _, row in df.iterrows():
                # Ya no necesitamos dropna() porque eliminamos los NaN con fillna()
                valores_validos = row.astype(str).str.strip()
                valores_validos = valores_validos[(valores_validos != '') & (valores_validos != 'NAN') & (valores_validos != 'nan')]
                
                # Si la fila está completamente vacía, la saltamos
                if len(valores_validos) == 0:
                    continue

                # Si solo hay 1 valor en toda la fila, es la categoría (Ej: "LIVING")
                if len(valores_validos) == 1:
                    categoria_actual_nombre = valores_validos.iloc[0].upper()
                    if categoria_actual_nombre == "MUEBLES PROPIOS":
                        return {
                            "status": "error",
                            "error": "El Excel contiene la categoría 'MUEBLES PROPIOS'. Por favor, elimina esta categoría del Excel. Ahora los Muebles Propios se gestionan directamente desde su propia sección en el Panel Administrativo."
                        }
                    continue

                sku_raw = str(row.get('SKU', '')).strip()
                sku = sku_raw.replace('.0', '')
                if sku == '' or sku.lower() == 'nan':
                    continue

                nombre = str(row.get('NOMBRE', '')).strip()
                medidas = str(row.get('MEDIDAS', '')).strip()
                if medidas.lower() == 'nan':
                    medidas = ''

                precio_col = None
                for col in row.index:
                    if 'PRECIO' in str(col).upper():
                        precio_col = col
                        break

                precio_raw = str(row.get(precio_col, '0')).strip() if precio_col else '0'
                if precio_raw.lower() == 'nan' or precio_raw == '':
                    precio_raw = '0'

                precio_str = re.sub(r'\.0+$', '', precio_raw)
                precio_str = precio_str.replace('.', '').replace(',', '')
                try:
                    precio_costo = int(re.sub(r'[^\d]', '', precio_str))
                except ValueError:
                    precio_costo = 0

                peso_raw = str(row.get('PESO (KG)', '0')).strip().lower()
                if peso_raw == 'nan' or peso_raw == '':
                    peso_raw = '0'
                peso_limpio = re.sub(r'[^\d,.]', '', peso_raw).replace(',', '.')
                try:
                    peso_final = float(peso_limpio)
                except ValueError:
                    peso_final = 0.0

                bultos_raw = str(row.get('BULTOS (CAJAS)', '1')).strip()
                if bultos_raw == '' or bultos_raw.lower() == 'nan':
                    bultos_raw = '1'
                try:
                    bultos = int(float(bultos_raw))
                except ValueError:
                    bultos = 1

                observaciones = str(row.get('OBSERVACIONES', '')).strip()
                if observaciones.lower() == 'nan':
                    observaciones = ''

                imagen_col = next((col for col in row.index if 'IMAGEN' in str(col).upper()), None)
                if imagen_col:
                    imagen_val = str(row.get(imagen_col, '')).strip()
                    imagen = imagen_val if imagen_val and imagen_val.lower() != 'nan' else f"{sku}.jpg"
                else:
                    imagen = f"{sku}.jpg"

                filas_muebles.append({
                    'sku': sku,
                    'nombre': nombre,
                    'imagen': imagen,
                    'medidas': medidas,
                    'precio_costo': precio_costo,
                    'peso_kg': peso_final,
                    'bultos': bultos,
                    'observaciones': observaciones,
                    'categoria_nombre': categoria_actual_nombre,
                })

            if not filas_muebles:
                return {
                    "status": "success",
                    "mensaje": "El archivo se leyó, pero no se procesó ningún mueble. Revisa el formato de las columnas.",
                    "muebles_procesados": 0,
                    "columnas_encontradas": list(df.columns),
                }

            nombres_categorias = [f['categoria_nombre'] for f in filas_muebles if f['categoria_nombre']]
            mapa_categorias = MueblesRepository.resolve_categorias_batch(nombres_categorias)

            tuplas_muebles = [
                (
                    f['sku'], f['nombre'], f['imagen'], f['medidas'], f['precio_costo'],
                    f['peso_kg'], f['bultos'], f['observaciones'],
                    mapa_categorias.get(f['categoria_nombre']) if f['categoria_nombre'] else None,
                )
                for f in filas_muebles
            ]

            muebles_insertados = MueblesRepository.upsert_muebles_batch(tuplas_muebles)

            MueblesRepository.registrar_inventario(id_admin_actual)

            logger.info("Excel procesado correctamente: %s muebles sincronizados.", muebles_insertados)

            return {
                "status": "success",
                "mensaje": "¡Sincronización perfecta!",
                "muebles_procesados": muebles_insertados,
            }

        except Exception as e:
            logger.exception("Error procesando archivo Excel")
            return {
                "status": "error",
                "error": str(e),
            }