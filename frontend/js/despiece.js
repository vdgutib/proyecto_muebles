document.addEventListener('DOMContentLoaded', () => {
    const formDespiece = document.getElementById('form-despiece');
    if (!formDespiece) return;

    function mostrarAlerta(mensaje, tipo = 'danger') {
        const container = document.getElementById('alert-container-despiece');
        if (!container) return;
        container.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
    }

    formDespiece.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = document.getElementById('btn-calcular');
        const defaultText = btnSubmit ? btnSubmit.innerHTML : 'Calcular';
        if (btnSubmit) {
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Calculando...';
            btnSubmit.disabled = true;
        }

        // Limpiar errores previos
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
        const resultsContainer = document.getElementById('despiece-resultados');
        if (resultsContainer) resultsContainer.style.display = 'none';
        
        const alertContainer = document.getElementById('alert-container-despiece');
        if (alertContainer) alertContainer.innerHTML = '';

        const data = {
            ancho: document.getElementById('input-ancho').value,
            alto: document.getElementById('input-alto').value,
            profundidad: document.getElementById('input-profundidad').value,
            grosor: document.getElementById('input-grosor').value
        };

        // CU-005 Alt A: Validar vacíos o inválidos (sin limpiar campos correctos)
        let hasError = false;
        Object.keys(data).forEach(key => {
            const val = parseFloat(data[key]);
            if (isNaN(val) || val <= 0) {
                mostrarErrorCampo('input-' + key, 'Debe ser un número mayor a 0');
                hasError = true;
            }
        });

        // CU-005 Alt B: Grosor mayor que dimensión
        const grosorVal = parseFloat(data.grosor);
        if (!hasError && (grosorVal >= parseFloat(data.ancho) || grosorVal >= parseFloat(data.alto))) {
            mostrarErrorCampo('input-grosor', 'Conflicto: El grosor no puede ser mayor o igual que el alto o ancho');
            hasError = true;
        }

        if (hasError) {
            if (btnSubmit) {
                btnSubmit.innerHTML = defaultText;
                btnSubmit.disabled = false;
            }
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/despiece', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                mostrarAlerta('Error al calcular: ' + (result.error || 'Problema en el servidor'));
            } else {
                mostrarResultados(result.piezas);
            }
        } catch (error) {
            mostrarAlerta('No se pudo conectar con el servidor para calcular las medidas.');
        } finally {
            if (btnSubmit) {
                btnSubmit.innerHTML = defaultText;
                btnSubmit.disabled = false;
            }
        }
    });

    function mostrarErrorCampo(id, mensaje) {
        const input = document.getElementById(id);
        if (!input) return;
        input.classList.add('is-invalid');
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback text-danger mt-1';
        feedback.style.fontSize = '0.85rem';
        feedback.textContent = mensaje;
        input.parentNode.insertBefore(feedback, input.nextSibling);
    }

    function mostrarResultados(piezas) {
        const resultsContainer = document.getElementById('despiece-resultados');
        if (!resultsContainer) return;
        
        let html = '<h5 class="mt-4 mb-3">Medidas de Corte Generadas</h5><ul class="list-group">';
        piezas.forEach(p => {
            html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                        ${p.nombre_pieza} (x${p.cantidad})
                        <span class="badge bg-primary rounded-pill">${p.largo_mm} x ${p.ancho_mm} mm</span>
                     </li>`;
        });
        html += '</ul>';
        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
    }
});
