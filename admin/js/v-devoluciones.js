/* =========================================
   VISTA: DEVOLUCIONES
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;

    // Productos de una venta con lo que aún se puede devolver
    function pendientesDeDevolver(venta) {
        const mapa = new Map();
        venta.venta_items.forEach(it => {
            const a = mapa.get(it.producto_id) || { id: it.producto_id, vendido: 0, importe: 0, devuelto: 0 };
            a.vendido += it.cantidad;
            a.importe += it.cantidad * Number(it.precio_unitario);
            mapa.set(it.producto_id, a);
        });
        PE.estado.devoluciones
            .filter(d => d.venta_id === venta.id)
            .forEach(d =>
                d.devolucion_items.forEach(i => {
                    const a = mapa.get(i.producto_id);
                    if (a) a.devuelto += i.cantidad;
                })
            );
        return Array.from(mapa.values())
            .map(a => ({ ...a, precio: a.importe / a.vendido, restante: a.vendido - a.devuelto }))
            .filter(a => a.restante > 0);
    }

    function abrirFormulario(ventaId) {
        const elegibles = PE.estado.ventas.filter(v => v.estado === 'pagada' || v.estado === 'entregada');
        if (!elegibles.length) {
            PE.toast('Aún no hay ventas pagadas o entregadas para devolver', 'error');
            return;
        }
        let reembolsoManual = false;

        const calcularSugerido = () => {
            const venta = elegibles.find(v => v.id === Number(PE.$('#dv-venta').value));
            if (!venta || reembolsoManual) return;
            const sub = Number(venta.subtotal);
            const factor = sub > 0 ? 1 - Number(venta.descuento) / sub : 1;
            const suma = PE.$$('.dv-fila').reduce(
                (s, f) => s + PE.num(PE.$('.dv-cant', f).value) * Number(f.dataset.precio),
                0
            );
            PE.$('#dv-reembolso').value = PE.redondear(suma * factor).toFixed(2);
        };

        const pintarItems = () => {
            const venta = elegibles.find(v => v.id === Number(PE.$('#dv-venta').value));
            const cont = PE.$('#dv-items');
            if (!venta) {
                cont.innerHTML = '';
                return;
            }
            const filas = pendientesDeDevolver(venta);
            if (!filas.length) {
                cont.innerHTML = '<p class="nota">Esta venta ya fue devuelta por completo.</p>';
                return;
            }
            cont.innerHTML =
                '<p class="nota">Cantidad a devolver de cada producto:</p>' +
                filas
                    .map(
                        a => `<div class="dv-fila" data-pid="${a.id}" data-precio="${a.precio}">
                            <div class="dv-nombre">${PE.esc(PE.nombreProducto(a.id))}
                                <small>Vendido ${a.vendido}${a.devuelto ? ' · ya devuelto ' + a.devuelto : ''} · ${PE.money(a.precio)} c/u</small>
                            </div>
                            <input class="dv-cant" type="number" min="0" max="${a.restante}" step="1" value="0" aria-label="Cantidad a devolver">
                            <label class="check"><input class="dv-bodega" type="checkbox" checked> Vuelve a bodega</label>
                        </div>`
                    )
                    .join('') +
                '<p class="nota">Desmarca "Vuelve a bodega" si el producto vino dañado o abierto y no se puede revender (queda como pérdida).</p>';
            reembolsoManual = false;
            calcularSugerido();
        };

        PE.abrirModal({
            titulo: 'Registrar devolución',
            ancho: true,
            boton: 'Registrar devolución',
            cuerpo: `
                <label>Venta
                    <select id="dv-venta" name="venta" required>
                        <option value="">Elige la venta…</option>
                        ${elegibles
                            .map(
                                v =>
                                    `<option value="${v.id}" ${v.id === ventaId ? 'selected' : ''}>#${v.id} · ${PE.esc(v.cliente)} · ${PE.fdate(v.fecha)} · ${PE.money(v.total)}</option>`
                            )
                            .join('')}
                    </select>
                </label>
                <div id="dv-items"></div>
                <div class="fila-2">
                    <label>Fecha <input name="fecha" type="date" required value="${PE.hoy()}"></label>
                    <label>Reembolso al cliente ($)
                        <input id="dv-reembolso" name="reembolso" type="number" step="0.01" min="0" value="0" required>
                    </label>
                </div>
                <label>Motivo
                    <input name="motivo" type="text" maxlength="200" list="dv-motivos" placeholder="Ej: producto dañado">
                    <datalist id="dv-motivos">
                        <option value="Producto dañado"><option value="Producto equivocado">
                        <option value="El cliente se arrepintió"><option value="Producto vencido">
                    </datalist>
                </label>
                <label>Nota <input name="nota" type="text" maxlength="300"></label>
            `,
            onAbrir: form => {
                PE.$('#dv-venta').addEventListener('change', pintarItems);
                PE.$('#dv-items').addEventListener('input', ev => {
                    if (ev.target.classList.contains('dv-cant')) calcularSugerido();
                });
                PE.$('#dv-reembolso').addEventListener('input', () => {
                    reembolsoManual = true;
                });
                pintarItems();
            },
            onSubmit: async form => {
                const items = PE.$$('.dv-fila')
                    .map(f => ({
                        producto_id: Number(f.dataset.pid),
                        cantidad: Math.round(PE.num(PE.$('.dv-cant', f).value)),
                        reingresa_stock: PE.$('.dv-bodega', f).checked
                    }))
                    .filter(i => i.cantidad > 0);
                if (!items.length) throw new Error('Indica cuántas unidades se devuelven');

                await PE.rpc('registrar_devolucion', {
                    p_venta_id: Number(form.elements.venta.value),
                    p_fecha: form.elements.fecha.value,
                    p_motivo: form.elements.motivo.value,
                    p_reembolso: PE.num(form.elements.reembolso.value),
                    p_nota: form.elements.nota.value,
                    p_items: items
                });
                PE.toast('Devolución registrada');
                await PE.refrescar();
            }
        });
    }

    PE.vistas.devoluciones = {
        async render(cont) {
            const rango = PE.rangoPeriodo(PE.periodo);
            const lista = PE.estado.devoluciones.filter(d => PE.enRango(d.fecha, rango));
            const total = lista.reduce((s, d) => s + Number(d.reembolso), 0);

            cont.innerHTML = `
                <div class="barra-titulo">
                    <h2>Devoluciones</h2>
                    ${PE.soloAdmin('<button class="btn" data-accion="devolucion-nueva">+ Nueva devolución</button>')}
                </div>
                ${PE.htmlPeriodo()}
                <p class="nota">${PE.plural(lista.length, 'devolución', 'devoluciones')} · ${PE.money(total)} reembolsados en el período</p>
                ${PE.tabla(
                    [
                        { t: '#', f: d => d.id },
                        { t: 'Fecha', f: d => PE.fdate(d.fecha) },
                        {
                            t: 'Venta',
                            f: d => {
                                const v = PE.estado.ventas.find(x => x.id === d.venta_id);
                                return `#${d.venta_id}${v ? ' · ' + PE.esc(v.cliente) : ''}`;
                            }
                        },
                        {
                            t: 'Productos',
                            f: d =>
                                d.devolucion_items
                                    .map(
                                        i =>
                                            `${i.cantidad}× ${PE.esc(PE.nombreProducto(i.producto_id))} ` +
                                            (i.reingresa_stock
                                                ? '<span class="badge b-pagada">a bodega</span>'
                                                : '<span class="badge b-cancelada">pérdida</span>')
                                    )
                                    .join('<br>')
                        },
                        { t: 'Reembolso', c: 'num', f: d => PE.money(d.reembolso) },
                        { t: 'Motivo', f: d => PE.esc(d.motivo || '') }
                    ],
                    lista,
                    'No hay devoluciones en este período.'
                )}
            `;
            PE.enlazarPeriodo(() => PE.renderActual());
        }
    };

    PE.acciones['devolucion-nueva'] = () => abrirFormulario(null);
    PE.acciones['venta-devolucion'] = el => abrirFormulario(Number(el.dataset.id));
})();
