/* Formato y validación de precio y medidas de muebles propios.
 * Las reglas replican las del backend (services/validacion_muebles.py); el backend siempre
 * vuelve a validar, esto solo evita errores de tipeo y guía al admin mientras escribe.
 */
const FormatoMuebles = (() => {
    const PRECIO_MIN = 14000;
    const PRECIO_MAX = 20000000;
    const MEDIDA_MIN = 1;
    const MEDIDA_MAX = 600;

    // toLocaleString('es-CL') no agrupa los miles en numeros de 4 cifras (5000), por eso se hace a mano
    const conPuntos = n => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const formatearPrecio = n => '$' + conPuntos(n);
    const soloDigitos = t => String(t == null ? '' : t).replace(/\D/g, '');
    const parsePrecio = t => { const d = soloDigitos(t); return d ? parseInt(d, 10) : 0; };

    /** Devuelve un mensaje de error, o null si el precio (entero) es valido. */
    function errorDePrecio(n) {
        if (!n) return 'Ingresa el precio del mueble';
        if (n < PRECIO_MIN) return `El precio mínimo es ${formatearPrecio(PRECIO_MIN)} (ingresaste ${formatearPrecio(n)}). ¿Faltan ceros?`;
        if (n > PRECIO_MAX) return `El precio máximo es ${formatearPrecio(PRECIO_MAX)}`;
        return null;
    }

    function etiquetaMagnitud(n) {
        if (n >= 1000000) return 'millones';
        if (n >= 100000) return 'cientos de miles';
        if (n >= 10000) return 'decenas de miles';
        return 'miles';
    }

    /** Versiones del numero escrito que si caen en el rango valido (14 -> 14.000, 140.000, 1.400.000). */
    function sugerenciasDePrecio(n) {
        return [1000, 10000, 100000]
            .map(k => n * k)
            .filter(v => v >= PRECIO_MIN && v <= PRECIO_MAX);
    }

    /**
     * Campo de precio: pone puntos de miles mientras se escribe, avisa si es muy bajo y ofrece
     * las escalas probables ("miles", "decenas de miles"...) como botones.
     * @param {HTMLInputElement} input  (type="text", inputmode="numeric")
     * @param {{hint?: HTMLElement, chips?: HTMLElement, alCambiar?: Function}} opciones
     */
    function enlazarPrecio(input, { hint = null, chips = null, alCambiar = null } = {}) {
        function pintar() {
            const n = parsePrecio(input.value);
            let texto = 'Escribe el precio en pesos. Ej: 150.000';
            let tono = 'neutro';
            let sugerencias = [];
            if (n > 0) {
                const err = n < PRECIO_MIN || n > PRECIO_MAX ? errorDePrecio(n) : null;
                if (err) {
                    tono = 'error';
                    texto = err;
                    if (n < PRECIO_MIN) {
                        sugerencias = sugerenciasDePrecio(n);
                        if (sugerencias.length) texto = `${formatearPrecio(n)} es muy poco para un mueble. ¿Quisiste decir…?`;
                    }
                } else {
                    tono = 'ok';
                    texto = `Precio: ${formatearPrecio(n)}`;
                }
            }
            if (hint) { hint.textContent = texto; hint.dataset.tono = tono; }
            input.classList.toggle('is-invalid', tono === 'error');
            if (chips) {
                chips.innerHTML = '';
                sugerencias.forEach(v => {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'chip-precio';
                    b.innerHTML = `${formatearPrecio(v)}<small>${etiquetaMagnitud(v)}</small>`;
                    b.addEventListener('click', () => { establecer(v); input.focus(); });
                    chips.appendChild(b);
                });
            }
            if (alCambiar) alCambiar(n);
        }

        function establecer(n) {
            input.value = n ? conPuntos(n) : '';
            pintar();
        }

        input.addEventListener('input', () => {
            // Conservar la posicion del cursor al reescribir con puntos
            const digitosAntes = soloDigitos(input.value.slice(0, input.selectionStart)).length;
            const d = soloDigitos(input.value).replace(/^0+/, '').slice(0, 9);
            input.value = d ? conPuntos(parseInt(d, 10)) : '';
            let pos = 0, vistos = 0;
            while (pos < input.value.length && vistos < digitosAntes) { if (/\d/.test(input.value[pos])) vistos++; pos++; }
            input.setSelectionRange(pos, pos);
            pintar();
        });

        pintar();
        return {
            valor: () => parsePrecio(input.value),
            establecer,
            reiniciar: () => establecer(0),
            error: () => errorDePrecio(parsePrecio(input.value)),
        };
    }

    // ---------------- Medidas ----------------
    const PATRON_MEDIDAS = /^\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)(?:\s*[xX×]\s*(\d+(?:[.,]\d+)?))?\s*(cm|mm|m)?\s*$/i;
    const FACTOR_CM = { cm: 1, m: 100, mm: 0.1 };
    const limpiarNumero = n => { const r = Math.round(n * 10) / 10; return String(r); };

    /** Interpreta un texto de medidas guardado. Devuelve [ancho, prof, alto] en cm, o null si no son 3 medidas. */
    function medidasDesdeTexto(texto) {
        const m = PATRON_MEDIDAS.exec(String(texto || ''));
        if (!m || m[3] === undefined) return null;
        const f = FACTOR_CM[(m[4] || 'cm').toLowerCase()];
        return [m[1], m[2], m[3]].map(g => limpiarNumero(parseFloat(g.replace(',', '.')) * f));
    }

    /** Valida tres medidas (strings, en cm). Devuelve {estado, texto, mensaje}. */
    function evaluarMedidas(ancho, prof, alto) {
        const vals = [ancho, prof, alto].map(v => String(v || '').trim());
        const llenos = vals.filter(Boolean).length;
        if (llenos === 0) return { estado: 'vacio', texto: '', mensaje: '' };
        if (llenos < 3) return { estado: 'incompleto', texto: '', mensaje: 'Completa las tres medidas (ancho, profundidad y alto) o deja las tres vacías' };
        const nums = vals.map(v => parseFloat(v));
        if (nums.some(n => Number.isNaN(n) || n < MEDIDA_MIN || n > MEDIDA_MAX)) {
            return { estado: 'invalido', texto: '', mensaje: `Cada medida debe estar entre ${MEDIDA_MIN} y ${MEDIDA_MAX} cm` };
        }
        const texto = nums.map(limpiarNumero).join('x') + ' cm';
        return { estado: 'ok', texto, mensaje: '' };
    }

    /**
     * Tres campos (ancho, profundidad, alto) en cm. Solo deja escribir numeros con un decimal.
     * @param {{ancho: HTMLInputElement, prof: HTMLInputElement, alto: HTMLInputElement}} campos
     * @param {{vista?: HTMLElement, antiguo?: HTMLElement}} opciones
     */
    function enlazarMedidas(campos, { vista = null, antiguo = null } = {}) {
        const lista = [campos.ancho, campos.prof, campos.alto];
        let textoAntiguo = '';

        function pintar() {
            const r = evaluarMedidas(campos.ancho.value, campos.prof.value, campos.alto.value);
            if (vista) {
                const tono = r.estado === 'ok' ? 'ok' : (r.estado === 'vacio' ? 'neutro' : 'error');
                vista.dataset.tono = tono;
                vista.textContent = r.estado === 'ok' ? `Se guardará como: ${r.texto}`
                    : (r.estado === 'vacio' ? 'Ancho × profundidad × alto, en centímetros' : r.mensaje);
            }
            lista.forEach(c => c.classList.toggle('is-invalid', r.estado === 'invalido' || (r.estado === 'incompleto' && !c.value.trim())));
            if (antiguo) {
                antiguo.hidden = !textoAntiguo || r.estado !== 'vacio';
            }
        }

        lista.forEach(c => c.addEventListener('input', () => {
            let v = c.value.replace(',', '.').replace(/[^0-9.]/g, '');
            const i = v.indexOf('.');
            if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 1);
            c.value = v.slice(0, 5);
            pintar();
        }));

        function establecer(texto) {
            textoAntiguo = '';
            lista.forEach(c => { c.value = ''; });
            const t = String(texto || '').trim();
            if (t) {
                const dims = medidasDesdeTexto(t);
                if (dims) { campos.ancho.value = dims[0]; campos.prof.value = dims[1]; campos.alto.value = dims[2]; }
                else {
                    // Formato antiguo (texto libre o 2 medidas): se conserva si no se completan los campos
                    textoAntiguo = t;
                    if (antiguo) antiguo.querySelector('[data-texto-antiguo]').textContent = t;
                }
            }
            pintar();
        }

        pintar();
        return {
            valor: () => {
                const r = evaluarMedidas(campos.ancho.value, campos.prof.value, campos.alto.value);
                return r.estado === 'vacio' && textoAntiguo ? { estado: 'antiguo', texto: textoAntiguo, mensaje: '' } : r;
            },
            establecer,
            reiniciar: () => establecer(''),
        };
    }

    return {
        PRECIO_MIN, PRECIO_MAX, MEDIDA_MIN, MEDIDA_MAX, conPuntos, formatearPrecio, parsePrecio,
        errorDePrecio, sugerenciasDePrecio, etiquetaMagnitud, enlazarPrecio, medidasDesdeTexto, evaluarMedidas, enlazarMedidas
    };
})();

// xd estaba pensando en lo siguiente, que era hacer varios muebles a la vez,
// ignoren el commit anterior, ahorita si en el commit siguiente viene el cambio de hacer varios muebles a la vez