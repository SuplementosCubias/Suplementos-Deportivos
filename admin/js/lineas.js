/* =========================================
   EDITOR DE LÍNEAS (producto · cantidad · precio o costo)
   Lo usan Ventas y Compras.
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;

    /*
      opciones = {
        etiquetaValor: 'Precio' | 'Costo',
        productos:     lista de productos disponibles,
        textoOpcion:   p => 'texto del <option>',
        deshabilitar:  p => boolean (opcional),
        valorInicial:  p => número sugerido al elegir el producto,
        alCambiar:     () => void
      }
    */
    PE.crearEditorLineas = function (contenedor, opciones) {
        const o = opciones;

        const opcionesHtml = () =>
            '<option value="">Elige un producto…</option>' +
            o.productos
                .map(
                    p =>
                        `<option value="${p.id}" ${o.deshabilitar && o.deshabilitar(p) ? 'disabled' : ''}>${PE.esc(o.textoOpcion(p))}</option>`
                )
                .join('');

        contenedor.innerHTML = `
            <div class="lineas-cab"><span>Producto</span><span>Cant.</span><span>${PE.esc(o.etiquetaValor)}</span><span></span></div>
            <div class="lineas-cuerpo"></div>
            <button type="button" class="btn-sec btn-agregar-linea">+ Agregar producto</button>
        `;

        const cuerpo = PE.$('.lineas-cuerpo', contenedor);

        function agregar() {
            const fila = document.createElement('div');
            fila.className = 'linea';
            fila.innerHTML = `
                <select class="l-prod" aria-label="Producto" required>${opcionesHtml()}</select>
                <input class="l-cant" type="number" min="1" step="1" value="1" aria-label="Cantidad" required>
                <input class="l-valor" type="number" min="0" step="0.01" aria-label="${PE.esc(o.etiquetaValor)}" required>
                <button type="button" class="btn-x l-quitar" aria-label="Quitar línea">✕</button>
            `;
            cuerpo.appendChild(fila);
            return fila;
        }

        contenedor.addEventListener('change', ev => {
            if (ev.target.classList.contains('l-prod')) {
                const p = PE.producto(Number(ev.target.value));
                const valor = PE.$('.l-valor', ev.target.closest('.linea'));
                if (p && o.valorInicial) {
                    const sugerido = o.valorInicial(p);
                    valor.value = sugerido > 0 ? sugerido : '';
                }
            }
            o.alCambiar();
        });

        contenedor.addEventListener('input', ev => {
            if (ev.target.classList.contains('l-cant') || ev.target.classList.contains('l-valor')) {
                o.alCambiar();
            }
        });

        contenedor.addEventListener('click', ev => {
            if (ev.target.closest('.btn-agregar-linea')) {
                agregar();
                o.alCambiar();
            }
            if (ev.target.closest('.l-quitar')) {
                if (PE.$$('.linea', cuerpo).length > 1) {
                    ev.target.closest('.linea').remove();
                    o.alCambiar();
                }
            }
        });

        agregar();

        return {
            // Devuelve solo las líneas completas
            leer() {
                return PE.$$('.linea', cuerpo)
                    .map(f => ({
                        producto_id: Number(PE.$('.l-prod', f).value) || null,
                        cantidad: Math.round(PE.num(PE.$('.l-cant', f).value)),
                        valor: PE.num(PE.$('.l-valor', f).value)
                    }))
                    .filter(l => l.producto_id && l.cantidad > 0);
            }
        };
    };
})();
