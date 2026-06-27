document.addEventListener('DOMContentLoaded', () => {
    // Referencias Excel
    const btnSubirExcel = document.getElementById('btn-subir-excel');
    const dropZoneExcel = document.getElementById('drop-zone-excel');
    const fileInputExcel = document.getElementById('file-excel');
    const excelFileList = document.getElementById('excel-file-list');

    // Referencias Imágenes
    const btnSubirImagenes = document.getElementById('btn-subir-imagenes');
    const dropZoneImagenes = document.getElementById('drop-zone-imagenes');
    const fileInputImagenes = document.getElementById('file-imagenes');
    const imagePreviewGrid = document.getElementById('image-preview-grid');

    const btnFinalizar = document.getElementById('btn-finalizar');

    // Funciones Helper de UI
    const formatBytes = (bytes, decimals = 1) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    // --- MANEJO EXCEL ---
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
        if(files.length > 0) processExcelFile(files[0]);
    }, false);

    fileInputExcel.addEventListener('change', function(e) {
        if(this.files.length > 0) processExcelFile(this.files[0]);
    });

    async function processExcelFile(file) {
        if(!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
            alert('Por favor selecciona un archivo Excel válido (.xls, .xlsx)');
            return;
        }

        // Crear elemento en UI
        const id = 'excel-' + Date.now();
        const fileHtml = `
            <div class="file-item excel-item" id="${id}">
                <i class="bi bi-file-earmark-excel text-success"></i>
                <span class="file-name" title="${file.name}">${file.name}</span>
                <span class="file-badge warning" id="${id}-badge">En Progreso</span>
                <span class="file-size">${formatBytes(file.size)}</span>
                <span class="file-progress-text" id="${id}-text">Progreso: 0%</span>
                <div class="progress-bar-container"><div class="progress-bar-fill warning" id="${id}-bar" style="width: 10%;"></div></div>
            </div>
        `;
        excelFileList.insertAdjacentHTML('beforeend', fileHtml);

        const badge = document.getElementById(`${id}-badge`);
        const text = document.getElementById(`${id}-text`);
        const bar = document.getElementById(`${id}-bar`);

        try {
            // Simulamos un poco de progreso para UX
            setTimeout(() => { if(bar.style.width === '10%') { bar.style.width = '40%'; text.innerText = 'Progreso: 40%'; } }, 500);
            
            const result = await api.uploadExcel(file);
            
            if (result.status === 'success') {
                badge.className = 'file-badge success';
                badge.innerText = 'Completado';
                bar.className = 'progress-bar-fill success';
                bar.style.width = '100%';
                text.innerText = 'Progreso: 100%';
            } else {
                badge.className = 'file-badge';
                badge.style.backgroundColor = '#e53e3e';
                badge.innerText = 'Error';
                bar.style.backgroundColor = '#e53e3e';
                text.innerText = 'Fallo';
                alert('Error: ' + result.error);
            }
        } catch (err) {
            badge.className = 'file-badge';
            badge.style.backgroundColor = '#e53e3e';
            badge.innerText = 'Error';
            bar.style.backgroundColor = '#e53e3e';
            text.innerText = 'Fallo';
            alert('Error de conexión.');
        }
    }


    // --- MANEJO IMÁGENES ---
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
        if(files.length > 0) processImages(files);
    }, false);

    fileInputImagenes.addEventListener('change', function(e) {
        if(this.files.length > 0) processImages(this.files);
    });

    async function processImages(fileList) {
        const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
        if(files.length === 0) return;

        // Mostrar previsualizaciones locales de inmediato
        files.forEach(file => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = function() {
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
            }
        });

        // Subir al backend
        try {
            // El API actual espera que enviemos los archivos. 
            // Esto llamara a la BD en batch para todas.
            const result = await api.subirImagenes(files);
            if (result.status === 'success') {
                console.log(`${result.mensaje}`);
            } else {
                alert(`Error al subir imágenes: ${result.error}`);
            }
        } catch (err) {
            console.error("Error subiendo imágenes", err);
        }
    }

    // --- ACCIÓN FINAL ---
    btnFinalizar.addEventListener('click', () => {
        window.location.href = 'catalogoProductos.html'; // O redirigir a inicio
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
});
