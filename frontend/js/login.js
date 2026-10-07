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
            mostrarModalAdvertencia('Por favor ingrese usuario y contraseña');
            return;
        }

        const result = await api.login(usuario, password);
        const feedbackEl = document.getElementById('login-feedback');

        if (result.status === 'success') {
            // Guardamos el token y redirigimos
            localStorage.setItem('token', result.access_token);
            window.location.href = 'panelAdmin.html';
        } else {
            // Mostramos feedback inline
            if (feedbackEl) {
                feedbackEl.style.display = 'block';
                
                if (result.error && result.error.includes('bloqueado')) {
                    feedbackEl.className = 'feedback-message locked';
                    feedbackEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${result.error}`;
                } else {
                    feedbackEl.className = 'feedback-message';
                    let textHtml = `<i class="bi bi-x-circle-fill"></i> ${result.error || 'Usuario o contraseña incorrectos'}`;
                    
                    if (result.attempts_left !== undefined && result.attempts_left !== null) {
                        textHtml = `<i class="bi bi-x-circle-fill"></i> Usuario o contraseña incorrectos.<br><strong class="mt-1 d-block">Te quedan ${result.attempts_left} intentos antes de bloquearse.</strong>`;
                    }
                    feedbackEl.innerHTML = textHtml;
                }
            } else {
                mostrarModalError(result.error || 'Error al iniciar sesión');
            }
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
