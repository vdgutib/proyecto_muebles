import logging
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from repositories.muebles_repository import MueblesRepository
from services.imagen_service import ImagenService

logger = logging.getLogger(__name__)
muebles_bp = Blueprint('muebles_bp', __name__)

@muebles_bp.route('/api/muebles', methods=['GET'])
def obtener_muebles():
    try:
        muebles = MueblesRepository.get_all_muebles()
        return jsonify(muebles), 200
    except Exception:
        logger.exception("Error obteniendo el listado de muebles")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500


@muebles_bp.route('/api/muebles/<sku>', methods=['GET'])
def obtener_mueble(sku):
    try:
        mueble = MueblesRepository.get_mueble_by_sku(sku)
    except Exception:
        logger.exception("Error obteniendo el mueble %s", sku)
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

    if not mueble:
        return jsonify({"status": "error", "error": "Mueble no encontrado"}), 404

    return jsonify(mueble), 200


@muebles_bp.route('/api/muebles/<sku>', methods=['DELETE'])
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
                logger.exception(
                    "Mueble %s eliminado en BD, pero no se pudo borrar el archivo de imagen '%s'",
                    sku, imagen
                )

        return jsonify({"status": "success", "mensaje": f"Mueble {sku} eliminado correctamente."}), 200

    except Exception:
        logger.exception("Error eliminando el mueble %s", sku)
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500


@muebles_bp.route('/api/muebles/limpiar', methods=['POST'])
@jwt_required()
def limpiar_muebles():
    """Elimina todos los registros de muebles de la base de datos"""
    try:
        cantidad_eliminada = MueblesRepository.limpiar_todos_muebles()
        return jsonify({
            "status": "success",
            "mensaje": f"Se eliminaron {cantidad_eliminada} registros de la base de datos."
        }), 200
    except Exception:
        logger.exception("Error limpiando la base de datos de muebles")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500


@muebles_bp.route('/api/muebles/destacados', methods=['GET'])
def obtener_muebles_destacados():
    """Devuelve los 3 muebles más caros para mostrar en el home"""
    try:
        muebles = MueblesRepository.get_muebles_destacados()
        return jsonify(muebles), 200
    except Exception:
        logger.exception("Error obteniendo muebles destacados")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500
