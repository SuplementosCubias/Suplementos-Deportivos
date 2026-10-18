-- =====================================================================
-- ProEvidence El Salvador · Sistema de administración
-- Esquema de base de datos para Supabase
--
-- CÓMO USARLO
--   1. Supabase → SQL Editor → New query
--   2. Pega TODO este archivo y pulsa Run
--   3. Es seguro volver a ejecutarlo SOLO en un proyecto vacío.
--      (No uses "drop" ni lo repitas con datos reales.)
--
-- SEGURIDAD
--   * RLS activado en todas las tablas.
--   * Solo usuarios con una fila en "perfiles" pueden ver datos.
--   * rol 'admin'  -> puede registrar y modificar.
--   * rol 'socio'  -> solo lectura.
--   * Compras, ventas, devoluciones y movimientos de inventario SOLO se
--     escriben mediante funciones (para que stock y costos no se
--     descuadren). Nadie puede borrar registros: se anulan o se cancelan.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Utilidades
-- ---------------------------------------------------------------------

-- Fecha de hoy en El Salvador (UTC-6), sin importar la hora del servidor
create or replace function public.hoy_sv()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/El_Salvador')::date
$$;


-- ---------------------------------------------------------------------
-- 1. Usuarios y roles
-- ---------------------------------------------------------------------

create table public.perfiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  nombre    text not null default '',
  rol       text not null default 'socio' check (rol in ('admin', 'socio')),
  creado_en timestamptz not null default now()
);

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  )
$$;

create or replace function public.es_miembro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol in ('admin', 'socio')
  )
$$;


-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------

-- Productos e inventario (stock y costo_promedio los mantienen las funciones)
create table public.productos (
  id             bigint generated always as identity primary key,
  nombre         text not null,
  sku            text,
  precio_venta   numeric(12,2) not null default 0 check (precio_venta >= 0),
  costo_promedio numeric(12,4) not null default 0 check (costo_promedio >= 0),
  stock          integer not null default 0 check (stock >= 0),
  stock_minimo   integer not null default 3 check (stock_minimo >= 0),
  activo         boolean not null default true,
  creado_en      timestamptz not null default now()
);
create unique index productos_nombre_uq on public.productos (lower(nombre));

-- Historial de movimientos de inventario (kardex)
create table public.movimientos_inventario (
  id             bigint generated always as identity primary key,
  fecha          date not null default public.hoy_sv(),
  producto_id    bigint not null references public.productos(id),
  tipo           text not null check (tipo in (
                   'compra', 'anulacion_compra', 'venta', 'cancelacion_venta',
                   'devolucion', 'merma', 'ajuste')),
  cantidad       integer not null check (cantidad <> 0),   -- + entra, - sale
  costo_unitario numeric(12,4) not null default 0,
  referencia_id  bigint,
  nota           text,
  creado_por     uuid default auth.uid(),
  creado_en      timestamptz not null default now()
);
create index on public.movimientos_inventario (producto_id);
create index on public.movimientos_inventario (fecha);

-- Compras / importaciones
create table public.compras (
  id           bigint generated always as identity primary key,
  fecha        date not null default public.hoy_sv(),
  proveedor    text,
  flete        numeric(12,2) not null default 0 check (flete >= 0),
  impuestos    numeric(12,2) not null default 0 check (impuestos >= 0),
  otros_costos numeric(12,2) not null default 0 check (otros_costos >= 0),
  subtotal     numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  nota         text,
  anulada      boolean not null default false,
  creado_por   uuid default auth.uid(),
  creado_en    timestamptz not null default now()
);
create index on public.compras (fecha);

create table public.compra_items (
  id                  bigint generated always as identity primary key,
  compra_id           bigint not null references public.compras(id) on delete cascade,
  producto_id         bigint not null references public.productos(id),
  cantidad            integer not null check (cantidad > 0),
  costo_unitario      numeric(12,4) not null check (costo_unitario >= 0),
  costo_real_unitario numeric(12,4) not null check (costo_real_unitario >= 0)
);
create index on public.compra_items (compra_id);

