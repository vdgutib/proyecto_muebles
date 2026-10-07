document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('destacados-container');
    if (!container) return;

    try {
        const [mueblesExt, mueblesPro] = await Promise.all([
            api.getDestacados().catch(() => []),
            api.getMueblesPropios().catch(() => [])
        ]);

        let todosDestacados = [];
        if (!mueblesExt.error) todosDestacados = todosDestacados.concat(mueblesExt);
        if (!mueblesPro.error) todosDestacados = todosDestacados.concat(mueblesPro);

        // Shuffle
        todosDestacados.sort(() => 0.5 - Math.random());
        
        // Take 3
        const muebles = todosDestacados.slice(0, 3);

        if (muebles.length === 0) {
            container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">No hay productos destacados disponibles en este momento.</p></div>';
            return;
        }

        container.innerHTML = muebles.map(m => {
            const isPropio = m.tipo === 'propio';
            const precioVenta = parseFloat(m.precio_venta ?? m.precio_costo ?? m.precio ?? 0);
            const precioFormateado = '$' + precioVenta.toLocaleString('es-CL');
            let imgPath = 'http://localhost:5000/static/imagenes/producto-placeholder.jpg';
            let imagenesStr = '';
            
            if (isPropio) {
                if (m.imagenes && m.imagenes.length > 0) {
                    imgPath = `http://localhost:5000/static/imagenes/${m.imagenes[0]}`;
                    imagenesStr = m.imagenes.join(',');
                }
            } else {
                if (m.imagen) {
                    imgPath = `http://localhost:5000/static/imagenes/${m.imagen.split(',')[0]}`;
                    imagenesStr = m.imagen;
                }
            }

            const sanitize = (str) => String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');

            const nombreEscaped = sanitize(m.nombre);
            const catNameEscaped = sanitize(m.nombre_categoria || 'Sin Categoría');
            const medidasEscaped = sanitize(m.medidas || 'N/A');
            imagenesStr = sanitize(imagenesStr);
            const videoUrlStr = sanitize(m.video_url || '');
            const productoId = isPropio ? `P_${m.id}` : `E_${m.id_mueble}`;
            const onClickStr = `abrirModal('${nombreEscaped}', '${precioFormateado}', '${medidasEscaped}', '${catNameEscaped}', '${imagenesStr}', '${videoUrlStr}', '${productoId}')`;

            const badgeHtml = isPropio ? `<span class="badge position-absolute top-0 end-0 m-2" style="background-color: var(--royal-violet); z-index: 2; border: 1px solid rgba(255,255,255,0.2);">Línea Propia</span>` : '';

            return `
                <div class="col-md-4">
                    <div class="product-item-clean position-relative" style="cursor: pointer;" onclick="${onClickStr}">
                        ${badgeHtml}
                        <div class="product-img-wrapper">
                            <img src="${imgPath}" class="img-fluid" alt="${nombreEscaped}" onerror="this.src='http://localhost:5000/static/imagenes/producto-placeholder.jpg'">
                        </div>
                        <div class="product-info mt-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <h3 class="product-title m-0">${nombreEscaped}</h3>
                                <span class="product-price">${precioFormateado}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error cargando destacados:', error);
        container.innerHTML = '<div class="col-12 text-center"><p class="text-danger">Error al cargar productos destacados. Por favor, intenta más tarde.</p></div>';
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
    let numItems = 0;
    
    if (imagenesStr) {
        const imagenes = imagenesStr.split(',');
        imagenes.forEach((img, index) => {
            if(img.trim()){
                itemsHtml += `
                <div class="carousel-item ${numItems === 0 ? 'active' : ''}">
                    <img src="http://localhost:5000/static/imagenes/${img.trim()}" class="d-block w-100 rounded modal-custom-img" style="object-fit: contain; max-height: 400px; background: #f8f9fa;" alt="${nombre}" onerror="this.src='http://localhost:5000/static/imagenes/producto-placeholder.jpg'">
                </div>`;
                numItems++;
            }
        });
    }

    if (videoUrlStr) {
        let embedUrl = videoUrlStr;
        // Si es solo el ID de 11 caracteres (nuevo formato)
        if (videoUrlStr && videoUrlStr.length === 11 && !videoUrlStr.includes('/')) {
            embedUrl = `https://www.youtube.com/embed/${videoUrlStr}`;
        } else if(videoUrlStr.includes('watch?v=')){
            embedUrl = videoUrlStr.replace('watch?v=', 'embed/');
        } else if(videoUrlStr.includes('youtu.be/')){
            embedUrl = videoUrlStr.replace('youtu.be/', 'youtube.com/embed/');
        }
        
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