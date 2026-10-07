import logging
from flask import Blueprint, request, jsonify
from services.auth_service import AuthService

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    datos = request.get_json(silent=True) or {}
    nombre_usuario = datos.get('usuario')
    password = datos.get('password')

    try:
        resultado = AuthService.autenticar(nombre_usuario, password)
    except Exception:
        logger.exception("Error inesperado durante el login")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

    if not resultado:
        return jsonify({"status": "error", "error": "Datos inválidos"}), 400

    if not resultado.get("success"):
        return jsonify({"status": "error", "error": resultado.get("error"), "attempts_left": resultado.get("attempts_left")}), 401

    return jsonify({"status": "success", "access_token": resultado.get("access_token")}), 200
