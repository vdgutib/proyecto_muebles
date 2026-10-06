let allMueblesExternos = [];
let allMueblesPropios = [];

let currentCategoryExterno = 'todos';
let currentCategoryPropio = 'todos';

let currentSearch = '';
let currentMaxPrice = 1000000;

function filtrarCategoria(tipo) {
    currentCategoryExterno = tipo;
    document.querySelectorAll('#category-filters .top-cat-btn').forEach(function (b) { b.classList.remove('active'); });
    const targetBtn = document.getElementById('btn-' + tipo);
    if (targetBtn) targetBtn.classList.add('active');
    filtrarCatalogoExterno();
}

function filtrarCategoriaPropios(tipo) {
    currentCategoryPropio = tipo;
    document.querySelectorAll('#category-filters-propios .top-cat-btn').forEach(function (b) { b.classList.remove('active'); });
    const targetBtn = document.getElementById('btn-' + tipo + '-propios');
    if (targetBtn) targetBtn.classList.add('active');
    filtrarCatalogoPropio();
}

function aplicaFiltrosGlobales(m, catSlug, currentCat) {
    const cumpleCategoria = currentCat === 'todos' || catSlug === currentCat;
    const precioProducto = Number(m.precio_venta ?? m.precio_costo ?? m.precio ?? 0);
    const cumplePrecio = !Number.isNaN(precioProducto) && precioProducto <= currentMaxPrice;
    const nombreProducto = (m.nombre || '').toLowerCase();
    const cumpleBusqueda = currentSearch === '' || nombreProducto.includes(currentSearch);
    
    return cumpleCategoria && cumplePrecio && cumpleBusqueda;
}

function filtrarCatalogoExterno() {
    const filtrados = allMueblesExternos.filter(m => {
        const catSlug = toSlug(m.nombre_categoria || 'Sin Categoría');
        return aplicaFiltrosGlobales(m, catSlug, currentCategoryExterno);
    });
    renderizarCatalogo(filtrados, 'dynamic-catalog-container', 'category-filters', currentCategoryExterno, false, false);
}

function filtrarCatalogoPropio() {
    const filtrados = allMueblesPropios.filter(m => {
        const catSlug = toSlug(m.nombre_categoria || 'Sin Categoría');
        return aplicaFiltrosGlobales(m, catSlug, currentCategoryPropio);
    });
    renderizarCatalogo(filtrados, 'dynamic-propios-container', 'category-filters-propios', currentCategoryPropio, true, true);
}


function crearTarjetaHtml(m, catName, isPropio) {
    const precioVenta = parseFloat(m.precio_venta ?? m.precio_costo ?? m.precio ?? 0);
    const precioFormateado = '$' + precioVenta.toLocaleString('es-CL');
    
    let imgPath = 'http://localhost:5000/static/imagenes/producto-placeholder.jpg';
    let imagenesStr = '';
    
    if (isPropio) {
        if(m.imagenes && m.imagenes.length > 0) {
            imgPath = `http://localhost:5000/static/imagenes/${m.imagenes[0]}`;
            imagenesStr = m.imagenes.join(',');
        }
    } else {
        if(m.imagen) {
            imgPath = `http://localhost:5000/static/imagenes/${m.imagen.split(',')[0]}`;
            imagenesStr = m.imagen;
        }
    }

    const sanitize = (str) => String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');

    const nombreEscaped = sanitize(m.nombre);
    const catNameEscaped = sanitize(catName);
    const medidasEscaped = sanitize(m.medidas || 'N/A');
    imagenesStr = sanitize(imagenesStr);
    const videoUrlStr = sanitize(m.video_url || '');

    // Para evitar colisiones de ID al pedir, agregamos el tipo al ID
    const prodId = isPropio ? `P_${m.id}` : `E_${m.id_mueble}`;

    const onClickStr = `abrirModal('${nombreEscaped}', '${precioFormateado}', '${medidasEscaped}', '${catNameEscaped}', '${imagenesStr}', '${videoUrlStr}', '${prodId}')`;

    let extraBadge = '';
    let extraIcon = '';
    if (isPropio) {
        extraBadge = `<span class="badge position-absolute top-0 end-0 m-2" style="background-color: var(--royal-violet); z-index: 2;">Línea Propia</span>`;
        if (m.video_url) {
            extraIcon = `<div class="position-absolute bottom-0 start-0 m-2" style="z-index: 2;"><i class="bi bi-play-circle-fill fs-4 text-white" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i></div>`;
        }
    }

    return `
        <div class="cat-card compra position-relative" onclick="${onClickStr}">
            ${extraBadge}
            <div class="cat-card-img position-relative">
                <img src="${imgPath}" alt="${nombreEscaped}" onerror="this.src='http://localhost:5000/static/imagenes/producto-placeholder.jpg'">
                ${extraIcon}
            </div>
            <div class="cat-card-info">
                <h5 class="cat-card-name">${nombreEscaped}</h5>
                <p class="cat-card-desc">${m.observaciones || m.descripcion || 'Sin descripción'}</p>
                <span class="cat-card-price">${precioFormateado}</span>
            </div>
        </div>
    `;
}

