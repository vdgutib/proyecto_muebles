document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('destacados-container');
    if (!container) return;

    try {
        const muebles = await api.getDestacados();

        if (muebles.error || muebles.length === 0) {
            container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">No hay productos destacados disponibles en este momento.</p></div>';
            return;
        }

        container.innerHTML = muebles.map(m => {
            const precioVenta = parseFloat(m.precio_venta ?? m.precio_costo ?? 0);
            const precioFormateado = '$' + precioVenta.toLocaleString('es-CL');
            const imgPath = m.imagen ? `http://localhost:5000/static/imagenes/${m.imagen}` : 'http://localhost:5000/static/imagenes/producto-placeholder.jpg';
            const sanitize = (str) => String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');

            const nombreEscaped = sanitize(m.nombre);
            const catNameEscaped = sanitize(m.nombre_categoria || 'Sin Categoría');
            const medidasEscaped = sanitize(m.medidas || 'N/A');
            const productoId = m.id_mueble || '';
            const onClickStr = `abrirModal('${nombreEscaped}', '${precioFormateado}', '${medidasEscaped}', '${catNameEscaped}', '${imgPath}', '${productoId}')`;

            return `
                <div class="col-md-4">
                    <div class="product-item-clean" style="cursor: pointer;" onclick="${onClickStr}">
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
});

function abrirModal(nombre, precio, medidas, categoria, imagenSrc, productoId = '') {
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

    document.getElementById('m-imagen').src = imagenSrc;
    document.getElementById('m-imagen').onerror = function () {
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