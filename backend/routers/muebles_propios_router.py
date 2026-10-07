import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, verify_jwt_in_request
import re
from repositories.muebles_propios_repository import MueblesPropiosRepository
from services.imagen_service import ImagenService

logger = logging.getLogger(__name__)
muebles_propios_bp = Blueprint('muebles_propios_bp', __name__)

# CATEGORIAS PROPIAS
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
        # Check if used
        muebles = MueblesPropiosRepository.get_all(activos_solo=False)
        en_uso = any(m.get('categoria_id') == cat_id for m in muebles)
        if en_uso:
            return jsonify({"status": "error", "error": "No se puede eliminar la categoría porque hay muebles asociados"}), 409
            
        success = MueblesPropiosRepository.delete_categoria(cat_id)
        if success:
            return jsonify({"status": "success", "mensaje": "Categoria eliminada"}), 200
        return jsonify({"status": "error", "error": "Categoria no encontrada"}), 404
    except Exception as e:
        logger.exception("Error eliminando categoria")
        return jsonify({"status": "error", "error": "Error interno o categoria en uso"}), 500

def extract_youtube_id(url):
    if not url: return ''
    url = url.strip()
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url):
        return url
    pattern = r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
    match = re.search(pattern, url)
    return match.group(1) if match else None

# MUEBLES PROPIOS
@muebles_propios_bp.route('/api/muebles-propios', methods=['GET'])
def get_muebles_propios():
    try:
        activos_solo = request.args.get('activos', 'true').lower() == 'true'
        if not activos_solo:
            verify_jwt_in_request()
            
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
                
        # Normalizar
        data['nombre'] = str(data['nombre']).strip()
        try:
            precio_val = int(data['precio'])
            if precio_val < 0: raise ValueError()
            data['precio'] = precio_val
        except:
            return jsonify({"status": "error", "error": "Precio debe ser un entero positivo"}), 400
            
        vid = data.get('video_url', '').strip()
        if vid:
            yt_id = extract_youtube_id(vid)
            if not yt_id:
                return jsonify({"status": "error", "error": "URL de video de YouTube inválida"}), 400
            data['video_url'] = yt_id
            
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
        
        if 'nombre' in data:
            data['nombre'] = str(data['nombre']).strip()
        if 'precio' in data:
            try:
                precio_val = int(data['precio'])
                if precio_val < 0: raise ValueError()
                data['precio'] = precio_val
            except:
                return jsonify({"status": "error", "error": "Precio debe ser un entero positivo"}), 400
        if 'video_url' in data:
            vid = data['video_url'].strip()
            if vid:
                yt_id = extract_youtube_id(vid)
                if not yt_id:
                    return jsonify({"status": "error", "error": "URL de video de YouTube inválida"}), 400
                data['video_url'] = yt_id
            else:
                data['video_url'] = ''
        
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
