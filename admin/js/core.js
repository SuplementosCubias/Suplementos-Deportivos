/* =========================================
   NÚCLEO DEL PANEL DE ADMINISTRACIÓN
   Utilidades, modales, carga de datos y navegación.
   ========================================= */

(function () {
    'use strict';

    const PE = (window.PE = {
        sb: null,
        estado: {
            perfil: null,
            productos: [],
            ventas: [],
            compras: [],
            devoluciones: [],
            gastos: [],
            socios: [],
            movSocios: []
        },
        periodo: { clave: 'mes', desde: '', hasta: '' },
        vistas: {},
        acciones: {},
        orden: [
            ['resumen', 'Resumen'],
            ['ventas', 'Ventas'],
            ['inventario', 'Inventario'],
            ['compras', 'Compras'],
            ['devoluciones', 'Devoluciones'],
            ['gastos', 'Gastos'],
            ['socios', 'Socios y capital'],
            ['respaldo', 'Respaldo']
        ]
    });

    /* ---------- Selectores y formato ---------- */

    PE.$ = (sel, raiz) => (raiz || document).querySelector(sel);
    PE.$$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));

    PE.esc = function (valor) {
        return String(valor === null || valor === undefined ? '' : valor).replace(
            /[&<>"']/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
        );
    };

    PE.num = function (valor) {
        const n = parseFloat(String(valor === null || valor === undefined ? '' : valor).replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };

    PE.redondear = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

    const formatoDinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    PE.money = n => formatoDinero.format(Number(n) || 0);
    PE.pct = n => (Number.isFinite(n) ? (n * 100).toFixed(1) + '%' : '—');
    PE.signo = n => (Number(n) < 0 ? 'neg' : 'pos');
    PE.plural = (n, uno, varios) => `${n} ${Number(n) === 1 ? uno : varios}`;

    PE.hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });

    PE.fdate = function (iso) {
        if (!iso) return '';
        const [a, m, d] = String(iso).slice(0, 10).split('-');
        return `${d}/${m}/${a}`;
    };

    const dos = n => String(n).padStart(2, '0');

    PE.rangoPeriodo = function (p) {
        const [anio, mes] = PE.hoy().split('-').map(Number);
        switch (p.clave) {
            case 'mes':
                return {
                    desde: `${anio}-${dos(mes)}-01`,
                    hasta: `${anio}-${dos(mes)}-${dos(new Date(anio, mes, 0).getDate())}`
                };
            case 'mes_pasado': {
                const a = mes === 1 ? anio - 1 : anio;
                const m = mes === 1 ? 12 : mes - 1;
                return {
                    desde: `${a}-${dos(m)}-01`,
                    hasta: `${a}-${dos(m)}-${dos(new Date(a, m, 0).getDate())}`
                };
            }
            case 'anio':
                return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
            case 'custom':
                return { desde: p.desde || '', hasta: p.hasta || '' };
            default:
                return { desde: '', hasta: '' };
        }
    };

    PE.enRango = (fecha, r) => (!r.desde || fecha >= r.desde) && (!r.hasta || fecha <= r.hasta);

    PE.esAdmin = () => PE.estado.perfil && PE.estado.perfil.rol === 'admin';
    PE.soloAdmin = html => (PE.esAdmin() ? html : '');

    PE.producto = id => PE.estado.productos.find(p => p.id === id);
    PE.nombreProducto = id => {
        const p = PE.producto(id);
        return p ? p.nombre : `Producto ${id}`;
    };

    /* ---------- Mensajes ---------- */

    PE.msgError = function (e) {
        const m = (e && (e.message || e.msg)) || String(e || '');
        if (/violates check constraint/i.test(m)) return 'Algún dato no es válido. Revisa el formulario.';
        if (/duplicate key|already exists/i.test(m)) return 'Ya existe un registro con ese nombre.';
        if (/row-level security|permission denied/i.test(m)) return 'No tienes permiso para hacer esto.';
        if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'No hay conexión con el servidor. Revisa tu internet.';
        if (/JWT|expired/i.test(m)) return 'Tu sesión venció. Vuelve a iniciar sesión.';
        return m || 'Ocurrió un error inesperado.';
    };

    let temporizadorToast;
    PE.toast = function (mensaje, tipo) {
        const el = PE.$('#toast');
        el.textContent = mensaje;
        el.className = 'toast visible' + (tipo === 'error' ? ' toast-error' : '');
        clearTimeout(temporizadorToast);
        temporizadorToast = setTimeout(() => el.classList.remove('visible'), tipo === 'error' ? 6000 : 3000);
    };

    /* ---------- Modal ---------- */

    let alCerrarModal = null;

    PE.abrirModal = function (op) {
        const fondo = PE.$('#modal-fondo');
        const cont = PE.$('#modal-contenido');

        if (alCerrarModal) {
            const previo = alCerrarModal;
            alCerrarModal = null;
            previo();
        }
        alCerrarModal = op.onCerrar || null;

        const pie = op.sinPie
            ? `<div class="modal-pie"><button type="button" class="btn-sec" data-accion="cerrar-modal">Cerrar</button></div>`
            : `<div class="modal-pie">
                   <button type="button" class="btn-sec" data-accion="cerrar-modal">Cancelar</button>
                   <button type="submit" class="btn ${op.peligro ? 'btn-peligro' : ''}">${PE.esc(op.boton || 'Guardar')}</button>
               </div>`;

        cont.innerHTML = `
            <div class="modal-cab">
                <h2>${PE.esc(op.titulo)}</h2>
                <button type="button" class="btn-x" data-accion="cerrar-modal" aria-label="Cerrar">✕</button>
            </div>
            <form id="form-modal">
                <div class="modal-cuerpo">${op.cuerpo}</div>
                ${pie}
            </form>`;

        PE.$('.modal', fondo).classList.toggle('modal-ancho', Boolean(op.ancho));
        fondo.hidden = false;
        document.body.classList.add('modal-abierto');

        const form = PE.$('#form-modal');
        form.addEventListener('submit', async ev => {
            ev.preventDefault();
            if (!op.onSubmit) return;
            const boton = PE.$('button[type="submit"]', form);
            if (boton.disabled) return;
            boton.disabled = true;
            try {
                const r = await op.onSubmit(form);
                if (r !== false) PE.cerrarModal();
            } catch (e) {
                PE.toast(PE.msgError(e), 'error');
            } finally {
                boton.disabled = false;
            }
        });

        if (op.onAbrir) op.onAbrir(form);

        const primero = PE.$('input:not([type="hidden"]):not([disabled]), select, textarea', form);
        if (primero) primero.focus({ preventScroll: true });
    };

    PE.cerrarModal = function () {
        PE.$('#modal-fondo').hidden = true;
        PE.$('#modal-contenido').innerHTML = '';
        document.body.classList.remove('modal-abierto');
        if (alCerrarModal) {
            const f = alCerrarModal;
            alCerrarModal = null;
            f();
        }
    };

    PE.confirmar = function (mensaje, op) {
        const o = op || {};
        return new Promise(resolver => {
            let respondido = false;
            PE.abrirModal({
                titulo: o.titulo || 'Confirmar',
                cuerpo: `<p class="texto-confirmar">${PE.esc(mensaje)}</p>`,
                boton: o.boton || 'Confirmar',
                peligro: Boolean(o.peligro),
                onSubmit: async () => {
                    respondido = true;
                    resolver(true);
                },
                onCerrar: () => {
                    if (!respondido) resolver(false);
                }
            });
        });
    };

    /* ---------- Tablas ---------- */

    // columnas: [{ t: 'Título', f: fila => 'html ya escapado', c: 'clase' }]
    PE.tabla = function (columnas, filas, vacio) {
        if (!filas.length) {
            return `<p class="vacio">${PE.esc(vacio || 'No hay registros.')}</p>`;
        }
        const cab = columnas.map(c => `<th class="${c.c || ''}">${PE.esc(c.t)}</th>`).join('');
        const cuerpo = filas
            .map(
                fila =>
                    '<tr>' +
                    columnas
                        .map(
                            c =>
                                `<td class="${c.c || ''}" data-label="${PE.esc(c.t)}">${c.f(fila)}</td>`
                        )
                        .join('') +
                    '</tr>'
            )
            .join('');
        return `<div class="tabla-envoltorio"><table class="tabla resp"><thead><tr>${cab}</tr></thead><tbody>${cuerpo}</tbody></table></div>`;
    };

    PE.tarjeta = function (titulo, valor, opciones) {
        const o = opciones || {};
        return `<div class="tarjeta ${o.clase || ''}">
            <span class="tarjeta-titulo">${PE.esc(titulo)}</span>
            <strong class="tarjeta-valor ${o.valorClase || ''}">${valor}</strong>
            ${o.nota ? `<span class="tarjeta-nota">${PE.esc(o.nota)}</span>` : ''}
        </div>`;
    };

    PE.badgeEstado = estado => `<span class="badge b-${PE.esc(estado)}">${PE.esc(estado)}</span>`;

    /* ---------- Filtro de período compartido ---------- */

    PE.htmlPeriodo = function () {
        const p = PE.periodo;
        const op = (v, t) => `<option value="${v}" ${p.clave === v ? 'selected' : ''}>${t}</option>`;
        return `<div class="filtro-periodo">
            <label>Período
                <select id="per-clave">
                    ${op('mes', 'Este mes')}${op('mes_pasado', 'Mes pasado')}${op('anio', 'Este año')}
                    ${op('todo', 'Todo')}${op('custom', 'Personalizado')}
                </select>
            </label>
            <span id="per-custom" ${p.clave === 'custom' ? '' : 'hidden'}>
                <label>Desde <input type="date" id="per-desde" value="${PE.esc(p.desde)}"></label>
                <label>Hasta <input type="date" id="per-hasta" value="${PE.esc(p.hasta)}"></label>
            </span>
        </div>`;
    };

    PE.enlazarPeriodo = function (alCambiar) {
        const clave = PE.$('#per-clave');
        const desde = PE.$('#per-desde');
        const hasta = PE.$('#per-hasta');
        const custom = PE.$('#per-custom');
        const leer = () => {
            PE.periodo.clave = clave.value;
            PE.periodo.desde = desde.value;
            PE.periodo.hasta = hasta.value;
            custom.hidden = clave.value !== 'custom';
            alCambiar();
        };
        clave.addEventListener('change', leer);
        desde.addEventListener('change', leer);
        hasta.addEventListener('change', leer);
    };

    /* ---------- Descargas ---------- */

    PE.descargar = function (nombre, contenido, tipo) {
        const blob = new Blob([contenido], { type: tipo });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };

    PE.aCSV = function (filas) {
        if (!filas.length) return '﻿';
        const columnas = Array.from(
            filas.reduce((s, f) => {
                Object.keys(f).forEach(k => s.add(k));
                return s;
            }, new Set())
        );
        const celda = v => {
            if (v === null || v === undefined) return '';
            let t = typeof v === 'object' ? JSON.stringify(v) : String(v);
            // Evita que Excel interprete texto como fórmula
            if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = "'" + t;
            return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
        };
        const lineas = [columnas.join(',')].concat(
            filas.map(f => columnas.map(c => celda(f[c])).join(','))
        );
        return '﻿' + lineas.join('\r\n');
    };

    /* ---------- Datos ---------- */

    PE.rpc = async function (nombre, args) {
        const { data, error } = await PE.sb.rpc(nombre, args || {});
        if (error) throw error;
        return data;
    };

    // Trae todas las filas (Supabase entrega máximo 1000 por consulta)
    PE.traerTodo = async function (tabla, seleccion, columna, ascendente) {
        const salida = [];
        const paso = 1000;
        for (let desde = 0; ; desde += paso) {
            const { data, error } = await PE.sb
                .from(tabla)
                .select(seleccion || '*')
                .order(columna || 'id', { ascending: Boolean(ascendente) })
                .range(desde, desde + paso - 1);
            if (error) throw error;
            salida.push(...data);
            if (data.length < paso) break;
        }
        return salida;
    };

    PE.recargar = async function () {
        const [productos, ventas, compras, devoluciones, gastos, socios, movSocios] = await Promise.all([
            PE.traerTodo('productos', '*', 'nombre', true),
            PE.traerTodo('ventas', '*, venta_items(*)'),
            PE.traerTodo('compras', '*, compra_items(*)'),
            PE.traerTodo('devoluciones', '*, devolucion_items(*)'),
            PE.traerTodo('gastos'),
            PE.traerTodo('socios', '*', 'id', true),
            PE.traerTodo('movimientos_socios')
        ]);
        Object.assign(PE.estado, { productos, ventas, compras, devoluciones, gastos, socios, movSocios });
    };

    /* ---------- Navegación ---------- */

    let numeroRender = 0;

    PE.renderActual = async function () {
        const clave = (location.hash.replace(/^#\/?/, '') || 'resumen').split('?')[0];
        const vista = PE.vistas[clave] || PE.vistas.resumen;
        const claveReal = PE.vistas[clave] ? clave : 'resumen';
        const cont = PE.$('#vista');
        const mio = ++numeroRender;

        PE.$$('#menu a').forEach(a => a.classList.toggle('activo', a.dataset.ruta === claveReal));
        cont.innerHTML = '<p class="cargando">Cargando…</p>';

        try {
            await vista.render(cont);
        } catch (e) {
            if (mio === numeroRender) {
                cont.innerHTML = `<div class="caja-error">${PE.esc(PE.msgError(e))}</div>`;
            }
        }
    };

    // Después de guardar algo: vuelve a leer los datos y repinta la vista actual
    PE.refrescar = async function () {
        await PE.recargar();
        await PE.renderActual();
    };

    PE.pintarMenu = function () {
        PE.$('#menu').innerHTML = PE.orden
            .map(([clave, texto]) => `<a href="#/${clave}" data-ruta="${clave}">${PE.esc(texto)}</a>`)
            .join('');
    };

    /* ---------- Eventos globales ---------- */

    PE.acciones['cerrar-modal'] = () => PE.cerrarModal();

    document.addEventListener('click', ev => {
        const el = ev.target.closest('[data-accion]');
        if (!el) return;
        const fn = PE.acciones[el.dataset.accion];
        if (!fn) return;
        ev.preventDefault();
        Promise.resolve(fn(el, ev)).catch(e => PE.toast(PE.msgError(e), 'error'));
    });

    document.addEventListener('keydown', ev => {
        if (ev.key === 'Escape' && !PE.$('#modal-fondo').hidden) PE.cerrarModal();
    });

    document.addEventListener('mousedown', ev => {
        if (ev.target.id === 'modal-fondo') PE.cerrarModal();
    });

    window.addEventListener('hashchange', () => {
        if (PE.estado.perfil) PE.renderActual();
    });
})();
