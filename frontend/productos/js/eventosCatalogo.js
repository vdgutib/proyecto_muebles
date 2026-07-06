let allMuebles = [];
let currentCategory = 'todos';
let currentSearch = '';
let currentMaxPrice = 1000000;

function filtrarCategoria(tipo) {
    currentCategory = tipo;
    document.querySelectorAll('.top-cat-btn').forEach(function (b) { b.classList.remove('active'); });
    const targetBtn = document.getElementById('btn-' + tipo);
    if (targetBtn) targetBtn.classList.add('active');
    filtrarCatalogo();
}

function filtrarCatalogo() {
    // Leer estado actual de los 3 filtros
    const categoriaSeleccionada = currentCategory;
    const textoBusqueda = currentSearch.toLowerCase().trim();
    const precioMaximo = Number(currentMaxPrice);

    // Filtrar con lógica AND estricta: un producto SOLO pasa si cumple TODAS las condiciones
    const mueblesFiltrados = allMuebles.filter(m => {
        // Condición 1: Categoría (debe coincidir O ser "todos")
        const cumpleCategoria = categoriaSeleccionada === 'todos' ||
                                toSlug(m.nombre_categoria || 'Sin Categoría') === categoriaSeleccionada;

        // Condición 2: Precio (debe ser <= al máximo del slider). Number() convierte
        // explícitamente strings numéricos a número real antes de comparar.
        const precioProducto = Number(m.precio_venta ?? m.precio_costo ?? 0);
        const cumplePrecio = !Number.isNaN(precioProducto) && precioProducto <= precioMaximo;

        // Condición 3: Búsqueda de texto (nombre debe incluir el texto buscado)
        const nombreProducto = (m.nombre || '').toLowerCase();
        const cumpleBusqueda = textoBusqueda === '' || nombreProducto.includes(textoBusqueda);

        // Lógica AND estricta: solo pasa si cumple las 3 condiciones a la vez
        return cumpleCategoria && cumplePrecio && cumpleBusqueda;
    });

    renderizarCatalogoFiltrado(mueblesFiltrados);
}

// Arma el HTML de una tarjeta de producto. Se extrajo a su propia función porque
// ahora se genera igual tanto en modo carrusel (vista "Todos") como en modo grilla
// completa (categoría específica); antes vivía inline dentro de un solo template.
function crearTarjetaHtml(m, catName) {
    const precioVenta = parseFloat(m.precio_venta ?? m.precio_costo ?? 0);
    const precioFormateado = '$' + precioVenta.toLocaleString('es-CL');
    const imgPath = m.imagen ? `http://localhost:5000/static/imagenes/${m.imagen}` : 'http://localhost:5000/static/imagenes/producto-placeholder.jpg';

    const sanitize = (str) => String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');

    const nombreEscaped = sanitize(m.nombre);
    const catNameEscaped = sanitize(catName);
    const medidasEscaped = sanitize(m.medidas || 'N/A');

    const onClickStr = `abrirModal('${nombreEscaped}', '${precioFormateado}', '${medidasEscaped}', '${catNameEscaped}', '${imgPath}', '${m.id_mueble || ''}')`;

    return `
        <div class="cat-card compra" onclick="${onClickStr}">
            <div class="cat-card-img">
                <img src="${imgPath}" alt="${nombreEscaped}" onerror="this.src='http://localhost:5000/static/imagenes/producto-placeholder.jpg'">
            </div>
            <div class="cat-card-info">
                <h5 class="cat-card-name">${nombreEscaped}</h5>
                <p class="cat-card-desc">${m.observaciones || 'Sin descripción'}</p>
                <span class="cat-card-price">${precioFormateado}</span>
            </div>
        </div>
    `;
}

