-- =====================================================================
-- ETAPA 5 — parte 2/2: motoboys, corridas e despacho (seções 10, 11, 26)
-- Rode DEPOIS da parte 1 (20261003000100_order_status_courier.sql).
--
-- Fluxo de entrega com app:
--   Pronto → [Chamar motoboy] Aguardando motoboy → [motoboy aceita]
--   Motoboy a caminho → [retirou] Saiu para entrega → [concluiu] Entregue
-- Fluxo manual ("Entregar sem o app"): Pronto → Saiu para entrega → Entregue
-- =====================================================================

create type public.courier_status as enum ('available', 'busy', 'offline');
create type public.delivery_status as enum ('offered', 'accepted', 'picked_up', 'delivered', 'cancelled');

-- ---------------------------------------------------------------------
-- couriers
-- ---------------------------------------------------------------------
create table public.couriers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.profiles (id) on delete cascade,
  name          varchar(120) not null check (length(btrim(name)) >= 2),
  phone         varchar(11) check (phone ~ '^[1-9]{2}9?[0-9]{8}$'),
  vehicle_type  varchar(40),
  plate         varchar(10),
  status        public.courier_status not null default 'offline',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger couriers_set_updated_at
  before update on public.couriers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- deliveries — uma por pedido (reaproveitada se a chamada for refeita)
-- ---------------------------------------------------------------------
create table public.deliveries (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders (id) on delete cascade,
  courier_id    uuid references public.couriers (id) on delete set null,
  status        public.delivery_status not null default 'offered',
  offered_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  picked_up_at  timestamptz,
  delivered_at  timestamptz,
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  constraint deliveries_courier_when_assigned
    check (status in ('offered', 'cancelled') or courier_id is not null)
);

create index deliveries_status_idx on public.deliveries (status);
create index deliveries_courier_idx on public.deliveries (courier_id, delivered_at desc);
-- Um motoboy só pode ter uma entrega ativa por vez
create unique index deliveries_one_active_per_courier
  on public.deliveries (courier_id) where status in ('accepted', 'picked_up');

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.current_courier_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.couriers c
  join public.profiles p on p.id = c.user_id
  where c.user_id = (select auth.uid())
    and c.active and p.active and p.role = 'courier'
$$;

revoke execute on function public.current_courier_id() from public, anon;
grant execute on function public.current_courier_id() to authenticated;

-- Perfil do atendente (Admin/Operador) ou erro
create or replace function public._staff_profile()
returns public.profiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile
  from public.profiles
  where id = (select auth.uid()) and active and role in ('admin', 'operator');
  if v_profile.id is null then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;
  return v_profile;
end;
$$;