function renderizarCatalogo(muebles, containerId, filtersId, currentCat, isPropio, isPremium) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (muebles.length === 0) {
        container.innerHTML = '<div class="alert alert-info text-center">No se encontraron productos en esta sección con los filtros actuales.</div>';
        return;
    }

    const categorias = {};
    muebles.forEach(m => {
        const cat = m.nombre_categoria || 'Sin Categoría';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(m);
    });

    const esVistaGeneral = currentCat === 'todos';
    const funcFiltro = isPropio ? 'filtrarCategoriaPropios' : 'filtrarCategoria';
    const suffix = isPropio ? '-propios' : '';

    let botonesHtml = `<button class="top-cat-btn ${currentCat === 'todos' ? 'active' : ''}" id="btn-todos${suffix}" onclick="${funcFiltro}('todos')"><i class="bi bi-grid-fill"></i> Todos</button>`;
    let seccionesHtml = '';

    Object.keys(categorias).forEach((catName, index) => {
        const catSlug = toSlug(catName);
        const items = categorias[catName];
        const cantidadTexto = items.length + (items.length === 1 ? ' producto' : ' productos');

        botonesHtml += `<button class="top-cat-btn ${currentCat === catSlug ? 'active' : ''}" id="btn-${catSlug}${suffix}" onclick="${funcFiltro}('${catSlug}')">${catName}</button>`;

        const navHtml = esVistaGeneral
            ? `<div class="section-nav" id="nav-${catSlug}${suffix}">
                    <span class="nav-counter">${cantidadTexto}</span>
                    <button class="nav-arrow" id="prev-${catSlug}${suffix}" onclick="scrollFila('${catSlug}${suffix}', -1)" aria-label="Anterior">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <button class="nav-arrow" id="next-${catSlug}${suffix}" onclick="scrollFila('${catSlug}${suffix}', 1)" aria-label="Siguiente">
                        <i class="bi bi-chevron-right"></i>
                    </button>
               </div>`
            : `<span class="nav-counter nav-counter--static">${cantidadTexto}</span>`;

        seccionesHtml += `
            <div class="catalog-section" id="seccion-${catSlug}${suffix}" style="animation-delay: ${Math.min(index, 6) * 70}ms;">
                <div class="section-top">
                    <h2 class="catalog-section-label" style="${isPremium ? 'color: var(--indigo-velvet);' : ''}">
                        <i class="bi ${isPremium ? 'bi-star' : 'bi-collection'} me-2"></i>${catName}
                    </h2>
                    ${navHtml}
                </div>
                <div class="catalog-grid ${esVistaGeneral ? 'catalog-grid--carousel' : 'catalog-grid--full'}" id="grid-${catSlug}${suffix}">
                    ${items.map(m => crearTarjetaHtml(m, catName, isPropio)).join('')}
                </div>
            </div>
        `;
    });

    const categoryFilters = document.getElementById(filtersId);
    if (categoryFilters) categoryFilters.innerHTML = botonesHtml;
    container.innerHTML = seccionesHtml;

    if (esVistaGeneral) initCarruseles(suffix);
    activarRevealAnimado(containerId);
}


function scrollFila(sec, dir) {
    const grid = document.getElementById('grid-' + sec);
    if (!grid) return;

    const primeraCard = grid.querySelector('.cat-card');
    const anchoCard = primeraCard ? primeraCard.getBoundingClientRect().width : 260;
    const gap = 20;
    const tarjetasPorSalto = window.innerWidth < 768 ? 1 : 2;

    grid.scrollBy({ left: dir * (anchoCard + gap) * tarjetasPorSalto, behavior: 'smooth' });
}

