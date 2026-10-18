# Panel de administración · ProEvidence

Panel web para llevar ventas, inventario, compras, devoluciones, gastos, socios y ganancias.
Vive en la carpeta `/admin` de tu tienda (HTML, CSS y JavaScript, igual que el resto) y guarda los datos en **Supabase**.

Se abre en `https://tudominio.com/admin/` (por ejemplo `proevidencesupps.com/admin/`).

---

## Instalación (una sola vez, unos 15 minutos)

### 1. Proyecto de Supabase
Ya lo estás creando. En la sección **Seguridad** del proyecto deja así las casillas:

- Habilitar Data API: **marcada**
- Exponer automáticamente nuevas tablas: **sin marcar**
- Activar RLS automático: **marcada**

Guarda la contraseña de la base de datos en un lugar seguro (gestor de contraseñas o papel). No se usa en el panel.

### 2. Crear las tablas
1. En Supabase abre **SQL Editor → New query**.
2. Abre el archivo `admin/supabase/esquema.sql`, copia **todo** su contenido y pégalo.
3. Pulsa **Run**. Debe terminar sin errores.
4. Ejecútalo **una sola vez**. No lo repitas cuando ya tengas datos reales.

> Si te sale algún error rojo, cópiamelo tal cual y lo corrijo. Probé el script en una base PostgreSQL de prueba, pero no en Supabase mismo.

### 3. Crear tu usuario
1. **Authentication → Users → Add user → Create new user**. Usa tu correo y una contraseña larga y única. Marca "Auto Confirm User".
2. Vuelve al **SQL Editor** y ejecuta esto, cambiando el correo y el nombre:

```sql
insert into public.perfiles (id, nombre, rol)
select id, 'Tu nombre', 'admin' from auth.users
where email = 'TU_CORREO@ejemplo.com';
```

3. **Muy importante:** ve a **Authentication → Sign In / Providers** y desactiva **"Allow new users to sign up"**. Así nadie más puede crearse una cuenta por su cuenta.

### 4. Conectar el panel
1. En Supabase: **Project Settings → API**.
2. Copia la **Project URL** y la llave **publishable** (o la **anon** si tu proyecto muestra "Legacy API keys").
3. Pégalas en `admin/config.js`:

```js
window.PE_CONFIG = {
    SUPABASE_URL: "https://xxxxxxxx.supabase.co",
    SUPABASE_ANON_KEY: "tu-llave-publica"
};
```

Estas dos son públicas por diseño y es normal que queden en GitHub. **Nunca pegues la llave `service_role` ni la `secret`.** Lo que protege tus datos es el inicio de sesión y las reglas del archivo SQL.

### 5. Publicar
Sube la carpeta `admin` a tu repositorio (o haz el merge de la rama `panel-admin`) y GitHub Pages la publica sola en un par de minutos. Entra a `/admin/` e inicia sesión.

---

## Primeros pasos dentro del panel

1. **Socios y capital → + Socio**: agrega a cada socio con su porcentaje (deben sumar 100%).
2. **+ Aporte o retiro**: registra lo que cada socio puso en el negocio.
3. **Inventario**: ya cargué los 11 productos de tu tienda con su precio. Revisa nombres y precios, y ajusta el "avisar cuando queden".
4. **Compras → + Nueva compra**: registra tu importación con flete e impuestos. El inventario y el costo real de cada producto se calculan solos.
5. **Ventas → + Nueva venta**: cada pedido que cierres por WhatsApp.

El stock empieza en 0. No se puede vender lo que no haya entrado por una compra.

## Cómo se manejan los números

- **Ingresos:** ventas pagadas o entregadas. Las pendientes no cuentan hasta que las marques como pagadas.
- **Costo real:** el flete y los impuestos de cada compra se reparten entre sus productos. Si compras el mismo producto a distintos precios, se usa el costo promedio.
- **Utilidad neta:** ingresos − reembolsos − costo de lo vendido − costo de envío − mermas − gastos.
- **Reparto a socios:** cada socio recibe su porcentaje de la utilidad neta acumulada. Lo que ya retiró se resta.
- **Caja estimada:** compárala con tu efectivo y bancos reales de vez en cuando. Si no coincide, falta registrar algo.
- **Los registros no se borran**, se anulan o se cancelan. Así queda el historial.

## Seguridad

- Hay dos roles: **administrador** (registra y modifica) y **socio** (solo lectura). Para agregar un socio: créale un usuario en Supabase y ejecuta el mismo `insert` del paso 3 con `'socio'` en lugar de `'admin'`.
- La sesión se cierra sola tras 30 minutos sin actividad.
- Activa la verificación en dos pasos en tu cuenta de GitHub y en tu cuenta de Supabase.
- Usa contraseñas largas y distintas para cada servicio.
- Los respaldos contienen nombres y teléfonos de clientes: guárdalos en un lugar privado.

## Respaldos

En **Respaldo** puedes descargar todo en un archivo `.json` o cada tabla en `.csv` para Excel. **Hazlo una vez por semana** y guárdalo fuera del panel (Drive, correo o memoria USB). El panel te avisa cuando pasan 7 días.

Cosas a tener en cuenta del plan gratuito de Supabase (verifica las condiciones actuales en supabase.com):

- Hasta donde sé, no incluye respaldos automáticos descargables. Tu respaldo semanal es lo que te protege.
- Un proyecto gratuito sin uso durante una semana se pausa. Los datos no se borran y se reactiva con un clic desde el panel de Supabase.

## Lo que este panel NO hace (todavía)

- **No recibe pedidos solo.** Tu tienda envía los pedidos por WhatsApp; tú los registras aquí a mano.
- **No edita montos de una venta ya hecha.** Si te equivocaste, cancela la venta y regístrala de nuevo.
- **No restaura respaldos con un botón.** Sirven para consultar los datos o recargarlos con ayuda técnica.
- **No es contabilidad legal:** no emite facturas ni calcula IVA o impuesto sobre la renta. Para tu formalización consulta con un contador.
- Si cambias el porcentaje de un socio, el cambio aplica a **toda** la utilidad acumulada, no solo a la futura.

## Mejora recomendada más adelante

En `admin/index.html` la librería de Supabase se carga con `supabase-js@2` (la última versión 2.x). Cuando confirmes que todo funciona, conviene fijar una versión exacta (por ejemplo `@2.x.y`, con el número actual de npmjs.com) para que no cambie sin avisarte.
