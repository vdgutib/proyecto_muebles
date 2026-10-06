import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from repositories.muebles_propios_repository import MueblesPropiosRepository
from services.imagen_service import ImagenService

logger = logging.getLogger(__name__)
muebles_propios_bp = Blueprint('muebles_propios_bp', __name__)

# ==========================
# CATEGORIAS PROPIAS
# ==========================

@muebles_propios_bp.route('/api/categorias-propias', methods=['GET'])
def get_categorias():
    try:
        activas_solo = request.args.get('activas', 'true').lower() == 'true'
        categorias = MueblesPropiosRepository.get_categorias(activas_solo=activas_solo)
        return jsonify(categorias), 200
    except Exception as e:
        logger.exception("Error obteniendo categorias propias")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

@muebles_propios_bp.route('/api/categorias-propias', methods=['POST'])
@jwt_required()
def create_categoria():
    try:
        data = request.json
        if not data or 'nombre' not in data:
            return jsonify({"status": "error", "error": "Nombre es requerido"}), 400
            
        cat_id = MueblesPropiosRepository.create_categoria(data['nombre'], data.get('orden', 0))
        return jsonify({"status": "success", "id": cat_id, "mensaje": "Categoria creada"}), 201
    except Exception as e:
        logger.exception("Error creando categoria")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

@muebles_propios_bp.route('/api/categorias-propias/<int:cat_id>', methods=['PUT'])
@jwt_required()
def update_categoria(cat_id):
    try:
        data = request.json
        success = MueblesPropiosRepository.update_categoria(cat_id, data)
        if success:
            return jsonify({"status": "success", "mensaje": "Categoria actualizada"}), 200
        return jsonify({"status": "error", "error": "Categoria no encontrada"}), 404
    except Exception as e:
        logger.exception("Error actualizando categoria")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

@muebles_propios_bp.route('/api/categorias-propias/<int:cat_id>', methods=['DELETE'])
@jwt_required()
def delete_categoria(cat_id):
    try:
        success = MueblesPropiosRepository.delete_categoria(cat_id)
        if success:
            return jsonify({"status": "success", "mensaje": "Categoria eliminada"}), 200
        return jsonify({"status": "error", "error": "Categoria no encontrada"}), 404
    except Exception as e:
        logger.exception("Error eliminando categoria")
        return jsonify({"status": "error", "error": "Error interno o categoria en uso"}), 500

# ==========================
# MUEBLES PROPIOS
# ==========================

@muebles_propios_bp.route('/api/muebles-propios', methods=['GET'])
def get_muebles_propios():
    try:
        activos_solo = request.args.get('activos', 'true').lower() == 'true'
        muebles = MueblesPropiosRepository.get_all(activos_solo=activos_solo)
        return jsonify(muebles), 200
    except Exception as e:
        logger.exception("Error obteniendo muebles propios")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

@muebles_propios_bp.route('/api/muebles-propios/<int:mueble_id>', methods=['GET'])
def get_mueble_propio(mueble_id):
    try:
        mueble = MueblesPropiosRepository.get_by_id(mueble_id)
        if mueble:
            return jsonify(mueble), 200
        return jsonify({"status": "error", "error": "Mueble no encontrado"}), 404
    except Exception as e:
        logger.exception("Error obteniendo mueble propio")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

@muebles_propios_bp.route('/api/muebles-propios', methods=['POST'])
@jwt_required()
def create_mueble_propio():
    try:
        data = request.json
        required = ['nombre', 'precio', 'categoria_id']
        for req in required:
            if req not in data:
                return jsonify({"status": "error", "error": f"Campo {req} es requerido"}), 400
                
        imagenes = data.get('imagenes', [])
        mueble_id = MueblesPropiosRepository.create(data, imagenes)
        return jsonify({"status": "success", "id": mueble_id, "mensaje": "Mueble creado correctamente"}), 201
    except Exception as e:
        logger.exception("Error creando mueble propio")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

@muebles_propios_bp.route('/api/muebles-propios/<int:mueble_id>', methods=['PUT'])
@jwt_required()
def update_mueble_propio(mueble_id):
    try:
        data = request.json
        imagenes = data.get('imagenes')
        # Limpiar imagenes de data para que no choque con el update del repositorio
        if 'imagenes' in data:
            del data['imagenes']
            
        success = MueblesPropiosRepository.update(mueble_id, data, imagenes)
        if success:
            return jsonify({"status": "success", "mensaje": "Mueble actualizado correctamente"}), 200
        return jsonify({"status": "error", "error": "Mueble no encontrado"}), 404
    except Exception as e:
        logger.exception("Error actualizando mueble propio")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500

@muebles_propios_bp.route('/api/muebles-propios/<int:mueble_id>', methods=['DELETE'])
@jwt_required()
def delete_mueble_propio(mueble_id):
    try:
        fisico = request.args.get('fisico', 'false').lower() == 'true'
        # Si es fisico, deberiamos borrar las imagenes del disco.
        if fisico:
            mueble = MueblesPropiosRepository.get_by_id(mueble_id)
            if mueble and mueble.get('imagenes'):
                for img in mueble['imagenes']:
                    try:
                        ImagenService.eliminar_imagen(img)
                    except Exception:
                        pass
        
        success = MueblesPropiosRepository.delete(mueble_id, fisico=fisico)
        if success:
            return jsonify({"status": "success", "mensaje": "Mueble eliminado"}), 200
        return jsonify({"status": "error", "error": "Mueble no encontrado"}), 404
    except Exception as e:
        logger.exception("Error eliminando mueble propio")
        return jsonify({"status": "error", "error": "Error interno del servidor"}), 500
