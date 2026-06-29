document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const producto = params.get('producto');
    
    if (producto) {
        document.getElementById('nombre-producto').textContent = producto;
    }

    const btnEnviar = document.getElementById('btn-enviar-ws');
    if (btnEnviar) {
        btnEnviar.addEventListener('click', () => {
            const prod = document.getElementById('nombre-producto').textContent;
            const nombre = document.getElementById('nombre').value.trim();
            const direccion = document.getElementById('direccion').value.trim();
            const contacto = document.getElementById('contacto').value.trim();
            const pago = document.getElementById('pago').value;
            const mensaje = document.getElementById('mensaje').value.trim();
            
            if (!nombre || !contacto) {
                alert('Por favor, ingresa al menos tu nombre y un número de contacto.');
                return;
            }

            const textoMsj = `Hola, me interesa solicitar el producto "${prod}".\n\nMis datos:\n- Nombre: ${nombre}\n- Dirección: ${direccion || 'No especificada'}\n- Contacto: ${contacto}\n- Forma de pago: ${pago || 'No especificada'}\n\nMensaje adicional:\n${mensaje || 'Sin mensaje adicional'}`;
            
            const numeroDestino = '56984248526';
            const url = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(textoMsj)}`;
            
            window.open(url, '_blank');
        });
    }
});
