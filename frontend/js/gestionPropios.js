let categoriasPropias = [];
let mueblesPropios = [];
let archivosImagenes = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    cargarCategorias();
    cargarMuebles();

    // Eventos modales
    document.getElementById('btn-gestionar-categorias').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('modalCategorias'));
        modal.show();
    });

    document.getElementById('btn-nuevo-mueble').addEventListener('click', () => {
        document.getElementById('form-mueble-propio').reset();
        document.getElementById('mueble-id').value = '';
        document.getElementById('modal-mueble-title').innerText = 'Agregar Mueble Propio';
        archivosImagenes = [];
        actualizarPreviewImagenes();
        const modal = new bootstrap.Modal(document.getElementById('modalMueblePropio'));
        modal.show();
    });

    // Formulario de categoría
    document.getElementById('form-categoria').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('nueva-categoria-nombre');
        const nombre = input.value.trim();
        if(!nombre) return;

        const res = await api.createCategoriaPropia(nombre);
        if(res.status === 'success') {
            input.value = '';
            await cargarCategorias();
        } else {
            mostrarModalError(res.error || 'Error al crear categoría');
        }
    });

    // Guardar mueble
    document.getElementById('btn-guardar-mueble').addEventListener('click', async () => {
        const id = document.getElementById('mueble-id').value;
        const nombre = document.getElementById('mueble-nombre').value.trim();
        const categoria_id = document.getElementById('mueble-categoria').value;
        const precio = document.getElementById('mueble-precio').value;
        
        if(!nombre || !categoria_id || !precio) {
            mostrarModalAdvertencia('Nombre, Categoría y Precio son obligatorios');
            return;
        }

        const data = {
            nombre,
            categoria_id: parseInt(categoria_id),
            precio: parseInt(precio),
            descripcion: document.getElementById('mueble-descripcion').value.trim(),
            video_url: document.getElementById('mueble-video').value.trim(),
            medidas: document.getElementById('mueble-medidas').value.trim()
        };

        // Subir imagenes si hay nuevas
        const inputFiles = document.getElementById('file-imagenes').files;
        if(inputFiles.length > 0) {
            const uploadRes = await api.subirImagenes(inputFiles);
            if(uploadRes.status === 'success') {
                // Combinar las imagenes ya existentes con las nuevas
                const urlsExistentes = archivosImagenes.filter(f => typeof f === 'string');
                data.imagenes = [...urlsExistentes, ...uploadRes.guardadas];
            } else {
                mostrarModalError('Error al subir imágenes: ' + uploadRes.error);
                return;
            }
        } else {
            // Solo las existentes
            data.imagenes = archivosImagenes.filter(f => typeof f === 'string');
        }

        let res;
        if(id) {
            res = await api.updateMueblePropio(id, data);
        } else {
            res = await api.createMueblePropio(data);
        }

        if(res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalMueblePropio')).hide();
            cargarMuebles();
        } else {
            mostrarModalError(res.error || 'Error al guardar mueble');
        }
    });

    // Drag and drop para imágenes
    const dropZone = document.getElementById('drop-zone-imagenes');
    const fileInput = document.getElementById('file-imagenes');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#e9ecef';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = '';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '';
        if(e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if(e.target.files.length) {
            handleFiles(e.target.files);
        }
    });

});

function handleFiles(files) {
    // Al seleccionar nuevos archivos, los mantenemos en el input
    // Y visualmente mostramos placeholders
    archivosImagenes = archivosImagenes.filter(f => typeof f === 'string'); // conservar urls viejas
    for(let f of files) {
        archivosImagenes.push(f);
    }
    actualizarPreviewImagenes();
}

function actualizarPreviewImagenes() {
    const container = document.getElementById('preview-imagenes');
    container.innerHTML = '';
    
    archivosImagenes.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'preview-img-container';
        
        let src = '';
        if(typeof item === 'string') {
            src = `http://localhost:5000/static/imagenes/${item}`;
        } else {
            src = URL.createObjectURL(item);
        }

        div.innerHTML = `
            <img src="${src}" alt="Preview">
            <button type="button" class="btn-remove" onclick="removerImagen(${index})"><i class="bi bi-x"></i></button>
        `;
        container.appendChild(div);
    });
}

window.removerImagen = function(index) {
    archivosImagenes.splice(index, 1);
    
    // Sincronizar con el input type file si es que borramos una recien añadida
    const nuevas = archivosImagenes.filter(f => typeof f !== 'string');
    const dt = new DataTransfer();
    nuevas.forEach(f => dt.items.add(f));
    document.getElementById('file-imagenes').files = dt.files;

    actualizarPreviewImagenes();
};

