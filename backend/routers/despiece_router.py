import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.despiece_service import DespieceService, DespieceError
from repositories.calculo_repository import CalculoRepository

logger = logging.getLogger(__name__)
despiece_bp = Blueprint('despiece_bp', __name__)

@despiece_bp.route('/api/despiece', methods=['POST'])
@jwt_required()
def calcular_despiece():
    datos = request.get_json(silent=True) or {}

    try:
        alto, ancho, profundidad, grosor, piezas = DespieceService.calcular(datos)
    except DespieceError as e:
        return jsonify({"status": "error", "error": str(e)}), 400

    try:
        id_admin = int(get_jwt_identity())
        descripcion = str(datos.get('descripcion', 'Cálculo sin descripción')).strip()[:150]

        id_calculo = CalculoRepository.guardar_calculo(
            descripcion, alto, ancho, profundidad, grosor, id_admin, piezas
        )
    except Exception:
        logger.exception("Error guardando el histórico de despiece")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

    return jsonify({
        "status": "success",
        "id_calculo": id_calculo,
        "piezas": piezas
    }), 201
