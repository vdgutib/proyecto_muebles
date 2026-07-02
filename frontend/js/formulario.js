document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const producto = params.get('producto');
    const productoId = params.get('producto_id');
    const spanProducto = document.getElementById('nombre-producto');
    const inputProductoId = document.getElementById('producto_id_hidden');

    if (producto) {
        spanProducto.textContent = producto;
    }
    if (productoId && inputProductoId) {
        inputProductoId.value = productoId;
    }

    // Formateo automático de teléfono chileno
    const contactoInput = document.getElementById('contacto');
    if (contactoInput) {
        contactoInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            // Si el usuario no escribió el prefijo, asumimos +56 9
            if (value.length > 0 && !value.startsWith('569')) {
                // Si empieza con 9, agregar 56
                if (value.startsWith('9')) {
                    value = '56' + value;
                }
                // Si no empieza con 56 ni 9, agregar 569
                else if (!value.startsWith('56')) {
                    value = '569' + value;
                }
            }
            
            // Formatear: +56 9 XXXX XXXX
            if (value.length >= 2) {
                let formatted = '+56 ';
                if (value.length > 2) {
                    formatted += value.substring(2, 3) + ' ';
                    if (value.length > 3) {
                        formatted += value.substring(3, 7);
                        if (value.length > 7) {
                            formatted += ' ' + value.substring(7, 11);
                        }
                    }
                }
                e.target.value = formatted;
            } else {
                e.target.value = value;
            }
        });
    }

    function mostrarAlerta(mensaje, tipo = 'danger') {
        if (tipo === 'danger' || tipo === 'error') {
            mostrarModalError(mensaje);
        } else if (tipo === 'success') {
            mostrarModalExito(mensaje);
        } else {
            mostrarModalInfo(mensaje);
        }
    }

    const btnEnviar = document.getElementById('btn-enviar-ws');
    if (btnEnviar) {
        btnEnviar.addEventListener('click', async () => {

            const productoId = inputProductoId ? inputProductoId.value : '';
            const productoNombre = spanProducto.textContent || '';
            const nombre    = document.getElementById('nombre').value.trim();
            const direccion = document.getElementById('direccion').value.trim();
            const contacto  = document.getElementById('contacto').value.trim();
            const pago      = document.getElementById('pago').value;
            const mensaje   = document.getElementById('mensaje').value.trim();

            if (!nombre || !direccion || !contacto) {
                mostrarAlerta('Faltan campos obligatorios: Nombre, Dirección y Contacto.');
                return;
            }

            // productoNombre empieza con '[' cuando no vino ningún producto en la URL
            const productoEnviar = productoNombre.startsWith('[') ? '' : productoNombre;

            try {
                const result = await api.crearSolicitud({
                    producto_id: productoId,
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