function actualizarFlechasCarrusel(grid) {
    if (!grid) return;
    const sec = grid.id.replace('grid-', '');
    const prevBtn = document.getElementById('prev-' + sec);
    const nextBtn = document.getElementById('next-' + sec);
    const navEl = document.getElementById('nav-' + sec);

    const maxScroll = grid.scrollWidth - grid.clientWidth;
    const sePuedeDesplazar = maxScroll > 4;

    if (navEl) {
        navEl.querySelectorAll('.nav-arrow').forEach(f => {
            f.style.display = sePuedeDesplazar ? '' : 'none';
        });
    }
    if (prevBtn) prevBtn.disabled = grid.scrollLeft <= 4;
    if (nextBtn) nextBtn.disabled = grid.scrollLeft >= maxScroll - 4;
}

function initCarruseles(suffix) {
    document.querySelectorAll(`.catalog-grid--carousel[id$="${suffix}"]`).forEach(grid => {
        actualizarFlechasCarrusel(grid);
        grid.addEventListener('scroll', () => actualizarFlechasCarrusel(grid), { passive: true });
    });
}

function activarRevealAnimado(containerId) {
    const cards = document.querySelectorAll(`#${containerId} .catalog-grid .cat-card`);
    if (!cards.length) return;

    if (!('IntersectionObserver' in window)) return;

    cards.forEach((card, i) => {
        card.classList.add('reveal-ready');
        card.style.transitionDelay = (Math.min(i % 9, 8) * 45) + 'ms';
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.remove('reveal-ready');
                entry.target.style.transitionDelay = '';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    cards.forEach(card => observer.observe(card));
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
    let hasItems = false;
    
    if (imagenesStr) {
        const imagenes = imagenesStr.split(',');
        imagenes.forEach((img, index) => {
            if(img.trim()){
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
        if(videoUrlStr.includes('watch?v=')){
            embedUrl = videoUrlStr.replace('watch?v=', 'embed/');
        } else if(videoUrlStr.includes('youtu.be/')){
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

function toSlug(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function cargarMueblesTodos() {
    const contExt = document.getElementById('dynamic-catalog-container');
    const contPro = document.getElementById('dynamic-propios-container');
    
    if(contExt) contExt.innerHTML = '<div class="text-center my-5"><div class="spinner-border text-primary"></div></div>';
    if(contPro) contPro.innerHTML = '<div class="text-center my-5"><div class="spinner-border text-primary"></div></div>';

    const [mueblesExt, mueblesPro] = await Promise.all([
        api.getMuebles(),
        api.getMueblesPropios()
    ]);

    if (!mueblesExt.error) allMueblesExternos = mueblesExt;
    if (!mueblesPro.error) allMueblesPropios = mueblesPro;

    // Calcular max precio combinado
    let maxPrecio = 1000000;
    const preciosExt = allMueblesExternos.map(m => parseFloat(m.precio_venta ?? m.precio_costo ?? 0)).filter(p => !Number.isNaN(p));
    const preciosPro = allMueblesPropios.map(m => parseFloat(m.precio ?? 0)).filter(p => !Number.isNaN(p));
    
    const maxCombo = Math.max(0, ...preciosExt, ...preciosPro);
    if (maxCombo > 0) maxPrecio = maxCombo;

    const priceRange = document.getElementById('price-range');
    const priceValue = document.getElementById('price-value');
    
    if (priceRange) {
        priceRange.max = maxPrecio;
        priceRange.value = maxPrecio;
        currentMaxPrice = maxPrecio;
    }
    if (priceValue) {
        priceValue.textContent = '$' + maxPrecio.toLocaleString('es-CL');
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            filtrarCatalogoExterno();
            filtrarCatalogoPropio();
        });
    }

    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            currentMaxPrice = Number(e.target.value);
            if (priceValue) {
                priceValue.textContent = '$' + currentMaxPrice.toLocaleString('es-CL');
            }
            filtrarCatalogoExterno();
            filtrarCatalogoPropio();
        });
    }

    // Ocultar sección de propios si no hay propios
    if (allMueblesPropios.length === 0 && document.getElementById('propios-catalog-container')) {
        document.getElementById('propios-catalog-container').style.display = 'none';
    }

    filtrarCatalogoExterno();
    filtrarCatalogoPropio();
}

var resizeTimer;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        document.querySelectorAll('.catalog-grid--carousel').forEach(actualizarFlechasCarrusel);
    }, 150);
});

document.addEventListener('DOMContentLoaded', function () {
    cargarMueblesTodos();
});