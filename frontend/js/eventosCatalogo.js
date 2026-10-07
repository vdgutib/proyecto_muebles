let allMueblesExternos = [];
let allMueblesPropios = [];

let state = {
    q: '',
    origen: 'todos', // todos, propia, tiendas
    cat: 'todos',
    precioMax: 1000000,
    precioMin: 0,
    video: false,
    sort: 'relevancia'
};

let maxGlobalPrecio = 1000000;

function initFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('q')) state.q = params.get('q');
    if (params.has('origen')) state.origen = params.get('origen');
    if (params.has('cat')) state.cat = params.get('cat');
    if (params.has('precioMax')) state.precioMax = Number(params.get('precioMax'));
    if (params.has('precioMin')) state.precioMin = Number(params.get('precioMin'));
    if (params.has('video')) state.video = params.get('video') === 'true';
    if (params.has('sort')) state.sort = params.get('sort');

    syncUIWithState();
}

function syncUIWithState() {
    const searchInput = document.getElementById('filter-search');
    if (searchInput) searchInput.value = state.q;

    document.querySelectorAll('.filter-origin').forEach(r => {
        r.checked = (r.value === state.origen);
    });

    const minInput = document.getElementById('filter-price-min');
    if (minInput) minInput.value = state.precioMin || '';

    const maxInput = document.getElementById('filter-price-max');
    if (maxInput) maxInput.value = state.precioMax < maxGlobalPrecio ? state.precioMax : '';

    const videoInput = document.getElementById('filter-video');
    if (videoInput) videoInput.checked = state.video;

    const sortInput = document.getElementById('filter-sort');
    if (sortInput) sortInput.value = state.sort;
}

function updateUrl() {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.origen !== 'todos') params.set('origen', state.origen);
    if (state.cat !== 'todos') params.set('cat', state.cat);
    if (state.precioMax < maxGlobalPrecio) params.set('precioMax', state.precioMax);
    if (state.precioMin > 0) params.set('precioMin', state.precioMin);
    if (state.video) params.set('video', 'true');
    if (state.sort !== 'relevancia') params.set('sort', state.sort);

    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newUrl);
}

function sanitize(str) {
    return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');
}

function toSlug(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// Búsqueda con debounce
let searchTimeout;
function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        state.q = e.target.value.toLowerCase().trim();
        applyFilters();
    }, 250);
}

function bindEvents() {
    const searchInput = document.getElementById('filter-search');
    if (searchInput) searchInput.addEventListener('input', handleSearch);

    document.querySelectorAll('.filter-origin').forEach(r => {
        r.addEventListener('change', (e) => {
            state.origen = e.target.value;
            state.cat = 'todos'; // Reset category when origin changes
            applyFilters();
        });
    });

    const btnPrecio = document.getElementById('btn-aplicar-precio');
    if (btnPrecio) {
        btnPrecio.addEventListener('click', () => {
            const minV = Number(document.getElementById('filter-price-min').value);
            const maxV = Number(document.getElementById('filter-price-max').value);
            state.precioMin = minV > 0 ? minV : 0;
            state.precioMax = maxV > 0 ? maxV : maxGlobalPrecio;
            applyFilters();
        });
    }

    const videoInput = document.getElementById('filter-video');
    if (videoInput) {
        videoInput.addEventListener('change', (e) => {
            state.video = e.target.checked;
            applyFilters();
        });
    }

    const sortInput = document.getElementById('filter-sort');
    if (sortInput) {
        sortInput.addEventListener('change', (e) => {
            state.sort = e.target.value;
            applyFilters();
        });
    }

    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            state = { q: '', origen: 'todos', cat: 'todos', precioMax: maxGlobalPrecio, precioMin: 0, video: false, sort: 'relevancia' };
            syncUIWithState();
            updateUrl();
            applyFilters();
        });
    }
}

function setCategoria(cat) {
    state.cat = cat;
    applyFilters();
}

