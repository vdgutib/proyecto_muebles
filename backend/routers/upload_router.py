import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.excel_service import ExcelService
from services.imagen_service import ImagenService

logger = logging.getLogger(__name__)
upload_bp = Blueprint('upload_bp', __name__)

@upload_bp.route('/api/subir-imagenes', methods=['POST'])
@jwt_required()
def subir_imagenes():
    if 'imagenes' not in request.files:
        return jsonify({"status": "error", "error": "No se encontraron imágenes en la petición"}), 400

    archivos = request.files.getlist('imagenes')
    if not archivos or all(a.filename == '' for a in archivos):
        return jsonify({"status": "error", "error": "No se seleccionó ninguna imagen"}), 400

    tipo = request.form.get('tipo', 'general')

    try:
        guardadas, rechazadas, asociadas = ImagenService.guardar_imagenes(archivos, tipo=tipo)
    except Exception:
        logger.exception("Error guardando imágenes en disco")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

    if not guardadas and rechazadas:
        return jsonify({
            "status": "error",
            "error": "Ninguna imagen pudo guardarse. Verifica que el nombre sea un SKU numérico existente.",
            "rechazadas": rechazadas
        }), 400

    mensaje = f"{len(guardadas)} imágenes subidas correctamente."
    if rechazadas:
        mensaje += f" ({len(rechazadas)} rechazadas)."

    return jsonify({
        "status": "success",
        "mensaje": mensaje,
        "guardadas": guardadas,
        "asociadas": asociadas,
        "rechazadas": rechazadas
    }), 200


@upload_bp.route('/api/subir-excel', methods=['POST'])
@jwt_required()
def subir_excel():
    if 'archivo' not in request.files:
        return jsonify({"status": "error", "error": "No se detectó ningún archivo en la petición"}), 400

    archivo = request.files['archivo']
    if archivo.filename == '':
        return jsonify({"status": "error", "error": "No se seleccionó ningún archivo"}), 400

    id_admin_actual = int(get_jwt_identity())

    resultado = ExcelService.procesar_archivo_excel(archivo, id_admin_actual)

    if resultado.get("status") == "success":
        return jsonify(resultado), 200

    logger.error("Fallo al procesar Excel: %s", resultado.get("error"))
    return jsonify(resultado), 500