// modal.js usa un unico modal global. Despues de confirmar, ese modal se esta cerrando y
// Bootstrap ignora un show() hecho mientras tanto, asi que se espera a que termine de cerrarse
// antes de mostrar un mensaje de error.
function esperarCierreModalGlobal() {
    return new Promise(resolve => {
        const el = document.getElementById('global-modal');
        if (!el || getComputedStyle(el).display === 'none') return resolve();
        el.addEventListener('hidden.bs.modal', () => resolve(), { once: true });
    });
}

async function cargarCategorias() {
    categoriasPropias = await api.getCategoriasPropias();
    if(categoriasPropias.error) return;

    // Actualizar select del modal
    const select = document.getElementById('mueble-categoria');
    select.innerHTML = '<option value="">Seleccione...</option>';
    
    // Actualizar lista del modal de categorias
    const lista = document.getElementById('lista-categorias');
    lista.innerHTML = '';

    categoriasPropias.forEach(c => {
        // En select de crear
        select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        
        // En lista de admin
        lista.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${c.nombre}
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarCategoria(${c.id})"><i class="bi bi-trash"></i></button>
            </li>
        `;
    });
}

window.eliminarCategoria = function(id) {
    mostrarModalConfirmacion(
        'Eliminar categoría',
        '¿Seguro que deseas eliminar esta categoría? Si hay muebles asociados a ella, no se podrá eliminar.',
        async () => {
            const res = await api.deleteCategoriaPropia(id);
            if(res.status === 'success') {
                cargarCategorias();
            } else {
                await esperarCierreModalGlobal();
                mostrarModalError(res.error || 'Error al eliminar');
            }
        }
    );
};

async function cargarMuebles() {
    const tbody = document.getElementById('tabla-muebles-propios');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Cargando...</td></tr>';
    
    mueblesPropios = await api.getMueblesPropios(true); // solo activos: los eliminados (borrado logico) no deben aparecer
    tbody.innerHTML = '';
    
    if(mueblesPropios.error) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error cargando muebles</td></tr>';
        return;
    }

    if(mueblesPropios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Aún no has agregado muebles propios.</td></tr>';
        return;
    }

    mueblesPropios.forEach(m => {
        let imgHtml = '<div style="width:60px;height:60px;background:#f8f9fa;border-radius:8px;display:flex;align-items:center;justify-content:center;border:1px solid #ccc;"><i class="bi bi-image text-muted"></i></div>';
        if(m.imagenes && m.imagenes.length > 0) {
            imgHtml = `<img src="http://localhost:5000/static/imagenes/${m.imagenes[0]}" class="img-thumbnail-table">`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td class="fw-bold">${m.nombre}</td>
            <td><span class="badge" style="background-color: var(--royal-violet);">${m.nombre_categoria}</span></td>
            <td>$${m.precio.toLocaleString('es-CL')}</td>
            <td>${m.video_url ? '<i class="bi bi-check-circle-fill text-success"></i> Sí' : '<i class="bi bi-x-circle text-muted"></i> No'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editarMueble(${m.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarMueble(${m.id})"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editarMueble = function(id) {
    const m = mueblesPropios.find(x => x.id === id);
    if(!m) return;

    document.getElementById('mueble-id').value = m.id;
    document.getElementById('mueble-nombre').value = m.nombre;
    document.getElementById('mueble-categoria').value = m.categoria_id;
    document.getElementById('mueble-precio').value = m.precio;
    document.getElementById('mueble-medidas').value = m.medidas || '';
    document.getElementById('mueble-descripcion').value = m.descripcion || '';
    document.getElementById('mueble-video').value = m.video_url || '';
    
    archivosImagenes = m.imagenes ? [...m.imagenes] : [];
    document.getElementById('file-imagenes').value = '';
    actualizarPreviewImagenes();

    document.getElementById('modal-mueble-title').innerText = 'Editar Mueble Propio';
    const modal = new bootstrap.Modal(document.getElementById('modalMueblePropio'));
    modal.show();
};

window.eliminarMueble = function(id) {
    mostrarModalConfirmacion(
        'Eliminar mueble',
        '¿Seguro que deseas eliminar este mueble propio?',
        async () => {
            const res = await api.deleteMueblePropio(id);
            if(res.status === 'success') {
                cargarMuebles();
            } else {
                await esperarCierreModalGlobal();
                mostrarModalError(res.error || 'Error al eliminar');
            }
        }
    );
};

window.cerrarSesion = function() {
    localStorage.removeItem('token');
    window.location.replace('login.html');
}

window.volverInicio = function() {
    localStorage.removeItem('token');
    window.location.replace('home.html');
}