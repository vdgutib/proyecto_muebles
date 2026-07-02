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

    function mostrarErrorCampo(id, mensaje) {
        const input = document.getElementById(id);
        if (!input) return;
        input.classList.add('is-invalid');
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback text-danger mt-1';
        feedback.style.fontSize = '0.85rem';
        feedback.textContent = mensaje;

        if (input.parentElement.classList.contains('input-group')) {
            feedback.style.display = 'block';
            feedback.style.width = '100%';
            feedback.style.textAlign = 'right';
            const row = input.parentElement.parentElement;
            row.style.flexWrap = 'wrap';
            row.appendChild(feedback);
        } else {
            input.parentNode.insertBefore(feedback, input.nextSibling);
        }
    }

    function mostrarResultados(piezas) {
        const resultsContainer = document.getElementById('despiece-resultados');
        if (!resultsContainer) return;
        let html = '<h5 class="mt-4 mb-3">Medidas de Corte Generadas</h5><ul class="list-group">';
        piezas.forEach(p => {
            html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                        ${p.nombre_pieza} (x${p.cantidad})
                        <span class="badge bg-primary rounded-pill">${p.largo_mm} × ${p.ancho_mm} mm</span>
                     </li>`;
        });
        html += '</ul>';
        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
    }

    formDespiece.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = document.getElementById('btn-calcular');
        const defaultText = btnSubmit ? btnSubmit.innerHTML : 'Calcular';
        if (btnSubmit) {
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Calculando...';
            btnSubmit.disabled = true;
        }

        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
        const resultsContainer = document.getElementById('despiece-resultados');
        if (resultsContainer) resultsContainer.style.display = 'none';
        const alertContainer = document.getElementById('alert-container-despiece');
        if (alertContainer) alertContainer.innerHTML = '';

        const rawData = {
            alto:        parseFloat(document.getElementById('input-alto').value),
            ancho:       parseFloat(document.getElementById('input-ancho').value),
            profundidad: parseFloat(document.getElementById('input-profundidad').value),
            grosor:      parseFloat(document.getElementById('input-grosor').value)
        };

        const units = {
            alto:        document.getElementById('unidad-alto').value,
            ancho:       document.getElementById('unidad-ancho').value,
            profundidad: document.getElementById('unidad-profundidad').value,
            grosor:      document.getElementById('unidad-grosor').value
        };

        let hasError = false;
        ['alto', 'ancho', 'profundidad', 'grosor'].forEach(key => {
            if (isNaN(rawData[key]) || rawData[key] <= 0) {
                mostrarErrorCampo('input-' + key, 'Debe ser un número mayor a 0');
                hasError = true;
            }
        });

        const unitsToCm = { 'mm': 0.1, 'cm': 1, 'm': 100 };
        const unitsToMm = { 'mm': 1, 'cm': 10, 'm': 1000 };

        const data = {
            alto: rawData.alto * unitsToCm[units.alto],
            ancho: rawData.ancho * unitsToCm[units.ancho],
            profundidad: rawData.profundidad * unitsToCm[units.profundidad],
            grosor: rawData.grosor * unitsToMm[units.grosor]
        };

        if (!hasError) {
            const grosorCm = data.grosor / 10;
            if ((grosorCm * 2) >= data.ancho || grosorCm >= data.alto) {
                mostrarErrorCampo('input-grosor', 'El grosor es demasiado grande para las dimensiones del mueble');
                hasError = true;
            }
        }

        if (hasError) {
            if (btnSubmit) { btnSubmit.innerHTML = defaultText; btnSubmit.disabled = false; }
            return;
        }

        try {
            const result = await api.calcularDespiece(data);

            if (result.status !== 'success') {
                mostrarAlerta('Error al calcular: ' + (result.error || 'Problema en el servidor'));
            } else {
                mostrarResultados(result.piezas);
            }
        } catch (error) {
            mostrarAlerta('No se pudo conectar con el servidor para calcular las medidas.');
        } finally {
            if (btnSubmit) { btnSubmit.innerHTML = defaultText; btnSubmit.disabled = false; }
        }
    });
});