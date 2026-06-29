import logging
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token

from repositories.admin_repository import AdminRepository

logger = logging.getLogger(__name__)

# Diccionarios en memoria para rastrear intentos fallidos y bloqueos
# En producción multi-instancia se usaría Redis o la BD.
_intentos_fallidos = {}  # usuario -> cantidad
_bloqueos = {}           # usuario -> tiempo_fin_bloqueo

class AuthService:
    @staticmethod
    def autenticar(nombre_usuario, password):
        if not nombre_usuario or not password:
            return None

        username = nombre_usuario.strip()

        # Verificar si está bloqueado
        if username in _bloqueos:
            if datetime.now() < _bloqueos[username]:
                logger.warning("Intento de acceso a usuario bloqueado: %s", username)
                return None  # Bloqueado
            else:
                del _bloqueos[username]
                if username in _intentos_fallidos:
                    del _intentos_fallidos[username]

        admin = AdminRepository.get_by_username(username)
        if not admin:
            # Aunque no exista, simulamos un fallo para evitar enumeración (CU-003)
            AuthService._registrar_fallo(username)
            return None

        password_almacenada = admin['password']

        if password_almacenada.startswith(('pbkdf2:', 'scrypt:')):
            es_valido = check_password_hash(password_almacenada, password)
        else:
            es_valido = (password_almacenada == password)
            if es_valido:
                logger.warning(
                    "El usuario '%s' tiene una contraseña sin hash en la BD. "
                    "Se recomienda migrarla con generate_password_hash().",
                    username
                )

        if not es_valido:
            AuthService._registrar_fallo(username)
            return None

        # Exito: resetear fallos
        if username in _intentos_fallidos:
            del _intentos_fallidos[username]

        access_token = create_access_token(
            identity=str(admin['id_admin']),
            additional_claims={"usuario": admin['nombre_usuario']}
        )
        return access_token

    @staticmethod
    def _registrar_fallo(username):
        _intentos_fallidos[username] = _intentos_fallidos.get(username, 0) + 1
        if _intentos_fallidos[username] >= 3:
            # Bloquear por 15 minutos
            _bloqueos[username] = datetime.now() + timedelta(minutes=15)
            logger.warning("Usuario '%s' bloqueado temporalmente por múltiples intentos fallidos", username)