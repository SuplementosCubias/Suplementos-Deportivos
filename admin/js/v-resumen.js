/* =========================================
   VISTA: RESUMEN
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;
    const CLAVE_RESPALDO = 'pe_ultimo_respaldo';

    function cobradas(v) {
        return v.estado === 'pagada' || v.estado === 'entregada';
    }

    function masVendidos(rango) {
        const mapa = new Map();
        PE.estado.ventas.forEach(v => {
            if (!cobradas(v) || !PE.enRango(v.fecha, rango)) return;
            v.venta_items.forEach(it => {
                const a = mapa.get(it.producto_id) || { id: it.producto_id, unidades: 0, utilidad: 0 };
                a.unidades += it.cantidad;
                a.utilidad += it.cantidad * (Number(it.precio_unitario) - Number(it.costo_unitario));
                mapa.set(it.producto_id, a);
            });
        });
        return Array.from(mapa.values())
            .sort((a, b) => b.unidades - a.unidades)
            .slice(0, 5);
    }

    function ingresosPorMes() {
        const [anio, mes] = PE.hoy().split('-').map(Number);
        const meses = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(anio, mes - 1 - i, 1);
            meses.push({
                clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                etiqueta: d.toLocaleDateString('es-SV', { month: 'short' }),
                total: 0
            });
        }
        PE.estado.ventas.forEach(v => {
            if (!cobradas(v)) return;
            const m = meses.find(x => x.clave === v.fecha.slice(0, 7));
            if (m) m.total += Number(v.total);
        });
        return meses;
    }

    function avisoRespaldo() {
        if (!PE.esAdmin()) return '';
        let ultimo = null;
        try {
            ultimo = localStorage.getItem(CLAVE_RESPALDO);
        } catch (e) {
            ultimo = null;
        }
        const dias = ultimo ? Math.floor((Date.now() - new Date(ultimo).getTime()) / 86400000) : null;
        if (dias !== null && dias < 7) return '';
        const texto = dias === null
            ? 'Todavía no has descargado un respaldo de tus datos.'
            : `Hace ${dias} días que no descargas un respaldo.`;
        return `<div class="caja-aviso">${PE.esc(texto)} <a href="#/respaldo">Descargar respaldo</a></div>`;
    }

    PE.vistas.resumen = {
        async render(cont) {
            const rango = PE.rangoPeriodo(PE.periodo);
            const r = await PE.rpc('resumen_financiero', {
                p_desde: rango.desde || null,
                p_hasta: rango.hasta || null
            });
            const p = r.periodo;

            const baseMargen = Number(p.ingresos) - Number(p.reembolsos);
            const margen = baseMargen > 0 ? Number(p.utilidad_neta) / baseMargen : NaN;
            const ticket = p.ventas > 0 ? Number(p.ingresos) / p.ventas : 0;

            const stockBajo = PE.estado.productos.filter(x => x.activo && x.stock <= x.stock_minimo);
            const pendientes = PE.estado.ventas.filter(v => v.estado === 'pendiente');

            const meses = ingresosPorMes();
            const maxMes = Math.max(1, ...meses.map(m => m.total));
            const barras = meses
                .map(
                    m => `<div class="barra-col">
                        <span class="barra-valor">${m.total ? PE.money(m.total) : ''}</span>
                        <div class="barra" style="height:${Math.round((m.total / maxMes) * 100)}%"></div>
                        <span class="barra-etiqueta">${PE.esc(m.etiqueta)}</span>
                    </div>`
                )
                .join('');

            const top = masVendidos(rango);

            cont.innerHTML = `
                <div class="barra-titulo"><h2>Resumen</h2>${PE.htmlPeriodo()}</div>
                ${avisoRespaldo()}

                <div class="rejilla-tarjetas">
                    ${PE.tarjeta('Ingresos', PE.money(p.ingresos), {
                        nota: `${PE.plural(p.ventas, 'venta', 'ventas')} · ${PE.plural(p.unidades, 'unidad', 'unidades')}`
                    })}
                    ${PE.tarjeta('Costo de lo vendido', PE.money(p.costo_ventas))}
                    ${PE.tarjeta('Utilidad antes de gastos', PE.money(p.utilidad_bruta), {
                        valorClase: PE.signo(p.utilidad_bruta)
                    })}
                    ${PE.tarjeta('Gastos', PE.money(p.gastos), {
                        nota: Number(p.mermas_ajustes) ? `Mermas y ajustes: ${PE.money(p.mermas_ajustes)}` : ''
                    })}
                    ${PE.tarjeta('Utilidad neta', PE.money(p.utilidad_neta), {
                        clase: 'tarjeta-destacada',
                        valorClase: PE.signo(p.utilidad_neta),
                        nota: Number.isFinite(margen) ? `Margen neto ${PE.pct(margen)}` : ''
                    })}
                    ${PE.tarjeta('Ticket promedio', PE.money(ticket))}
                </div>

                <h3 class="subtitulo">Situación actual</h3>
                <div class="rejilla-tarjetas">
                    ${PE.tarjeta('Inventario (al costo)', PE.money(r.valor_inventario))}
                    ${PE.tarjeta('Caja estimada', PE.money(r.caja_estimada), {
                        valorClase: PE.signo(r.caja_estimada),
                        nota: 'Lo que deberías tener en efectivo y bancos'
                    })}
                    ${PE.tarjeta('Por cobrar', PE.money(r.por_cobrar), {
                        nota: `${PE.plural(pendientes.length, 'venta pendiente', 'ventas pendientes')}`
                    })}
                    ${PE.tarjeta('Capital invertido', PE.money(Number(r.aportes) - Number(r.retiros_capital)), {
                        nota: 'Aportes menos retiros de capital'
                    })}
                </div>

                <div class="dos-columnas">
                    <section class="panel">
                        <h3>Ingresos por mes</h3>
                        <div class="barras">${barras}</div>
                    </section>

                    <section class="panel">
                        <h3>Más vendidos del período</h3>
                        ${PE.tabla(
                            [
                                { t: 'Producto', f: x => PE.esc(PE.nombreProducto(x.id)) },
                                { t: 'Unidades', c: 'num', f: x => x.unidades },
                                { t: 'Utilidad', c: 'num', f: x => PE.money(x.utilidad) }
                            ],
                            top,
                            'Todavía no hay ventas cobradas en este período.'
                        )}
                    </section>
                </div>

                <section class="panel">
                    <h3>Stock bajo</h3>
                    ${PE.tabla(
                        [
                            { t: 'Producto', f: x => PE.esc(x.nombre) },
                            { t: 'En bodega', c: 'num', f: x => `<span class="stock-bajo">${x.stock}</span>` },
                            { t: 'Mínimo', c: 'num', f: x => x.stock_minimo }
                        ],
                        stockBajo,
                        'Todo el inventario está por encima del mínimo.'
                    )}
                </section>

                <details class="ayuda">
                    <summary>¿Cómo se calculan estos números?</summary>
                    <p><strong>Ingresos:</strong> ventas pagadas o entregadas (incluye lo que cobras por envío).</p>
                    <p><strong>Costo de lo vendido:</strong> lo que te costó cada producto puesto en tu bodega (con flete e impuestos), al momento de la venta. Si una devolución vuelve al inventario, se descuenta de este costo.</p>
                    <p><strong>Utilidad neta:</strong> ingresos − reembolsos − costo de lo vendido − costo de envío − mermas − gastos.</p>
                    <p><strong>Caja estimada:</strong> aportes de socios − retiros + cobros − reembolsos − compras − gastos − costo de envío. Compárala con tu efectivo y bancos reales para detectar errores.</p>
                </details>
            `;

            PE.enlazarPeriodo(() => PE.renderActual());
        }
    };

    PE.marcarRespaldoHecho = function () {
        try {
            localStorage.setItem(CLAVE_RESPALDO, new Date().toISOString());
        } catch (e) {
            /* sin almacenamiento: no pasa nada */
        }
    };
})();
