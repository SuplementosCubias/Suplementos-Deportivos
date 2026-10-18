/* =========================================
   VISTA: GASTOS
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;

    const CATEGORIAS = [
        'Publicidad',
        'Empaques',
        'Envíos y transporte',
        'Dominio y hosting',
        'Comisiones y bancos',
        'Permisos y trámites',
        'Otros'
    ];

    PE.vistas.gastos = {
        async render(cont) {
            const rango = PE.rangoPeriodo(PE.periodo);
            const lista = PE.estado.gastos.filter(g => PE.enRango(g.fecha, rango));
            const validos = lista.filter(g => !g.anulado);
            const total = validos.reduce((s, g) => s + Number(g.monto), 0);

            const porCategoria = new Map();
            validos.forEach(g => porCategoria.set(g.categoria, (porCategoria.get(g.categoria) || 0) + Number(g.monto)));
            const resumenCat = Array.from(porCategoria.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([c, m]) => `<span class="chip">${PE.esc(c)}: <strong>${PE.money(m)}</strong></span>`)
                .join('');

            cont.innerHTML = `
                <div class="barra-titulo">
                    <h2>Gastos</h2>
                    ${PE.soloAdmin('<button class="btn" data-accion="gasto-nuevo">+ Nuevo gasto</button>')}
                </div>
                ${PE.htmlPeriodo()}
                <p class="nota">${PE.plural(validos.length, 'gasto', 'gastos')} · <strong>${PE.money(total)}</strong> en el período</p>
                <div class="chips">${resumenCat}</div>
                ${PE.tabla(
                    [
                        { t: 'Fecha', f: g => PE.fdate(g.fecha) },
                        { t: 'Categoría', f: g => PE.esc(g.categoria) },
                        {
                            t: 'Descripción',
                            f: g => PE.esc(g.descripcion) + (g.anulado ? ' <span class="badge b-cancelada">anulado</span>' : '')
                        },
                        { t: 'Monto', c: 'num', f: g => (g.anulado ? `<s>${PE.money(g.monto)}</s>` : PE.money(g.monto)) },
                        {
                            t: '',
                            c: 'acciones',
                            f: g =>
                                g.anulado
                                    ? ''
                                    : PE.soloAdmin(
                                          `<button class="btn-mini btn-mini-peligro" data-accion="gasto-anular" data-id="${g.id}">Anular</button>`
                                      )
                        }
                    ],
                    lista,
                    'No hay gastos en este período.'
                )}
                <p class="nota">Aquí van los gastos del día a día (publicidad, empaques, dominio…). El flete y los impuestos de importación se registran en la compra, no aquí.</p>
            `;
            PE.enlazarPeriodo(() => PE.renderActual());
        }
    };

    PE.acciones['gasto-nuevo'] = () => {
        PE.abrirModal({
            titulo: 'Nuevo gasto',
            cuerpo: `
                <div class="fila-2">
                    <label>Fecha <input name="fecha" type="date" required value="${PE.hoy()}"></label>
                    <label>Monto ($) <input name="monto" type="number" step="0.01" min="0.01" required></label>
                </div>
                <label>Categoría
                    <select name="categoria">${CATEGORIAS.map(c => `<option>${PE.esc(c)}</option>`).join('')}</select>
                </label>
                <label>Descripción
                    <input name="descripcion" type="text" required maxlength="200" placeholder="Ej: publicidad en Instagram octubre">
                </label>
            `,
            onSubmit: async form => {
                const monto = PE.num(form.elements.monto.value);
                if (monto <= 0) throw new Error('El monto debe ser mayor que cero');
                const { error } = await PE.sb.from('gastos').insert({
                    fecha: form.elements.fecha.value,
                    categoria: form.elements.categoria.value,
                    descripcion: form.elements.descripcion.value.trim(),
                    monto
                });
                if (error) throw error;
                PE.toast('Gasto registrado');
                await PE.refrescar();
            }
        });
    };

    PE.acciones['gasto-anular'] = async el => {
        const g = PE.estado.gastos.find(x => x.id === Number(el.dataset.id));
        if (!g) return;
        const ok = await PE.confirmar(`¿Anular el gasto "${g.descripcion}" por ${PE.money(g.monto)}?`, {
            boton: 'Anular gasto',
            peligro: true
        });
        if (!ok) return;
        const { error } = await PE.sb.from('gastos').update({ anulado: true }).eq('id', g.id);
        if (error) throw error;
        PE.toast('Gasto anulado');
        await PE.refrescar();
    };
})();
