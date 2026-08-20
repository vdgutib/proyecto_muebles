from services.auth_service import AuthService   

class Admin:
    def __init__(self, nombre_usuario, password):
        self.id = 1
        self.nombre_usuario = nombre_usuario
        self.password = password

class AdminBuilder:
    def with_nombre_usuario(self, nombre_usuario):
        self.nombre_usuario = nombre_usuario
        return self

    def with_password(self, password):
        self.password = password
        return self

    def build(self):
        return Admin(nombre_usuario=self.nombre_usuario, password=self.password)


    # def autenticar_admin(self, nombre, password):
    #     return autenticar(nombre, password)

    # def registrar_fallo(self, nombre):
    #     _registrar_fallo(nombre)