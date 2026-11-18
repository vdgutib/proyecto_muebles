import io
import logging
import os
import posixpath
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
import pandas as pd
from PIL import Image

from config import Config
from repositories.muebles_repository import MueblesRepository
from services.imagen_service import ImagenService

logger = logging.getLogger(__name__)


class ExcelService:

    @staticmethod
    def _extraer_imagenes_de_xlsx(contenido_bytes):
        """
        Lee el archivo .xlsx como ZIP y busca en los archivos de dibujo (drawings)
        la relación entre cada fila de la hoja (0-indexed) y el archivo de imagen en xl/media.
        Devuelve un diccionario {fila_0_indexada: (nombre_archivo_en_zip, bytes_imagen)}
        """
        row_images = {}
        if not zipfile.is_zipfile(io.BytesIO(contenido_bytes)):
            return row_images

        try:
            with zipfile.ZipFile(io.BytesIO(contenido_bytes)) as z:
                drawing_files = [n for n in z.namelist() if n.startswith('xl/drawings/drawing') and n.endswith('.xml')]
                for d in drawing_files:
                    dir_name = posixpath.dirname(d)
                    base_name = posixpath.basename(d)
                    rels_name = posixpath.join(dir_name, '_rels', base_name + '.rels')
                    rels = {}
                    if rels_name in z.namelist():
                        try:
                            root_rels = ET.fromstring(z.read(rels_name))
                            for elem in root_rels:
                                r_id = elem.attrib.get('Id')
                                target = elem.attrib.get('Target')
                                if r_id and target:
                                    rels[r_id] = posixpath.normpath(posixpath.join(dir_name, target))
                        except Exception as e:
                            logger.warning("Error leyendo rels de dibujo %s: %s", rels_name, e)

                    try:
                        root_draw = ET.fromstring(z.read(d))
                        anchors = (
                            root_draw.findall('{*}twoCellAnchor') +
                            root_draw.findall('{*}oneCellAnchor')
                        )
                        for a in anchors:
                            blip = a.find('.//{*}blip')
                            if blip is not None:
                                from_elem = a.find('{*}from')
                                if from_elem is not None:
                                    row_text = from_elem.findtext('{*}row')
                                    if row_text is not None and row_text.isdigit():
                                        r_idx = int(row_text)
                                        embed_id = (
                                            blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                                            or blip.attrib.get('r:embed')
                                        )
                                        target_file = rels.get(embed_id)
                                        if target_file and target_file in z.namelist():
                                            row_images[r_idx] = (target_file, z.read(target_file))
                    except Exception as e:
                        logger.warning("Error leyendo dibujo %s: %s", d, e)
        except Exception as e:
            logger.warning("Error al inspeccionar imágenes internas de Excel: %s", e)

        return row_images

    @staticmethod
    def _guardar_imagen_producto(sku, target_file, img_bytes, excel_row_num, nombre_producto):
        """
        Guarda la imagen del producto en Config.IMAGENES_DIR con nombre {sku}.{ext}.
        Si la imagen está en formato EMF, la convierte a PNG usando Pillow.
        Si ocurre un fallo de conversión o archivo corrupto, devuelve una advertencia detallada.
        """
        os.makedirs(Config.IMAGENES_DIR, exist_ok=True)
        directorio_destino = os.path.realpath(Config.IMAGENES_DIR)

        es_emf = target_file.lower().endswith('.emf') or img_bytes.startswith(b'\x01\x00\x00\x00')

        if es_emf:
            try:
                with Image.open(io.BytesIO(img_bytes)) as pil_img:
                    out_io = io.BytesIO()
                    pil_img.save(out_io, format='PNG')
                    png_bytes = out_io.getvalue()

                    nombre_archivo = f"{sku}.png"
                    ImagenService.limpiar_imagenes_previas_sku(sku, extension_a_conservar='png')
                    ruta_guardar = os.path.join(directorio_destino, nombre_archivo)
                    with open(ruta_guardar, 'wb') as f_out:
                        f_out.write(png_bytes)
                    return nombre_archivo, None
            except Exception as e:
                logger.warning("Error convirtiendo EMF a PNG para SKU %s (fila %s): %s", sku, excel_row_num, e)
                advertencia = {
                    "fila": excel_row_num,
                    "sku": sku,
                    "nombre": nombre_producto,
                    "motivo": f"La foto del Excel no se pudo abrir o venía dañada. Puedes subirla manualmente abajo nombrando el archivo '{sku}.png'."
                }
                return f"{sku}.jpg", advertencia

        ext = 'png' if target_file.lower().endswith('.png') else ('webp' if target_file.lower().endswith('.webp') else 'jpg')
        if img_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            ext = 'png'
        elif img_bytes.startswith(b'\xff\xd8'):
            ext = 'jpg'
        elif img_bytes.startswith(b'RIFF') and img_bytes[8:12] == b'WEBP':
            ext = 'webp'

        nombre_archivo = f"{sku}.{ext}"
        try:
            ImagenService.limpiar_imagenes_previas_sku(sku, extension_a_conservar=ext)
            ruta_guardar = os.path.join(directorio_destino, nombre_archivo)
            with open(ruta_guardar, 'wb') as f_out:
                f_out.write(img_bytes)
            return nombre_archivo, None
        except Exception as e:
            logger.warning("Error guardando imagen para SKU %s (fila %s): %s", sku, excel_row_num, e)
            advertencia = {
                "fila": excel_row_num,
                "sku": sku,
                "nombre": nombre_producto,
                "motivo": f"No se pudo guardar la foto ({str(e)}). Puedes subirla manualmente abajo como '{sku}.{ext}'."
            }
            return nombre_archivo, advertencia

    @staticmethod
    def procesar_archivo_excel(archivo, id_admin_actual=1):
        try:
            contenido_bytes = archivo.read()
            if not contenido_bytes:
                return {
                    "status": "error",
                    "error": "El archivo proporcionado está vacío."
                }
            archivo.seek(0)

            # 1. Extraer mapa de imágenes desde drawings
            imagenes_por_fila = ExcelService._extraer_imagenes_de_xlsx(contenido_bytes)
            logger.info("Imágenes vinculadas encontradas en drawings de Excel: %d", len(imagenes_por_fila))

            # 2. Cargar DataFrame
            df_raw = pd.read_excel(io.BytesIO(contenido_bytes), header=None, dtype=str).fillna("")

            header_idx = 0
            for i, row in df_raw.iterrows():
                row_strs = [str(val).upper().strip() for val in row.values]
                if 'SKU' in row_strs or 'NOMBRE' in row_strs:
                    header_idx = i
                    break

            df = df_raw.copy()
            df.columns = df.iloc[header_idx]

            columnas_limpias = (
                df.columns.astype(str)
                .str.replace('\n', ' ')
                .str.replace('\r', ' ')
                .str.strip()
                .str.upper()
                .str.replace(r'\s+', ' ', regex=True)
            )
            df.columns = columnas_limpias
            columnas = list(df.columns)

            has_nombre = 'NOMBRE' in columnas
            has_medidas = 'MEDIDAS' in columnas
            has_precio = any('PRECIO' in str(col) for col in columnas)

            if not (has_nombre and has_medidas and has_precio):
                return {
                    "status": "error",
                    "error": "Esquema de archivo inválido. Faltan columnas obligatorias (Nombre, Precio, Medidas).",
                    "columnas_encontradas": columnas
                }

            candidatos = []
            categoria_actual_nombre = None

            # Iteramos desde la fila siguiente al encabezado
            for i in range(header_idx + 1, len(df)):
                row_raw_idx = i
                excel_row_num = row_raw_idx + 1
                row = df.iloc[i]

                valores_validos = row.astype(str).str.strip()
                valores_validos = valores_validos[(valores_validos != '') & (valores_validos != 'NAN') & (valores_validos != 'nan')]

                if len(valores_validos) == 0:
                    continue

                if len(valores_validos) == 1:
                    categoria_actual_nombre = valores_validos.iloc[0].upper()
                    if categoria_actual_nombre == "MUEBLES PROPIOS":
                        return {
                            "status": "error",
                            "error": "El Excel contiene la categoría 'MUEBLES PROPIOS'. Por favor, elimina esta categoría del Excel. Los Muebles Propios se gestionan directamente desde su propia sección en el Panel Administrativo."
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
                imagen_col_val = None
                if imagen_col:
                    val = str(row.get(imagen_col, '')).strip()
                    if val and val.lower() != 'nan':
                        imagen_col_val = val

                candidatos.append({
                    'row_raw_idx': row_raw_idx,
                    'excel_row': excel_row_num,
                    'sku': sku,
                    'nombre': nombre,
                    'medidas': medidas,
                    'precio_costo': precio_costo,
                    'peso_kg': peso_final,
                    'bultos': bultos,
                    'observaciones': observaciones,
                    'categoria_nombre': categoria_actual_nombre,
                    'imagen_col_val': imagen_col_val,
                })

            if not candidatos:
                return {
                    "status": "success",
                    "mensaje": "El archivo se leyó, pero no se detectaron filas de muebles válidas.",
                    "muebles_procesados": 0,
                    "columnas_encontradas": columnas,
                    "duplicados": [],
                    "advertencias_imagenes": []
                }

            # 3. Detección y filtrado estricto de SKUs duplicados
            sku_counts = Counter(c['sku'] for c in candidatos)
            skus_duplicados = {sku for sku, count in sku_counts.items() if count > 1}

            duplicados_reporte = []
            if skus_duplicados:
                for sku in skus_duplicados:
                    ocurrencias = [c for c in candidatos if c['sku'] == sku]
                    filas_num = [c['excel_row'] for c in ocurrencias]
                    nombres = [c['nombre'] for c in ocurrencias]
                    duplicados_reporte.append({
                        "sku": sku,
                        "filas": filas_num,
                        "nombres": nombres,
                        "mensaje": f"SKU {sku} repetido en filas {', '.join(map(str, filas_num))} ({' / '.join(nombres)})."
                    })
                logger.warning("SKUs duplicados encontrados en Excel: %s", duplicados_reporte)

            # Solo se procesan muebles con SKU único
            candidatos_validos = [c for c in candidatos if c['sku'] not in skus_duplicados]

            # 4. Manejo de imágenes y armado final de tuplas para BD
            filas_muebles = []
            advertencias_imagenes = []
            imagenes_guardadas_count = 0

            for c in candidatos_validos:
                sku = c['sku']
                row_raw_idx = c['row_raw_idx']
                excel_row = c['excel_row']
                nombre = c['nombre']

                imagen_final = None

                # Verificamos si la fila tiene imagen anclada en el Excel
                if row_raw_idx in imagenes_por_fila:
                    target_file, img_bytes = imagenes_por_fila[row_raw_idx]
                    nombre_guardado, adv = ExcelService._guardar_imagen_producto(
                        sku, target_file, img_bytes, excel_row, nombre
                    )
                    imagen_final = nombre_guardado
                    if adv:
                        advertencias_imagenes.append(adv)
                    else:
                        imagenes_guardadas_count += 1
                elif c['imagen_col_val']:
                    imagen_final = c['imagen_col_val']
                else:
                    imagen_final = f"{sku}.jpg"

                filas_muebles.append({
                    'sku': sku,
                    'nombre': nombre,
                    'imagen': imagen_final,
                    'medidas': c['medidas'],
                    'precio_costo': c['precio_costo'],
                    'peso_kg': c['peso_kg'],
                    'bultos': c['bultos'],
                    'observaciones': c['observaciones'],
                    'categoria_nombre': c['categoria_nombre'],
                })

            # 5. Persistencia en la Base de Datos
            muebles_insertados = 0
            if filas_muebles:
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
                logger.info("Excel procesado: %d muebles insertados/actualizados.", muebles_insertados)

            total_duplicados_omitidos = len(candidatos) - len(candidatos_validos)

            resumen = {
                "total_filas_detectadas": len(candidatos),
                "muebles_procesados": muebles_insertados,
                "imagenes_extraidas": imagenes_guardadas_count,
                "skus_duplicados_omitidos": total_duplicados_omitidos,
                "advertencias_imagenes_count": len(advertencias_imagenes)
            }

            mensaje_final = f"¡Carga completada! Se guardaron {muebles_insertados} muebles y {imagenes_guardadas_count} fotos."
            if total_duplicados_omitidos > 0:
                mensaje_final += f" Atención: {total_duplicados_omitidos} muebles no se guardaron porque su SKU está repetido en el archivo."

            return {
                "status": "success",
                "mensaje": mensaje_final,
                "muebles_procesados": muebles_insertados,
                "resumen": resumen,
                "duplicados": duplicados_reporte,
                "advertencias_imagenes": advertencias_imagenes
            }

        except Exception as e:
            logger.exception("Error procesando archivo Excel")
            return {
                "status": "error",
                "error": str(e),
            }
