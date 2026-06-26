from flask import Flask, request, jsonify
from flask_cors import CORS
from services.excel_service import ExcelService
from repositories.muebles_repository import MueblesRepository
from config import Config

app = Flask(__name__)
CORS(app)

import os

@app.route('/')
def home():
    return "El backend está funcionando correctamente"

@app.route('/api/subir-imagenes', methods=['POST'])
def subir_imagenes():
    if 'imagenes' not in request.files:
        return jsonify({"error": "No se encontraron imágenes en la petición"}), 400
    
    archivos = request.files.getlist('imagenes')
    if not archivos or all(a.filename == '' for a in archivos):
        return jsonify({"error": "No se seleccionó ninguna imagen"}), 400
        
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, 'frontend', 'imagenes', 'public')
    os.makedirs(public_dir, exist_ok=True)
    
    count = 0
    for archivo in archivos:
        if archivo.filename:
            filepath = os.path.join(public_dir, archivo.filename)
            archivo.save(filepath)
            count += 1
            
    return jsonify({
        "status": "success",
        "mensaje": f"{count} imágenes subidas correctamente."
    }), 200

@app.route('/api/subir-excel', methods=['POST'])
def subir_excel():
    if 'archivo' not in request.files:
        return jsonify({"error": "No se detectó ningún archivo en la petición"}), 400

    archivo = request.files['archivo']
    if archivo.filename == '':
        return jsonify({"error": "No se seleccionó ningún archivo"}), 400
        
    id_admin_actual = 1 

    resultado = ExcelService.procesar_archivo_excel(archivo, id_admin_actual)
    
    if resultado.get("status") == "success":
        return jsonify(resultado), 200
    else:
        return jsonify(resultado), 500

@app.route('/api/muebles', methods=['GET'])
def obtener_muebles():
    try:
        muebles = MueblesRepository.get_all_muebles()
        return jsonify(muebles), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)