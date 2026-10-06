document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('gallery-grid');
    if (!container) return;

    try {
        const muebles = await api.getMueblesPropios();
        if (muebles.error) {
            container.innerHTML = '<div class="col-12 text-center text-danger">Error al cargar la galería.</div>';
            return;
        }

        // Filtrar muebles que tengan video
        const mueblesConVideo = muebles.filter(m => m.video_url && m.video_url.trim() !== '');

        if (mueblesConVideo.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted w-100 py-5">Aún no hay muebles con videos para mostrar en inspiración.</div>';
            return;
        }

        container.innerHTML = mueblesConVideo.map(m => {
            const precioVenta = parseFloat(m.precio ?? 0);
            const precioFormateado = '$' + precioVenta.toLocaleString('es-CL');

            let imagenesStr = '';
            let imgPath = 'http://localhost:5000/static/imagenes/producto-placeholder.jpg';
            if (m.imagenes && m.imagenes.length > 0) {
                imagenesStr = m.imagenes.join(',');
                imgPath = `http://localhost:5000/static/imagenes/${m.imagenes[0]}`;
            }

            const sanitize = (str) => String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');

            const nombreEscaped = sanitize(m.nombre);
            const catNameEscaped = sanitize(m.nombre_categoria || 'Sin Categoría');
            const medidasEscaped = sanitize(m.medidas || 'N/A');
            imagenesStr = sanitize(imagenesStr);
            const videoUrlStr = sanitize(m.video_url || '');
            const productoId = m.id ? `P_${m.id}` : '';
            const onClickStr = `abrirModal('${nombreEscaped}', '${precioFormateado}', '${medidasEscaped}', '${catNameEscaped}', '${imagenesStr}', '${videoUrlStr}', '${productoId}')`;

            let embedUrl = videoUrlStr;
            if (videoUrlStr.includes('watch?v=')) {
                embedUrl = videoUrlStr.replace('watch?v=', 'embed/');
            } else if (videoUrlStr.includes('youtu.be/')) {
                embedUrl = videoUrlStr.replace('youtu.be/', 'youtube.com/embed/');
            }

            return `
                <div class="gallery-card" onclick="${onClickStr}" style="cursor: pointer;">
                    <div class="ratio ratio-16x9 w-100" style="pointer-events: none;">
                        <iframe src="${embedUrl}?controls=0&mute=1&showinfo=0&rel=0&autoplay=0" title="Video Producto" allowfullscreen></iframe>
                    </div>
                    <span class="card-tag">Premium</span>
                    <div class="card-overlay" style="background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); display: flex; flex-direction: column; justify-content: flex-end;">
                        <span class="card-category text-white mb-1"><i class="bi bi-play-circle-fill me-1"></i> Ver Detalles</span>
                        <h3 class="card-title text-white">${nombreEscaped}</h3>
                        <p class="card-desc text-white-50">${medidasEscaped}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error cargando inspiración:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger w-100 py-5">Error al cargar los videos.</div>';
    }
});

function abrirModal(nombre, precio, medidas, categoria, imagenesStr, videoUrlStr, productoId = '') {
    document.getElementById('m-nombre').innerText = nombre;
    document.getElementById('m-precio').innerText = precio;

    const medidasLimpias = (medidas || '').replace(/^medidas:\s*/i, '').trim();
    document.getElementById('m-medidas').innerText = medidasLimpias || 'N/A';

    const catEl = document.getElementById('m-categoria');
    const catRow = document.getElementById('m-categoria-row');
    const medidasDiv = document.getElementById('m-medidas-col');
    if (!categoria || categoria === 'Sin Categoría') {
        if (catRow) catRow.style.display = 'none';
        if (medidasDiv) {
            medidasDiv.classList.remove('border-start', 'ps-3');
        }
    } else {
        if (catRow) catRow.style.display = '';
        if (medidasDiv) {
            medidasDiv.classList.add('border-start', 'ps-3');
        }
        catEl.innerText = categoria;
    }

    const carruselInner = document.getElementById('m-carrusel-inner');
    carruselInner.innerHTML = '';

    let itemsHtml = '';
    let hasItems = false;

    if (imagenesStr) {
        const imagenes = imagenesStr.split(',');
        imagenes.forEach((img, index) => {
            if (img.trim()) {
                itemsHtml += `
                <div class="carousel-item ${!hasItems ? 'active' : ''}">
                    <img src="http://localhost:5000/static/imagenes/${img.trim()}" class="d-block w-100 rounded modal-custom-img" style="object-fit: contain; max-height: 400px; background: #f8f9fa;" alt="${nombre}" onerror="this.src='http://localhost:5000/static/imagenes/producto-placeholder.jpg'">
                </div>`;
                hasItems = true;
            }
        });
    }

    if (videoUrlStr) {
        let embedUrl = videoUrlStr;
        if (videoUrlStr.includes('watch?v=')) {
            embedUrl = videoUrlStr.replace('watch?v=', 'embed/');
        } else if (videoUrlStr.includes('youtu.be/')) {
            embedUrl = videoUrlStr.replace('youtu.be/', 'youtube.com/embed/');
        }

        itemsHtml += `
        <div class="carousel-item ${!hasItems ? 'active' : ''}">
            <div class="ratio ratio-16x9 w-100 rounded" style="max-height: 400px; background: #000;">
                <iframe src="${embedUrl}" title="Video Producto" allowfullscreen></iframe>
            </div>
        </div>`;
        hasItems = true;
    }

    if (!hasItems) {
        itemsHtml = `
        <div class="carousel-item active">
            <img src="http://localhost:5000/static/imagenes/producto-placeholder.jpg" class="d-block w-100 rounded modal-custom-img" style="object-fit: contain; max-height: 400px; background: #f8f9fa;" alt="Placeholder">
        </div>`;
    }

    carruselInner.innerHTML = itemsHtml;

    let url = 'formulario.html?producto=' + encodeURIComponent(nombre);
    if (productoId) {
        url += '&producto_id=' + encodeURIComponent(productoId);
    }
    document.getElementById('btn-solicitar-producto').href = url;

    if (typeof bootstrap !== 'undefined') {
        var modalElement = document.getElementById('modalProducto');
        var myModal = bootstrap.Modal.getOrCreateInstance(modalElement);
        myModal.show();
    }
}
