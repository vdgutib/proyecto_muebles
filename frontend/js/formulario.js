document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const producto = params.get('producto');
    const spanProducto = document.getElementById('nombre-producto');

    if (producto) {
        spanProducto.textContent = producto;
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

            const prod      = (spanProducto.textContent || '').trim();
            const nombre    = document.getElementById('nombre').value.trim();
            const direccion = document.getElementById('direccion').value.trim();
            const contacto  = document.getElementById('contacto').value.trim();
            const pago      = document.getElementById('pago').value;
            const mensaje   = document.getElementById('mensaje').value.trim();

            if (!nombre || !direccion || !contacto) {
                mostrarAlerta('Faltan campos obligatorios: Nombre, Dirección y Contacto.');
                return;
            }

            // prod empieza con '[' cuando no vino ningún producto en la URL
            const productoEnviar = prod.startsWith('[') ? '' : prod;

            try {
                const result = await api.crearSolicitud({
                    producto: productoEnviar,
                    nombre,
                    direccion,
                    contacto,
                    pago,
                    mensaje
                });

                if (result.status !== 'success') {
                    throw new Error(result.error || 'Fallo al guardar en el servidor');
                }

                mostrarAlerta('¡Solicitud recibida con éxito! A continuación te redirigiremos a WhatsApp.', 'success');

                const textoMsj =
                    `Hola, me interesa solicitar el producto "${productoEnviar || 'No especificado'}".\n\n` +
                    `Mis datos:\n` +
                    `- Nombre: ${nombre}\n` +
                    `- Dirección: ${direccion}\n` +
                    `- Contacto: ${contacto}\n` +
                    `- Forma de pago: ${pago || 'No especificada'}\n\n` +
                    `Mensaje adicional:\n${mensaje || 'Sin mensaje adicional'}`;

                const numeroDestino = '56984248526';
                const url = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(textoMsj)}`;

                setTimeout(() => window.open(url, '_blank'), 1500);

            } catch (error) {
                mostrarAlerta('Hubo un problema de conexión y la solicitud no pudo ser guardada. Por favor intenta de nuevo o contáctanos directamente.');
                console.error('Error solicitud:', error);
            }
        });
    }
});