function removeFilter(key) {
    if (key === 'q') {
        state.q = '';
        const searchInput = document.getElementById('filter-search');
        if (searchInput) searchInput.value = '';
    }
    if (key === 'origen') state.origen = 'todos';
    if (key === 'cat') state.cat = 'todos';
    if (key === 'precio') {
        state.precioMax = maxGlobalPrecio;
        state.precioMin = 0;
        const minInput = document.getElementById('filter-price-min');
        const maxInput = document.getElementById('filter-price-max');
        if (minInput) minInput.value = '';
        if (maxInput) maxInput.value = '';
    }
    if (key === 'video') {
        state.video = false;
        const videoInput = document.getElementById('filter-video');
        if (videoInput) videoInput.checked = false;
    }
    
    // update inputs
    document.querySelectorAll('.filter-origin').forEach(r => {
        r.checked = (r.value === state.origen);
    });

    applyFilters();
}

function renderChips() {
    const chipsContainer = document.getElementById('active-filters-chips');
    if (!chipsContainer) return;
    
    let html = '';
    let hasFilters = false;

    const makeChip = (label, key) => `
        <span class="badge bg-light text-dark border rounded-pill px-3 py-2 d-flex align-items-center gap-2" style="font-size: 0.85rem;">
            ${label}
            <i class="bi bi-x-circle-fill text-muted" style="cursor: pointer;" onclick="removeFilter('${key}')"></i>
        </span>
    `;

    if (state.q) {
        html += makeChip(`Búsqueda: "${state.q}"`, 'q');
        hasFilters = true;
    }
    // No mostramos chip de origen porque ya está como título de sección
    // Pero si quieren un chip
    if (state.cat !== 'todos') {
        // Encontrar el nombre real de la categoría
        html += makeChip(`Categoría: ${state.cat}`, 'cat');
        hasFilters = true;
    }
    if (state.precioMax < maxGlobalPrecio || state.precioMin > 0) {
        const minText = state.precioMin > 0 ? `$${state.precioMin.toLocaleString('es-CL')}` : '$0';
        const maxText = state.precioMax < maxGlobalPrecio ? `$${state.precioMax.toLocaleString('es-CL')}` : 'Max';
        html += makeChip(`Precio: ${minText} - ${maxText}`, 'precio');
        hasFilters = true;
    }
    if (state.video) {
        html += makeChip(`Solo con video`, 'video');
        hasFilters = true;
    }

    if (hasFilters) {
        html += `<button class="btn btn-sm btn-link text-decoration-none text-danger p-0 ms-2" onclick="document.getElementById('btn-limpiar-filtros').click()">Limpiar todo</button>`;
    }

    chipsContainer.innerHTML = html;
    
    // count filters mobile
    const mc = document.getElementById('filtros-count-mobile');
    if (mc) {
        let count = (state.q?1:0) + (state.origen!=='todos'?1:0) + (state.cat!=='todos'?1:0) + (state.precioMax<maxGlobalPrecio?1:0) + (state.video?1:0);
        mc.textContent = count;
    }
}

function getBaseMuebles() {
    let base = [];
    if (state.origen === 'todos' || state.origen === 'propia') {
        base = base.concat(allMueblesPropios);
    }
    if (state.origen === 'todos' || state.origen === 'tiendas') {
        base = base.concat(allMueblesExternos);
    }
    return base;
}

