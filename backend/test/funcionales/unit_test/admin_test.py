from pytest_mock import mocker

from services.auth_service import AuthService 
from test.funcionales.unit_test.factory.admin_builder import AdminBuilder

def test_should_return_token(mocker):
    mock_get_user = mocker.patch('services.auth_service.AdminRepository.get_by_username')
    mock_get_user.return_value = {
        'id_admin': 1, 
        'nombre_usuario': 'admin', 
        'password': '123456'
    }

    mock_create_token = mocker.patch('services.auth_service.create_access_token')
    mock_create_token.return_value = "token-jwt-simulado"
    
    admin = AdminBuilder().with_nombre_usuario("admin").with_password("123456").build()
    result = AuthService().autenticar(admin.nombre_usuario, admin.password) 

    assert result == "token-jwt-simulado"
    mock_get_user.assert_called_once_with("admin")


def test_should_return_error_when_invalid_name(mocker):
    
    mock_get_user = mocker.patch('services.auth_service.AdminRepository.get_by_username')
    mock_get_user.return_value = None  # Es none, ya que no se obtiene el nombre
        
    admin = AdminBuilder().with_nombre_usuario("don juan").with_password("123456").build()
    result = AuthService().autenticar(admin.nombre_usuario, admin.password)    
    assert result == None # Deberia retornar none si el nombre de usuario es incorrecto

def test_should_return_error_when_invalid_password(mocker):
    
    mock_get_user = mocker.patch('services.auth_service.AdminRepository.get_by_username')
    mock_get_user.return_value = None  # Es none, ya que no se obtiene el nombre
        
    admin = AdminBuilder().with_nombre_usuario("admin").with_password("654321").build()
    result = AuthService().autenticar(admin.nombre_usuario, admin.password)    
    assert result == None # Deberia retornar none si el nombre de usuario es incorrecto