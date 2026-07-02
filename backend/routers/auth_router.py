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
        access_token = AuthService.autenticar(nombre_usuario, password)
    except Exception:
        logger.exception("Error inesperado durante el login")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

    if not access_token:
        return jsonify({"status": "error", "error": "Usuario o contraseña incorrectos"}), 401

    return jsonify({"status": "success", "access_token": access_token}), 200
