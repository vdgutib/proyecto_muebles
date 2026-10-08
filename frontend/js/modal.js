// Sistema de Modales Globales - Reemplazo de alert() y confirm()

function mostrarModal(titulo, mensaje, tipo = 'info', onConfirm = null, textoConfirmar = 'Confirmar') {
    // Crear modal si no existe
    let modalElement = document.getElementById('global-modal');
    if (!modalElement) {
        const modalHtml = `
            <div class="modal fade" id="global-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="global-modal-title"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                        </div>
                        <div class="modal-body" id="global-modal-body"></div>
                        <div class="modal-footer" id="global-modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalElement = document.getElementById('global-modal');
    }

    const titleElement = document.getElementById('global-modal-title');
    const bodyElement = document.getElementById('global-modal-body');
    const footerElement = document.getElementById('global-modal-footer');

    // Configurar según tipo
    let btnClass = 'btn-primary';
    let icon = '';
    
    switch(tipo) {
        case 'success':
            btnClass = 'btn-success';
            icon = '<i class="bi bi-check-circle-fill text-success me-2"></i>';
            break;
        case 'error':
        case 'danger':
            btnClass = 'btn-danger';
            icon = '<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>';
            break;
        case 'warning':
            btnClass = 'btn-warning';
            icon = '<i class="bi bi-exclamation-circle-fill text-warning me-2"></i>';
            break;
        case 'confirm-danger':
            btnClass = 'btn-danger';
            icon = '<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>';
            break;
        case 'confirm':
            btnClass = 'btn-primary';
            icon = '<i class="bi bi-question-circle-fill text-primary me-2"></i>';
            break;
        default:
            icon = '<i class="bi bi-info-circle-fill text-info me-2"></i>';
    }

    titleElement.innerHTML = icon + titulo;
    bodyElement.innerHTML = mensaje;

    // Configurar footer según tipo
    if ((tipo === 'confirm' || tipo === 'confirm-danger') && onConfirm) {
        footerElement.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn ${btnClass}" id="global-modal-confirm">${textoConfirmar}</button>
        `;
        document.getElementById('global-modal-confirm').addEventListener('click', () => {
            if (onConfirm) onConfirm();
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        });
    } else {
        footerElement.innerHTML = `
            <button type="button" class="btn ${btnClass}" data-bs-dismiss="modal">Aceptar</button>
        `;
    }

    // Mostrar modal
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
}

// Funciones de conveniencia
function mostrarModalConfirmacionPeligro(titulo, mensaje, onConfirm, textoConfirmar = 'Eliminar') {
    mostrarModal(titulo, mensaje, 'confirm-danger', onConfirm, textoConfirmar);
}

function mostrarModalExito(mensaje) {
    mostrarModal('Éxito', mensaje, 'success');
}

function mostrarModalError(mensaje) {
    mostrarModal('Error', mensaje, 'error');
}

function mostrarModalAdvertencia(mensaje) {
    mostrarModal('Advertencia', mensaje, 'warning');
}

function mostrarModalInfo(mensaje) {
    mostrarModal('Información', mensaje, 'info');
}

function mostrarModalConfirmacion(titulo, mensaje, onConfirm) {
    mostrarModal(titulo, mensaje, 'confirm', onConfirm);
}