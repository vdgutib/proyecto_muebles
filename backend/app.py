import logging
import os
from datetime import timedelta

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config

from routers.auth_router import auth_bp
from routers.upload_router import upload_bp
from routers.muebles_router import muebles_bp
from routers.muebles_propios_router import muebles_propios_bp
from routers.despiece_router import despiece_bp
from routers.solicitudes_router import solicitudes_bp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')
CORS(app)

app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=Config.JWT_ACCESS_TOKEN_EXPIRES_MIN)
jwt = JWTManager(app)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(upload_bp)
app.register_blueprint(muebles_bp)
app.register_blueprint(muebles_propios_bp)
app.register_blueprint(despiece_bp)
app.register_blueprint(solicitudes_bp)


@app.route('/')
def home():
    return "El backend está funcionando correctamente"


@app.route('/static/imagenes/<path:filename>')
def servir_imagen(filename):
    """Sirve archivos de imagen desde la carpeta static/imagenes"""
    return send_from_directory(Config.IMAGENES_DIR, filename)

@jwt.unauthorized_loader
def manejar_token_faltante(motivo):
    return jsonify({"status": "error", "error": "Token de autenticación requerido"}), 401


@jwt.invalid_token_loader
def manejar_token_invalido(motivo):
    return jsonify({"status": "error", "error": "Token de autenticación inválido"}), 401


@jwt.expired_token_loader
def manejar_token_expirado(jwt_header, jwt_payload):
    return jsonify({"status": "error", "error": "El token ha expirado, inicia sesión nuevamente"}), 401


if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'False') == 'True'
    app.run(debug=debug_mode, port=5000)