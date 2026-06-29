document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    // La lógica de subida de archivos ahora se maneja en subidaArchivos.js
});
