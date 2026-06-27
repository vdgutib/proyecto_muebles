import pandas as pd
import re
from repositories.muebles_repository import MueblesRepository

class ExcelService:
    @staticmethod
    def procesar_archivo_excel(archivo, id_admin_actual=1):
        try:
            df_raw = pd.read_excel(archivo, header=None, dtype=str)
            
            header_idx = 0
            for i, row in df_raw.iterrows():
                row_strs = [str(val).upper().strip() for val in row.values]
                if 'SKU' in row_strs or 'NOMBRE' in row_strs:
                    header_idx = i
                    break
            
            df = df_raw.copy()
            df.columns = df.iloc[header_idx]
            df = df.iloc[header_idx + 1:].reset_index(drop=True)
            
            df.columns = df.columns.astype(str).str.replace('\\n', ' ').str.replace('\\r', ' ').str.strip().str.upper()
            df.columns = df.columns.str.replace(r'\\s+', ' ', regex=True)
            
            muebles_insertados = 0
            categoria_actual_id = None

            for index, row in df.iterrows():
                
                valores_validos = row.dropna().astype(str).str.strip()
                valores_validos = valores_validos[(valores_validos != '') & (valores_validos != 'nan')]
                
                if len(valores_validos) == 1:
                    nombre_cat = valores_validos.iloc[0].upper() 
                    categoria_actual_id = MueblesRepository.get_or_create_categoria(nombre_cat)
                    continue 

                sku_raw = str(row.get('SKU', '')).strip()
                sku = sku_raw.replace('.0', '')
                
                if sku == '' or sku == 'nan':
                    continue 

                nombre = str(row.get('NOMBRE', '')).strip()
                medidas = str(row.get('MEDIDAS', '')).strip()
                if medidas == 'nan': medidas = ''

                precio_col = None
                for col in row.index:
                    if 'PRECIO' in str(col).upper():
                        precio_col = col
                        break

                precio_raw = str(row.get(precio_col, '0')).strip() if precio_col else '0'
                if precio_raw.lower() == 'nan': precio_raw = '0'
                
                precio_str = re.sub(r'\.0+$', '', precio_raw)
                precio_str = precio_str.replace('.', '').replace(',', '')
                try:
                    precio_costo = int(re.sub(r'[^\d]', '', precio_str))
                except ValueError:
                    precio_costo = 0

                peso_raw = str(row.get('PESO (KG)', '0')).strip().lower()
                if peso_raw == 'nan': peso_raw = '0'
                peso_limpio = re.sub(r'[^\d,.]', '', peso_raw).replace(',', '.')
                try:
                    peso_final = float(peso_limpio)
                except ValueError:
                    peso_final = 0.0

                bultos_raw = str(row.get('BULTOS (CAJAS)', '1')).strip()
                try:
                    bultos = int(float(bultos_raw)) 
                except ValueError:
                    bultos = 1
                
                observaciones = str(row.get('OBSERVACIONES', '')).strip()
                if observaciones == 'nan': observaciones = ''
                
                imagen = f"{sku}.jpg"

                MueblesRepository.upsert_mueble(
                    sku, nombre, imagen, medidas, precio_costo, peso_final, bultos, observaciones, categoria_actual_id
                )
                muebles_insertados += 1

            MueblesRepository.registrar_inventario(id_admin_actual)

            resultado = {
                "status": "success",
                "mensaje": "¡Sincronización perfecta!",
                "muebles_procesados": muebles_insertados
            }
            
            if muebles_insertados == 0:
                resultado["mensaje"] = "El archivo se leyó, pero no se procesó ningún mueble. Revisa el formato de las columnas."
                resultado["columnas_encontradas"] = list(df.columns)
                
            return resultado

        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
