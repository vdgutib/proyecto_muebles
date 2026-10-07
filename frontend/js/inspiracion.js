let allMueblesConVideo = [];
let currentFilter = 'todos';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('gallery-grid');
    const tabsContainer = document.getElementById('filter-tabs');
    if (!container || !tabsContainer) return;

    try {
        const [muebles, categorias] = await Promise.all([
            api.getMueblesPropios().catch(() => []),
            api.getCategoriasPropias ? api.getCategoriasPropias().catch(() => []) : fetch('/api/categorias-propias').then(res=>res.json()).catch(()=>[])
        ]);

        if (muebles.error) {
            container.innerHTML = '<div class="col-12 text-center text-danger py-5">Error al cargar la galería.</div>';
            return;
        }

        allMueblesConVideo = muebles.filter(m => m.video_url && m.video_url.trim() !== '');

        if (allMueblesConVideo.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-5" style="grid-column: 1 / -1;">Aún no hay muebles con videos para mostrar en inspiración.</div>';
            tabsContainer.style.display = 'none';
            return;
        }

        // Extraer categorías únicas que tienen videos
        const catIdsConVideo = new Set(allMueblesConVideo.map(m => m.categoria_id));
        const categoriasConVideo = (categorias || []).filter(c => catIdsConVideo.has(c.id) || catIdsConVideo.has(c.id_categoria));

        let tabsHtml = `<button class="filter-btn active" data-cat="todos" onclick="setFilter('todos')">Todos</button>`;
        categoriasConVideo.forEach(c => {
            const catIdStr = String(c.id || c.id_categoria);
            tabsHtml += `<button class="filter-btn" data-cat="${catIdStr}" onclick="setFilter('${catIdStr}')">${c.nombre}</button>`;
        });
        tabsContainer.innerHTML = tabsHtml;

        renderGallery();

    } catch (error) {
        console.error('Error cargando inspiración:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger w-100 py-5">Error al cargar los videos.</div>';
    }

    // Detener videos al cerrar el modal
    const modalEl = document.getElementById('modalProducto');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', function () {
            const inner = document.getElementById('m-carrusel-inner');
            if (inner) inner.innerHTML = '';
        });
    }
});

function setFilter(catId) {
    currentFilter = catId;
    
    // Update active tab class
    document.querySelectorAll('#filter-tabs .filter-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === catId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderGallery();
}

function getEmbedUrl(video_url) {
    let embedUrl = video_url;
    // Si es solo el ID de 11 caracteres (nuevo formato)
    if (video_url && video_url.length === 11 && !video_url.includes('/')) {
        embedUrl = `https://www.youtube.com/embed/${video_url}`;
    } else if (video_url.includes('watch?v=')) {
        embedUrl = video_url.replace('watch?v=', 'embed/');
    } else if (video_url.includes('youtu.be/')) {
        embedUrl = video_url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return embedUrl;
}

function renderGallery() {
    const container = document.getElementById('gallery-grid');
    if (!container) return;

    let filtrados = allMueblesConVideo;
    if (currentFilter !== 'todos') {
        filtrados = allMueblesConVideo.filter(m => String(m.categoria_id) === currentFilter);
    }

    if (filtrados.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-5" style="grid-column: 1 / -1;">No hay videos para esta categoría.</div>';
        return;
    }

    container.innerHTML = filtrados.map(m => {
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

        const embedUrl = getEmbedUrl(m.video_url);

        return `
            <div class="gallery-card" onclick="${onClickStr}" style="cursor: pointer;">
                <div class="ratio ratio-16x9 w-100" style="pointer-events: none;">
                    <iframe src="${embedUrl}?controls=0&mute=1&showinfo=0&rel=0&autoplay=0" title="Video Producto" allowfullscreen></iframe>
                </div>
                <span class="card-tag" style="background-color: var(--royal-violet);">Línea Propia</span>
                <div class="card-overlay" style="background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); display: flex; flex-direction: column; justify-content: flex-end;">
                    <span class="card-category text-white mb-1"><i class="bi bi-play-circle-fill me-1"></i> Ver Detalles</span>
                    <h3 class="card-title text-white">${nombreEscaped}</h3>
                    <p class="card-desc text-white-50">${medidasEscaped}</p>
                </div>
            </div>
        `;
    }).join('');
}

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
        if (medidasDiv) medidasDiv.classList.remove('border-start', 'ps-3');
    } else {
        if (catRow) catRow.style.display = '';
        if (medidasDiv) medidasDiv.classList.add('border-start', 'ps-3');
        catEl.innerText = categoria;
    }

    const carruselInner = document.getElementById('m-carrusel-inner');
    carruselInner.innerHTML = '';

    let itemsHtml = '';
    let numItems = 0;

    if (imagenesStr) {
        const imagenes = imagenesStr.split(',');
        imagenes.forEach((img) => {
            if (img.trim()) {
                itemsHtml += `
                <div class="carousel-item ${numItems === 0 ? 'active' : ''}">
                    <img src="http://localhost:5000/static/imagenes/${img.trim()}" class="d-block w-100 rounded modal-custom-img" style="object-fit: contain; max-height: 400px; background: #f8f9fa;" alt="${nombre}" onerror="this.src='http://localhost:5000/static/imagenes/producto-placeholder.jpg'">
                </div>`;
                numItems++;
            }
        });
    }

    if (videoUrlStr) {
        const embedUrl = getEmbedUrl(videoUrlStr);
        itemsHtml += `
        <div class="carousel-item ${numItems === 0 ? 'active' : ''}">
            <div class="ratio ratio-16x9 w-100 rounded" style="max-height: 400px; background: #000;">
                <iframe src="${embedUrl}" title="Video Producto" allowfullscreen></iframe>
            </div>
        </div>`;
        numItems++;
    }

    if (numItems === 0) {
        itemsHtml = `
        <div class="carousel-item active">
            <img src="http://localhost:5000/static/imagenes/producto-placeholder.jpg" class="d-block w-100 rounded modal-custom-img" style="object-fit: contain; max-height: 400px; background: #f8f9fa;" alt="Placeholder">
        </div>`;
        numItems = 1;
    }

    carruselInner.innerHTML = itemsHtml;

    // Ocultar flechas si hay 1 o menos elementos
    const prevBtn = document.querySelector('#modalProducto .carousel-control-prev');
    const nextBtn = document.querySelector('#modalProducto .carousel-control-next');
    if (prevBtn) prevBtn.style.display = numItems <= 1 ? 'none' : '';
    if (nextBtn) nextBtn.style.display = numItems <= 1 ? 'none' : '';

    let url = 'formulario.html?producto=' + encodeURIComponent(nombre);
    if (productoId) url += '&producto_id=' + encodeURIComponent(productoId);
    document.getElementById('btn-solicitar-producto').href = url;

    if (typeof bootstrap !== 'undefined') {
        var modalElement = document.getElementById('modalProducto');
        var myModal = bootstrap.Modal.getOrCreateInstance(modalElement);
        myModal.show();
    }
}
