-- =====================================================================
-- ETAPA 4 — Operação: mudança de status, histórico, estatísticas do
-- cliente, tempo real e indicadores do dashboard
-- =====================================================================

alter table public.orders add column cancellation_reason text;

-- Nome de quem alterou (snapshot): operadores não leem outros perfis
alter table public.order_status_history add column changed_by_name varchar(120);
alter table public.order_status_history add column reason text;

-- ---------------------------------------------------------------------
-- Transições permitidas (seção 8 do briefing)
-- ---------------------------------------------------------------------
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
    -- Pedidos finalizados não mudam mais
    when p_from in ('delivered', 'picked_up', 'cancelled', 'refused') then false
    when p_to = 'refused' then p_from = 'new'
    when p_to = 'cancelled' then true
    when p_type = 'delivery' then p_from::text || '>' || p_to::text in (
      'new>confirmed',
      'confirmed>preparing',
      'preparing>ready',
      'ready>awaiting_courier',
      'awaiting_courier>out_for_delivery',
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

-- ---------------------------------------------------------------------
-- Única forma de alterar o status de um pedido.
-- p_expected_status: status que o atendente estava vendo; se outra pessoa
-- já mudou, a operação é recusada (evita cliques duplicados).
-- ---------------------------------------------------------------------
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
  v_order   public.orders%rowtype;
  v_profile public.profiles%rowtype;
  v_reason  text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_profile
  from public.profiles
  where id = (select auth.uid()) and active and role in ('admin', 'operator');
  if v_profile.id is null then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;

  -- Trava a linha: chamadas simultâneas são processadas uma de cada vez
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

  update public.orders
     set status = p_new_status,
         confirmed_at = case when p_new_status = 'confirmed' then now() else confirmed_at end,
         ready_at = case when p_new_status in ('ready', 'ready_for_pickup') then now() else ready_at end,
         delivered_at = case when p_new_status in ('delivered', 'picked_up') then now() else delivered_at end,
         cancelled_at = case when p_new_status in ('cancelled', 'refused') then now() else cancelled_at end,
         cancellation_reason = case when p_new_status in ('cancelled', 'refused') then v_reason else cancellation_reason end
   where id = v_order.id;

  insert into public.order_status_history
    (order_id, previous_status, new_status, changed_by, changed_by_name, reason)
  values
    (v_order.id, v_order.status, p_new_status, v_profile.id, v_profile.name, v_reason);

  -- Estatísticas do cliente: somente pedidos concluídos (seção 24)
  if p_new_status in ('delivered', 'picked_up') then
    update public.customers
       set total_orders = total_orders + 1,
           total_spent = total_spent + v_order.total,
           first_order_at = coalesce(first_order_at, v_order.created_at),
           last_order_at = greatest(coalesce(last_order_at, v_order.created_at), v_order.created_at)
     where id = v_order.customer_id;
  end if;

  return jsonb_build_object('id', v_order.id, 'status', p_new_status);
end;
$$;

revoke execute on function public.change_order_status(uuid, public.order_status, public.order_status, text)
  from public, anon;
grant execute on function public.change_order_status(uuid, public.order_status, public.order_status, text)
  to authenticated;

-- ---------------------------------------------------------------------
-- Tempo real: o painel recebe inserções/alterações de pedidos.
-- O Realtime respeita o RLS (somente Admin/Operador leem pedidos).
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
     ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Indicadores do dashboard (seção 19). Datas no fuso de São Paulo.
-- Valores financeiros somente para o Admin.
-- Faturamento = pedidos não cancelados/recusados.
-- ---------------------------------------------------------------------
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
                               where status in ('awaiting_courier', 'out_for_delivery')),
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

revoke execute on function public.get_dashboard_stats() from public, anon;
grant execute on function public.get_dashboard_stats() to authenticated;