function renderizarCatalogoFiltrado(muebles) {
    const container = document.getElementById('dynamic-catalog-container');
    if (!container) return;

    if (muebles.length === 0) {
        container.innerHTML = '<div class="alert alert-info text-center">No se encontraron productos con los filtros actuales.</div>';
        return;
    }

    // Nota: seguimos limpiando el contenedor con una única asignación (no `+=`) en
    // vez de ir acumulando HTML — eso fue lo que causaba que categorías/precios
    // viejos quedaran pegados en el DOM cada vez que se filtraba (ver commit anterior).
    const categorias = {};
    muebles.forEach(m => {
        const cat = m.nombre_categoria || 'Sin Categoría';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(m);
    });

    // Vista "Todos" → filas horizontales tipo carrusel (una por categoría).
    // Categoría específica → una sola grilla vertical con TODOS sus productos,
    // sin recorte ni paginación: el usuario solo desliza hacia abajo.
    const esVistaGeneral = currentCategory === 'todos';

    let botonesHtml = `<button class="top-cat-btn ${currentCategory === 'todos' ? 'active' : ''}" id="btn-todos" onclick="filtrarCategoria('todos')"><i class="bi bi-grid-fill"></i> Todos</button>`;
    let seccionesHtml = '';

    Object.keys(categorias).forEach((catName, index) => {
        const catSlug = toSlug(catName);
        const items = categorias[catName];
        const cantidadTexto = items.length + (items.length === 1 ? ' producto' : ' productos');

        botonesHtml += `<button class="top-cat-btn ${currentCategory === catSlug ? 'active' : ''}" id="btn-${catSlug}" onclick="filtrarCategoria('${catSlug}')">${catName}</button>`;

        const navHtml = esVistaGeneral
            ? `<div class="section-nav" id="nav-${catSlug}">
                    <span class="nav-counter">${cantidadTexto}</span>
                    <button class="nav-arrow" id="prev-${catSlug}" onclick="scrollFila('${catSlug}', -1)" aria-label="Anterior">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <button class="nav-arrow" id="next-${catSlug}" onclick="scrollFila('${catSlug}', 1)" aria-label="Siguiente">
                        <i class="bi bi-chevron-right"></i>
                    </button>
               </div>`
            : `<span class="nav-counter nav-counter--static">${cantidadTexto}</span>`;

        seccionesHtml += `
            <div class="catalog-section" id="seccion-${catSlug}" data-categoria="${catSlug}" style="animation-delay: ${Math.min(index, 6) * 70}ms;">
                <div class="section-top">
                    <h2 class="catalog-section-label">
                        <i class="bi bi-collection me-2"></i>${catName}
                    </h2>
                    ${navHtml}
                </div>
                <div class="catalog-grid ${esVistaGeneral ? 'catalog-grid--carousel' : 'catalog-grid--full'}" id="grid-${catSlug}">
                    ${items.map(m => crearTarjetaHtml(m, catName)).join('')}
                </div>
            </div>
        `;
    });

    const categoryFilters = document.getElementById('category-filters');
    if (categoryFilters) categoryFilters.innerHTML = botonesHtml;
    container.innerHTML = seccionesHtml;

    // Carruseles: calcular si hay contenido suficiente para deslizar y dejar
    // escuchando el scroll de cada fila para habilitar/deshabilitar sus flechas.
    if (esVistaGeneral) initCarruseles();

    // Animación de aparición: las tarjetas entran con un leve fade + desplazamiento
    // a medida que se hacen visibles, en vez de "aparecer cortadas" de golpe.
    activarRevealAnimado();
}

// ── Carrusel horizontal (vista "Todos") ────────────────────────────────────
// Desliza una fila de categoría. Se mueve el ancho de ~2 tarjetas en desktop
// y 1 en mobile, con scroll suave nativo (sin reflow manual ni recorte de tarjetas).
function scrollFila(sec, dir) {
    const grid = document.getElementById('grid-' + sec);
    if (!grid) return;

    const primeraCard = grid.querySelector('.cat-card');
    const anchoCard = primeraCard ? primeraCard.getBoundingClientRect().width : 260;
    const gap = 20;
    const tarjetasPorSalto = window.innerWidth < 768 ? 1 : 2;

    grid.scrollBy({ left: dir * (anchoCard + gap) * tarjetasPorSalto, behavior: 'smooth' });
}

// Habilita/deshabilita las flechas según cuánto se pueda seguir deslizando, y
// oculta la navegación por completo si la fila ya cabe entera en pantalla.
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

// Registra el estado inicial de flechas de cada carrusel presente en el DOM y
// deja un listener de scroll por fila para irlas actualizando mientras se desliza.
// Se llama de nuevo en cada render, pero como los grids viejos se reemplazan por
// completo (container.innerHTML), los listeners de las filas anteriores se
// descartan junto con esos nodos — no hay acumulación de listeners huérfanos.
function initCarruseles() {
    document.querySelectorAll('.catalog-grid--carousel').forEach(grid => {
        actualizarFlechasCarrusel(grid);
        grid.addEventListener('scroll', () => actualizarFlechasCarrusel(grid), { passive: true });
    });
}

// ── Animación de aparición ──────────────────────────────────────────────────
// Cada tarjeta arranca "oculta" (opacity 0 + leve desplazamiento) y se revela con
// una transición suave apenas entra en el viewport, en vez de aparecer de golpe.
// Funciona igual para la grilla vertical (se revela al bajar) y para el carrusel
// (se revela al deslizar hacia los lados, porque IntersectionObserver también
// reacciona al scroll horizontal de un contenedor con overflow).
function activarRevealAnimado() {
    const cards = document.querySelectorAll('.catalog-grid .cat-card');
    if (!cards.length) return;

    if (!('IntersectionObserver' in window)) return; // sin soporte: quedan visibles por defecto

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

function abrirModal(nombre, precio, medidas, categoria, imagenSrc, productoId = '') {
    document.getElementById('m-nombre').innerText = nombre;
    document.getElementById('m-precio').innerText = precio;

    const medidasLimpias = medidas.replace(/^medidas:\s*/i, '').trim();
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

    document.getElementById('m-imagen').src = imagenSrc;
    document.getElementById('m-imagen').onerror = function() {
        this.src = 'http://localhost:5000/static/imagenes/producto-placeholder.jpg';
    };
    
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

    allMuebles = muebles;

    // Calcular precio máximo para el slider
    const maxPrecio = Math.max(...muebles.map(m => parseFloat(m.precio_venta ?? m.precio_costo ?? 0)).filter(p => !Number.isNaN(p)));
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

    // Configurar event listeners para filtros
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            filtrarCatalogo();
        });
    }

    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            currentMaxPrice = Number(e.target.value);
            if (priceValue) {
                priceValue.textContent = '$' + currentMaxPrice.toLocaleString('es-CL');
            }
            filtrarCatalogo();
        });
    }

    // Renderizar catálogo inicial con todos los productos
    filtrarCatalogo();
}

var resizeTimer;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        document.querySelectorAll('.catalog-grid--carousel').forEach(actualizarFlechasCarrusel);
    }, 150);
});

document.addEventListener('DOMContentLoaded', function () {
    cargarMuebles();
});