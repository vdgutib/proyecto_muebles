document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    localStorage.removeItem('token');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!usuario || !password) {
            alert('Por favor ingrese usuario y contraseña');
            return;
        }

        const result = await api.login(usuario, password);

        if (result.status === 'success') {
            // Guardamos el token y redirigimos
            localStorage.setItem('token', result.access_token);
            window.location.href = 'panelAdmin.html';
        } else {
            // Mostramos un error
            alert(result.error || 'Error al iniciar sesión');
        }
    });

    const passIcon = document.querySelector('.pass-icon');
    if (passIcon) {
        passIcon.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passIcon.classList.remove('bi-eye-fill');
                passIcon.classList.add('bi-eye-slash-fill');
            } else {
                passwordInput.type = 'password';
                passIcon.classList.remove('bi-eye-slash-fill');
                passIcon.classList.add('bi-eye-fill');
            }
        });
    }
});
