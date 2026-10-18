/* =========================================
   ARRANQUE: sesión, acceso y cierre por inactividad
   ========================================= */

(function () {
    'use strict';
    const PE = window.PE;
    const cfg = window.PE_CONFIG || {};
    const MINUTOS_INACTIVIDAD = 30;

    let ultimaActividad = Date.now();
    let reloj = null;

    function mostrar(id) {
        ['pantalla-carga', 'config-falta', 'login', 'sin-acceso', 'app'].forEach(x => {
            PE.$('#' + x).hidden = x !== id;
        });
    }

    function configuracionIncompleta() {
        return (
            !cfg.SUPABASE_URL ||
            !cfg.SUPABASE_ANON_KEY ||
            /TU-PROYECTO|TU_LLAVE/i.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY)
        );
    }

    function iniciarInactividad() {
        ultimaActividad = Date.now();
        if (reloj) return;
        ['click', 'keydown', 'touchstart', 'scroll'].forEach(e =>
            document.addEventListener(e, () => (ultimaActividad = Date.now()), { passive: true })
        );
        reloj = setInterval(async () => {
            if (!PE.estado.perfil) return;
            if (Date.now() - ultimaActividad > MINUTOS_INACTIVIDAD * 60000) {
                await salir();
                PE.toast('Cerramos tu sesión por inactividad.');
            }
        }, 30000);
    }

    async function salir() {
        try {
            await PE.sb.auth.signOut();
        } catch (e) {
            /* si falla la red, igual limpiamos la pantalla */
        }
        PE.estado.perfil = null;
        PE.cerrarModal();
        location.hash = '';
        mostrar('login');
    }

    async function entrar(usuario) {
        mostrar('pantalla-carga');
        try {
            const { data: perfil, error } = await PE.sb
                .from('perfiles')
                .select('*')
                .eq('id', usuario.id)
                .maybeSingle();
            if (error) throw error;

            if (!perfil) {
                mostrar('sin-acceso');
                return;
            }

            PE.estado.perfil = perfil;
            await PE.recargar();
            PE.pintarMenu();
            PE.$('#usuario').textContent =
                (perfil.nombre || usuario.email) +
                ' · ' +
                (perfil.rol === 'admin' ? 'Administrador' : 'Socio (solo lectura)');

            mostrar('app');
            iniciarInactividad();
            if (!location.hash) location.hash = '#/resumen';
            await PE.renderActual();
        } catch (e) {
            PE.estado.perfil = null;
            mostrar('login');
            PE.toast(PE.msgError(e), 'error');
        }
    }

    async function arrancar() {
        if (configuracionIncompleta()) {
            mostrar('config-falta');
            return;
        }
        if (!window.supabase) {
            mostrar('login');
            PE.$('#login-error').textContent =
                'No se pudo cargar la librería de Supabase. Revisa tu conexión a internet y recarga.';
            return;
        }

        PE.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
            auth: { persistSession: true, autoRefreshToken: true }
        });

        PE.sb.auth.onAuthStateChange(evento => {
            if (evento === 'SIGNED_OUT' && PE.estado.perfil) {
                PE.estado.perfil = null;
                mostrar('login');
            }
        });

        const { data } = await PE.sb.auth.getSession();
        if (data.session) await entrar(data.session.user);
        else mostrar('login');
    }

    PE.$('#form-login').addEventListener('submit', async ev => {
        ev.preventDefault();
        const form = ev.target;
        const boton = PE.$('button[type="submit"]', form);
        const aviso = PE.$('#login-error');
        aviso.textContent = '';
        boton.disabled = true;
        try {
            const { data, error } = await PE.sb.auth.signInWithPassword({
                email: form.elements.correo.value.trim(),
                password: form.elements.clave.value
            });
            if (error) {
                aviso.textContent = /invalid login|invalid credentials/i.test(error.message)
                    ? 'Correo o contraseña incorrectos.'
                    : PE.msgError(error);
                return;
            }
            form.reset();
            await entrar(data.user);
        } catch (e) {
            aviso.textContent = PE.msgError(e);
        } finally {
            boton.disabled = false;
        }
    });

    PE.acciones['salir'] = () => salir();

    arrancar();
})();
