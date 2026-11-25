document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const btnSubirExcel = document.getElementById('btn-subir-excel');
    const dropZoneExcel = document.getElementById('drop-zone-excel');
    const fileInputExcel = document.getElementById('file-excel');
    const excelFileList = document.getElementById('excel-file-list');
    const excelReporteResumen = document.getElementById('excel-reporte-resumen');

    const btnSubirImagenes = document.getElementById('btn-subir-imagenes');
    const dropZoneImagenes = document.getElementById('drop-zone-imagenes');
    const fileInputImagenes = document.getElementById('file-imagenes');
    const imagePreviewGrid = document.getElementById('image-preview-grid');

    const btnFinalizar = document.getElementById('btn-finalizar');
    const btnLimpiarBD = document.getElementById('btn-limpiar-bd');

    const formatBytes = (bytes, decimals = 1) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // ==========================================
    // 1. CARGA Y LECTURA DE EXCEL
    // ==========================================
    btnSubirExcel.addEventListener('click', () => fileInputExcel.click());
    dropZoneExcel.addEventListener('click', () => fileInputExcel.click());
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZoneExcel.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZoneExcel.addEventListener(eventName, () => dropZoneExcel.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZoneExcel.addEventListener(eventName, () => dropZoneExcel.classList.remove('dragover'), false);
    });

    dropZoneExcel.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        if (files.length > 0) processExcelFile(files[0]);
    }, false);

    fileInputExcel.addEventListener('change', function (e) {
        if (this.files.length > 0) processExcelFile(this.files[0]);
    });

    async function processExcelFile(file) {
        if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
            mostrarModalAdvertencia('Por favor selecciona un archivo Excel válido (.xls o .xlsx)');
            return;
        }

        // Limpiar reporte previo si existía
        if (excelReporteResumen) excelReporteResumen.innerHTML = '';

        // Crear elemento en UI
        const id = 'excel-' + Date.now();
        const fileHtml = `
            <div class="file-item excel-item" id="${id}">
                <i class="bi bi-file-earmark-excel text-success"></i>
                <span class="file-name" title="${file.name}">${file.name}</span>
                <span class="file-badge warning" id="${id}-badge">Leyendo datos y fotos...</span>
                <span class="file-size">${formatBytes(file.size)}</span>
                <span class="file-progress-text" id="${id}-text">Progreso: 15%</span>
                <div class="progress-bar-container"><div class="progress-bar-fill warning" id="${id}-bar" style="width: 15%;"></div></div>
            </div>
        `;
        excelFileList.insertAdjacentHTML('beforeend', fileHtml);

        const badge = document.getElementById(`${id}-badge`);
        const text = document.getElementById(`${id}-text`);
        const bar = document.getElementById(`${id}-bar`);

        let progresoTimer = setInterval(() => {
            let actual = parseInt(bar.style.width) || 15;
            if (actual < 85) {
                let nuevo = actual + 15;
                bar.style.width = nuevo + '%';
                text.innerText = `Progreso: ${nuevo}%`;
            }
        }, 400);

        try {
            const result = await api.uploadExcel(file);
            clearInterval(progresoTimer);
            
            if (result.status === 'success') {
                const hayDuplicados = result.duplicados && result.duplicados.length > 0;
                const hayAdvertenciasImg = result.advertencias_imagenes && result.advertencias_imagenes.length > 0;

                bar.style.width = '100%';
                text.innerText = 'Progreso: 100%';

                if (hayDuplicados || hayAdvertenciasImg) {
                    badge.className = 'file-badge warning';
                    badge.innerText = 'Listo con observaciones';
                    bar.className = 'progress-bar-fill warning';
                } else {
                    badge.className = 'file-badge success';
                    badge.innerText = 'Cargado con éxito';
                    bar.className = 'progress-bar-fill success';
                }

                // Renderizar resumen en pantalla y abrir modal explicativo
                renderizarReporteExcel(result);
                mostrarModalReporteDetallado(result);

            } else {
                badge.className = 'file-badge';
                badge.style.backgroundColor = '#e53e3e';
                badge.innerText = 'Error';
                bar.style.backgroundColor = '#e53e3e';
                text.innerText = 'Fallo';
                mostrarModalError('No se pudo cargar el Excel: ' + (result.error || 'Revisa que el archivo tenga el formato correcto.'));
            }
        } catch (err) {
            clearInterval(progresoTimer);
            badge.className = 'file-badge';
            badge.style.backgroundColor = '#e53e3e';
            badge.innerText = 'Error';
            bar.style.backgroundColor = '#e53e3e';
            text.innerText = 'Fallo';
            mostrarModalError('Hubo un problema de conexión al subir el archivo Excel. Intenta de nuevo.');
        }
    }

    function renderizarReporteExcel(result) {
        if (!excelReporteResumen) return;

        const res = result.resumen || {
            muebles_procesados: result.muebles_procesados || 0,
            imagenes_extraidas: 0,
            skus_duplicados_omitidos: 0,
            advertencias_imagenes_count: 0
        };

        const totalDuplicados = (result.duplicados || []).length;
        const totalAdvImg = (result.advertencias_imagenes || []).length;

        let html = `
            <div class="reporte-resumen-box">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="fw-bold m-0 text-dark">
                        <i class="bi bi-file-earmark-check-fill text-success me-1"></i> Resumen de la carga
                    </h6>
                    <button class="btn btn-sm btn-outline-secondary" id="btn-reabrir-reporte">
                        <i class="bi bi-eye"></i> Ver detalle
                    </button>
                </div>

                <div class="reporte-stats-grid">
                    <div class="stat-pill success">
                        <strong>${res.muebles_procesados}</strong>
                        <span>Muebles guardados</span>
                    </div>
                    <div class="stat-pill info">
                        <strong>${res.imagenes_extraidas}</strong>
                        <span>Fotos listas</span>
                    </div>
                    <div class="stat-pill ${totalDuplicados > 0 ? 'danger' : ''}">
                        <strong>${res.skus_duplicados_omitidos}</strong>
                        <span>Repetidos sin guardar</span>
                    </div>
                    <div class="stat-pill ${totalAdvImg > 0 ? 'warning' : ''}">
                        <strong>${res.advertencias_imagenes_count}</strong>
                        <span>Fotos con aviso</span>
                    </div>
                </div>
        `;

        if (totalDuplicados > 0) {
            html += `
                <div class="alerta-duplicados">
                    <strong><i class="bi bi-exclamation-octagon-fill me-1"></i> ${totalDuplicados} SKU repetidos en el Excel:</strong>
                    Estos muebles no se agregaron al catálogo porque tienen el código repetido en el archivo.
                </div>
            `;
        }

        if (totalAdvImg > 0) {
            html += `
                <div class="alerta-imagenes">
                    <strong><i class="bi bi-image me-1"></i> ${totalAdvImg} fotos no se pudieron leer:</strong>
                    Los muebles sí se guardaron, pero debes subirles la foto a mano en la sección de abajo.
                </div>
            `;
        }

        html += `</div>`;
        excelReporteResumen.innerHTML = html;

        const btnReabrir = document.getElementById('btn-reabrir-reporte');
        if (btnReabrir) {
            btnReabrir.addEventListener('click', () => mostrarModalReporteDetallado(result));
        }
    }

    function mostrarModalReporteDetallado(result) {
        const res = result.resumen || {
            muebles_procesados: result.muebles_procesados || 0,
            imagenes_extraidas: 0,
            skus_duplicados_omitidos: 0,
            advertencias_imagenes_count: 0
        };

        const duplicados = result.duplicados || [];
        const advImagenes = result.advertencias_imagenes || [];
        const hayDuplicados = duplicados.length > 0;
        const hayAdvImg = advImagenes.length > 0;

        let tipoModal = (hayDuplicados || hayAdvImg) ? 'warning' : 'success';
        let tituloModal = (hayDuplicados || hayAdvImg) 
            ? 'Resultado de la Carga (Con Avisos)' 
            : '¡Carga Exitosa!';

        let html = `
            <div>
                <p class="mb-3 text-secondary">
                    ${result.mensaje || 'El archivo Excel se procesó y se guardó en el catálogo.'}
                </p>

                <div class="row g-2 text-center mb-3">
                    <div class="col-6 col-sm-3">
                        <div class="border rounded p-2 bg-light">
                            <span class="d-block text-muted small">Muebles Listos</span>
                            <strong class="fs-5 text-success">${res.muebles_procesados}</strong>
                        </div>
                    </div>
                    <div class="col-6 col-sm-3">
                        <div class="border rounded p-2 bg-light">
                            <span class="d-block text-muted small">Fotos Asociadas</span>
                            <strong class="fs-5 text-primary">${res.imagenes_extraidas}</strong>
                        </div>
                    </div>
                    <div class="col-6 col-sm-3">
                        <div class="border rounded p-2 bg-light">
                            <span class="d-block text-muted small">Repetidos Omitidos</span>
                            <strong class="fs-5 ${hayDuplicados ? 'text-danger' : 'text-secondary'}">${res.skus_duplicados_omitidos}</strong>
                        </div>
                    </div>
                    <div class="col-6 col-sm-3">
                        <div class="border rounded p-2 bg-light">
                            <span class="d-block text-muted small">Fotos Pendientes</span>
                            <strong class="fs-5 ${hayAdvImg ? 'text-warning' : 'text-secondary'}">${res.advertencias_imagenes_count}</strong>
                        </div>
                    </div>
                </div>
        `;

        if (hayDuplicados) {
            html += `
                <div class="alert alert-danger p-3 mb-3">
                    <h6 class="alert-heading fw-bold fs-6 mb-2">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i> Muebles que NO se guardaron porque el SKU está repetido:
                    </h6>
                    <p class="small mb-2">
                        Cada mueble debe tener un número de SKU diferente. Estos muebles no se guardaron para evitar confusiones; cambia el código en el Excel y vuelve a subir el archivo:
                    </p>
                    <div class="table-responsive" style="max-height: 180px; overflow-y: auto;">
                        <table class="table table-sm table-bordered bg-white mb-0" style="font-size: 0.82rem;">
                            <thead class="table-danger">
                                <tr>
                                    <th>SKU</th>
                                    <th>Fila en Excel</th>
                                    <th>Muebles con el mismo código</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            duplicados.forEach(dup => {
                html += `
                    <tr>
                        <td class="fw-bold">${dup.sku}</td>
                        <td>${dup.filas ? dup.filas.join(', ') : 'N/A'}</td>
                        <td>${dup.nombres ? dup.nombres.join(' <em> y </em> ') : dup.mensaje}</td>
                    </tr>
                `;
            });
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        if (hayAdvImg) {
            html += `
                <div class="alert alert-warning p-3 mb-3">
                    <h6 class="alert-heading fw-bold fs-6 mb-2">
                        <i class="bi bi-image-fill me-1"></i> Muebles guardados pero sin foto:
                    </h6>
                    <p class="small mb-2">
                        El mueble sí quedó guardado en el catálogo, pero su foto en el Excel venía dañada o no se pudo abrir. Puedes subir la foto a mano en la sección de abajo con el número de SKU (ejemplo: <code>10102054.png</code>):
                    </p>
                    <ul class="list-group list-group-flush border rounded bg-white" style="font-size: 0.82rem; max-height: 160px; overflow-y: auto;">
            `;
            advImagenes.forEach(adv => {
                html += `
                    <li class="list-group-item p-2">
                        <strong>Fila ${adv.fila} (SKU ${adv.sku}):</strong> ${adv.nombre || ''}<br>
                        <span class="text-danger small">${adv.motivo}</span>
                    </li>
                `;
            });
            html += `
                    </ul>
                </div>
            `;
        }

        if (!hayDuplicados && !hayAdvImg) {
            html += `
                <div class="alert alert-success p-3 mb-0 small">
                    <i class="bi bi-check-circle-fill me-1"></i>
                    Todos los muebles y sus fotos se cargaron correctamente al catálogo sin ningún problema.
                </div>
            `;
        }

        html += `</div>`;

        mostrarModal(tituloModal, html, tipoModal);
    }


    // ==========================================
    // 2. SUBIDA MANUAL DE FOTOS (OPCIONAL)
    // ==========================================
    btnSubirImagenes.addEventListener('click', () => fileInputImagenes.click());
    dropZoneImagenes.addEventListener('click', () => fileInputImagenes.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZoneImagenes.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZoneImagenes.addEventListener(eventName, () => dropZoneImagenes.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZoneImagenes.addEventListener(eventName, () => dropZoneImagenes.classList.remove('dragover'), false);
    });

    dropZoneImagenes.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        if (files.length > 0) processImages(files);
    }, false);

    fileInputImagenes.addEventListener('change', function (e) {
        e.preventDefault();
        if (this.files.length > 0) processImages(this.files);
    });

    async function processImages(fileList) {
        const rawFiles = Array.from(fileList);
        if (rawFiles.length === 0) return;

        const validos = [];
        const rechazadosPre = [];

        rawFiles.forEach(file => {
            if (!file.type.startsWith('image/')) {
                rechazadosPre.push({
                    archivo: file.name,
                    motivo: 'El archivo no es una foto válida (debe ser JPG, PNG o WEBP).'
                });
                return;
            }
            const nombreBase = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            if (!/^\d+$/.test(nombreBase.trim())) {
                rechazadosPre.push({
                    archivo: file.name,
                    motivo: `El nombre de la foto debe ser solo el número de SKU (ejemplo: 10102054.png). Se recibió '${nombreBase}'.`
                });
                return;
            }
            validos.push(file);
        });

        // Si todos los archivos seleccionados fallaron en la validación inicial de nombre
        if (validos.length === 0) {
            mostrarModalImagenesRechazadas(rechazadosPre, []);
            fileInputImagenes.value = '';
            return;
        }

        // Previsualizar los válidos en la galería inferior
        validos.forEach(file => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = function () {
                const imgHtml = `
                    <div class="image-thumbnail">
                        <img src="${reader.result}" alt="preview">
                        <div class="img-info">
                            <span class="img-name" title="${file.name}">${file.name}</span>
                            <span class="img-size">${formatBytes(file.size)}</span>
                        </div>
                    </div>
                `;
                imagePreviewGrid.insertAdjacentHTML('beforeend', imgHtml);
            };
        });

        try {
            const result = await api.subirImagenes(validos, 'catalogo');
            fileInputImagenes.value = '';

            const todasRechazadas = [...rechazadosPre, ...(result.rechazadas || [])];
            const asociadas = result.asociadas || [];

            if (result.status === 'success') {
                if (todasRechazadas.length > 0) {
                    mostrarModalImagenesRechazadas(todasRechazadas, asociadas);
                } else {
                    mostrarModalExito(`¡Listo! Se actualizaron ${asociadas.length} fotos y quedaron guardadas en sus muebles correspondientes.`);
                }
            } else {
                mostrarModalImagenesRechazadas(todasRechazadas, asociadas, result.error);
            }
        } catch (err) {
            console.error("Error subiendo imágenes", err);
            fileInputImagenes.value = '';
            mostrarModalError('Hubo un problema de conexión al subir las fotos. Intenta nuevamente.');
        }
    }

    function mostrarModalImagenesRechazadas(rechazadas, asociadas, errorMsg = '') {
        let html = `<div>`;

        if (errorMsg) {
            html += `<p class="text-danger fw-bold mb-2">${errorMsg}</p>`;
        }

        if (asociadas && asociadas.length > 0) {
            html += `
                <div class="alert alert-success p-2 mb-3">
                    <strong class="d-block mb-1"><i class="bi bi-check-circle-fill me-1"></i> Fotos guardadas con éxito (${asociadas.length}):</strong>
                    <ul class="mb-0 ps-3 small">
            `;
            asociadas.forEach(a => {
                html += `<li><strong>SKU ${a.sku}:</strong> ${a.nombre_producto || a.archivo}</li>`;
            });
            html += `</ul></div>`;
        }

        if (rechazadas && rechazadas.length > 0) {
            html += `
                <div class="alert alert-danger p-2 mb-0">
                    <strong class="d-block mb-1"><i class="bi bi-x-circle-fill me-1"></i> Fotos que no se pudieron subir (${rechazadas.length}):</strong>
                    <p class="small text-muted mb-2">Para que el sistema sepa a qué mueble corresponde cada foto, el archivo debe llamarse exactamente con el número de SKU de un mueble que ya esté en el catálogo.</p>
                    <div class="table-responsive" style="max-height: 180px; overflow-y: auto;">
                        <table class="table table-sm table-bordered bg-white mb-0" style="font-size: 0.8rem;">
                            <thead class="table-danger">
                                <tr>
                                    <th>Archivo</th>
                                    <th>Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            rechazadas.forEach(r => {
                html += `
                    <tr>
                        <td class="fw-bold">${r.archivo}</td>
                        <td class="text-danger">${r.motivo}</td>
                    </tr>
                `;
            });
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        const tipo = (asociadas && asociadas.length > 0) ? 'warning' : 'error';
        const titulo = (asociadas && asociadas.length > 0) ? 'Resultado de Subida de Fotos' : 'Fotos No Aceptadas';
        mostrarModal(titulo, html, tipo);
    }


    // ==========================================
    // 3. NAVEGACIÓN Y BORRADO DE CATÁLOGO
    // ==========================================
    btnFinalizar.addEventListener('click', () => {
        window.location.href = 'catalogoProductos.html';
    });

    btnLimpiarBD.addEventListener('click', async () => {
        mostrarModalConfirmacion(
            'Confirmar borrado',
            '¿Estás seguro de que deseas borrar TODOS los muebles del catálogo? Esta acción no se puede deshacer.',
            async () => {
                try {
                    const result = await api.limpiarBaseDatos();
                    if (result.status === 'success') {
                        mostrarModalExito('Catálogo limpiado correctamente.');
                        excelFileList.innerHTML = '';
                        imagePreviewGrid.innerHTML = '';
                        if (excelReporteResumen) excelReporteResumen.innerHTML = '';
                    } else {
                        mostrarModalError('No se pudo borrar: ' + (result.error || 'Ocurrió un error.'));
                    }
                } catch (err) {
                    mostrarModalError('Hubo un problema de conexión al intentar borrar los muebles.');
                    console.error('Error limpiando BD:', err);
                }
            },
            'Sí, borrar todo'
        );
    });

    window.volverInicio = function () {
        window.location.href = 'panelAdmin.html';
    };

    window.cerrarSesion = function () {
        mostrarModalConfirmacion(
            'Cerrar Sesión',
            '¿Estás seguro de que deseas salir del panel de administración?',
            () => {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            },
            'Cerrar Sesión'
        );
    };
});
