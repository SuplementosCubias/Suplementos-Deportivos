/* =========================================
   VISTA: RESPALDO
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;

    const TABLAS = [
        ['productos', 'Productos e inventario'],
        ['ventas', 'Ventas'],
        ['venta_items', 'Productos de cada venta'],
        ['compras', 'Compras'],
        ['compra_items', 'Productos de cada compra'],
        ['devoluciones', 'Devoluciones'],
        ['devolucion_items', 'Productos devueltos'],
        ['gastos', 'Gastos'],
        ['movimientos_inventario', 'Historial de inventario'],
        ['socios', 'Socios'],
        ['movimientos_socios', 'Aportes y retiros de socios']
    ];

    const sufijoFecha = () => PE.hoy();

    PE.vistas.respaldo = {
        async render(cont) {
            cont.innerHTML = `
                <div class="barra-titulo"><h2>Respaldo de datos</h2></div>

                <section class="panel">
                    <h3>Respaldo completo</h3>
                    <p class="nota">Descarga todos tus datos en un solo archivo. Hazlo cada semana y guárdalo fuera de este panel (tu correo, Google Drive o una memoria USB).</p>
                    <button class="btn" data-accion="respaldo-json">Descargar respaldo completo (.json)</button>
                </section>

                <section class="panel">
                    <h3>Tablas para Excel</h3>
                    <p class="nota">Cada botón descarga una tabla en formato CSV, que abre directamente en Excel o Google Sheets.</p>
                    <div class="rejilla-botones">
                        ${TABLAS.map(
                            ([clave, texto]) =>
                                `<button class="btn-sec" data-accion="respaldo-csv" data-tabla="${clave}">${PE.esc(texto)}</button>`
                        ).join('')}
                    </div>
                </section>

                <details class="ayuda">
                    <summary>Cuidados con los respaldos</summary>
                    <p>Los archivos incluyen nombres y teléfonos de tus clientes, además de tus costos y ganancias. Guárdalos en un lugar privado y no los compartas por chats abiertos.</p>
                    <p>Los respaldos sirven para consultar tus datos o volver a cargarlos en una base nueva si algún día hiciera falta. Si necesitas restaurar, pide ayuda y ten el archivo a la mano.</p>
                </details>
            `;
        }
    };

    PE.acciones['respaldo-json'] = async el => {
        el.disabled = true;
        const original = el.textContent;
        el.textContent = 'Preparando…';
        try {
            const tablas = {};
            for (const [clave] of TABLAS) {
                tablas[clave] = await PE.traerTodo(clave, '*', 'id', true);
            }
            const paquete = {
                sistema: 'ProEvidence admin',
                generado: new Date().toISOString(),
                tablas
            };
            PE.descargar(`respaldo-proevidence-${sufijoFecha()}.json`, JSON.stringify(paquete, null, 2), 'application/json');
            PE.marcarRespaldoHecho();
            PE.toast('Respaldo descargado');
        } finally {
            el.disabled = false;
            el.textContent = original;
        }
    };

    PE.acciones['respaldo-csv'] = async el => {
        const clave = el.dataset.tabla;
        if (!TABLAS.some(t => t[0] === clave)) return;
        el.disabled = true;
        try {
            const filas = await PE.traerTodo(clave, '*', 'id', true);
            PE.descargar(`${clave}-${sufijoFecha()}.csv`, PE.aCSV(filas), 'text/csv;charset=utf-8');
            PE.toast('Archivo descargado');
        } finally {
            el.disabled = false;
        }
    };
})();
