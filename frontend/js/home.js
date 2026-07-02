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
            const precioVenta = parseFloat(m.precio_venta || m.precio_costo || 0);
            const precioFormateado = '$' + precioVenta.toLocaleString('es-CL');
            const imgPath = m.imagen ? `http://localhost:5000/static/imagenes/${m.imagen}` : 'http://localhost:5000/static/imagenes/producto-placeholder.jpg';
            const nombreEscaped = (m.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

            return `
                <div class="col-md-4">
                    <div class="product-item-clean">
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
