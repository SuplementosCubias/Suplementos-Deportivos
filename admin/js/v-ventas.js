/* =========================================
   VISTA: VENTAS
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;
    const filtro = { estado: '', texto: '' };

    const METODOS_PAGO = [
        'Transferencia bancaria',
        'Efectivo contra entrega',
        'Efectivo',
        'Tarjeta o enlace de pago',
        'Otro'
    ];

    function utilidadEstimada(v) {
        const margen = v.venta_items.reduce(
            (s, it) => s + it.cantidad * (Number(it.precio_unitario) - Number(it.costo_unitario)),
            0
        );
        return margen - Number(v.descuento) + Number(v.envio_cobrado) - Number(v.costo_envio);
    }

    function resumenProductos(v) {
        return v.venta_items
            .map(it => `${it.cantidad}× ${PE.esc(PE.nombreProducto(it.producto_id))}`)
            .join('<br>');
    }

    function enlaceWhatsApp(tel) {
        const digitos = String(tel || '').replace(/\D/g, '');
        if (!digitos) return '';
        const numero = digitos.length === 8 ? '503' + digitos : digitos;
        return ` <a class="enlace-wa" href="https://wa.me/${numero}" target="_blank" rel="noopener noreferrer" title="Abrir WhatsApp">WhatsApp</a>`;
    }

    function listaFiltrada() {
        const rango = PE.rangoPeriodo(PE.periodo);
        const t = filtro.texto.trim().toLowerCase();
        return PE.estado.ventas.filter(
            v =>
                PE.enRango(v.fecha, rango) &&
                (!filtro.estado || v.estado === filtro.estado) &&
                (!t ||
                    v.cliente.toLowerCase().includes(t) ||
                    (v.telefono || '').includes(t) ||
                    String(v.id) === t.replace('#', ''))
        );
    }

    function accionesFila(v) {
        if (!PE.esAdmin()) return '';
        const b = (accion, texto, extra) =>
            `<button class="btn-mini ${extra || ''}" data-accion="${accion}" data-id="${v.id}">${texto}</button>`;
        const estado = (e, texto, extra) =>
            `<button class="btn-mini ${extra || ''}" data-accion="venta-estado" data-id="${v.id}" data-estado="${e}">${texto}</button>`;

        let html = '';
        if (v.estado === 'pendiente') html += estado('pagada', 'Marcar pagada', 'btn-mini-ok') + estado('cancelada', 'Cancelar', 'btn-mini-peligro');
        if (v.estado === 'pagada') html += estado('entregada', 'Marcar entregada', 'btn-mini-ok') + b('venta-devolucion', 'Devolución') + estado('cancelada', 'Cancelar', 'btn-mini-peligro');
        if (v.estado === 'entregada') html += b('venta-devolucion', 'Devolución');
        if (v.estado !== 'cancelada') html += b('venta-editar', 'Editar');
        return html;
    }

    function pintarTabla() {
        const lista = listaFiltrada();
        const validas = lista.filter(v => v.estado !== 'cancelada');
        const total = validas.reduce((s, v) => s + Number(v.total), 0);

        PE.$('#ven-totales').textContent =
            `${PE.plural(validas.length, 'venta', 'ventas')} (sin contar canceladas) · ${PE.money(total)}`;

        PE.$('#ven-tabla').innerHTML = PE.tabla(
            [
                { t: '#', f: v => v.id },
                { t: 'Fecha', f: v => PE.fdate(v.fecha) },
                {
                    t: 'Cliente',
                    f: v => `<strong>${PE.esc(v.cliente)}</strong>${enlaceWhatsApp(v.telefono)}`
                },
                { t: 'Productos', f: v => resumenProductos(v) },
                { t: 'Total', c: 'num', f: v => PE.money(v.total) },
                {
                    t: 'Utilidad est.',
                    c: 'num',
                    f: v =>
                        v.estado === 'cancelada'
                            ? '—'
                            : `<span class="${PE.signo(utilidadEstimada(v))}">${PE.money(utilidadEstimada(v))}</span>`
                },
                { t: 'Estado', f: v => PE.badgeEstado(v.estado) },
                {
                    t: '',
                    c: 'acciones',
                    f: v => `<button class="btn-mini" data-accion="venta-ver" data-id="${v.id}">Ver</button>` + accionesFila(v)
                }
            ],
            lista,
            'No hay ventas con ese filtro.'
        );
    }

    PE.vistas.ventas = {
        async render(cont) {
            cont.innerHTML = `
                <div class="barra-titulo">
                    <h2>Ventas</h2>
                    ${PE.soloAdmin('<button class="btn" data-accion="venta-nueva">+ Nueva venta</button>')}
                </div>
                ${PE.htmlPeriodo()}
                <div class="filtros">
                    <select id="ven-estado" aria-label="Estado">
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="pagada">Pagadas</option>
                        <option value="entregada">Entregadas</option>
                        <option value="cancelada">Canceladas</option>
                    </select>
                    <input type="search" id="ven-buscar" placeholder="Buscar cliente, teléfono o #…" value="${PE.esc(filtro.texto)}">
                </div>
                <p class="nota" id="ven-totales"></p>
                <div id="ven-tabla"></div>
            `;
            PE.$('#ven-estado').value = filtro.estado;
            PE.$('#ven-estado').addEventListener('change', e => {
                filtro.estado = e.target.value;
                pintarTabla();
            });
            PE.$('#ven-buscar').addEventListener('input', e => {
                filtro.texto = e.target.value;
                pintarTabla();
            });
            PE.enlazarPeriodo(() => {
                pintarTabla();
            });
            pintarTabla();
        }
    };

    /* ---------- Nueva venta ---------- */

    PE.acciones['venta-nueva'] = () => {
        const disponibles = PE.estado.productos.filter(p => p.activo);
        if (!disponibles.length) {
            PE.toast('Primero crea tus productos en Inventario', 'error');
            return;
        }
        let editor;

        const resumen = () => {
            const lineas = editor.leer();
            const f = PE.$('#form-modal');
            const sub = lineas.reduce((s, l) => s + l.cantidad * l.valor, 0);
            const costo = lineas.reduce((s, l) => {
                const p = PE.producto(l.producto_id);
                return s + l.cantidad * (p ? Number(p.costo_promedio) : 0);
            }, 0);
            const desc = PE.num(f.elements.descuento.value);
            const envio = PE.num(f.elements.envio_cobrado.value);
            const costoEnvio = PE.num(f.elements.costo_envio.value);
            const total = sub - desc + envio;
            const util = total - costo - costoEnvio;
            PE.$('#vn-resumen').innerHTML = `
                <div><span>Subtotal</span><strong>${PE.money(sub)}</strong></div>
                <div><span>Total a cobrar</span><strong>${PE.money(total)}</strong></div>
                <div><span>Utilidad estimada</span><strong class="${PE.signo(util)}">${PE.money(util)}</strong></div>`;
        };

        PE.abrirModal({
            titulo: 'Nueva venta',
            ancho: true,
            boton: 'Registrar venta',
            cuerpo: `
                <div class="fila-2">
                    <label>Fecha <input name="fecha" type="date" required value="${PE.hoy()}"></label>
                    <label>Estado
                        <select name="estado">
                            <option value="pendiente">Pendiente de pago</option>
                            <option value="pagada">Pagada</option>
                            <option value="entregada">Pagada y entregada</option>
                        </select>
                    </label>
                </div>
                <div class="fila-2">
                    <label>Cliente <input name="cliente" type="text" required maxlength="120"></label>
                    <label>Teléfono (WhatsApp) <input name="telefono" type="tel" maxlength="30" inputmode="tel"></label>
                </div>
                <label>Forma de pago
                    <select name="metodo_pago">
                        <option value="">—</option>
                        ${METODOS_PAGO.map(m => `<option>${PE.esc(m)}</option>`).join('')}
                    </select>
                </label>
                <div id="vn-lineas" class="lineas"></div>
                <div class="fila-3">
                    <label>Descuento ($) <input name="descuento" type="number" step="0.01" min="0" value="0"></label>
                    <label>Envío cobrado ($) <input name="envio_cobrado" type="number" step="0.01" min="0" value="0"></label>
                    <label>Costo de envío ($) <input name="costo_envio" type="number" step="0.01" min="0" value="0"></label>
                </div>
                <label>Nota <input name="nota" type="text" maxlength="300"></label>
                <div id="vn-resumen" class="resumen-form"></div>
            `,
            onAbrir: form => {
                editor = PE.crearEditorLineas(PE.$('#vn-lineas'), {
                    etiquetaValor: 'Precio $',
                    productos: disponibles,
                    textoOpcion: p => `${p.nombre} (${p.stock > 0 ? 'stock ' + p.stock : 'agotado'})`,
                    deshabilitar: p => p.stock <= 0,
                    valorInicial: p => Number(p.precio_venta),
                    alCambiar: resumen
                });
                ['descuento', 'envio_cobrado', 'costo_envio'].forEach(n =>
                    form.elements[n].addEventListener('input', resumen)
                );
                resumen();
            },
            onSubmit: async form => {
                const lineas = editor.leer();
                if (!lineas.length) throw new Error('Agrega al menos un producto');
                const id = await PE.rpc('registrar_venta', {
                    p_fecha: form.elements.fecha.value,
                    p_cliente: form.elements.cliente.value,
                    p_telefono: form.elements.telefono.value,
                    p_metodo_pago: form.elements.metodo_pago.value,
                    p_estado: form.elements.estado.value,
                    p_descuento: PE.num(form.elements.descuento.value),
                    p_envio_cobrado: PE.num(form.elements.envio_cobrado.value),
                    p_costo_envio: PE.num(form.elements.costo_envio.value),
                    p_nota: form.elements.nota.value,
                    p_items: lineas.map(l => ({
                        producto_id: l.producto_id,
                        cantidad: l.cantidad,
                        precio_unitario: l.valor
                    }))
                });
                PE.toast(`Venta #${id} registrada`);
                await PE.refrescar();
            }
        });
    };

    /* ---------- Detalle ---------- */

    PE.acciones['venta-ver'] = el => {
        const v = PE.estado.ventas.find(x => x.id === Number(el.dataset.id));
        if (!v) return;
        const devs = PE.estado.devoluciones.filter(d => d.venta_id === v.id);

        const lineas = PE.tabla(
            [
                { t: 'Producto', f: it => PE.esc(PE.nombreProducto(it.producto_id)) },
                { t: 'Cant.', c: 'num', f: it => it.cantidad },
                { t: 'Precio', c: 'num', f: it => PE.money(it.precio_unitario) },
                { t: 'Subtotal', c: 'num', f: it => PE.money(it.cantidad * it.precio_unitario) }
            ],
            v.venta_items
        );

        const devolucionesHtml = devs.length
            ? `<h3 class="subtitulo">Devoluciones</h3>` +
              PE.tabla(
                  [
                      { t: 'Fecha', f: d => PE.fdate(d.fecha) },
                      { t: 'Productos', f: d => d.devolucion_items.map(i => `${i.cantidad}× ${PE.esc(PE.nombreProducto(i.producto_id))}`).join('<br>') },
                      { t: 'Reembolso', c: 'num', f: d => PE.money(d.reembolso) },
                      { t: 'Motivo', f: d => PE.esc(d.motivo || '') }
                  ],
                  devs
              )
            : '';

        PE.abrirModal({
            titulo: `Venta #${v.id} · ${v.cliente}`,
            ancho: true,
            sinPie: true,
            cuerpo: `
                <p class="nota">${PE.fdate(v.fecha)} · ${PE.badgeEstado(v.estado)}${v.metodo_pago ? ' · ' + PE.esc(v.metodo_pago) : ''}${v.telefono ? ' · ' + PE.esc(v.telefono) : ''}</p>
                ${lineas}
                <div class="resumen-form">
                    <div><span>Subtotal</span><strong>${PE.money(v.subtotal)}</strong></div>
                    ${Number(v.descuento) ? `<div><span>Descuento</span><strong>−${PE.money(v.descuento)}</strong></div>` : ''}
                    ${Number(v.envio_cobrado) ? `<div><span>Envío cobrado</span><strong>${PE.money(v.envio_cobrado)}</strong></div>` : ''}
                    <div><span>Total</span><strong>${PE.money(v.total)}</strong></div>
                    ${Number(v.costo_envio) ? `<div><span>Costo de envío (tuyo)</span><strong>${PE.money(v.costo_envio)}</strong></div>` : ''}
                    ${v.estado !== 'cancelada' ? `<div><span>Utilidad estimada</span><strong class="${PE.signo(utilidadEstimada(v))}">${PE.money(utilidadEstimada(v))}</strong></div>` : ''}
                </div>
                ${v.nota ? `<p class="nota">Nota: ${PE.esc(v.nota)}</p>` : ''}
                ${devolucionesHtml}
            `
        });
    };

    /* ---------- Cambiar estado ---------- */

    PE.acciones['venta-estado'] = async el => {
        const id = Number(el.dataset.id);
        const estado = el.dataset.estado;
        const v = PE.estado.ventas.find(x => x.id === id);
        if (!v) return;

        if (estado === 'cancelada') {
            const ok = await PE.confirmar(
                `¿Cancelar la venta #${id} de ${v.cliente}? El stock vuelve al inventario y no podrás reactivarla.`,
                { boton: 'Cancelar venta', peligro: true }
            );
            if (!ok) return;
        }
        await PE.rpc('cambiar_estado_venta', { p_id: id, p_estado: estado });
        PE.toast(estado === 'cancelada' ? 'Venta cancelada' : `Venta marcada como ${estado}`);
        await PE.refrescar();
    };

    /* ---------- Editar datos básicos ---------- */

    PE.acciones['venta-editar'] = el => {
        const v = PE.estado.ventas.find(x => x.id === Number(el.dataset.id));
        if (!v) return;
        PE.abrirModal({
            titulo: `Editar venta #${v.id}`,
            cuerpo: `
                <label>Cliente <input name="cliente" type="text" required maxlength="120" value="${PE.esc(v.cliente)}"></label>
                <label>Teléfono <input name="telefono" type="tel" maxlength="30" value="${PE.esc(v.telefono || '')}"></label>
                <label>Forma de pago
                    <select name="metodo_pago">
                        <option value="">—</option>
                        ${METODOS_PAGO.map(m => `<option ${m === v.metodo_pago ? 'selected' : ''}>${PE.esc(m)}</option>`).join('')}
                    </select>
                </label>
                <label>Nota <input name="nota" type="text" maxlength="300" value="${PE.esc(v.nota || '')}"></label>
                <p class="nota">Para cambiar productos o montos, cancela la venta y regístrala de nuevo.</p>
            `,
            onSubmit: async form => {
                const { error } = await PE.sb
                    .from('ventas')
                    .update({
                        cliente: form.elements.cliente.value.trim(),
                        telefono: form.elements.telefono.value.trim() || null,
                        metodo_pago: form.elements.metodo_pago.value || null,
                        nota: form.elements.nota.value.trim() || null
                    })
                    .eq('id', v.id);
                if (error) throw error;
                PE.toast('Venta actualizada');
                await PE.refrescar();
            }
        });
    };
})();
