/* Carga multiple de muebles propios: varios muebles de una misma categoria en una sola operacion.
 * Depende de gestionPropios.js (categoriasPropias, mueblesPropios, cargarMuebles, escaparHtml,
 * normalizarTexto, esperarCierreModalGlobal), de formatoMuebles.js y de modal.js.
 */
const CargaMultiple = (() => {
    const FILAS_INICIALES = 3;
    const FILAS_MAX = 50;      // mismo limite que el backend (LOTE_MAX)
    const FOTOS_MAX = 10;      // por mueble

    let filas = [];            // [{el, precio, medidas, archivos, subidas, ...}]
    let guardando = false;
    let modal = null;

    const $ = id => document.getElementById(id);

    const PLANTILLA = `
        <div class="lote-num" data-num></div>
        <div class="lote-campo lote-nombre">
            <label class="lote-etq">Nombre</label>
            <input type="text" class="form-control" data-nombre maxlength="150" placeholder="Ej: Velador clásico" autocomplete="off">
        </div>
        <div class="lote-campo lote-precio">
            <label class="lote-etq">Precio</label>
            <div class="input-group">
                <span class="input-group-text">$</span>
                <input type="text" class="form-control" data-precio inputmode="numeric" placeholder="150.000" autocomplete="off">
            </div>
            <div class="campo-ayuda" data-precio-hint data-tono="neutro"></div>
            <div class="chips-precio" data-precio-chips></div>
        </div>
        <div class="lote-campo lote-medidas">
            <label class="lote-etq">Medidas (cm)</label>
            <div class="medidas-grid">
                <input type="text" class="form-control medida-campo" data-ancho inputmode="decimal" placeholder="Ancho" aria-label="Ancho en cm">
                <span class="medida-x">×</span>
                <input type="text" class="form-control medida-campo" data-prof inputmode="decimal" placeholder="Prof." aria-label="Profundidad en cm">
                <span class="medida-x">×</span>
                <input type="text" class="form-control medida-campo" data-alto inputmode="decimal" placeholder="Alto" aria-label="Alto en cm">
            </div>
            <div class="campo-ayuda" data-medidas-vista data-tono="neutro"></div>
        </div>
        <div class="lote-campo lote-fotos">
            <label class="lote-etq">Fotos</label>
            <button type="button" class="btn btn-outline-violet btn-sm" data-fotos-btn><i class="bi bi-image"></i> <span data-fotos-texto>Agregar</span></button>
            <input type="file" accept="image/*" multiple hidden data-fotos-input>
            <div class="lote-miniaturas" data-miniaturas></div>
        </div>
        <div class="lote-botones">
            <button type="button" class="btn btn-sm btn-outline-secondary" data-mas title="Descripción y video" aria-label="Descripción y video" aria-expanded="false"><i class="bi bi-chevron-down"></i></button>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-duplicar title="Duplicar fila" aria-label="Duplicar fila"><i class="bi bi-copy"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-quitar title="Quitar fila" aria-label="Quitar fila"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="lote-extra" data-extra hidden>
            <div>
                <label class="lote-etq-fija">Descripción</label>
                <textarea class="form-control" data-descripcion rows="2" placeholder="Opcional"></textarea>
            </div>
            <div>
                <label class="lote-etq-fija">Link de YouTube</label>
                <input type="text" class="form-control" data-video placeholder="https://www.youtube.com/watch?v=... (opcional)" autocomplete="off">
            </div>
        </div>
        <div class="lote-error" data-error hidden role="alert"></div>
    `;

    // ---------- Filas ----------
    function crearFila(valores = {}) {
        if (filas.length >= FILAS_MAX) {
            mostrarModalAdvertencia(`Puedes crear hasta ${FILAS_MAX} muebles por vez.`);
            return null;
        }
        const el = document.createElement('div');
        el.className = 'lote-fila';
        el.innerHTML = PLANTILLA;
        const q = sel => el.querySelector(sel);

        const fila = { el, archivos: [], subidas: null, q };
        fila.precio = FormatoMuebles.enlazarPrecio(q('[data-precio]'), {
            hint: q('[data-precio-hint]'), chips: q('[data-precio-chips]'), alCambiar: () => { limpiarError(fila); actualizarResumen(); }
        });
        fila.medidas = FormatoMuebles.enlazarMedidas(
            { ancho: q('[data-ancho]'), prof: q('[data-prof]'), alto: q('[data-alto]') },
            { vista: q('[data-medidas-vista]') }
        );

        ['[data-nombre]', '[data-ancho]', '[data-prof]', '[data-alto]', '[data-descripcion]', '[data-video]'].forEach(sel =>
            q(sel).addEventListener('input', () => { limpiarError(fila); actualizarResumen(); }));

        // Enter en "Alto": pasa al nombre de la fila siguiente (crea una si es la ultima)
        q('[data-alto]').addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const i = filas.indexOf(fila);
            const sig = filas[i + 1] || crearFila();
            if (sig) sig.q('[data-nombre]').focus();
        });

        q('[data-fotos-btn]').addEventListener('click', () => q('[data-fotos-input]').click());
        q('[data-fotos-input]').addEventListener('change', e => {
            agregarFotos(fila, e.target.files);
            e.target.value = '';
        });
        q('[data-mas]').addEventListener('click', () => alternarExtra(fila));
        q('[data-duplicar]').addEventListener('click', () => duplicarFila(fila));
        q('[data-quitar]').addEventListener('click', () => quitarFila(fila));

        $('lote-filas').appendChild(el);
        filas.push(fila);

        if (valores.nombre) q('[data-nombre]').value = valores.nombre;
        if (valores.precio) fila.precio.establecer(valores.precio);
        if (valores.medidas) fila.medidas.establecer(valores.medidas);
        if (valores.descripcion) q('[data-descripcion]').value = valores.descripcion;
        if (valores.video) q('[data-video]').value = valores.video;
        if (valores.descripcion || valores.video) alternarExtra(fila, true);

        renumerar();
        return fila;
    }

    function duplicarFila(fila) {
        const q = fila.q;
        const copia = crearFila({
            nombre: q('[data-nombre]').value.trim(),
            precio: fila.precio.valor(),
            medidas: (() => { const m = fila.medidas.valor(); return m.estado === 'ok' || m.estado === 'antiguo' ? m.texto : ''; })(),
            descripcion: q('[data-descripcion]').value.trim(),
            video: q('[data-video]').value.trim()
        });
        if (!copia) return;
        // La copia queda justo debajo de la original, con el nombre seleccionado para reescribirlo
        fila.el.after(copia.el);
        filas.splice(filas.indexOf(copia), 1);
        filas.splice(filas.indexOf(fila) + 1, 0, copia);
        renumerar();
        const nombre = copia.q('[data-nombre]');
        nombre.focus(); nombre.select();
    }

    function quitarFila(fila) {
        if (filas.length === 1) { reiniciarFila(fila); return; }
        fila.archivos.forEach(a => a._url && URL.revokeObjectURL(a._url));
        fila.el.remove();
        filas.splice(filas.indexOf(fila), 1);
        renumerar();
    }

    function reiniciarFila(fila) {
        const q = fila.q;
        ['[data-nombre]', '[data-descripcion]', '[data-video]'].forEach(s => { q(s).value = ''; });
        fila.precio.reiniciar();
        fila.medidas.reiniciar();
        fila.archivos = []; fila.subidas = null;
        pintarFotos(fila);
        limpiarError(fila);
        actualizarResumen();
    }

    function alternarExtra(fila, forzar) {
        const extra = fila.q('[data-extra]');
        const abrir = forzar !== undefined ? forzar : extra.hidden;
        extra.hidden = !abrir;
        const btn = fila.q('[data-mas]');
        btn.setAttribute('aria-expanded', String(abrir));
        btn.querySelector('i').className = abrir ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
    }

    function renumerar() {
        filas.forEach((f, i) => { f.q('[data-num]').textContent = i + 1; });
        actualizarResumen();
    }

    // ---------- Fotos ----------
    function agregarFotos(fila, lista) {
        const nuevas = Array.from(lista).filter(a => /^image\//.test(a.type));
        const repetida = a => fila.archivos.some(x => x.name === a.name && x.size === a.size);
        nuevas.filter(a => !repetida(a)).forEach(a => {
            if (fila.archivos.length < FOTOS_MAX) { a._url = URL.createObjectURL(a); fila.archivos.push(a); }
        });
        if (fila.archivos.length >= FOTOS_MAX && nuevas.length) {
            mostrarModalAdvertencia(`Máximo ${FOTOS_MAX} fotos por mueble.`);
        }
        fila.subidas = null; // cambiaron las fotos: hay que volver a subirlas
        pintarFotos(fila);
        limpiarError(fila);
        actualizarResumen();
    }

    function pintarFotos(fila) {
        const cont = fila.q('[data-miniaturas]');
        cont.innerHTML = '';
        fila.archivos.forEach((a, idx) => {
            const d = document.createElement('div');
            d.className = 'lote-mini';
            d.innerHTML = `<img src="${a._url}" alt=""><button type="button" aria-label="Quitar foto"><i class="bi bi-x"></i></button>`;
            d.querySelector('button').addEventListener('click', () => {
                URL.revokeObjectURL(a._url);
                fila.archivos.splice(idx, 1);
                fila.subidas = null;
                pintarFotos(fila);
            });
            cont.appendChild(d);
        });
        fila.q('[data-fotos-texto]').textContent = fila.archivos.length ? `${fila.archivos.length} foto${fila.archivos.length > 1 ? 's' : ''}` : 'Agregar';
    }

    // ---------- Estado de cada fila ----------
    function datos(fila) {
        const q = fila.q;
        return {
            nombre: q('[data-nombre]').value.trim(),
            precio: fila.precio.valor(),
            medidas: fila.medidas.valor(),
            descripcion: q('[data-descripcion]').value.trim(),
            video: q('[data-video]').value.trim()
        };
    }

    function estaVacia(fila) {
        const d = datos(fila);
        const med = d.medidas.estado;
        return !d.nombre && !d.precio && (med === 'vacio') && !d.descripcion && !d.video && fila.archivos.length === 0;
    }

    /** Devuelve un mensaje de error para la fila, o null si esta bien. No considera filas vacias. */
    function errorDeFila(fila) {
        const d = datos(fila);
        if (!d.nombre) return 'Falta el nombre';
        const ep = fila.precio.error();
        if (ep) return ep;
        if (d.medidas.estado === 'incompleto' || d.medidas.estado === 'invalido') return d.medidas.mensaje;
        return null;
    }

    function marcarError(fila, mensaje) {
        fila.el.classList.add('lote-fila--error');
        const e = fila.q('[data-error]');
        e.textContent = mensaje;
        e.hidden = false;
    }

    function limpiarError(fila) {
        if (!fila.el.classList.contains('lote-fila--error')) return;
        fila.el.classList.remove('lote-fila--error');
        fila.q('[data-error]').hidden = true;
    }

    function actualizarResumen() {
        const n = filas.filter(f => !estaVacia(f)).length;
        $('lote-resumen').textContent = n === 0 ? 'Ningún mueble completado aún'
            : `${n} mueble${n > 1 ? 's' : ''} para crear`;
        const btn = $('lote-guardar');
        if (!guardando) btn.textContent = n > 0 ? `Guardar ${n} mueble${n > 1 ? 's' : ''}` : 'Guardar muebles';
    }

    // ---------- Guardado ----------
    function fijarOcupado(ocupado, texto) {
        guardando = ocupado;
        const btn = $('lote-guardar');
        btn.disabled = ocupado;
        $('lote-cancelar').disabled = ocupado;
        document.querySelector('#modalLote .btn-close').disabled = ocupado;
        $('modalLote').querySelectorAll('.lote-fila input, .lote-fila textarea, .lote-fila button, #lote-categoria, .lote-agregar button')
            .forEach(c => { c.disabled = ocupado; });
        if (ocupado) btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>${texto}`;
        else actualizarResumen();
    }

    async function guardar() {
        if (guardando) return;
        const categoriaId = $('lote-categoria').value;
        if (!categoriaId) {
            mostrarModalAdvertencia('Selecciona la categoría de los muebles.');
            return;
        }

        const activas = filas.map((f, i) => ({ f, n: i + 1 })).filter(x => !estaVacia(x.f));
        if (activas.length === 0) {
            mostrarModalAdvertencia('Completa al menos un mueble (nombre y precio).');
            return;
        }

        // Validar todas las filas antes de enviar nada
        let primera = null, cuantas = 0;
        const nombres = new Map();
        activas.forEach(({ f, n }) => {
            limpiarError(f);
            let err = errorDeFila(f);
            if (!err) {
                const clave = normalizarTexto(datos(f).nombre);
                if (nombres.has(clave)) err = `El nombre está repetido (ya aparece en la fila ${nombres.get(clave)})`;
                else nombres.set(clave, n);
            }
            if (err) {
                marcarError(f, err);
                cuantas++;
                if (!primera) primera = { f, n, err };
            }
        });
        if (primera) {
            primera.f.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            mostrarModalAdvertencia(`Fila ${primera.n}: ${primera.err}` + (cuantas > 1 ? `<br><small>Hay ${cuantas} filas con errores, marcadas en rojo.</small>` : ''));
            return;
        }

        // Avisar si ya existen muebles con el mismo nombre en esa categoria
        const existentes = (Array.isArray(mueblesPropios) ? mueblesPropios : [])
            .filter(m => String(m.categoria_id) === categoriaId)
            .map(m => normalizarTexto(m.nombre));
        const repetidos = activas.map(x => datos(x.f).nombre).filter(nom => existentes.includes(normalizarTexto(nom)));
        if (repetidos.length) {
            mostrarModalConfirmacion(
                'Ya existen muebles con ese nombre',
                `En esta categoría ya hay: <strong>${repetidos.map(escaparHtml).join(', ')}</strong>.<br>¿Quieres crearlos de todos modos?`,
                () => enviar(categoriaId, activas)
            );
            return;
        }
        enviar(categoriaId, activas);
    }

    async function enviar(categoriaId, activas) {
        await esperarCierreModalGlobal();
        fijarOcupado(true, 'Guardando…');
        try {
            // 1) Subir las fotos de cada fila (una sola vez aunque haya que reintentar)
            const conFotos = activas.filter(x => x.f.archivos.length && !x.f.subidas);
            let hechas = 0;
            for (const { f, n } of conFotos) {
                fijarOcupado(true, `Subiendo fotos (${++hechas}/${conFotos.length})…`);
                const r = await api.subirImagenes(f.archivos);
                if (r.status !== 'success') {
                    fijarOcupado(false);
                    marcarError(f, 'No se pudieron subir las fotos: ' + (r.error || 'error desconocido'));
                    f.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    mostrarModalError(`Fila ${n}: no se pudieron subir las fotos. ${r.error || ''}`);
                    return;
                }
                f.subidas = r.guardadas;
            }

            // 2) Crear todos los muebles de una vez
            fijarOcupado(true, 'Guardando muebles…');
            const res = await api.createMueblesLote({
                categoria_id: parseInt(categoriaId, 10),
                muebles: activas.map(({ f, n }) => {
                    const d = datos(f);
                    return {
                        fila: n,
                        nombre: d.nombre,
                        precio: d.precio,
                        medidas: d.medidas.texto || '',
                        descripcion: d.descripcion,
                        video_url: d.video,
                        imagenes: f.subidas || []
                    };
                })
            });

            fijarOcupado(false);
            if (res.status === 'success') {
                const cerrado = new Promise(r => $('modalLote').addEventListener('hidden.bs.modal', r, { once: true }));
                modal.hide();
                await Promise.all([cargarMuebles(), cerrado]);
                mostrarModalExito(`${res.creados} mueble${res.creados > 1 ? 's' : ''} creado${res.creados > 1 ? 's' : ''} correctamente.`);
                return;
            }
            // Errores por fila devueltos por el servidor
            (res.errores || []).forEach(e => { const f = filas[e.fila - 1]; if (f) marcarError(f, e.error); });
            const prim = (res.errores || [])[0];
            if (prim && filas[prim.fila - 1]) filas[prim.fila - 1].el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            mostrarModalError(res.error || 'No se pudieron crear los muebles');
        } catch (err) {
            console.error(err);
            fijarOcupado(false);
            mostrarModalError('Ocurrió un error inesperado al guardar los muebles.');
        }
    }

    // ---------- Apertura ----------
    function abrir() {
        if (!Array.isArray(categoriasPropias) || categoriasPropias.length === 0) {
            mostrarModalAdvertencia('Primero crea al menos una categoría (botón "Categorías").');
            return;
        }
        const sel = $('lote-categoria');
        sel.innerHTML = '<option value="">Seleccione...</option>' +
            categoriasPropias.map(c => `<option value="${c.id}">${escaparHtml(c.nombre)}</option>`).join('');
        // Si el listado esta filtrado por una categoria, se propone esa
        const filtro = $('filtro-categoria').value;
        if (filtro) sel.value = filtro;

        filas.forEach(f => f.archivos.forEach(a => a._url && URL.revokeObjectURL(a._url)));
        filas = [];
        $('lote-filas').innerHTML = '';
        for (let i = 0; i < FILAS_INICIALES; i++) crearFila();
        modal.show();
    }

    function iniciar() {
        modal = new bootstrap.Modal($('modalLote'));
        $('btn-carga-multiple').addEventListener('click', abrir);
        $('lote-agregar-fila').addEventListener('click', () => { const f = crearFila(); if (f) f.q('[data-nombre]').focus(); });
        $('lote-agregar-cinco').addEventListener('click', () => {
            let primera = null;
            for (let i = 0; i < 5; i++) { const f = crearFila(); if (!f) break; primera = primera || f; }
            if (primera) primera.q('[data-nombre]').focus();
        });
        $('lote-guardar').addEventListener('click', guardar);
        $('lote-categoria').addEventListener('change', actualizarResumen);
        // Evita perder el trabajo por un cierre accidental con datos escritos
        $('modalLote').addEventListener('hide.bs.modal', e => {
            if (guardando) e.preventDefault();
        });
    }

    document.addEventListener('DOMContentLoaded', iniciar);
    return { abrir };
})();