-- Ventas
create table public.ventas (
  id            bigint generated always as identity primary key,
  fecha         date not null default public.hoy_sv(),
  cliente       text not null,
  telefono      text,
  metodo_pago   text,
  estado        text not null default 'pendiente'
                check (estado in ('pendiente', 'pagada', 'entregada', 'cancelada')),
  subtotal      numeric(12,2) not null default 0,
  descuento     numeric(12,2) not null default 0 check (descuento >= 0),
  envio_cobrado numeric(12,2) not null default 0 check (envio_cobrado >= 0),
  costo_envio   numeric(12,2) not null default 0 check (costo_envio >= 0),
  total         numeric(12,2) not null default 0,
  nota          text,
  creado_por    uuid default auth.uid(),
  creado_en     timestamptz not null default now()
);
create index on public.ventas (fecha);
create index on public.ventas (estado);

create table public.venta_items (
  id              bigint generated always as identity primary key,
  venta_id        bigint not null references public.ventas(id) on delete cascade,
  producto_id     bigint not null references public.productos(id),
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  costo_unitario  numeric(12,4) not null check (costo_unitario >= 0)
);
create index on public.venta_items (venta_id);

-- Devoluciones
create table public.devoluciones (
  id         bigint generated always as identity primary key,
  venta_id   bigint not null references public.ventas(id),
  fecha      date not null default public.hoy_sv(),
  motivo     text,
  reembolso  numeric(12,2) not null default 0 check (reembolso >= 0),
  nota       text,
  creado_por uuid default auth.uid(),
  creado_en  timestamptz not null default now()
);
create index on public.devoluciones (venta_id);

create table public.devolucion_items (
  id              bigint generated always as identity primary key,
  devolucion_id   bigint not null references public.devoluciones(id) on delete cascade,
  producto_id     bigint not null references public.productos(id),
  cantidad        integer not null check (cantidad > 0),
  reingresa_stock boolean not null default true,
  costo_unitario  numeric(12,4) not null default 0
);
create index on public.devolucion_items (devolucion_id);

-- Gastos operativos (publicidad, empaques, dominio, etc.)
-- Los costos de importación (flete, impuestos) van en la compra, no aquí.
create table public.gastos (
  id          bigint generated always as identity primary key,
  fecha       date not null default public.hoy_sv(),
  categoria   text not null default 'Otros',
  descripcion text not null,
  monto       numeric(12,2) not null check (monto > 0),
  anulado     boolean not null default false,
  creado_por  uuid default auth.uid(),
  creado_en   timestamptz not null default now()
);
create index on public.gastos (fecha);

-- Socios y capital
create table public.socios (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  porcentaje numeric(5,2) not null default 0 check (porcentaje >= 0 and porcentaje <= 100),
  activo     boolean not null default true,
  nota       text,
  creado_en  timestamptz not null default now()
);

create table public.movimientos_socios (
  id         bigint generated always as identity primary key,
  socio_id   bigint not null references public.socios(id),
  fecha      date not null default public.hoy_sv(),
  tipo       text not null check (tipo in ('aporte', 'retiro_utilidad', 'retiro_capital')),
  monto      numeric(12,2) not null check (monto > 0),
  nota       text,
  anulado    boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en  timestamptz not null default now()
);
create index on public.movimientos_socios (socio_id);


-- ---------------------------------------------------------------------
-- 3. Funciones de negocio (todas exigen rol admin para escribir)
-- ---------------------------------------------------------------------

