const paginacion = {};

function getPerPage() {
    const w = window.innerWidth;
    if (w < 576) return 1;
    if (w < 992) return 2;
    return 3;
}

function renderSeccion(sec) {
    const grid = document.getElementById('grid-' + sec);
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.cat-card'));
    const perPage = getPerPage();

    if (paginacion[sec] === undefined) paginacion[sec] = 0;
    const page = paginacion[sec];

    const total = cards.length;
    const totalPages = Math.ceil(total / perPage);
    const start = page * perPage;
    const end = Math.min(start + perPage, total);

    cards.forEach(function (card, i) {
        card.style.display = (i >= start && i < end) ? '' : 'none';
    });

    const counter = document.getElementById('counter-' + sec);
    if (counter) {
        counter.textContent = total > 0 ? (start + 1) + '-' + end + ' de ' + total : '';
    }

    const prevBtn = document.getElementById('prev-' + sec);
    const nextBtn = document.getElementById('next-' + sec);

    if (prevBtn) prevBtn.disabled = (page === 0);
    if (nextBtn) nextBtn.disabled = (page >= totalPages - 1);

    const navEl = document.getElementById('nav-' + sec);
    if (navEl) {
        navEl.style.display = (total <= perPage) ? 'none' : 'flex';
    }
}

function navSection(sec, dir) {
    const grid = document.getElementById('grid-' + sec);
    if (!grid) return;

    const total = grid.querySelectorAll('.cat-card').length;
    const totalPages = Math.ceil(total / getPerPage());
    paginacion[sec] = Math.max(0, Math.min((paginacion[sec] || 0) + dir, totalPages - 1));
    renderSeccion(sec);
}

function filtrarCategoria(tipo) {
    document.querySelectorAll('.top-cat-btn').forEach(function (b) { b.classList.remove('active'); });
    const targetBtn = document.getElementById('btn-' + tipo);
    if (targetBtn) targetBtn.classList.add('active');

    document.querySelectorAll('.catalog-section').forEach(sec => {
        if (tipo === 'todos') {
            sec.style.display = 'block';
        } else {
            if (sec.dataset.categoria === tipo) {
                sec.style.display = 'block';
            } else {
                sec.style.display = 'none';
            }
        }
    });
}

function abrirModal(nombre, precio, medidas, categoria, imagenSrc) {
    document.getElementById('m-nombre').innerText = nombre;
    document.getElementById('m-precio').innerText = precio;
    document.getElementById('m-medidas').innerText = medidas;
    document.getElementById('m-categoria').innerText = categoria;
    document.getElementById('m-imagen').src = imagenSrc;
    document.getElementById('btn-solicitar-producto').href = 'formulario.html?producto=' + encodeURIComponent(nombre);

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

async function cargarMuebles() {
    const container = document.getElementById('dynamic-catalog-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center my-5"><div class="spinner-border text-primary" role="status"></div><p>Cargando catálogo...</p></div>';

    const muebles = await api.getMuebles();
    container.innerHTML = '';

    if (muebles.error) {
        container.innerHTML = '<div class="alert alert-danger text-center">Servicio no disponible en este momento. Por favor, intenta de nuevo más tarde.</div>';
        return;
    }

    if (muebles.length === 0) {
        container.innerHTML = '<div class="alert alert-info text-center">No hay productos disponibles en este momento. El catálogo está en actualización.</div>';
        return;
    }

    const categorias = {};
    muebles.forEach(m => {
        const cat = m.nombre_categoria || 'Sin Categoría';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(m);
    });

    const categoryFilters = document.getElementById('category-filters');
    if (categoryFilters) categoryFilters.innerHTML = `<button class="top-cat-btn active" id="btn-todos" onclick="filtrarCategoria('todos')"><i class="bi bi-grid-fill"></i> Todos</button>`;

    Object.keys(categorias).forEach(catName => {
        const catSlug = toSlug(catName);
        const items = categorias[catName];

        if (categoryFilters) {
            categoryFilters.innerHTML += `<button class="top-cat-btn" id="btn-${catSlug}" onclick="filtrarCategoria('${catSlug}')">${catName}</button>`;
        }

        const sectionHtml = `
            <div class="catalog-section" id="seccion-${catSlug}" data-categoria="${catSlug}">
                <div class="section-top">
                    <h2 class="catalog-section-label">
                        <i class="bi bi-collection me-2"></i>${catName}
                    </h2>
                    <div class="section-nav" id="nav-${catSlug}">
                        <button class="nav-arrow" id="prev-${catSlug}" onclick="navSection('${catSlug}', -1)" disabled aria-label="Anterior">
                            <i class="bi bi-chevron-left"></i>
                        </button>
                        <span class="nav-counter" id="counter-${catSlug}"></span>
                        <button class="nav-arrow" id="next-${catSlug}" onclick="navSection('${catSlug}', 1)" aria-label="Siguiente">
                            <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div class="catalog-grid" id="grid-${catSlug}">
                    ${items.map(m => {
            const precioVenta = parseFloat(m.precio_venta || m.precio_costo || 0);
            const precioFormateado = '$' + precioVenta.toLocaleString('es-CL');
            const imgPath = m.imagen ? `../imagenes/public/${m.imagen}` : '../imagenes/public/producto-placeholder.jpg';

            const sanitize = (str) => String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');

            const nombreEscaped = sanitize(m.nombre);
            const catNameEscaped = sanitize(catName);
            const medidasEscaped = sanitize(m.medidas || 'N/A');

            const onClickStr = `abrirModal('${nombreEscaped}', '${precioFormateado}', '${medidasEscaped}', '${catNameEscaped}', '${imgPath}')`;

            return `
                        <div class="cat-card compra" onclick="${onClickStr}">
                            <div class="cat-card-img">
                                <img src="${imgPath}" alt="${nombreEscaped}" onerror="this.src='../imagenes/public/producto-placeholder.jpg'">
                            </div>
                            <div class="cat-card-info">
                                <h5 class="cat-card-name">${nombreEscaped}</h5>
                                <p class="cat-card-desc">${m.observaciones || 'Sin descripción'}</p>
                                <span class="cat-card-price">${precioFormateado}</span>
                            </div>
                        </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;

        container.innerHTML += sectionHtml;
        paginacion[catSlug] = 0;
        renderSeccion(catSlug);
    });
}

var resizeTimer;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        Object.keys(paginacion).forEach(sec => {
            paginacion[sec] = 0;
            renderSeccion(sec);
        });
    }, 150);
});

document.addEventListener('DOMContentLoaded', function () {
    cargarMuebles();
});