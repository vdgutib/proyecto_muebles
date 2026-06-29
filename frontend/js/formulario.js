document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const producto = params.get('producto');

    if (producto) {
        document.getElementById('nombre-producto').textContent = producto;
    }

    function mostrarAlerta(mensaje, tipo = 'danger') {
        const container = document.getElementById('alert-container');
        if (!container) return;
        container.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
    }

    const btnEnviar = document.getElementById('btn-enviar-ws');
    if (btnEnviar) {
        btnEnviar.addEventListener('click', async () => {
            const prod = document.getElementById('nombre-producto').textContent;
            const nombre = document.getElementById('nombre').value.trim();
            const direccion = document.getElementById('direccion').value.trim();
            const contacto = document.getElementById('contacto').value.trim();
            const pago = document.getElementById('pago').value;
            const mensaje = document.getElementById('mensaje').value.trim();

            if (!nombre || !direccion || !contacto) {
                mostrarAlerta('Faltan campos obligatorios: Nombre, Dirección y Contacto.');
                return;
            }

            try {
                const response = await fetch('http://localhost:5000/api/solicitudes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        producto: prod !== '[Nombre del Producto]' ? prod : '',
                        nombre,
                        direccion,
                        contacto,
                        pago,
                        mensaje
                    })
                });

                if (!response.ok) {
                    throw new Error('Fallo al guardar en el servidor');
                }

                mostrarAlerta('¡Solicitud recibida con éxito en el sistema! A continuación te redirigiremos a WhatsApp.', 'success');

                const textoMsj = `Hola, me interesa solicitar el producto "${prod}".\n\nMis datos:\n- Nombre: ${nombre || 'No especificado'}\n- Dirección: ${direccion || 'No especificada'}\n- Contacto: ${contacto || 'No especificado'}\n- Forma de pago: ${pago || 'No especificada'}\n\nMensaje adicional:\n${mensaje || 'Sin mensaje adicional'}`;

                const numeroDestino = '56984248526';
                const url = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(textoMsj)}`;

                setTimeout(() => {
                    window.open(url, '_blank');
                }, 1500);
            } catch (error) {
                mostrarAlerta('Hubo un problema de conexión y la solicitud no pudo ser guardada. Por favor intenta de nuevo o contáctanos directamente.');
            }
        });
    }
});