-- 3.1 Registrar una compra / importación
-- p_items: [{"producto_id":1,"cantidad":10,"costo_unitario":15.5}, ...]
-- Flete + impuestos + otros se reparten proporcionalmente al valor de cada
-- línea y se suman al costo del producto (costo real puesto en bodega).
create or replace function public.registrar_compra(
  p_fecha     date,
  p_proveedor text,
  p_flete     numeric,
  p_impuestos numeric,
  p_otros     numeric,
  p_nota      text,
  p_items     jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id        bigint;
  v_sub       numeric;
  v_extra     numeric;
  v_qty_total integer;
  v_real      numeric;
  v_nuevo     integer;
  v_costo     numeric;
  v_prod      public.productos%rowtype;
  it          record;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La compra debe tener al menos un producto';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(producto_id bigint, cantidad int, costo_unitario numeric)
    where x.producto_id is null or x.cantidad is null or x.cantidad <= 0
       or x.costo_unitario is null or x.costo_unitario < 0
  ) then
    raise exception 'Revisa las cantidades y los costos de la compra';
  end if;

  v_extra := coalesce(p_flete, 0) + coalesce(p_impuestos, 0) + coalesce(p_otros, 0);
  if v_extra < 0 then
    raise exception 'Los costos adicionales no pueden ser negativos';
  end if;

  select coalesce(sum(x.cantidad * x.costo_unitario), 0), coalesce(sum(x.cantidad), 0)
    into v_sub, v_qty_total
  from jsonb_to_recordset(p_items) as x(producto_id bigint, cantidad int, costo_unitario numeric);

  insert into public.compras (fecha, proveedor, flete, impuestos, otros_costos, subtotal, total, nota)
  values (
    coalesce(p_fecha, public.hoy_sv()),
    nullif(trim(coalesce(p_proveedor, '')), ''),
    coalesce(p_flete, 0), coalesce(p_impuestos, 0), coalesce(p_otros, 0),
    round(v_sub, 2), round(v_sub + v_extra, 2),
    nullif(trim(coalesce(p_nota, '')), '')
  )
  returning id into v_id;

  for it in
    select * from jsonb_to_recordset(p_items) as x(producto_id bigint, cantidad int, costo_unitario numeric)
  loop
    select * into v_prod from public.productos where id = it.producto_id for update;
    if not found then
      raise exception 'El producto % no existe', it.producto_id;
    end if;

    if v_sub > 0 then
      v_real := it.costo_unitario * (1 + v_extra / v_sub);
    else
      v_real := v_extra / v_qty_total;
    end if;
    v_real := round(v_real, 4);

    v_nuevo := v_prod.stock + it.cantidad;
    v_costo := round((v_prod.stock * v_prod.costo_promedio + it.cantidad * v_real) / v_nuevo, 4);

    update public.productos
       set stock = v_nuevo, costo_promedio = v_costo
     where id = v_prod.id;

    insert into public.compra_items (compra_id, producto_id, cantidad, costo_unitario, costo_real_unitario)
    values (v_id, v_prod.id, it.cantidad, it.costo_unitario, v_real);

    insert into public.movimientos_inventario (fecha, producto_id, tipo, cantidad, costo_unitario, referencia_id)
    values (coalesce(p_fecha, public.hoy_sv()), v_prod.id, 'compra', it.cantidad, v_real, v_id);
  end loop;

  return v_id;
end;
$$;


