/* =========================================
   VISTA: COMPRAS / IMPORTACIONES
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;

    function extras(c) {
        return Number(c.flete) + Number(c.impuestos) + Number(c.otros_costos);
    }

    PE.vistas.compras = {
        async render(cont) {
            const rango = PE.rangoPeriodo(PE.periodo);
            const lista = PE.estado.compras.filter(c => PE.enRango(c.fecha, rango));
            const validas = lista.filter(c => !c.anulada);
            const total = validas.reduce((s, c) => s + Number(c.total), 0);

            cont.innerHTML = `
                <div class="barra-titulo">
                    <h2>Compras e importaciones</h2>
                    ${PE.soloAdmin('<button class="btn" data-accion="compra-nueva">+ Nueva compra</button>')}
                </div>
                ${PE.htmlPeriodo()}
                <p class="nota">${PE.plural(validas.length, 'compra', 'compras')} · ${PE.money(total)} invertidos en el período</p>
                ${PE.tabla(
                    [
                        { t: '#', f: c => c.id },
                        { t: 'Fecha', f: c => PE.fdate(c.fecha) },
                        { t: 'Proveedor', f: c => PE.esc(c.proveedor || '—') },
                        {
                            t: 'Productos',
                            f: c =>
                                c.compra_items
                                    .map(i => `${i.cantidad}× ${PE.esc(PE.nombreProducto(i.producto_id))}`)
                                    .join('<br>')
                        },
                        { t: 'Mercadería', c: 'num', f: c => PE.money(c.subtotal) },
                        { t: 'Flete, impuestos', c: 'num', f: c => PE.money(extras(c)) },
                        { t: 'Total', c: 'num', f: c => PE.money(c.total) },
                        { t: 'Estado', f: c => (c.anulada ? '<span class="badge b-cancelada">anulada</span>' : '<span class="badge b-pagada">registrada</span>') },
                        {
                            t: '',
                            c: 'acciones',
                            f: c =>
                                `<button class="btn-mini" data-accion="compra-ver" data-id="${c.id}">Ver</button>` +
                                (c.anulada
                                    ? ''
                                    : PE.soloAdmin(
                                          `<button class="btn-mini btn-mini-peligro" data-accion="compra-anular" data-id="${c.id}">Anular</button>`
                                      ))
                        }
                    ],
                    lista,
                    'No hay compras en este período.'
                )}
                <p class="nota">El flete y los impuestos de importación se reparten entre los productos de la compra y se suman a su costo. Así tu utilidad refleja lo que realmente te costó cada frasco.</p>
            `;
            PE.enlazarPeriodo(() => PE.renderActual());
        }
    };

    PE.acciones['compra-nueva'] = () => {
        const disponibles = PE.estado.productos.filter(p => p.activo);
        if (!disponibles.length) {
            PE.toast('Primero crea tus productos en Inventario', 'error');
            return;
        }
        let editor;

        const resumen = () => {
            const f = PE.$('#form-modal');
            const lineas = editor.leer();
            const sub = lineas.reduce((s, l) => s + l.cantidad * l.valor, 0);
            const extra = PE.num(f.elements.flete.value) + PE.num(f.elements.impuestos.value) + PE.num(f.elements.otros.value);
            const unidades = lineas.reduce((s, l) => s + l.cantidad, 0);

            const detalle = lineas
                .map(l => {
                    const real = sub > 0 ? l.valor * (1 + extra / sub) : unidades > 0 ? extra / unidades : 0;
                    return `<div><span>${PE.esc(PE.nombreProducto(l.producto_id))}</span><strong>${PE.money(real)} c/u</strong></div>`;
                })
                .join('');

            PE.$('#cp-resumen').innerHTML = `
                <div><span>Mercadería</span><strong>${PE.money(sub)}</strong></div>
                <div><span>Flete, impuestos y otros</span><strong>${PE.money(extra)}</strong></div>
                <div><span>Total de la compra</span><strong>${PE.money(sub + extra)}</strong></div>
                ${detalle ? `<p class="nota resumen-titulo">Costo real por unidad (con flete e impuestos):</p>${detalle}` : ''}`;
        };

        PE.abrirModal({
            titulo: 'Nueva compra',
            ancho: true,
            boton: 'Registrar compra',
            cuerpo: `
                <div class="fila-2">
                    <label>Fecha <input name="fecha" type="date" required value="${PE.hoy()}"></label>
                    <label>Proveedor o tienda <input name="proveedor" type="text" maxlength="120" placeholder="Ej: Amazon, iHerb, courier"></label>
                </div>
                <div id="cp-lineas" class="lineas"></div>
                <div class="fila-3">
                    <label>Flete / courier ($) <input name="flete" type="number" step="0.01" min="0" value="0"></label>
                    <label>Impuestos ($) <input name="impuestos" type="number" step="0.01" min="0" value="0"></label>
                    <label>Otros costos ($) <input name="otros" type="number" step="0.01" min="0" value="0"></label>
                </div>
                <label>Nota <input name="nota" type="text" maxlength="300"></label>
                <div id="cp-resumen" class="resumen-form"></div>
            `,
            onAbrir: form => {
                editor = PE.crearEditorLineas(PE.$('#cp-lineas'), {
                    etiquetaValor: 'Costo $',
                    productos: disponibles,
                    textoOpcion: p => p.nombre,
                    alCambiar: resumen
                });
                ['flete', 'impuestos', 'otros'].forEach(n => form.elements[n].addEventListener('input', resumen));
                resumen();
            },
            onSubmit: async form => {
                const lineas = editor.leer();
                if (!lineas.length) throw new Error('Agrega al menos un producto');
                const id = await PE.rpc('registrar_compra', {
                    p_fecha: form.elements.fecha.value,
                    p_proveedor: form.elements.proveedor.value,
                    p_flete: PE.num(form.elements.flete.value),
                    p_impuestos: PE.num(form.elements.impuestos.value),
                    p_otros: PE.num(form.elements.otros.value),
                    p_nota: form.elements.nota.value,
                    p_items: lineas.map(l => ({
                        producto_id: l.producto_id,
                        cantidad: l.cantidad,
                        costo_unitario: l.valor
                    }))
                });
                PE.toast(`Compra #${id} registrada. El inventario se actualizó.`);
                await PE.refrescar();
            }
        });
    };

    PE.acciones['compra-ver'] = el => {
        const c = PE.estado.compras.find(x => x.id === Number(el.dataset.id));
        if (!c) return;
        PE.abrirModal({
            titulo: `Compra #${c.id}`,
            ancho: true,
            sinPie: true,
            cuerpo: `
                <p class="nota">${PE.fdate(c.fecha)}${c.proveedor ? ' · ' + PE.esc(c.proveedor) : ''}${c.anulada ? ' · <span class="badge b-cancelada">anulada</span>' : ''}</p>
                ${PE.tabla(
                    [
                        { t: 'Producto', f: i => PE.esc(PE.nombreProducto(i.producto_id)) },
                        { t: 'Cant.', c: 'num', f: i => i.cantidad },
                        { t: 'Costo', c: 'num', f: i => PE.money(i.costo_unitario) },
                        { t: 'Costo real', c: 'num', f: i => PE.money(i.costo_real_unitario) }
                    ],
                    c.compra_items
                )}
                <div class="resumen-form">
                    <div><span>Mercadería</span><strong>${PE.money(c.subtotal)}</strong></div>
                    <div><span>Flete</span><strong>${PE.money(c.flete)}</strong></div>
                    <div><span>Impuestos</span><strong>${PE.money(c.impuestos)}</strong></div>
                    <div><span>Otros costos</span><strong>${PE.money(c.otros_costos)}</strong></div>
                    <div><span>Total</span><strong>${PE.money(c.total)}</strong></div>
                </div>
                ${c.nota ? `<p class="nota">Nota: ${PE.esc(c.nota)}</p>` : ''}
            `
        });
    };

    PE.acciones['compra-anular'] = async el => {
        const id = Number(el.dataset.id);
        const ok = await PE.confirmar(
            `¿Anular la compra #${id}? Se resta ese inventario de tu bodega. Solo se puede si esos productos siguen en stock.`,
            { boton: 'Anular compra', peligro: true }
        );
        if (!ok) return;
        await PE.rpc('anular_compra', { p_id: id });
        PE.toast('Compra anulada');
        await PE.refrescar();
    };
})();
