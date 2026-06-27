document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const btnSubirExcel = document.getElementById('btn-subir-excel');
    const fileInputExcel = document.getElementById('file-excel');
    const btnSubirImagenes = document.getElementById('btn-subir-imagenes');
    const fileInputImagenes = document.getElementById('file-imagenes');
    const statusDiv = document.getElementById('upload-status');

    btnSubirExcel.addEventListener('click', () => {
        fileInputExcel.click();
    });

    btnSubirImagenes.addEventListener('click', () => {
        fileInputImagenes.click();
    });

    fileInputImagenes.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        statusDiv.style.display = 'block';
        statusDiv.style.backgroundColor = '#fff3cd';
        statusDiv.style.color = '#856404';
        statusDiv.innerHTML = `<i class="bi bi-hourglass-split"></i> Subiendo ${files.length} imágenes...`;
        btnSubirImagenes.disabled = true;

        try {
            const result = await api.subirImagenes(files);
            if (result.status === 'success') {
                statusDiv.style.backgroundColor = '#d4edda';
                statusDiv.style.color = '#155724';
                statusDiv.innerHTML = `<i class="bi bi-check-circle"></i> ${result.mensaje}`;
            } else {
                statusDiv.style.backgroundColor = '#f8d7da';
                statusDiv.style.color = '#721c24';
                statusDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error: ${result.error || 'Error desconocido'}`;
            }
        } catch (err) {
            statusDiv.style.backgroundColor = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error de conexión con el servidor.`;
        } finally {
            btnSubirImagenes.disabled = false;
            fileInputImagenes.value = '';
        }
    });

    fileInputExcel.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        statusDiv.style.display = 'block';
        statusDiv.style.backgroundColor = '#fff3cd';
        statusDiv.style.color = '#856404';
        statusDiv.innerHTML = '<i class="bi bi-hourglass-split"></i> Subiendo y procesando archivo...';
        btnSubirExcel.disabled = true;

        try {
            const result = await api.uploadExcel(file);

            if (result.status === 'success') {
                statusDiv.style.backgroundColor = '#d4edda';
                statusDiv.style.color = '#155724';
                statusDiv.innerHTML = `<i class="bi bi-check-circle"></i> ${result.mensaje} <br> <strong>${result.muebles_procesados} muebles procesados.</strong>`;
                if (result.columnas_encontradas) {
                    statusDiv.innerHTML += `<br><br><small><strong>Columnas detectadas:</strong> ${result.columnas_encontradas.join(', ')}</small>`;
                    statusDiv.innerHTML += `<br><small><em>Nota: El sistema busca la columna "SKU" para identificar un producto.</em></small>`;
                    statusDiv.style.backgroundColor = '#fff3cd';
                    statusDiv.style.color = '#856404';
                }
            } else {
                statusDiv.style.backgroundColor = '#f8d7da';
                statusDiv.style.color = '#721c24';
                statusDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error: ${result.error || 'Error desconocido'}`;
            }
        } catch (err) {
            statusDiv.style.backgroundColor = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error de conexión con el servidor.`;
        } finally {
            btnSubirExcel.disabled = false;
            fileInputExcel.value = '';
        }
    });
});