-- 3.2 Anular una compra (solo si el inventario de esa compra sigue en bodega)
create or replace function public.anular_compra(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra public.compras%rowtype;
  v_prod   public.productos%rowtype;
  v_nuevo  integer;
  v_costo  numeric;
  it       record;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  select * into v_compra from public.compras where id = p_id for update;
  if not found then
    raise exception 'La compra no existe';
  end if;
  if v_compra.anulada then
    raise exception 'La compra ya está anulada';
  end if;

  for it in select * from public.compra_items where compra_id = p_id loop
    select * into v_prod from public.productos where id = it.producto_id for update;

    if v_prod.stock < it.cantidad then
      raise exception 'No se puede anular: de "%" ya se vendió parte de este lote (en bodega hay %, la compra trajo %)',
        v_prod.nombre, v_prod.stock, it.cantidad;
    end if;

    v_nuevo := v_prod.stock - it.cantidad;
    if v_nuevo > 0 then
      v_costo := greatest(0, round(
        (v_prod.stock * v_prod.costo_promedio - it.cantidad * it.costo_real_unitario) / v_nuevo, 4));
    else
      v_costo := v_prod.costo_promedio;
    end if;

    update public.productos set stock = v_nuevo, costo_promedio = v_costo where id = v_prod.id;

    insert into public.movimientos_inventario (producto_id, tipo, cantidad, costo_unitario, referencia_id)
    values (v_prod.id, 'anulacion_compra', -it.cantidad, it.costo_real_unitario, p_id);
  end loop;

  update public.compras set anulada = true where id = p_id;
end;
$$;


-- 3.3 Registrar una venta (descuenta stock al momento)
-- p_items: [{"producto_id":1,"cantidad":2,"precio_unitario":43}, ...]
create or replace function public.registrar_venta(
  p_fecha         date,
  p_cliente       text,
  p_telefono      text,
  p_metodo_pago   text,
  p_estado        text,
  p_descuento     numeric,
  p_envio_cobrado numeric,
  p_costo_envio   numeric,
  p_nota          text,
  p_items         jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    bigint;
  v_sub   numeric;
  v_desc  numeric := coalesce(p_descuento, 0);
  v_env   numeric := coalesce(p_envio_cobrado, 0);
  v_cenv  numeric := coalesce(p_costo_envio, 0);
  v_total numeric;
  v_prod  public.productos%rowtype;
  it      record;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if trim(coalesce(p_cliente, '')) = '' then
    raise exception 'Escribe el nombre del cliente';
  end if;
  if coalesce(p_estado, 'pendiente') not in ('pendiente', 'pagada', 'entregada') then
    raise exception 'Estado de venta no válido';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto';
  end if;
  if v_desc < 0 or v_env < 0 or v_cenv < 0 then
    raise exception 'Descuento y envío no pueden ser negativos';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(producto_id bigint, cantidad int, precio_unitario numeric)
    where x.producto_id is null or x.cantidad is null or x.cantidad <= 0
       or x.precio_unitario is null or x.precio_unitario < 0
  ) then
    raise exception 'Revisa las cantidades y precios de la venta';
  end if;

  select coalesce(sum(x.cantidad * x.precio_unitario), 0) into v_sub
  from jsonb_to_recordset(p_items) as x(producto_id bigint, cantidad int, precio_unitario numeric);

  v_total := v_sub - v_desc + v_env;
  if v_total < 0 then
    raise exception 'El descuento no puede ser mayor que la venta';
  end if;

  insert into public.ventas (fecha, cliente, telefono, metodo_pago, estado,
                             subtotal, descuento, envio_cobrado, costo_envio, total, nota)
  values (
    coalesce(p_fecha, public.hoy_sv()),
    trim(p_cliente),
    nullif(trim(coalesce(p_telefono, '')), ''),
    nullif(trim(coalesce(p_metodo_pago, '')), ''),
    coalesce(p_estado, 'pendiente'),
    round(v_sub, 2), v_desc, v_env, v_cenv, round(v_total, 2),
    nullif(trim(coalesce(p_nota, '')), '')
  )
  returning id into v_id;

  for it in
    select * from jsonb_to_recordset(p_items) as x(producto_id bigint, cantidad int, precio_unitario numeric)
  loop
    select * into v_prod from public.productos where id = it.producto_id for update;
    if not found then
      raise exception 'El producto % no existe', it.producto_id;
    end if;
    if v_prod.stock < it.cantidad then
      raise exception 'Stock insuficiente de "%": hay %, pediste %. Registra primero la compra.',
        v_prod.nombre, v_prod.stock, it.cantidad;
    end if;

    update public.productos set stock = stock - it.cantidad where id = v_prod.id;

    insert into public.venta_items (venta_id, producto_id, cantidad, precio_unitario, costo_unitario)
    values (v_id, v_prod.id, it.cantidad, it.precio_unitario, v_prod.costo_promedio);

    insert into public.movimientos_inventario (fecha, producto_id, tipo, cantidad, costo_unitario, referencia_id)
    values (coalesce(p_fecha, public.hoy_sv()), v_prod.id, 'venta', -it.cantidad, v_prod.costo_promedio, v_id);
  end loop;

  return v_id;
end;
$$;


-- 3.4 Cambiar el estado de una venta
-- Cancelar devuelve el stock. Una venta cancelada no se puede reactivar.
create or replace function public.cambiar_estado_venta(p_id bigint, p_estado text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta public.ventas%rowtype;
  v_prod  public.productos%rowtype;
  v_nuevo integer;
  it      record;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;
  if p_estado not in ('pendiente', 'pagada', 'entregada', 'cancelada') then
    raise exception 'Estado de venta no válido';
  end if;

  select * into v_venta from public.ventas where id = p_id for update;
  if not found then
    raise exception 'La venta no existe';
  end if;
  if v_venta.estado = 'cancelada' then
    raise exception 'Una venta cancelada no se puede reactivar. Regístrala de nuevo.';
  end if;
  if v_venta.estado = p_estado then
    return;
  end if;

  if p_estado = 'cancelada' then
    if exists (select 1 from public.devoluciones where venta_id = p_id) then
      raise exception 'Esta venta tiene devoluciones registradas; no se puede cancelar';
    end if;

    for it in select * from public.venta_items where venta_id = p_id loop
      select * into v_prod from public.productos where id = it.producto_id for update;
      v_nuevo := v_prod.stock + it.cantidad;
      update public.productos
         set stock = v_nuevo,
             costo_promedio = round(
               (v_prod.stock * v_prod.costo_promedio + it.cantidad * it.costo_unitario) / v_nuevo, 4)
       where id = v_prod.id;

      insert into public.movimientos_inventario (producto_id, tipo, cantidad, costo_unitario, referencia_id)
      values (v_prod.id, 'cancelacion_venta', it.cantidad, it.costo_unitario, p_id);
    end loop;
  end if;

  update public.ventas set estado = p_estado where id = p_id;
end;
$$;


-- 3.5 Registrar una devolución
-- p_items: [{"producto_id":1,"cantidad":1,"reingresa_stock":true}, ...]
-- Solo ventas pagadas o entregadas. El reembolso resta de los ingresos.
create or replace function public.registrar_devolucion(
  p_venta_id  bigint,
  p_fecha     date,
  p_motivo    text,
  p_reembolso numeric,
  p_nota      text,
  p_items     jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta     public.ventas%rowtype;
  v_prod      public.productos%rowtype;
  v_id        bigint;
  v_vendido   integer;
  v_devuelto  integer;
  v_costo     numeric;
  v_ya_reemb  numeric;
  v_nuevo     integer;
  v_reemb     numeric := coalesce(p_reembolso, 0);
  it          record;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  select * into v_venta from public.ventas where id = p_venta_id for update;
  if not found then
    raise exception 'La venta no existe';
  end if;
  if v_venta.estado not in ('pagada', 'entregada') then
    raise exception 'Solo se registran devoluciones de ventas pagadas o entregadas. Si aún no se cobró, cancela la venta.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Indica qué productos se devuelven';
  end if;
  if v_reemb < 0 then
    raise exception 'El reembolso no puede ser negativo';
  end if;

  select coalesce(sum(reembolso), 0) into v_ya_reemb
  from public.devoluciones where venta_id = p_venta_id;
  if v_ya_reemb + v_reemb > v_venta.total then
    raise exception 'El reembolso total (%) supera el valor de la venta (%)',
      v_ya_reemb + v_reemb, v_venta.total;
  end if;

  insert into public.devoluciones (venta_id, fecha, motivo, reembolso, nota)
  values (
    p_venta_id,
    coalesce(p_fecha, public.hoy_sv()),
    nullif(trim(coalesce(p_motivo, '')), ''),
    v_reemb,
    nullif(trim(coalesce(p_nota, '')), '')
  )
  returning id into v_id;

  for it in
    select * from jsonb_to_recordset(p_items) as x(producto_id bigint, cantidad int, reingresa_stock boolean)
  loop
    if it.producto_id is null or it.cantidad is null or it.cantidad <= 0 then
      raise exception 'Revisa las cantidades devueltas';
    end if;

    select coalesce(sum(cantidad), 0),
           coalesce(sum(cantidad * costo_unitario) / nullif(sum(cantidad), 0), 0)
      into v_vendido, v_costo
    from public.venta_items
    where venta_id = p_venta_id and producto_id = it.producto_id;

    if v_vendido = 0 then
      raise exception 'El producto % no es parte de esa venta', it.producto_id;
    end if;

    select coalesce(sum(di.cantidad), 0) into v_devuelto
    from public.devolucion_items di
    join public.devoluciones d on d.id = di.devolucion_id
    where d.venta_id = p_venta_id and di.producto_id = it.producto_id;

    if v_devuelto + it.cantidad > v_vendido then
      raise exception 'Se intenta devolver más de lo vendido (vendido %, ya devuelto %, ahora %)',
        v_vendido, v_devuelto, it.cantidad;
    end if;

    insert into public.devolucion_items (devolucion_id, producto_id, cantidad, reingresa_stock, costo_unitario)
    values (v_id, it.producto_id, it.cantidad, coalesce(it.reingresa_stock, true), round(v_costo, 4));

    if coalesce(it.reingresa_stock, true) then
      select * into v_prod from public.productos where id = it.producto_id for update;
      v_nuevo := v_prod.stock + it.cantidad;
      update public.productos
         set stock = v_nuevo,
             costo_promedio = round(
               (v_prod.stock * v_prod.costo_promedio + it.cantidad * v_costo) / v_nuevo, 4)
       where id = v_prod.id;

      insert into public.movimientos_inventario (fecha, producto_id, tipo, cantidad, costo_unitario, referencia_id)
      values (coalesce(p_fecha, public.hoy_sv()), v_prod.id, 'devolucion', it.cantidad, round(v_costo, 4), v_id);
    end if;
  end loop;

  return v_id;
end;
$$;


-- 3.6 Ajustar stock: merma (vencido, dañado, perdido) o ajuste por conteo
create or replace function public.ajustar_stock(
  p_producto_id bigint,
  p_delta       integer,
  p_tipo        text,
  p_nota        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prod public.productos%rowtype;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;
  if p_tipo not in ('merma', 'ajuste') then
    raise exception 'Tipo de ajuste no válido';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'La cantidad no puede ser cero';
  end if;
  if p_tipo = 'merma' and p_delta > 0 then
    raise exception 'Una merma resta stock; usa una cantidad negativa';
  end if;

  select * into v_prod from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'El producto no existe';
  end if;
  if v_prod.stock + p_delta < 0 then
    raise exception 'El stock no puede quedar negativo (hay %)', v_prod.stock;
  end if;

  update public.productos set stock = stock + p_delta where id = p_producto_id;

  insert into public.movimientos_inventario (producto_id, tipo, cantidad, costo_unitario, nota)
  values (p_producto_id, p_tipo, p_delta, v_prod.costo_promedio,
          nullif(trim(coalesce(p_nota, '')), ''));
end;
$$;


-- ---------------------------------------------------------------------
-- 4. Reportes (los puede ejecutar cualquier miembro: admin o socio)
-- ---------------------------------------------------------------------

-- Componentes del resultado entre dos fechas.
-- Ingresos = ventas pagadas o entregadas (incluye lo cobrado por envío).
-- Utilidad neta = ingresos - reembolsos - costo de lo vendido (neto de lo
--   devuelto a bodega) - costo de envío - mermas y ajustes - gastos.
create or replace function public.componentes_resultado(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  d1 date := coalesce(p_desde, date '1900-01-01');
  d2 date := coalesce(p_hasta, date '2999-12-31');
  v_ingresos   numeric;
  v_num        integer;
  v_unidades   integer;
  v_cogs       numeric;
  v_envio      numeric;
  v_reembolsos numeric;
  v_recuperado numeric;
  v_mermas     numeric;
  v_gastos     numeric;
  v_bruta      numeric;
  v_neta       numeric;
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  select coalesce(sum(total), 0), count(*), coalesce(sum(costo_envio), 0)
    into v_ingresos, v_num, v_envio
  from public.ventas
  where estado in ('pagada', 'entregada') and fecha between d1 and d2;

  select coalesce(sum(vi.cantidad * vi.costo_unitario), 0), coalesce(sum(vi.cantidad), 0)
    into v_cogs, v_unidades
  from public.venta_items vi
  join public.ventas v on v.id = vi.venta_id
  where v.estado in ('pagada', 'entregada') and v.fecha between d1 and d2;

  select coalesce(sum(reembolso), 0) into v_reembolsos
  from public.devoluciones where fecha between d1 and d2;

  select coalesce(sum(di.cantidad * di.costo_unitario), 0) into v_recuperado
  from public.devolucion_items di
  join public.devoluciones d on d.id = di.devolucion_id
  where di.reingresa_stock and d.fecha between d1 and d2;

  select coalesce(-sum(cantidad * costo_unitario), 0) into v_mermas
  from public.movimientos_inventario
  where tipo in ('merma', 'ajuste') and fecha between d1 and d2;

  select coalesce(sum(monto), 0) into v_gastos
  from public.gastos where not anulado and fecha between d1 and d2;

  v_bruta := v_ingresos - v_reembolsos - (v_cogs - v_recuperado) - v_envio;
  v_neta  := v_bruta - v_mermas - v_gastos;

  return jsonb_build_object(
    'ventas',           v_num,
    'unidades',         v_unidades,
    'ingresos',         round(v_ingresos, 2),
    'reembolsos',       round(v_reembolsos, 2),
    'costo_ventas',     round(v_cogs - v_recuperado, 2),
    'costo_envio',      round(v_envio, 2),
    'utilidad_bruta',   round(v_bruta, 2),
    'mermas_ajustes',   round(v_mermas, 2),
    'gastos',           round(v_gastos, 2),
    'utilidad_neta',    round(v_neta, 2)
  );
end;
$$;


-- Resumen general: período + situación actual (inventario, caja, por cobrar)
create or replace function public.resumen_financiero(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  per        jsonb;
  acu        jsonb;
  v_inv      numeric;
  v_pend     numeric;
  v_comp     numeric;
  v_aportes  numeric;
  v_ret_cap  numeric;
  v_ret_ut   numeric;
  v_compras  numeric;
  v_caja     numeric;
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  per := public.componentes_resultado(p_desde, p_hasta);
  acu := public.componentes_resultado(null, null);

  select coalesce(sum(stock * costo_promedio), 0) into v_inv from public.productos;

  select coalesce(sum(total), 0) into v_pend
  from public.ventas where estado = 'pendiente';

  select coalesce(sum(vi.cantidad * vi.costo_unitario), 0) into v_comp
  from public.venta_items vi
  join public.ventas v on v.id = vi.venta_id
  where v.estado = 'pendiente';

  select
    coalesce(sum(monto) filter (where tipo = 'aporte'), 0),
    coalesce(sum(monto) filter (where tipo = 'retiro_capital'), 0),
    coalesce(sum(monto) filter (where tipo = 'retiro_utilidad'), 0)
    into v_aportes, v_ret_cap, v_ret_ut
  from public.movimientos_socios where not anulado;

  select coalesce(sum(total), 0) into v_compras
  from public.compras where not anulada;

  v_caja := v_aportes - v_ret_cap - v_ret_ut
            + (acu->>'ingresos')::numeric
            - (acu->>'reembolsos')::numeric
            - v_compras
            - (acu->>'gastos')::numeric
            - (acu->>'costo_envio')::numeric;

  return jsonb_build_object(
    'periodo',              per,
    'acumulado',            acu,
    'valor_inventario',     round(v_inv, 2),
    'inventario_comprometido', round(v_comp, 2),
    'por_cobrar',           round(v_pend, 2),
    'caja_estimada',        round(v_caja, 2),
    'aportes',              round(v_aportes, 2),
    'retiros_capital',      round(v_ret_cap, 2),
    'retiros_utilidad',     round(v_ret_ut, 2)
  );
end;
$$;


-- Reparto por socio (usa la utilidad neta acumulada y el % actual de cada socio)
create or replace function public.resumen_socios()
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_util  numeric;
  v_pct   numeric;
  v_lista jsonb;
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  v_util := (public.componentes_resultado(null, null)->>'utilidad_neta')::numeric;
  select coalesce(sum(porcentaje), 0) into v_pct from public.socios where activo;

  select coalesce(jsonb_agg(fila order by (fila->>'id')::bigint), '[]'::jsonb)
    into v_lista
  from (
    select jsonb_build_object(
      'id',                s.id,
      'nombre',            s.nombre,
      'porcentaje',        s.porcentaje,
      'activo',            s.activo,
      'aportes',           coalesce(sum(m.monto) filter (where m.tipo = 'aporte' and not m.anulado), 0),
      'retiros_capital',   coalesce(sum(m.monto) filter (where m.tipo = 'retiro_capital' and not m.anulado), 0),
      'retiros_utilidad',  coalesce(sum(m.monto) filter (where m.tipo = 'retiro_utilidad' and not m.anulado), 0),
      'utilidad_asignada', round(v_util * s.porcentaje / 100, 2),
      'utilidad_disponible',
        round(v_util * s.porcentaje / 100
              - coalesce(sum(m.monto) filter (where m.tipo = 'retiro_utilidad' and not m.anulado), 0), 2)
    ) as fila
    from public.socios s
    left join public.movimientos_socios m on m.socio_id = s.id
    group by s.id
  ) t;

  return jsonb_build_object(
    'utilidad_acumulada', round(v_util, 2),
    'porcentaje_total',   v_pct,
    'socios',             v_lista
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 5. Seguridad: RLS, permisos y funciones
-- ---------------------------------------------------------------------

alter table public.perfiles enable row level security;

create policy perfiles_ver on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.es_admin());

create policy perfiles_admin on public.perfiles
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

do $$
declare
  t text;
begin
  foreach t in array array[
    'productos', 'movimientos_inventario', 'compras', 'compra_items',
    'ventas', 'venta_items', 'devoluciones', 'devolucion_items',
    'gastos', 'socios', 'movimientos_socios'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.es_miembro())',
      'leer_' || t, t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.es_admin())',
      'insertar_' || t, t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.es_admin()) with check (public.es_admin())',
      'actualizar_' || t, t);
  end loop;
end $$;

-- Permisos de tabla: nada para anon; lectura para usuarios con sesión;
-- escritura directa solo donde no afecta stock ni costos.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on all tables in schema public to authenticated;

grant insert (nombre, sku, precio_venta, stock_minimo, activo),
      update (nombre, sku, precio_venta, stock_minimo, activo)
  on public.productos to authenticated;

grant insert, update on public.socios             to authenticated;
grant insert, update on public.perfiles           to authenticated;

-- Gastos y movimientos de socios: se registran y solo se pueden ANULAR
-- (no se puede cambiar el monto ni la fecha de algo ya registrado)
grant insert on public.gastos             to authenticated;
grant update (anulado) on public.gastos   to authenticated;
grant insert on public.movimientos_socios to authenticated;
grant update (anulado) on public.movimientos_socios to authenticated;

grant update (cliente, telefono, metodo_pago, nota) on public.ventas  to authenticated;
grant update (proveedor, nota)                      on public.compras to authenticated;

-- Funciones: nada para anon; ejecutables solo con sesión
-- (las de escritura vuelven a verificar que seas admin)
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as firma
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', f.firma);
    execute format('grant execute on function %s to authenticated', f.firma);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 6. Productos iniciales (los de tu tienda). Costo y stock empiezan en 0:
--    se llenan al registrar tu primera compra.
-- ---------------------------------------------------------------------

insert into public.productos (nombre, precio_venta) values
  ('Creatina Planitum - 80 Servicios', 43),
  ('Creatina ON - 120 Servicios', 53),
  ('Vitamina D3 - 120 servicios', 21),
  ('Omega 3 - 100 servicios', 24),
  ('Zinc - 100 Servicios', 21),
  ('Citrato de Magnesio - 120 Servicios', 23),
  ('Creatina Dimatize (99.9% PUREZA) - 60 Servicios', 42.50),
  ('Melatonina 3 mg con sabor a fresa - 90 Servicios', 21),
  ('Creatina NUTREX - 60 Servicios', 26.50),
  ('Nutricost D3 K2 - 120 Servicios', 26),
  ('Alpha test muscletech - 120 Servicios', 36)
on conflict do nothing;


-- ---------------------------------------------------------------------
-- 7. PASO FINAL (hazlo a mano, NO lo ejecutes tal cual)
--
--   a) Supabase → Authentication → Users → Add user → crea tu usuario
--      con tu correo y una contraseña larga.
--   b) Cambia TU_CORREO por ese correo y ejecuta SOLO esta instrucción:
--
--   insert into public.perfiles (id, nombre, rol)
--   select id, 'Tu nombre', 'admin' from auth.users
--   where email = 'TU_CORREO@ejemplo.com';
--
--   Para un socio (solo lectura), igual pero con rol 'socio'.
--   Recomendado: Authentication → Sign In / Providers → desactiva
--   "Allow new users to sign up" para que nadie más pueda registrarse.
-- ---------------------------------------------------------------------