-- Aplica um novo status ao pedido: datas, histórico e estatísticas do cliente
create or replace function public._apply_order_status(
  p_order_id uuid,
  p_from public.order_status,
  p_to public.order_status,
  p_actor uuid,
  p_actor_name text,
  p_reason text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_total       numeric(10, 2);
  v_created_at  timestamptz;
begin
  update public.orders
     set status = p_to,
         confirmed_at = case when p_to = 'confirmed' then now() else confirmed_at end,
         ready_at = case when p_to in ('ready', 'ready_for_pickup') and ready_at is null then now() else ready_at end,
         delivered_at = case when p_to in ('delivered', 'picked_up') then now() else delivered_at end,
         cancelled_at = case when p_to in ('cancelled', 'refused') then now() else cancelled_at end,
         cancellation_reason = case when p_to in ('cancelled', 'refused') then p_reason else cancellation_reason end
   where id = p_order_id
  returning customer_id, total, created_at into v_customer_id, v_total, v_created_at;

  insert into public.order_status_history
    (order_id, previous_status, new_status, changed_by, changed_by_name, reason)
  values (p_order_id, p_from, p_to, p_actor, p_actor_name, p_reason);

  -- Estatísticas: somente pedidos concluídos (seção 24)
  if p_to in ('delivered', 'picked_up') then
    update public.customers
       set total_orders = total_orders + 1,
           total_spent = total_spent + v_total,
           first_order_at = coalesce(first_order_at, v_created_at),
           last_order_at = greatest(coalesce(last_order_at, v_created_at), v_created_at)
     where id = v_customer_id;
  end if;
end;
$$;

-- Libera o motoboy (volta a Disponível) se estiver ocupado
create or replace function public._release_courier(p_courier_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.couriers set status = 'available'
  where id = p_courier_id and status = 'busy'
$$;

revoke execute on function public._staff_profile() from public, anon, authenticated;
revoke execute on function public._apply_order_status(uuid, public.order_status, public.order_status, uuid, text, text)
  from public, anon, authenticated;
revoke execute on function public._release_courier(uuid) from public, anon, authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.couriers   enable row level security;
alter table public.deliveries enable row level security;

revoke all on public.couriers, public.deliveries from anon;
revoke insert, update, delete, truncate on public.couriers, public.deliveries from authenticated;

create policy "couriers_select" on public.couriers
  for select to authenticated
  using ((select public.is_staff()) or user_id = (select auth.uid()));

-- As linhas de deliveries não têm dados pessoais (só IDs e status).
-- Motoboy vê: as próprias corridas e as ofertas abertas enquanto está Disponível.
create policy "deliveries_select" on public.deliveries
  for select to authenticated
  using (
    (select public.is_staff())
    or courier_id = (select public.current_courier_id())
    or (
      status = 'offered'
      and exists (
        select 1 from public.couriers c
        where c.id = (select public.current_courier_id()) and c.status = 'available'
      )
    )
  );

-- Tempo real: painel da loja e app do motoboy (RLS se aplica)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'deliveries') then
      alter publication supabase_realtime add table public.deliveries;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couriers') then
      alter publication supabase_realtime add table public.couriers;
    end if;
  end if;
end;
$$;

-- =====================================================================
-- Mudança manual de status (atualiza a função da Etapa 4)
-- Os passos com motoboy (Aguardando motoboy / Motoboy a caminho) só
-- acontecem pelas funções de despacho abaixo.
-- =====================================================================
create or replace function public.order_transition_allowed(
  p_type public.order_type,
  p_from public.order_status,
  p_to public.order_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from::text in ('delivered', 'picked_up', 'cancelled', 'refused') then false
    when p_to::text = 'refused' then p_from::text = 'new'
    when p_to::text = 'cancelled' then true
    when p_type = 'delivery' then p_from::text || '>' || p_to::text in (
      'new>confirmed',
      'confirmed>preparing',
      'preparing>ready',
      'ready>out_for_delivery',      -- "Entregar sem o app"
      'out_for_delivery>delivered'
    )
    else p_from::text || '>' || p_to::text in (
      'new>confirmed',
      'confirmed>preparing',
      'preparing>ready_for_pickup',
      'ready_for_pickup>picked_up'
    )
  end
$$;

create or replace function public.change_order_status(
  p_order_id uuid,
  p_new_status public.order_status,
  p_expected_status public.order_status default null,
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile  public.profiles%rowtype := public._staff_profile();
  v_order    public.orders%rowtype;
  v_delivery public.deliveries%rowtype;
  v_reason   text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'Pedido não encontrado.' using errcode = 'P0001';
  end if;
  if p_expected_status is not null and v_order.status <> p_expected_status then
    raise exception 'Este pedido já foi atualizado por outra pessoa. A tela foi recarregada.'
      using errcode = 'P0001';
  end if;
  if not public.order_transition_allowed(v_order.order_type, v_order.status, p_new_status) then
    raise exception 'Não é possível mudar este pedido para esse status.' using errcode = 'P0001';
  end if;
  if p_new_status in ('cancelled', 'refused') and v_reason is null then
    raise exception 'Informe o motivo.' using errcode = 'P0001';
  end if;
  if length(v_reason) > 300 then
    raise exception 'Motivo muito longo.' using errcode = 'P0001';
  end if;

  -- Corrida vinculada: cancelar o pedido cancela a corrida; marcar entregue
  -- manualmente encerra a corrida. Em ambos os casos o motoboy é liberado.
  select * into v_delivery from public.deliveries where order_id = v_order.id for update;
  if v_delivery.id is not null and v_delivery.status in ('offered', 'accepted', 'picked_up') then
    if p_new_status = 'cancelled' then
      update public.deliveries set status = 'cancelled', cancelled_at = now() where id = v_delivery.id;
      perform public._release_courier(v_delivery.courier_id);
    elsif p_new_status = 'delivered' then
      update public.deliveries set status = 'delivered', delivered_at = now() where id = v_delivery.id;
      perform public._release_courier(v_delivery.courier_id);
    end if;
  end if;

  perform public._apply_order_status(v_order.id, v_order.status, p_new_status, v_profile.id, v_profile.name, v_reason);
  return jsonb_build_object('id', v_order.id, 'status', p_new_status);
end;
$$;

-- =====================================================================
-- Despacho (loja)
-- =====================================================================

-- CHAMAR MOTOBOY: oferece a corrida a todos os motoboys disponíveis
create or replace function public.dispatch_delivery(p_order_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile   public.profiles%rowtype := public._staff_profile();
  v_order     public.orders%rowtype;
  v_available integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'Pedido não encontrado.' using errcode = 'P0001';
  end if;
  if v_order.order_type <> 'delivery' or v_order.status <> 'ready' then
    raise exception 'Só é possível chamar motoboy para pedidos de entrega prontos.' using errcode = 'P0001';
  end if;

  insert into public.deliveries (order_id, status, offered_at)
  values (v_order.id, 'offered', now())
  on conflict (order_id) do update
    set status = 'offered', courier_id = null, offered_at = now(),
        accepted_at = null, picked_up_at = null, delivered_at = null, cancelled_at = null;

  perform public._apply_order_status(v_order.id, 'ready', 'awaiting_courier', v_profile.id, v_profile.name, null);

  select count(*) into v_available from public.couriers where active and status = 'available';
  return jsonb_build_object('available_couriers', v_available);
end;
$$;

-- Cancelar a chamada (antes da retirada): pedido volta a "Pronto"
create or replace function public.cancel_dispatch(p_order_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile  public.profiles%rowtype := public._staff_profile();
  v_order    public.orders%rowtype;
  v_delivery public.deliveries%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null or v_order.status not in ('awaiting_courier', 'courier_assigned') then
    raise exception 'Não há chamada de motoboy ativa para este pedido.' using errcode = 'P0001';
  end if;

  select * into v_delivery from public.deliveries where order_id = v_order.id for update;
  if v_delivery.status = 'picked_up' then
    raise exception 'O motoboy já retirou o pedido.' using errcode = 'P0001';
  end if;

  update public.deliveries set status = 'cancelled', cancelled_at = now() where id = v_delivery.id;
  perform public._release_courier(v_delivery.courier_id);
  perform public._apply_order_status(v_order.id, v_order.status, 'ready', v_profile.id, v_profile.name,
                                     'Chamada de motoboy cancelada');
end;
$$;

-- =====================================================================
-- App do motoboy
-- =====================================================================

-- Trava pedido → corrida → motoboy, na mesma ordem das funções da loja
-- (evita deadlocks). As travas valem até o fim da transação; quem chama
-- lê os registros em seguida. Retorna o id do pedido.
create or replace function public._lock_courier_delivery(p_delivery_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  if public.current_courier_id() is null then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;
  select order_id into v_order_id from public.deliveries where id = p_delivery_id;
  if v_order_id is null then
    raise exception 'Entrega não encontrada.' using errcode = 'P0001';
  end if;
  perform 1 from public.orders where id = v_order_id for update;
  perform 1 from public.deliveries where id = p_delivery_id for update;
  perform 1 from public.couriers where id = public.current_courier_id() for update;
  return v_order_id;
end;
$$;

revoke execute on function public._lock_courier_delivery(uuid) from public, anon, authenticated;

-- ACEITAR ENTREGA — atômico: só o primeiro motoboy consegue (seção 11)
create or replace function public.accept_delivery(p_delivery_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.couriers;
  d public.deliveries;
  o public.orders;
  v_order_id uuid;
begin
  v_order_id := public._lock_courier_delivery(p_delivery_id);
  select * into o from public.orders where id = v_order_id;
  select * into d from public.deliveries where id = p_delivery_id;
  select * into v from public.couriers where id = public.current_courier_id();

  if d.status <> 'offered' or o.status <> 'awaiting_courier' then
    raise exception 'Esta entrega já foi aceita por outro motoboy.' using errcode = 'P0001';
  end if;
  if v.status = 'busy' then
    raise exception 'Você já tem uma entrega em andamento.' using errcode = 'P0001';
  end if;
  if v.status <> 'available' then
    raise exception 'Fique Disponível para aceitar entregas.' using errcode = 'P0001';
  end if;

  update public.deliveries
     set status = 'accepted', courier_id = v.id, accepted_at = now()
   where id = d.id;
  update public.couriers set status = 'busy' where id = v.id;
  perform public._apply_order_status(o.id, o.status, 'courier_assigned', v.user_id, v.name, null);
end;
$$;

-- PEDIDO RETIRADO
create or replace function public.pickup_delivery(p_delivery_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.couriers;
  d public.deliveries;
  o public.orders;
  v_order_id uuid;
begin
  v_order_id := public._lock_courier_delivery(p_delivery_id);
  select * into o from public.orders where id = v_order_id;
  select * into d from public.deliveries where id = p_delivery_id;
  select * into v from public.couriers where id = public.current_courier_id();
  if d.courier_id is distinct from v.id then
    raise exception 'Esta entrega não está com você.' using errcode = 'P0001';
  end if;
  if d.status <> 'accepted' then
    raise exception 'Esta entrega não está aguardando retirada.' using errcode = 'P0001';
  end if;

  update public.deliveries set status = 'picked_up', picked_up_at = now() where id = d.id;
  perform public._apply_order_status(o.id, o.status, 'out_for_delivery', v.user_id, v.name, null);
end;
$$;

-- ENTREGA CONCLUÍDA
create or replace function public.complete_delivery(p_delivery_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.couriers;
  d public.deliveries;
  o public.orders;
  v_order_id uuid;
begin
  v_order_id := public._lock_courier_delivery(p_delivery_id);
  select * into o from public.orders where id = v_order_id;
  select * into d from public.deliveries where id = p_delivery_id;
  select * into v from public.couriers where id = public.current_courier_id();
  if d.courier_id is distinct from v.id then
    raise exception 'Esta entrega não está com você.' using errcode = 'P0001';
  end if;
  if d.status <> 'picked_up' then
    raise exception 'Marque "Pedido retirado" antes de concluir.' using errcode = 'P0001';
  end if;

  update public.deliveries set status = 'delivered', delivered_at = now() where id = d.id;
  update public.couriers set status = 'available' where id = v.id;
  perform public._apply_order_status(o.id, o.status, 'delivered', v.user_id, v.name, null);
end;
$$;

-- Disponível / Offline (Ocupado é automático)
create or replace function public.set_courier_status(p_status public.courier_status)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.couriers;
begin
  select * into v from public.couriers where id = public.current_courier_id() for update;
  if v.id is null then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;
  if p_status = 'busy' then
    raise exception 'Status inválido.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.deliveries where courier_id = v.id and status in ('accepted', 'picked_up')) then
    raise exception 'Conclua a entrega atual antes de mudar o status.' using errcode = 'P0001';
  end if;
  update public.couriers set status = p_status where id = v.id;
end;
$$;

-- Tela inicial do motoboy: status, entrega atual (dados completos só dela)
-- e ofertas (apenas bairro, pagamento e valores — sem dados pessoais)
create or replace function public.get_courier_home()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v       public.couriers;
  v_curr  jsonb;
  v_offer jsonb := '[]'::jsonb;
begin
  select * into v from public.couriers where id = public.current_courier_id();
  if v.id is null then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'delivery_id', d.id,
    'delivery_status', d.status,
    'accepted_at', d.accepted_at,
    'picked_up_at', d.picked_up_at,
    'order_number', o.order_number,
    'customer_name', o.customer_snapshot ->> 'name',
    'customer_phone', o.customer_snapshot ->> 'phone',
    'address', o.address_snapshot,
    'notes', o.customer_notes,
    'payment_method', o.payment_method,
    'total', o.total,
    'change_for', o.change_for,
    'amount_to_collect', case when o.payment_method = 'pix' then 0 else o.total end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.product_name_snapshot, 'quantity', i.quantity) order by i.sort_order)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  into v_curr
  from public.deliveries d
  join public.orders o on o.id = d.order_id
  where d.courier_id = v.id and d.status in ('accepted', 'picked_up')
  limit 1;

  if v.status = 'available' and v_curr is null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'delivery_id', d.id,
      'order_number', o.order_number,
      'neighborhood', o.address_snapshot ->> 'neighborhood',
      'payment_method', o.payment_method,
      'total', o.total,
      'change_for', o.change_for,
      'offered_at', d.offered_at
    ) order by d.offered_at), '[]'::jsonb)
    into v_offer
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    where d.status = 'offered';
  end if;

  return jsonb_build_object(
    'courier', jsonb_build_object('name', v.name, 'status', v.status),
    'current', v_curr,
    'offers', v_offer
  );
end;
$$;

-- Histórico do motoboy (sem dados pessoais do cliente)
create or replace function public.get_courier_history()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(t order by t.delivered_at desc), '[]'::jsonb)
  from (
    select o.order_number, d.delivered_at, o.address_snapshot ->> 'neighborhood' as neighborhood,
           o.payment_method, o.total
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    where d.courier_id = public.current_courier_id() and d.status = 'delivered'
    order by d.delivered_at desc
    limit 100
  ) t
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'dispatch_delivery(uuid)', 'cancel_dispatch(uuid)', 'accept_delivery(uuid)',
    'pickup_delivery(uuid)', 'complete_delivery(uuid)', 'set_courier_status(public.courier_status)',
    'get_courier_home()', 'get_courier_history()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- =====================================================================
-- Dashboard: "entregas em andamento" passa a incluir Motoboy a caminho
-- =====================================================================
create or replace function public.get_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_admin    boolean := public.is_admin();
  v_now_local   timestamp := now() at time zone 'America/Sao_Paulo';
  v_day_start   timestamptz := date_trunc('day', v_now_local) at time zone 'America/Sao_Paulo';
  v_month_start timestamptz := date_trunc('month', v_now_local) at time zone 'America/Sao_Paulo';
  v_result      jsonb;
begin
  if not public.is_staff() then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;

  with valid as (
    select * from public.orders where status not in ('cancelled', 'refused')
  )
  select jsonb_build_object(
    'orders_today', (select count(*) from valid where created_at >= v_day_start),
    'orders_month', (select count(*) from valid where created_at >= v_month_start),
    'in_progress', (select count(*) from public.orders
                    where status not in ('delivered', 'picked_up', 'cancelled', 'refused')),
    'deliveries_in_progress', (select count(*) from public.orders
                               where status in ('awaiting_courier', 'courier_assigned', 'out_for_delivery')),
    'new_customers_month', (select count(*) from public.customers where created_at >= v_month_start),
    'recurring_customers', (select count(*) from public.customers where total_orders >= 2),
    'revenue_today', case when v_is_admin then
      (select coalesce(sum(total), 0) from valid where created_at >= v_day_start) end,
    'revenue_month', case when v_is_admin then
      (select coalesce(sum(total), 0) from valid where created_at >= v_month_start) end,
    'average_ticket_month', case when v_is_admin then
      (select coalesce(round(avg(total), 2), 0) from valid where created_at >= v_month_start) end,
    'top_products', coalesce((
      select jsonb_agg(t order by t.quantity desc, t.name)
      from (
        select i.product_name_snapshot as name, sum(i.quantity)::int as quantity
        from public.order_items i
        join valid o on o.id = i.order_id
        where o.created_at >= v_month_start
        group by i.product_name_snapshot
        order by quantity desc, name
        limit 5
      ) t
    ), '[]'::jsonb),
    'top_customers', coalesce((
      select jsonb_agg(t order by t.total_orders desc, t.name)
      from (
        select c.id, c.name, c.total_orders,
               case when v_is_admin then c.total_spent end as total_spent
        from public.customers c
        where c.total_orders > 0
        order by c.total_orders desc, c.total_spent desc, c.name
        limit 5
      ) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
