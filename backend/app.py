import logging
import os
from datetime import timedelta

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, jwt_required, get_jwt_identity
)

from config import Config
from services.excel_service import ExcelService
from services.imagen_service import ImagenService
from services.auth_service import AuthService
from services.despiece_service import DespieceService, DespieceError
from repositories.muebles_repository import MueblesRepository
from repositories.calculo_repository import CalculoRepository
from repositories.solicitudes_repository import SolicitudesRepository


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# NOTA seguridad: CORS(app) sin restricción acepta cualquier origen.
# Para producción se recomienda CORS(app, origins=["https://tu-dominio.com"]).
CORS(app)


app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=Config.JWT_ACCESS_TOKEN_EXPIRES_MIN)
jwt = JWTManager(app)


@app.route('/')
def home():
    return "El backend está funcionando correctamente"

@app.route('/api/login', methods=['POST'])
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


@app.route('/api/subir-imagenes', methods=['POST'])
@jwt_required()
def subir_imagenes():
    if 'imagenes' not in request.files:
        return jsonify({"status": "error", "error": "No se encontraron imágenes en la petición"}), 400

    archivos = request.files.getlist('imagenes')
    if not archivos or all(a.filename == '' for a in archivos):
        return jsonify({"status": "error", "error": "No se seleccionó ninguna imagen"}), 400

    try:
        guardadas, rechazadas = ImagenService.guardar_imagenes(archivos)
    except Exception:
        logger.exception("Error guardando imágenes en disco")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

    if not guardadas and rechazadas:
        return jsonify({
            "status": "error",
            "error": "Ninguna imagen pudo guardarse",
            "rechazadas": rechazadas
        }), 400

    return jsonify({
        "status": "success",
        "mensaje": f"{len(guardadas)} imágenes subidas correctamente.",
        "guardadas": guardadas,
        "rechazadas": rechazadas
    }), 200


@app.route('/api/subir-excel', methods=['POST'])
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

@app.route('/api/muebles', methods=['GET'])
def obtener_muebles():
    try:
        muebles = MueblesRepository.get_all_muebles()
        return jsonify(muebles), 200
    except Exception:
        logger.exception("Error obteniendo el listado de muebles")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500


@app.route('/api/muebles/<sku>', methods=['GET'])
def obtener_mueble(sku):
    try:
        mueble = MueblesRepository.get_mueble_by_sku(sku)
    except Exception:
        logger.exception("Error obteniendo el mueble %s", sku)
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

    if not mueble:
        return jsonify({"status": "error", "error": "Mueble no encontrado"}), 404

    return jsonify(mueble), 200


@app.route('/api/muebles/<sku>', methods=['DELETE'])
@jwt_required()
def eliminar_mueble(sku):
    try:
        imagen = MueblesRepository.get_imagen_by_sku(sku)
        if imagen is None:
            return jsonify({"status": "error", "error": "Mueble no encontrado"}), 404

        eliminado = MueblesRepository.delete_mueble(sku)
        if not eliminado:
            return jsonify({"status": "error", "error": "Mueble no encontrado"}), 404

        if imagen:
            try:
                ImagenService.eliminar_imagen(imagen)
            except Exception:
                # No revertimos el borrado en BD por esto; queda registrado
                # para limpieza manual del archivo huérfano.
                logger.exception(
                    "Mueble %s eliminado en BD, pero no se pudo borrar el archivo de imagen '%s'",
                    sku, imagen
                )

        return jsonify({"status": "success", "mensaje": f"Mueble {sku} eliminado correctamente."}), 200

    except Exception:
        logger.exception("Error eliminando el mueble %s", sku)
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500


@app.route('/api/despiece', methods=['POST'])
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

@app.route('/api/solicitudes', methods=['POST'])
def crear_solicitud():
    datos = request.get_json(silent=True) or {}
    producto = datos.get('producto', '')
    nombre = datos.get('nombre', '')
    direccion = datos.get('direccion', '')
    contacto = datos.get('contacto', '')
    pago = datos.get('pago', '')
    mensaje = datos.get('mensaje', '')
    
    if not nombre or not direccion or not contacto:
        return jsonify({"status": "error", "error": "Faltan campos obligatorios: nombre, dirección y contacto."}), 400
        
    try:
        id_solicitud = SolicitudesRepository.guardar_solicitud(producto, nombre, direccion, contacto, pago, mensaje)
        return jsonify({"status": "success", "mensaje": "Solicitud recibida con éxito", "id": id_solicitud}), 201
    except Exception:
        logger.exception("Error guardando solicitud")
        return jsonify({"status": "error", "error": "Error interno del servidor persistiendo la solicitud"}), 500

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