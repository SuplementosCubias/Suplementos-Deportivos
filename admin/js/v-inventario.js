/* =========================================
   VISTA: INVENTARIO
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;
    const filtro = { texto: '', inactivos: false };

    const TIPOS_MOV = {
        compra: 'Compra',
        anulacion_compra: 'Compra anulada',
        venta: 'Venta',
        cancelacion_venta: 'Venta cancelada',
        devolucion: 'Devolución',
        merma: 'Merma',
        ajuste: 'Ajuste'
    };

    function filas() {
        const t = filtro.texto.trim().toLowerCase();
        return PE.estado.productos.filter(
            p =>
                (filtro.inactivos || p.activo) &&
                (!t || p.nombre.toLowerCase().includes(t) || (p.sku || '').toLowerCase().includes(t))
        );
    }

    function pintarTabla() {
        const lista = filas();
        const unidades = lista.reduce((s, p) => s + p.stock, 0);
        const valor = lista.reduce((s, p) => s + p.stock * Number(p.costo_promedio), 0);

        PE.$('#inv-totales').textContent =
            `${lista.length} productos · ${unidades} unidades · ${PE.money(valor)} al costo`;

        PE.$('#inv-tabla').innerHTML = PE.tabla(
            [
                {
                    t: 'Producto',
                    f: p =>
                        `<strong>${PE.esc(p.nombre)}</strong>` +
                        (p.sku ? `<br><small>${PE.esc(p.sku)}</small>` : '') +
                        (p.activo ? '' : ' <span class="badge b-cancelada">inactivo</span>')
                },
                {
                    t: 'En bodega',
                    c: 'num',
                    f: p =>
                        p.stock <= p.stock_minimo
                            ? `<span class="stock-bajo">${p.stock}</span>`
                            : String(p.stock)
                },
                { t: 'Mínimo', c: 'num', f: p => p.stock_minimo },
                { t: 'Costo prom.', c: 'num', f: p => PE.money(p.costo_promedio) },
                { t: 'Precio', c: 'num', f: p => PE.money(p.precio_venta) },
                {
                    t: 'Margen',
                    c: 'num',
                    f: p => {
                        const precio = Number(p.precio_venta);
                        if (precio <= 0 || Number(p.costo_promedio) === 0) return '—';
                        return PE.pct((precio - Number(p.costo_promedio)) / precio);
                    }
                },
                { t: 'Valor', c: 'num', f: p => PE.money(p.stock * Number(p.costo_promedio)) },
                {
                    t: '',
                    c: 'acciones',
                    f: p =>
                        PE.soloAdmin(
                            `<button class="btn-mini" data-accion="inv-editar" data-id="${p.id}">Editar</button>
                             <button class="btn-mini" data-accion="inv-ajustar" data-id="${p.id}">Ajustar</button>`
                        ) +
                        `<button class="btn-mini" data-accion="inv-historial" data-id="${p.id}">Historial</button>`
                }
            ],
            lista,
            'No hay productos con ese filtro.'
        );
    }

    function formularioProducto(p) {
        const v = p || { nombre: '', sku: '', precio_venta: '', stock_minimo: 3, activo: true };
        return `
            <label>Nombre del producto
                <input name="nombre" type="text" required maxlength="120" value="${PE.esc(v.nombre)}">
            </label>
            <label>Código o SKU (opcional)
                <input name="sku" type="text" maxlength="60" value="${PE.esc(v.sku || '')}">
            </label>
            <div class="fila-2">
                <label>Precio de venta ($)
                    <input name="precio_venta" type="number" step="0.01" min="0" required value="${PE.esc(v.precio_venta)}">
                </label>
                <label>Avisar cuando queden
                    <input name="stock_minimo" type="number" step="1" min="0" required value="${PE.esc(v.stock_minimo)}">
                </label>
            </div>
            <label class="check">
                <input name="activo" type="checkbox" ${v.activo ? 'checked' : ''}> Producto activo (disponible para vender)
            </label>
            ${p ? '' : '<p class="nota">El stock y el costo se llenan solos cuando registras una compra.</p>'}
        `;
    }

    function leerProducto(form) {
        const d = new FormData(form);
        return {
            nombre: String(d.get('nombre')).trim(),
            sku: String(d.get('sku') || '').trim() || null,
            precio_venta: PE.num(d.get('precio_venta')),
            stock_minimo: Math.max(0, Math.round(PE.num(d.get('stock_minimo')))),
            activo: form.elements.activo.checked
        };
    }

    PE.vistas.inventario = {
        async render(cont) {
            cont.innerHTML = `
                <div class="barra-titulo">
                    <h2>Inventario</h2>
                    ${PE.soloAdmin('<button class="btn" data-accion="inv-nuevo">+ Producto</button>')}
                </div>
                <div class="filtros">
                    <input type="search" id="inv-buscar" placeholder="Buscar producto…" value="${PE.esc(filtro.texto)}">
                    <label class="check"><input type="checkbox" id="inv-inactivos" ${filtro.inactivos ? 'checked' : ''}> Mostrar inactivos</label>
                </div>
                <p class="nota" id="inv-totales"></p>
                <div id="inv-tabla"></div>
            `;
            PE.$('#inv-buscar').addEventListener('input', e => {
                filtro.texto = e.target.value;
                pintarTabla();
            });
            PE.$('#inv-inactivos').addEventListener('change', e => {
                filtro.inactivos = e.target.checked;
                pintarTabla();
            });
            pintarTabla();
        }
    };

    PE.acciones['inv-nuevo'] = () => {
        PE.abrirModal({
            titulo: 'Nuevo producto',
            cuerpo: formularioProducto(null),
            onSubmit: async form => {
                const { error } = await PE.sb.from('productos').insert(leerProducto(form));
                if (error) throw error;
                PE.toast('Producto creado');
                await PE.refrescar();
            }
        });
    };

    PE.acciones['inv-editar'] = el => {
        const p = PE.producto(Number(el.dataset.id));
        if (!p) return;
        PE.abrirModal({
            titulo: 'Editar producto',
            cuerpo: formularioProducto(p),
            onSubmit: async form => {
                const { error } = await PE.sb.from('productos').update(leerProducto(form)).eq('id', p.id);
                if (error) throw error;
                PE.toast('Producto actualizado');
                await PE.refrescar();
            }
        });
    };

    PE.acciones['inv-ajustar'] = el => {
        const p = PE.producto(Number(el.dataset.id));
        if (!p) return;
        PE.abrirModal({
            titulo: `Ajustar stock · ${p.nombre}`,
            cuerpo: `
                <p class="nota">En bodega ahora: <strong>${p.stock}</strong></p>
                <label>Tipo
                    <select name="tipo">
                        <option value="merma">Merma (vencido, dañado o perdido)</option>
                        <option value="ajuste">Ajuste por conteo físico</option>
                    </select>
                </label>
                <label><span id="aj-etiqueta">Unidades perdidas</span>
                    <input name="cantidad" type="number" step="1" required>
                </label>
                <label>Nota
                    <input name="nota" type="text" maxlength="200" placeholder="Ej: frasco vencido">
                </label>
                <p class="nota">Las mermas cuentan como pérdida en tus reportes. Para sumar inventario nuevo usa una Compra.</p>
            `,
            onAbrir: form => {
                form.elements.tipo.addEventListener('change', () => {
                    PE.$('#aj-etiqueta').textContent =
                        form.elements.tipo.value === 'merma'
                            ? 'Unidades perdidas'
                            : 'Diferencia (+ suma, − resta)';
                });
            },
            onSubmit: async form => {
                const tipo = form.elements.tipo.value;
                const n = Math.round(PE.num(form.elements.cantidad.value));
                if (!n) throw new Error('La cantidad no puede ser cero');
                const delta = tipo === 'merma' ? -Math.abs(n) : n;
                await PE.rpc('ajustar_stock', {
                    p_producto_id: p.id,
                    p_delta: delta,
                    p_tipo: tipo,
                    p_nota: form.elements.nota.value
                });
                PE.toast('Stock ajustado');
                await PE.refrescar();
            }
        });
    };

    PE.acciones['inv-historial'] = async el => {
        const p = PE.producto(Number(el.dataset.id));
        if (!p) return;
        const { data, error } = await PE.sb
            .from('movimientos_inventario')
            .select('*')
            .eq('producto_id', p.id)
            .order('id', { ascending: false })
            .limit(100);
        if (error) throw error;

        PE.abrirModal({
            titulo: `Historial · ${p.nombre}`,
            ancho: true,
            sinPie: true,
            cuerpo: PE.tabla(
                [
                    { t: 'Fecha', f: m => PE.fdate(m.fecha) },
                    { t: 'Tipo', f: m => PE.esc(TIPOS_MOV[m.tipo] || m.tipo) },
                    {
                        t: 'Cantidad',
                        c: 'num',
                        f: m => `<span class="${m.cantidad < 0 ? 'neg' : 'pos'}">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</span>`
                    },
                    { t: 'Costo', c: 'num', f: m => PE.money(m.costo_unitario) },
                    { t: 'Nota', f: m => PE.esc(m.nota || (m.referencia_id ? `#${m.referencia_id}` : '')) }
                ],
                data,
                'Este producto todavía no tiene movimientos.'
            ) + '<p class="nota">Se muestran los últimos 100 movimientos.</p>'
        });
    };
})();
