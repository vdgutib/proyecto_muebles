import logging
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token

from repositories.admin_repository import AdminRepository

logger = logging.getLogger(__name__)


class AuthService:
    @staticmethod
    def autenticar(nombre_usuario, password):
        if not nombre_usuario or not password:
            return None

        admin = AdminRepository.get_by_username(nombre_usuario.strip())
        if not admin:
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
                    nombre_usuario
                )

        if not es_valido:
            return None

        access_token = create_access_token(
            identity=str(admin['id_admin']),
            additional_claims={"usuario": admin['nombre_usuario']}
        )
        return access_token