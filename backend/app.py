from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import mysql.connector
import re

app = Flask(__name__)

CORS(app)

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'tienda_muebles'
}

@app.route('/')
def home():
    return "El backend está funcionando correctamente"

@app.route('/api/subir-excel', methods=['POST'])
def subir_excel():
    if 'archivo' not in request.files:
        return jsonify({"error": "No se detectó ningún archivo en la petición"}), 400

    archivo = request.files['archivo']
    id_admin_actual = 1 

    try:
        df = pd.read_excel(archivo, dtype={'SKU': str})
        
        df.columns = df.columns.astype(str).str.replace('\n', ' ').str.replace('\r', ' ').str.strip().str.upper()
        df.columns = df.columns.str.replace(r'\s+', ' ', regex=True)
        
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor()

        categoria_actual_id = None
        muebles_insertados = 0

        for index, row in df.iterrows():
            
            valores_validos = row.dropna().astype(str).str.strip()
            valores_validos = valores_validos[(valores_validos != '') & (valores_validos != 'nan')]
            
            if len(valores_validos) == 1:
                nombre_cat = valores_validos.iloc[0].upper() 
                cursor.execute("SELECT id_categoria FROM categorias WHERE nombre_categoria = %s", (nombre_cat,))
                cat = cursor.fetchone()
                if cat:
                    categoria_actual_id = cat[0]
                else:
                    cursor.execute("INSERT INTO categorias (nombre_categoria) VALUES (%s)", (nombre_cat,))
                    categoria_actual_id = cursor.lastrowid
                continue 

            sku_raw = str(row.get('SKU', '')).strip()
            sku = sku_raw.replace('.0', '')
            
            if sku == '' or sku == 'nan':
                continue 

            nombre = str(row.get('NOMBRE', '')).strip()
            medidas = str(row.get('MEDIDAS', '')).strip()
            if medidas == 'nan': medidas = ''

            precio_raw = str(row.get('PRECIO S/ARMADO', '0')).replace('$', '').replace(' ', '').strip()
            if precio_raw.endswith('.0'):
                precio_raw = precio_raw[:-2]
            precio_raw = precio_raw.replace('.', '')
            
            try:
                precio_costo = int(precio_raw)
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

            sql_mueble = """
            INSERT INTO muebles (sku, nombre, imagen, medidas, precio_costo, peso_kg, bultos, observaciones, id_categoria)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            nombre=VALUES(nombre), medidas=VALUES(medidas), precio_costo=VALUES(precio_costo), 
            peso_kg=VALUES(peso_kg), bultos=VALUES(bultos), observaciones=VALUES(observaciones), id_categoria=VALUES(id_categoria)
            """
            valores = (sku, nombre, imagen, medidas, precio_costo, peso_final, bultos, observaciones, categoria_actual_id)
            cursor.execute(sql_mueble, valores)
            muebles_insertados += 1

        try:
            cursor.execute("INSERT INTO inventario (id_admin) VALUES (%s)", (id_admin_actual,))
        except mysql.connector.Error:
            pass 

        conexion.commit()
        cursor.close()
        conexion.close()

        return jsonify({
            "status": "success",
            "mensaje": "¡Sincronización perfecta!",
            "muebles_procesados": muebles_insertados
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route('/api/muebles', methods=['GET'])
def obtener_muebles():
    try:
        conexion = mysql.connector.connect(**db_config)
        
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
        
        cursor.close()
        conexion.close()
        return jsonify(muebles), 200

    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)