function normalizarTexto(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function applyFilters() {
    updateUrl();
    renderChips();

    const qNorm = normalizarTexto(state.q);
    
    let base = getBaseMuebles();
    let filtrados = base.filter(m => {
        const p = Number(m.precio_venta ?? m.precio_costo ?? m.precio ?? 0);
        if (p > state.precioMax || p < state.precioMin) return false;
        
        if (state.video) {
            if (m.tipo !== 'propio' || !m.video_url) return false;
        }

        if (state.cat !== 'todos') {
            const catSlug = toSlug(m.nombre_categoria || 'Sin Categoría');
            if (catSlug !== state.cat) return false;
        }

        if (qNorm) {
            const nomNorm = normalizarTexto(m.nombre || '');
            if (!nomNorm.includes(qNorm)) return false;
        }

        return true;
    });

    const videoContainer = document.getElementById('video-filter-container');
    if (videoContainer) {
        videoContainer.style.display = state.origen === 'tiendas' ? 'none' : 'block';
    }

    // Ordenar
    if (state.sort === 'precio-asc') {
        filtrados.sort((a,b) => Number(a.precio_venta ?? a.precio_costo ?? a.precio ?? 0) - Number(b.precio_venta ?? b.precio_costo ?? b.precio ?? 0));
    } else if (state.sort === 'precio-desc') {
        filtrados.sort((a,b) => Number(b.precio_venta ?? b.precio_costo ?? b.precio ?? 0) - Number(a.precio_venta ?? a.precio_costo ?? a.precio ?? 0));
    } else if (state.sort === 'nombre-asc') {
        filtrados.sort((a,b) => (a.nombre||'').localeCompare(b.nombre||''));
    }

    renderCategoriesSidebar(base);
    renderCatalogContent(filtrados);

    const countEl = document.getElementById('resultados-count');
    if (countEl) countEl.textContent = filtrados.length;
}

function renderCategoriesSidebar(baseMuebles) {
    const container = document.getElementById('filter-categories-container');
    if (!container) return;

    // Calcular conteos según los filtros ACTUALES excluyendo la categoría misma
    // Para que el conteo refleje cuántos habrán si haces clic
    const catsPropios = {};
    const catsTiendas = {};

    let currentFiltrados = baseMuebles.filter(m => {
        const p = Number(m.precio_venta ?? m.precio_costo ?? m.precio ?? 0);
        if (p > state.precioMax || p < state.precioMin) return false;
        if (state.video && (m.tipo !== 'propio' || !m.video_url)) return false;
        const qNorm = normalizarTexto(state.q);
        if (qNorm) {
            const nomNorm = normalizarTexto(m.nombre || '');
            if (!nomNorm.includes(qNorm)) return false;
        }
        return true;
    });

    currentFiltrados.forEach(m => {
        const cat = m.nombre_categoria || 'Sin Categoría';
        const slug = toSlug(cat);
        if (m.tipo === 'propio') {
            if (!catsPropios[slug]) catsPropios[slug] = { nombre: cat, count: 0 };
            catsPropios[slug].count++;
        } else {
            if (!catsTiendas[slug]) catsTiendas[slug] = { nombre: cat, count: 0 };
            catsTiendas[slug].count++;
        }
    });

    let html = `
        <div class="form-check custom-radio mb-2">
            <input class="form-check-input" type="radio" name="cat" id="cat-todos" value="todos" ${state.cat === 'todos' ? 'checked' : ''} onchange="setCategoria('todos')">
            <label class="form-check-label w-100 d-flex justify-content-between" for="cat-todos">
                <span>Todas las categorías</span>
            </label>
        </div>
    `;

    const renderList = (catDict) => {
        return Object.keys(catDict).sort().map(slug => {
            const item = catDict[slug];
            const isChecked = state.cat === slug ? 'checked' : '';
            return `
                <div class="form-check custom-radio mb-2 ms-2">
                    <input class="form-check-input" type="radio" name="cat" id="cat-${slug}" value="${slug}" ${isChecked} onchange="setCategoria('${slug}')">
                    <label class="form-check-label w-100 d-flex justify-content-between text-muted" for="cat-${slug}">
                        <span>${item.nombre}</span>
                        <span class="badge bg-light text-dark rounded-pill border">${item.count}</span>
                    </label>
                </div>
            `;
        }).join('');
    };

    if (state.origen === 'todos') {
        if (Object.keys(catsPropios).length > 0) {
            html += `<h6 class="mt-3 mb-2 ps-2 text-dark" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Línea Propia</h6>`;
            html += renderList(catsPropios);
        }
        if (Object.keys(catsTiendas).length > 0) {
            html += `<h6 class="mt-3 mb-2 ps-2 text-dark" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Tiendas</h6>`;
            html += renderList(catsTiendas);
        }
    } else if (state.origen === 'propia') {
        html += renderList(catsPropios);
    } else {
        html += renderList(catsTiendas);
    }

    container.innerHTML = html;
}

function crearTarjetaHtml(m) {
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

    const nombreEscaped = sanitize(m.nombre);
    const catNameEscaped = sanitize(m.nombre_categoria || 'Sin Categoría');
    const medidasEscaped = sanitize(m.medidas || 'N/A');
    imagenesStr = sanitize(imagenesStr);
    const videoUrlStr = sanitize(m.video_url || '');

    const prodId = isPropio ? `P_${m.id}` : `E_${m.id_mueble}`;

    const onClickStr = `abrirModal('${nombreEscaped}', '${precioFormateado}', '${medidasEscaped}', '${catNameEscaped}', '${imagenesStr}', '${videoUrlStr}', '${prodId}')`;

    let extraBadge = '';
    let extraIcon = '';
    if (isPropio) {
        extraBadge = `<span class="badge position-absolute top-0 end-0 m-2" style="background-color: var(--royal-violet); z-index: 2; border: 1px solid rgba(255,255,255,0.2);">Línea Propia</span>`;
        if (m.video_url) {
            extraIcon = `<div class="position-absolute bottom-0 start-0 m-2" style="z-index: 2;"><i class="bi bi-play-circle-fill fs-4 text-white" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i></div>`;
        }
    }

    let cardClass = isPropio ? 'cat-card compra cat-card--propio position-relative h-100' : 'cat-card compra position-relative h-100';
    
    const desc = (m.observaciones || m.descripcion || '').trim();
    const descHtml = desc ? `<p class="cat-card-desc">${desc}</p>` : '';

    return `
        <div class="${cardClass}" onclick="${onClickStr}">
            ${extraBadge}
            <div class="cat-card-img position-relative">
                <img src="${imgPath}" alt="${nombreEscaped}" onerror="this.src='http://localhost:5000/static/imagenes/producto-placeholder.jpg'">
                ${extraIcon}
            </div>
            <div class="cat-card-info">
                <h5 class="cat-card-name">${nombreEscaped}</h5>
                ${descHtml}
                <span class="cat-card-price">${precioFormateado}</span>
            </div>
        </div>
    `;
}

function renderCatalogContent(filtrados) {
    const container = document.getElementById('catalog-content-area');
    if (!container) return;

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div class="alert alert-light border text-center py-5 rounded-4 mt-3">
                <i class="bi bi-search fs-1 text-muted mb-3 d-block"></i>
                <h5 class="text-dark">No se encontraron productos</h5>
                <p class="text-muted">Intenta ajustando o limpiando los filtros actuales.</p>
                <button class="btn btn-outline-primary rounded-pill px-4 mt-2" onclick="document.getElementById('btn-limpiar-filtros').click()">Limpiar filtros</button>
            </div>
        `;
        return;
    }

    // Agrupar por tipo y categoría
    const propios = filtrados.filter(m => m.tipo === 'propio');
    const tiendas = filtrados.filter(m => m.tipo !== 'propio');

    let html = '';

    const renderGroup = (items, isPropioGroup) => {
        if (items.length === 0) return '';
        
        let groupHtml = '';
        const cats = {};
        items.forEach(m => {
            const c = m.nombre_categoria || 'Sin Categoría';
            if (!cats[c]) cats[c] = [];
            cats[c].push(m);
        });

        const esVistaGeneral = state.cat === 'todos';
        
        Object.keys(cats).sort().forEach(catName => {
            const itemsCat = cats[catName];
            const catSlug = toSlug(catName);
            const isCarousel = esVistaGeneral;
            const itemsAMostrar = isCarousel ? itemsCat.slice(0, 8) : itemsCat;
            const suf = isPropioGroup ? '-propio' : '-tienda';

            const cantidadTexto = itemsCat.length + (itemsCat.length === 1 ? ' producto' : ' productos');
            
            let headerHtml = '';
            
            // Si es línea propia y vista específica de cat (o hay solo 1 cat total en propios), no repetir el título si ya estamos en un filtro, pero el requerimiento dice: 
            // "Línea propia: sin título de categoría ni 'Todos' si hay una sola categoría".
            // Para mantener consistencia, mostramos el título a menos que sea la única categoría de la vista.
            const hideHeader = isPropioGroup && Object.keys(cats).length === 1 && state.origen === 'propia';

            if (!hideHeader) {
                const navHtml = isCarousel && itemsCat.length > 0
                    ? `<div class="section-nav" id="nav-${catSlug}${suf}">
                            <span class="nav-counter">${cantidadTexto}</span>
                            <button class="nav-arrow" id="prev-${catSlug}${suf}" onclick="scrollFila('${catSlug}${suf}', -1)" aria-label="Anterior">
                                <i class="bi bi-chevron-left"></i>
                            </button>
                            <button class="nav-arrow" id="next-${catSlug}${suf}" onclick="scrollFila('${catSlug}${suf}', 1)" aria-label="Siguiente">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                       </div>`
                    : `<span class="nav-counter nav-counter--static">${cantidadTexto}</span>`;

                headerHtml = `
                    <div class="section-top align-items-center mt-4">
                        <h2 class="catalog-section-label mb-0 fs-5 text-dark">
                            ${catName} <span class="ms-2 fs-6 text-muted fw-normal">(${cantidadTexto})</span>
                        </h2>
                        ${isCarousel ? navHtml : ''}
                    </div>
                `;
            }

            let linkVerTodosHtml = '';
            if (isCarousel && itemsCat.length > 8) {
                linkVerTodosHtml = `<div class="mt-3 text-end"><button class="btn btn-link text-decoration-none p-0" style="color: var(--royal-violet); font-weight: 600;" onclick="setCategoria('${catSlug}')">Ver todos (${itemsCat.length}) &rarr;</button></div>`;
            }

            groupHtml += `
                <div class="catalog-section mb-5" id="seccion-${catSlug}${suf}">
                    ${headerHtml}
                    <div class="catalog-grid ${isCarousel ? 'catalog-grid--carousel' : 'catalog-grid--full'}" id="grid-${catSlug}${suf}">
                        ${itemsAMostrar.map(m => crearTarjetaHtml(m)).join('')}
                    </div>
                    ${linkVerTodosHtml}
                </div>
            `;
        });
        return groupHtml;
    };

    if (state.origen === 'todos') {
        if (window._errorSecciones?.pro) {
            html += `<div class="alert alert-danger">Error al cargar la Línea Propia.</div>`;
        } else if (propios.length > 0) {
            html += `
                <div class="origin-block mb-5">
                    <h4 class="mb-3 text-uppercase fw-bold" style="color: var(--royal-violet); font-size: 1rem; letter-spacing: 1px;">Línea Propia</h4>
                    ${renderGroup(propios, true)}
                </div>
            `;
        }
        
        if (window._errorSecciones?.ext) {
            html += `<div class="alert alert-danger">Error al cargar las Tiendas.</div>`;
        } else if (tiendas.length > 0) {
            html += `
                <div class="origin-block">
                    <h4 class="mb-3 text-uppercase fw-bold text-muted" style="font-size: 1rem; letter-spacing: 1px;">Tiendas</h4>
                    ${renderGroup(tiendas, false)}
                </div>
            `;
        }
    } else if (state.origen === 'propia') {
        if (window._errorSecciones?.pro) {
            html += `<div class="alert alert-danger">Error al cargar la Línea Propia.</div>`;
        } else {
            html += renderGroup(propios, true);
        }
    } else {
        if (window._errorSecciones?.ext) {
            html += `<div class="alert alert-danger">Error al cargar las Tiendas.</div>`;
        } else {
            html += renderGroup(tiendas, false);
        }
    }

    container.innerHTML = html;

    if (state.cat === 'todos') {
        initCarruseles();
    }
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

function initCarruseles() {
    document.querySelectorAll('.catalog-grid--carousel').forEach(grid => {
        actualizarFlechasCarrusel(grid);
        grid.addEventListener('scroll', () => actualizarFlechasCarrusel(grid), { passive: true });
    });
}

var resizeTimer;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        document.querySelectorAll('.catalog-grid--carousel').forEach(actualizarFlechasCarrusel);
        
        // Manejar offcanvas filters responsiveness
        const desktopContainer = document.getElementById('filters-desktop-container');
        const mobileContainer = document.getElementById('mobile-filters-container');
        const content = document.getElementById('filters-content');
        if (!content) return;
        
        if (window.innerWidth >= 992) {
            if (mobileContainer && mobileContainer.contains(content)) {
                desktopContainer.appendChild(content);
            }
        } else {
            if (desktopContainer && desktopContainer.contains(content)) {
                mobileContainer.appendChild(content);
            }
        }

    }, 150);
});

async function cargarMueblesTodos() {
    const [mueblesExt, mueblesPro] = await Promise.all([
        api.getMuebles().catch(() => ({error: true})),
        api.getMueblesPropios().catch(() => ({error: true}))
    ]);

    let hayErrorExt = false;
    let hayErrorPro = false;

    if (mueblesExt.error) {
        hayErrorExt = true;
    } else {
        allMueblesExternos = mueblesExt || [];
    }

    if (mueblesPro.error) {
        hayErrorPro = true;
    } else {
        allMueblesPropios = mueblesPro || [];
    }
    
    // Guardar estado de error global
    window._errorSecciones = { ext: hayErrorExt, pro: hayErrorPro };

    // Calcular max precio global inicial
    const preciosExt = allMueblesExternos.map(m => parseFloat(m.precio_venta ?? m.precio_costo ?? 0)).filter(p => !Number.isNaN(p));
    const preciosPro = allMueblesPropios.map(m => parseFloat(m.precio ?? 0)).filter(p => !Number.isNaN(p));
    const maxCombo = Math.max(0, ...preciosExt, ...preciosPro);
    
    // No re-establecer max global sobre el filtro
    maxGlobalPrecio = maxCombo > 0 ? maxCombo : 1000000;
    
    const maxInput = document.getElementById('filter-price-max');
    if (maxInput) {
        maxInput.placeholder = 'Máx: $' + maxGlobalPrecio.toLocaleString('es-CL');
    }
    
    bindEvents();
    
    // Trigger resize once to move filters content to correct container on load
    window.dispatchEvent(new Event('resize'));

    applyFilters();
}

function abrirModal(nombre, precio, medidas, categoria, imagenesStr, videoUrlStr, productoId = '') {
    // ... same exact modal logic as before
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
        imagenes.forEach((img, index) => {
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
        let embedUrl = videoUrlStr;
        // Si es solo el ID de 11 caracteres (nuevo formato)
        if (videoUrlStr && videoUrlStr.length === 11 && !videoUrlStr.includes('/')) {
            embedUrl = `https://www.youtube.com/embed/${videoUrlStr}`;
        } else if (videoUrlStr.includes('watch?v=')) {
            embedUrl = videoUrlStr.replace('watch?v=', 'embed/');
        } else if (videoUrlStr.includes('youtu.be/')) {
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

document.addEventListener('DOMContentLoaded', function () {
    initFiltersFromUrl();
    cargarMueblesTodos();
    
    // Detener videos al cerrar el modal
    const modalEl = document.getElementById('modalProducto');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', function () {
            const inner = document.getElementById('m-carrusel-inner');
            if (inner) inner.innerHTML = '';
        });
    }
});