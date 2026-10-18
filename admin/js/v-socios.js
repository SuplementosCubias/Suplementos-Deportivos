/* =========================================
   VISTA: SOCIOS Y CAPITAL
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;

    const TIPOS = {
        aporte: 'Aporte de capital',
        retiro_utilidad: 'Retiro de ganancias',
        retiro_capital: 'Retiro de capital'
    };

    let ultimo = null; // último resumen_socios()

    function datosSocio(id) {
        return ultimo && ultimo.socios.find(s => s.id === id);
    }

    PE.vistas.socios = {
        async render(cont) {
            ultimo = await PE.rpc('resumen_socios');
            const activos = ultimo.socios.filter(s => s.activo);
            const sumaPct = Number(ultimo.porcentaje_total);
            const totalAportes = ultimo.socios.reduce((s, x) => s + Number(x.aportes) - Number(x.retiros_capital), 0);
            const movs = PE.estado.movSocios;

            const avisoPct =
                activos.length && Math.abs(sumaPct - 100) > 0.001
                    ? `<div class="caja-aviso">Los porcentajes de los socios activos suman <strong>${sumaPct}%</strong>. Deben sumar 100% para repartir toda la utilidad.</div>`
                    : '';

            cont.innerHTML = `
                <div class="barra-titulo">
                    <h2>Socios y capital</h2>
                    ${PE.soloAdmin(`<span class="grupo-botones">
                        <button class="btn-sec" data-accion="socio-nuevo">+ Socio</button>
                        <button class="btn" data-accion="movsocio-nuevo">+ Aporte o retiro</button>
                    </span>`)}
                </div>
                ${avisoPct}
                <div class="rejilla-tarjetas">
                    ${PE.tarjeta('Utilidad neta acumulada', PE.money(ultimo.utilidad_acumulada), {
                        valorClase: PE.signo(ultimo.utilidad_acumulada),
                        nota: 'Desde el inicio del negocio'
                    })}
                    ${PE.tarjeta('Capital aportado (neto)', PE.money(totalAportes))}
                    ${PE.tarjeta('Porcentaje repartido', `${sumaPct}%`)}
                </div>

                <section class="panel">
                    <h3>Reparto por socio</h3>
                    ${PE.tabla(
                        [
                            {
                                t: 'Socio',
                                f: s => `<strong>${PE.esc(s.nombre)}</strong>${s.activo ? '' : ' <span class="badge b-cancelada">inactivo</span>'}`
                            },
                            { t: '%', c: 'num', f: s => `${Number(s.porcentaje)}%` },
                            { t: 'Aportó', c: 'num', f: s => PE.money(s.aportes) },
                            { t: 'Retiró capital', c: 'num', f: s => PE.money(s.retiros_capital) },
                            { t: 'Utilidad que le toca', c: 'num', f: s => PE.money(s.utilidad_asignada) },
                            { t: 'Ya retiró', c: 'num', f: s => PE.money(s.retiros_utilidad) },
                            {
                                t: 'Disponible',
                                c: 'num',
                                f: s => `<strong class="${PE.signo(s.utilidad_disponible)}">${PE.money(s.utilidad_disponible)}</strong>`
                            },
                            {
                                t: '',
                                c: 'acciones',
                                f: s => PE.soloAdmin(`<button class="btn-mini" data-accion="socio-editar" data-id="${s.id}">Editar</button>`)
                            }
                        ],
                        ultimo.socios,
                        'Aún no has registrado socios. Agrega el primero con "+ Socio".'
                    )}
                </section>

                <section class="panel">
                    <h3>Aportes y retiros</h3>
                    ${PE.tabla(
                        [
                            { t: 'Fecha', f: m => PE.fdate(m.fecha) },
                            {
                                t: 'Socio',
                                f: m => {
                                    const s = PE.estado.socios.find(x => x.id === m.socio_id);
                                    return PE.esc(s ? s.nombre : `Socio ${m.socio_id}`);
                                }
                            },
                            { t: 'Tipo', f: m => PE.esc(TIPOS[m.tipo] || m.tipo) },
                            {
                                t: 'Monto',
                                c: 'num',
                                f: m => (m.anulado ? `<s>${PE.money(m.monto)}</s>` : PE.money(m.monto))
                            },
                            { t: 'Nota', f: m => PE.esc(m.nota || '') + (m.anulado ? ' <span class="badge b-cancelada">anulado</span>' : '') },
                            {
                                t: '',
                                c: 'acciones',
                                f: m =>
                                    m.anulado
                                        ? ''
                                        : PE.soloAdmin(
                                              `<button class="btn-mini btn-mini-peligro" data-accion="movsocio-anular" data-id="${m.id}">Anular</button>`
                                          )
                            }
                        ],
                        movs,
                        'Todavía no hay aportes ni retiros registrados.'
                    )}
                </section>

                <details class="ayuda">
                    <summary>¿Cómo se reparte la utilidad?</summary>
                    <p>A cada socio le toca su porcentaje de la <strong>utilidad neta acumulada</strong> (ya descontados costos, envíos, mermas y gastos). Lo que ya retiró se resta, y la diferencia es lo que tiene disponible.</p>
                    <p>El aporte de capital es dinero que el socio puso en el negocio; no cuenta como ganancia ni como gasto. Si luego retira capital, se registra aparte.</p>
                    <p>Si cambias el porcentaje de un socio, el cambio aplica a toda la utilidad acumulada, también a la de meses anteriores. Antes de cambiarlo, pónganse de acuerdo y apunten la fecha del cambio.</p>
                </details>
            `;
        }
    };

    /* ---------- Socios ---------- */

    function formularioSocio(s) {
        const v = s || { nombre: '', porcentaje: '', activo: true, nota: '' };
        return `
            <label>Nombre <input name="nombre" type="text" required maxlength="100" value="${PE.esc(v.nombre)}"></label>
            <label>Porcentaje de las ganancias (%)
                <input name="porcentaje" type="number" step="0.01" min="0" max="100" required value="${PE.esc(v.porcentaje)}">
            </label>
            <label>Nota <input name="nota" type="text" maxlength="200" value="${PE.esc(v.nota || '')}"></label>
            <label class="check"><input name="activo" type="checkbox" ${v.activo ? 'checked' : ''}> Socio activo</label>
        `;
    }

    function leerSocio(form) {
        return {
            nombre: form.elements.nombre.value.trim(),
            porcentaje: PE.num(form.elements.porcentaje.value),
            nota: form.elements.nota.value.trim() || null,
            activo: form.elements.activo.checked
        };
    }

    PE.acciones['socio-nuevo'] = () => {
        PE.abrirModal({
            titulo: 'Nuevo socio',
            cuerpo: formularioSocio(null),
            onSubmit: async form => {
                const { error } = await PE.sb.from('socios').insert(leerSocio(form));
                if (error) throw error;
                PE.toast('Socio agregado');
                await PE.refrescar();
            }
        });
    };

    PE.acciones['socio-editar'] = el => {
        const s = PE.estado.socios.find(x => x.id === Number(el.dataset.id));
        if (!s) return;
        PE.abrirModal({
            titulo: `Editar socio · ${s.nombre}`,
            cuerpo: formularioSocio(s),
            onSubmit: async form => {
                const { error } = await PE.sb.from('socios').update(leerSocio(form)).eq('id', s.id);
                if (error) throw error;
                PE.toast('Socio actualizado');
                await PE.refrescar();
            }
        });
    };

    /* ---------- Aportes y retiros ---------- */

    PE.acciones['movsocio-nuevo'] = () => {
        const socios = PE.estado.socios.filter(s => s.activo);
        if (!socios.length) {
            PE.toast('Primero agrega un socio', 'error');
            return;
        }

        PE.abrirModal({
            titulo: 'Aporte o retiro',
            cuerpo: `
                <label>Socio
                    <select name="socio" required>${socios.map(s => `<option value="${s.id}">${PE.esc(s.nombre)}</option>`).join('')}</select>
                </label>
                <label>Tipo
                    <select name="tipo">
                        ${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${PE.esc(t)}</option>`).join('')}
                    </select>
                </label>
                <div class="fila-2">
                    <label>Monto ($) <input name="monto" type="number" step="0.01" min="0.01" required></label>
                    <label>Fecha <input name="fecha" type="date" required value="${PE.hoy()}"></label>
                </div>
                <label>Nota <input name="nota" type="text" maxlength="200"></label>
                <label class="check" id="ms-adelanto" hidden>
                    <input name="adelanto" type="checkbox"> Es un adelanto (permite retirar más de lo disponible)
                </label>
            `,
            onAbrir: form => {
                const alternar = () => {
                    PE.$('#ms-adelanto').hidden = form.elements.tipo.value !== 'retiro_utilidad';
                };
                form.elements.tipo.addEventListener('change', alternar);
                alternar();
            },
            onSubmit: async form => {
                const socioId = Number(form.elements.socio.value);
                const tipo = form.elements.tipo.value;
                const monto = PE.num(form.elements.monto.value);
                if (monto <= 0) throw new Error('El monto debe ser mayor que cero');
                const d = datosSocio(socioId);

                if (d && tipo === 'retiro_utilidad' && monto > Number(d.utilidad_disponible) + 0.004 && !form.elements.adelanto.checked) {
                    throw new Error(
                        `${d.nombre} solo tiene ${PE.money(Math.max(0, d.utilidad_disponible))} disponible. Marca "Es un adelanto" si quieres registrarlo igual.`
                    );
                }
                if (d && tipo === 'retiro_capital' && monto > Number(d.aportes) - Number(d.retiros_capital) + 0.004) {
                    throw new Error(
                        `${d.nombre} no puede retirar más capital del que aportó (${PE.money(Number(d.aportes) - Number(d.retiros_capital))}).`
                    );
                }

                const { error } = await PE.sb.from('movimientos_socios').insert({
                    socio_id: socioId,
                    tipo,
                    monto,
                    fecha: form.elements.fecha.value,
                    nota: form.elements.nota.value.trim() || null
                });
                if (error) throw error;
                PE.toast('Movimiento registrado');
                await PE.refrescar();
            }
        });
    };

    PE.acciones['movsocio-anular'] = async el => {
        const m = PE.estado.movSocios.find(x => x.id === Number(el.dataset.id));
        if (!m) return;
        const ok = await PE.confirmar(
            `¿Anular este movimiento (${TIPOS[m.tipo] || m.tipo} de ${PE.money(m.monto)})?`,
            { boton: 'Anular', peligro: true }
        );
        if (!ok) return;
        const { error } = await PE.sb.from('movimientos_socios').update({ anulado: true }).eq('id', m.id);
        if (error) throw error;
        PE.toast('Movimiento anulado');
        await PE.refrescar();
    };
})();
