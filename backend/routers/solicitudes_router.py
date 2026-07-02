import logging
from flask import Blueprint, request, jsonify
from repositories.solicitudes_repository import SolicitudesRepository

logger = logging.getLogger(__name__)
solicitudes_bp = Blueprint('solicitudes_bp', __name__)

@solicitudes_bp.route('/api/solicitudes', methods=['POST', 'OPTIONS'])
def crear_solicitud():
    if request.method == 'OPTIONS':
        return '', 200
    datos = request.get_json(silent=True) or {}
    producto_id = datos.get('producto_id', '')
    producto = datos.get('producto', '')
    nombre = datos.get('nombre', '')
    direccion = datos.get('direccion', '')
    contacto = datos.get('contacto', '')
    pago = datos.get('pago', '')
    mensaje = datos.get('mensaje', '')
    
    if not nombre or not direccion or not contacto:
        return jsonify({"status": "error", "error": "Faltan campos obligatorios: nombre, dirección y contacto."}), 400
        
    try:
        id_solicitud = SolicitudesRepository.guardar_solicitud(producto_id, producto, nombre, direccion, contacto, pago, mensaje)
        return jsonify({"status": "success", "mensaje": "Solicitud recibida con éxito", "id": id_solicitud}), 201
    except Exception:
        logger.exception("Error guardando solicitud")
        return jsonify({"status": "error", "error": "Error interno del servidor persistiendo la solicitud"}), 500
