-- =====================================================================
-- ETAPA 6 — Marketing: clientes, fidelidade, promoções, cupons, origem
-- Autorizado: ajusta funções das Etapas 3/4/5 (preço, cotação, criação do
-- pedido, aplicação de status e acompanhamento público).
-- =====================================================================

-- =====================================================================
-- CLIENTES (seção 12) — observações e revogação de consentimento (LGPD)
-- =====================================================================
alter table public.customers add column marketing_opt_out_at timestamptz;

create or replace function public.set_customer_notes(p_customer_id uuid, p_notes text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype := public._staff_profile();
  v_notes   text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if length(v_notes) > 1000 then
    raise exception 'Observação muito longa (máx. 1000 caracteres).' using errcode = 'P0001';
  end if;
  update public.customers set notes = v_notes where id = p_customer_id;
  if not found then
    raise exception 'Cliente não encontrado.' using errcode = 'P0001';
  end if;
end;
$$;

-- A pedido do cliente: remove o consentimento e registra a data
create or replace function public.revoke_marketing_consent(p_customer_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype := public._staff_profile();
begin
  update public.customers
     set marketing_opt_in = false, marketing_opt_out_at = now()
   where id = p_customer_id and marketing_opt_in;
  if not found then
    raise exception 'Este cliente não tem consentimento ativo.' using errcode = 'P0001';
  end if;
end;
$$;

-- =====================================================================
-- FIDELIDADE (seção 13)
-- =====================================================================
create type public.loyalty_reward_status as enum ('available', 'redeemed', 'expired');

create table public.loyalty_rules (
  id                  uuid primary key default gen_random_uuid(),
  name                varchar(120) not null check (length(btrim(name)) > 0),
  orders_required     integer not null check (orders_required between 2 and 100),
  reward_type         varchar(20) not null default 'product' check (reward_type in ('product', 'other')),
  reward_product_id   uuid references public.products (id) on delete set null,
  reward_description  varchar(160) not null check (length(btrim(reward_description)) > 0),
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- MVP: uma regra ativa por vez
create unique index loyalty_rules_one_active on public.loyalty_rules ((true)) where active;

create trigger loyalty_rules_set_updated_at
  before update on public.loyalty_rules
  for each row execute function public.set_updated_at();

create table public.loyalty_rewards (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.customers (id) on delete cascade,
  loyalty_rule_id     uuid not null references public.loyalty_rules (id) on delete restrict,
  order_id            uuid unique references public.orders (id) on delete set null,
  status              public.loyalty_reward_status not null default 'available',
  reward_description  varchar(160) not null,
  created_at          timestamptz not null default now(),
  redeemed_at         timestamptz,
  redeemed_by_name    varchar(120)
);

create index loyalty_rewards_customer_idx on public.loyalty_rewards (customer_id, created_at desc);

-- Decisão da Etapa 6 (1a): o brinde vale NO pedido que completa a meta.
-- Posição do pedido = concluídos + outros em andamento + 1.
create or replace function public._maybe_create_loyalty_reward(p_customer_id uuid, p_order_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_rule public.loyalty_rules%rowtype;
  v_done integer;
  v_open integer;
begin
  select * into v_rule from public.loyalty_rules where active limit 1;
  if v_rule.id is null then
    return;
  end if;

  select total_orders into v_done from public.customers where id = p_customer_id;
  select count(*) into v_open
  from public.orders
  where customer_id = p_customer_id
    and id <> p_order_id
    and status not in ('delivered', 'picked_up', 'cancelled', 'refused');

  if (coalesce(v_done, 0) + v_open + 1) % v_rule.orders_required = 0 then
    insert into public.loyalty_rewards (customer_id, loyalty_rule_id, order_id, reward_description)
    values (p_customer_id, v_rule.id, p_order_id, v_rule.reward_description);
  end if;
end;
$$;

-- Atendente marca o brinde como entregue
create or replace function public.redeem_loyalty_reward(p_reward_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype := public._staff_profile();
begin
  update public.loyalty_rewards
     set status = 'redeemed', redeemed_at = now(), redeemed_by_name = v_profile.name
   where id = p_reward_id and status = 'available';
  if not found then
    raise exception 'Este brinde não está disponível.' using errcode = 'P0001';
  end if;
end;
$$;

-- =====================================================================
-- PROMOÇÕES (seção 14)
-- =====================================================================
create type public.promotion_type as enum ('percent', 'fixed', 'promotional_price');

create table public.promotions (
  id           uuid primary key default gen_random_uuid(),
  name         varchar(120) not null check (length(btrim(name)) > 0),
  type         public.promotion_type not null,
  value        numeric(10, 2) not null check (value > 0),
  product_id   uuid references public.products (id) on delete cascade,
  category_id  uuid references public.categories (id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  -- Horário diário opcional (fuso de São Paulo). Pode cruzar a meia-noite.
  daily_start  time,
  daily_end    time,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint promotions_one_target check (num_nonnulls(product_id, category_id) = 1),
  constraint promotions_dates check (ends_at > starts_at),
  constraint promotions_percent_range check (type <> 'percent' or value < 100),
  constraint promotions_window_pair check ((daily_start is null) = (daily_end is null)),
  constraint promotions_window_valid check (daily_start is null or daily_start <> daily_end),
  constraint promotions_price_needs_product check (type <> 'promotional_price' or product_id is not null)
);

create index promotions_active_idx on public.promotions (active, starts_at, ends_at);

create trigger promotions_set_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();

create or replace function public._promotion_in_window(p_start time, p_end time)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_now time := (now() at time zone 'America/Sao_Paulo')::time;
begin
  if p_start is null then
    return true;
  end if;
  if p_start < p_end then
    return v_now >= p_start and v_now < p_end;
  end if;
  return v_now >= p_start or v_now < p_end; -- cruza a meia-noite
end;
$$;

-- Preço efetivo do produto agora: menor entre preço promocional do cadastro
-- e as promoções vigentes (seção 24: ativa + dentro das datas [+ horário])
create or replace function public.product_effective_price(p_product_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select least(
    coalesce(p.promotional_price, p.price),
    coalesce(min(
      case pr.type
        when 'percent' then round(p.price * (1 - pr.value / 100), 2)
        when 'fixed' then greatest(p.price - pr.value, 0)
        else pr.value
      end
    ), p.price)
  )
  from public.products p
  left join public.promotions pr
    on pr.active
   and (pr.product_id = p.id or pr.category_id = p.category_id)
   and now() >= pr.starts_at
   and now() <= pr.ends_at
   and public._promotion_in_window(pr.daily_start, pr.daily_end)
  where p.id = p_product_id
  group by p.id, p.price, p.promotional_price
$$;

-- Preços promocionais vigentes para o cardápio público
create or replace function public.get_promotion_prices()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('product_id', t.id, 'price', t.effective)), '[]'::jsonb)
  from (
    select p.id, public.product_effective_price(p.id) as effective, coalesce(p.promotional_price, p.price) as current
    from public.products p
    where p.active
      and exists (
        select 1 from public.promotions pr
        where pr.active
          and (pr.product_id = p.id or pr.category_id = p.category_id)
          and now() between pr.starts_at and pr.ends_at
      )
  ) t
  where t.effective < t.current
$$;

-- =====================================================================
-- CUPONS (seção 15)
-- =====================================================================
create type public.coupon_type as enum ('percent', 'fixed', 'free_delivery');

create table public.coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                varchar(30) not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description         varchar(160),
  type                public.coupon_type not null,
  value               numeric(10, 2) not null default 0 check (value >= 0),
  minimum_order       numeric(10, 2) not null default 0 check (minimum_order >= 0),
  usage_limit         integer check (usage_limit > 0),
  usage_per_customer  integer check (usage_per_customer > 0),
  starts_at           timestamptz not null default now(),
  expires_at          timestamptz,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint coupons_value_required check (type = 'free_delivery' or value > 0),
  constraint coupons_percent_range check (type <> 'percent' or value <= 100),
  constraint coupons_dates check (expires_at is null or expires_at > starts_at)
);

create trigger coupons_set_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

alter table public.orders
  add constraint orders_coupon_id_fkey foreign key (coupon_id) references public.coupons (id) on delete set null;
create index orders_coupon_idx on public.orders (coupon_id) where coupon_id is not null;

-- Valida o cupom; p_phone NULL = ainda sem cliente (cotação). Erros em português.
create or replace function public._validate_coupon(p_code text, p_subtotal numeric, p_phone text)
returns public.coupons
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
  v_used   integer;
begin
  select * into v_coupon from public.coupons where code = upper(btrim(p_code));
  if v_coupon.id is null or not v_coupon.active then
    raise exception 'Cupom inválido.' using errcode = 'P0001';
  end if;
  if now() < v_coupon.starts_at then
    raise exception 'Este cupom ainda não está valendo.' using errcode = 'P0001';
  end if;
  if v_coupon.expires_at is not null and now() > v_coupon.expires_at then
    raise exception 'Este cupom expirou.' using errcode = 'P0001';
  end if;
  if p_subtotal < v_coupon.minimum_order then
    raise exception 'Este cupom exige pedido mínimo de R$ %.',
      replace(to_char(v_coupon.minimum_order, 'FM999990.00'), '.', ',') using errcode = 'P0001';
  end if;

  -- Pedidos cancelados/recusados não contam no uso do cupom
  if v_coupon.usage_limit is not null then
    select count(*) into v_used from public.orders
    where coupon_id = v_coupon.id and status not in ('cancelled', 'refused');
    if v_used >= v_coupon.usage_limit then
      raise exception 'Este cupom atingiu o limite de usos.' using errcode = 'P0001';
    end if;
  end if;

  if v_coupon.usage_per_customer is not null and p_phone is not null then
    select count(*) into v_used
    from public.orders o join public.customers c on c.id = o.customer_id
    where o.coupon_id = v_coupon.id and c.phone = p_phone and o.status not in ('cancelled', 'refused');
    if v_used >= v_coupon.usage_per_customer then
      raise exception 'Você já usou este cupom.' using errcode = 'P0001';
    end if;
  end if;

  return v_coupon;
end;
$$;

-- =====================================================================
-- Preço dos itens (Etapa 3) — agora com promoções vigentes
-- =====================================================================
create or replace function public._price_order_items(p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_item        jsonb;
  v_product     public.products%rowtype;
  v_group       record;
  v_qty         integer;
  v_notes       text;
  v_option_ids  uuid[];
  v_valid       integer;
  v_options     jsonb;
  v_options_sum numeric(10, 2);
  v_unit        numeric(10, 2);
  v_line        numeric(10, 2);
  v_subtotal    numeric(10, 2) := 0;
  v_result      jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Seu carrinho está vazio.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'O carrinho tem itens demais.' using errcode = 'P0001';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_qty := (v_item ->> 'quantity')::integer;
      v_option_ids := array(
        select distinct value::uuid
        from jsonb_array_elements_text(coalesce(v_item -> 'option_ids', '[]'::jsonb))
      );
      select p.* into v_product
      from public.products p
      join public.categories c on c.id = p.category_id
      where p.id = (v_item ->> 'product_id')::uuid
        and p.active
        and c.active;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Carrinho inválido. Atualize a página.' using errcode = 'P0001';
    end;

    if v_product.id is null then
      raise exception 'Um dos produtos do carrinho não está mais disponível.' using errcode = 'P0001';
    end if;
    if not v_product.available then
      raise exception '% está esgotado no momento.', v_product.name using errcode = 'P0001';
    end if;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Quantidade inválida para %.', v_product.name using errcode = 'P0001';
    end if;

    v_notes := nullif(btrim(coalesce(v_item ->> 'notes', '')), '');
    if length(v_notes) > 200 then
      raise exception 'Observação muito longa para %.', v_product.name using errcode = 'P0001';
    end if;

    select count(*) into v_valid
    from public.product_options o
    join public.option_groups g on g.id = o.option_group_id
    where o.id = any (v_option_ids)
      and g.product_id = v_product.id
      and o.available;

    if v_valid <> coalesce(array_length(v_option_ids, 1), 0) then
      raise exception 'Uma opção escolhida para % não está mais disponível.', v_product.name
        using errcode = 'P0001';
    end if;

    for v_group in
      select g.name, g.min_choices, g.max_choices,
             (select count(*) from public.product_options o
               where o.option_group_id = g.id and o.id = any (v_option_ids)) as chosen
      from public.option_groups g
      where g.product_id = v_product.id
    loop
      if v_group.chosen < v_group.min_choices then
        raise exception 'Escolha % em "%" (%).',
          case when v_group.min_choices = 1 then '1 opção' else v_group.min_choices || ' opções' end,
          v_group.name, v_product.name
          using errcode = 'P0001';
      end if;
      if v_group.chosen > v_group.max_choices then
        raise exception 'Escolha no máximo % em "%" (%).',
          case when v_group.max_choices = 1 then '1 opção' else v_group.max_choices || ' opções' end,
          v_group.name, v_product.name
          using errcode = 'P0001';
      end if;
    end loop;

    select
      coalesce(jsonb_agg(jsonb_build_object(
        'option_id', o.id,
        'group_name', g.name,
        'name', o.name,
        'additional_price', o.additional_price
      ) order by g.sort_order, o.sort_order), '[]'::jsonb),
      coalesce(sum(o.additional_price), 0)
    into v_options, v_options_sum
    from public.product_options o
    join public.option_groups g on g.id = o.option_group_id
    where o.id = any (v_option_ids);

    -- Etapa 6: preço efetivo considera promoções vigentes (adicionais sem desconto)
    v_unit := public.product_effective_price(v_product.id) + v_options_sum;
    v_line := v_unit * v_qty;
    v_subtotal := v_subtotal + v_line;

    v_result := v_result || jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'quantity', v_qty,
      'unit_price', v_unit,
      'total', v_line,
      'notes', v_notes,
      'options', v_options
    );

    v_product := null;
  end loop;

  return jsonb_build_object('items', v_result, 'subtotal', v_subtotal);
end;
$$;

revoke execute on function public._price_order_items(jsonb) from public, anon, authenticated;

-- =====================================================================
-- Cotação (Etapa 3) — agora com cupom. Assinatura nova: remove a antiga
-- para não haver ambiguidade na API.
-- =====================================================================
drop function if exists public.quote_order(jsonb, public.order_type);

create or replace function public.quote_order(
  p_items jsonb,
  p_order_type public.order_type,
  p_coupon_code text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings     public.settings%rowtype;
  v_priced       jsonb;
  v_fee          numeric(10, 2);
  v_subtotal     numeric(10, 2);
  v_discount     numeric(10, 2) := 0;
  v_coupon       public.coupons%rowtype;
  v_coupon_error text;
begin
  select * into v_settings from public.settings limit 1;
  v_priced := public._price_order_items(p_items);
  v_subtotal := (v_priced ->> 'subtotal')::numeric;
  v_fee := case when p_order_type = 'delivery' then v_settings.default_delivery_fee else 0 end;

  if nullif(btrim(coalesce(p_coupon_code, '')), '') is not null then
    begin
      v_coupon := public._validate_coupon(p_coupon_code, v_subtotal, null);
      if v_coupon.type = 'percent' then
        v_discount := round(v_subtotal * v_coupon.value / 100, 2);
      elsif v_coupon.type = 'fixed' then
        v_discount := least(v_coupon.value, v_subtotal);
      else
        v_fee := 0;
      end if;
    exception when sqlstate 'P0001' then
      v_coupon_error := sqlerrm;
      v_coupon := null;
    end;
  end if;

  return jsonb_build_object(
    'items', v_priced -> 'items',
    'subtotal', v_subtotal,
    'discount', v_discount,
    'delivery_fee', v_fee,
    'total', v_subtotal - v_discount + v_fee,
    'minimum_order', v_settings.minimum_order,
    'accepting_orders', v_settings.accepting_orders,
    'coupon', case when v_coupon.id is null then null else jsonb_build_object(
      'code', v_coupon.code, 'type', v_coupon.type, 'description', v_coupon.description) end,
    'coupon_error', v_coupon_error
  );
end;
$$;

revoke execute on function public.quote_order(jsonb, public.order_type, text) from public;
grant execute on function public.quote_order(jsonb, public.order_type, text) to anon, authenticated;

-- =====================================================================
-- Criação do pedido (Etapa 3) — agora com cupom e fidelidade
-- =====================================================================
create or replace function public.create_order(p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_settings     public.settings%rowtype;
  v_customer     jsonb := coalesce(p_payload -> 'customer', '{}'::jsonb);
  v_address_in   jsonb := p_payload -> 'address';
  v_name         text := btrim(coalesce(v_customer ->> 'name', ''));
  v_phone        text := regexp_replace(coalesce(v_customer ->> 'phone', ''), '[^0-9]', '', 'g');
  v_email        text := nullif(lower(btrim(coalesce(v_customer ->> 'email', ''))), '');
  v_opt_in       boolean := coalesce((v_customer ->> 'marketing_opt_in')::boolean, false);
  v_type         public.order_type;
  v_payment      public.payment_method;
  v_change_for   numeric(10, 2);
  v_notes        text := nullif(btrim(coalesce(p_payload ->> 'notes', '')), '');
  v_source       text := lower(nullif(btrim(coalesce(p_payload ->> 'source', '')), ''));
  v_coupon_code  text := nullif(btrim(coalesce(p_payload ->> 'coupon_code', '')), '');
  v_coupon       public.coupons%rowtype;
  v_priced       jsonb;
  v_subtotal     numeric(10, 2);
  v_discount     numeric(10, 2) := 0;
  v_fee          numeric(10, 2);
  v_total        numeric(10, 2);
  v_customer_id  uuid;
  v_address      jsonb;
  v_address_id   uuid;
  v_order_id     uuid;
  v_order_number bigint;
  v_token        text;
  v_item         jsonb;
  v_item_id      uuid;
  v_index        integer := 0;
begin
  select * into v_settings from public.settings limit 1;
  if not coalesce(v_settings.accepting_orders, false) then
    raise exception 'A loja não está recebendo pedidos no momento.' using errcode = 'P0001';
  end if;

  if length(v_phone) in (12, 13) and left(v_phone, 2) = '55' then
    v_phone := substr(v_phone, 3);
  end if;
  if v_phone !~ '^[1-9]{2}9?[0-9]{8}$' then
    raise exception 'Informe um WhatsApp válido com DDD.' using errcode = 'P0001';
  end if;
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Informe seu nome.' using errcode = 'P0001';
  end if;
  if v_email is not null and (length(v_email) > 255 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'E-mail inválido.' using errcode = 'P0001';
  end if;

  begin
    v_type := (p_payload ->> 'order_type')::public.order_type;
    v_payment := (p_payload ->> 'payment_method')::public.payment_method;
    v_change_for := nullif(p_payload ->> 'change_for', '')::numeric;
  exception when others then
    raise exception 'Dados do pedido inválidos.' using errcode = 'P0001';
  end;
  if v_type is null then
    raise exception 'Escolha entrega ou retirada.' using errcode = 'P0001';
  end if;
  if v_payment is null then
    raise exception 'Escolha a forma de pagamento.' using errcode = 'P0001';
  end if;
  if length(v_notes) > 500 then
    raise exception 'Observação do pedido muito longa.' using errcode = 'P0001';
  end if;
  if v_source is not null and v_source !~ '^[a-z0-9_-]{1,40}$' then
    v_source := null;
  end if;

  if (
    select count(*) from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.phone = v_phone and o.created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Muitos pedidos em sequência. Aguarde alguns minutos.' using errcode = 'P0001';
  end if;

  v_priced := public._price_order_items(p_payload -> 'items');
  v_subtotal := (v_priced ->> 'subtotal')::numeric;
  if v_subtotal < v_settings.minimum_order then
    raise exception 'O pedido mínimo é de R$ %.', replace(to_char(v_settings.minimum_order, 'FM999990.00'), '.', ',')
      using errcode = 'P0001';
  end if;
  v_fee := case when v_type = 'delivery' then v_settings.default_delivery_fee else 0 end;

  -- Cupom (validado com o telefone: limite por cliente)
  if v_coupon_code is not null then
    v_coupon := public._validate_coupon(v_coupon_code, v_subtotal, v_phone);
    if v_coupon.type = 'percent' then
      v_discount := round(v_subtotal * v_coupon.value / 100, 2);
    elsif v_coupon.type = 'fixed' then
      v_discount := least(v_coupon.value, v_subtotal);
    else
      v_fee := 0;
    end if;
  end if;
  v_total := v_subtotal - v_discount + v_fee;

  if v_payment = 'cash' then
    if v_change_for is not null and v_change_for < v_total then
      raise exception 'O valor para troco deve ser maior que o total do pedido.' using errcode = 'P0001';
    end if;
  else
    v_change_for := null;
  end if;

  if v_type = 'delivery' then
    if v_address_in is null or jsonb_typeof(v_address_in) <> 'object' then
      raise exception 'Informe o endereço de entrega.' using errcode = 'P0001';
    end if;
    v_address := jsonb_build_object(
      'zip_code', nullif(regexp_replace(coalesce(v_address_in ->> 'zip_code', ''), '[^0-9]', '', 'g'), ''),
      'street', btrim(coalesce(v_address_in ->> 'street', '')),
      'number', btrim(coalesce(v_address_in ->> 'number', '')),
      'complement', nullif(btrim(coalesce(v_address_in ->> 'complement', '')), ''),
      'neighborhood', btrim(coalesce(v_address_in ->> 'neighborhood', '')),
      'city', btrim(coalesce(v_address_in ->> 'city', '')),
      'state', nullif(upper(btrim(coalesce(v_address_in ->> 'state', ''))), ''),
      'reference', nullif(btrim(coalesce(v_address_in ->> 'reference', '')), '')
    );
    if v_address ->> 'street' = '' or v_address ->> 'number' = ''
       or v_address ->> 'neighborhood' = '' or v_address ->> 'city' = '' then
      raise exception 'Preencha rua, número, bairro e cidade.' using errcode = 'P0001';
    end if;
    if (v_address ->> 'zip_code') is not null and (v_address ->> 'zip_code') !~ '^[0-9]{8}$' then
      raise exception 'CEP inválido.' using errcode = 'P0001';
    end if;
    if (v_address ->> 'state') is not null and (v_address ->> 'state') !~ '^[A-Z]{2}$' then
      raise exception 'UF inválida.' using errcode = 'P0001';
    end if;
    if length(v_address ->> 'street') > 160 or length(v_address ->> 'number') > 20
       or length(coalesce(v_address ->> 'complement', '')) > 80
       or length(v_address ->> 'neighborhood') > 80 or length(v_address ->> 'city') > 80
       or length(coalesce(v_address ->> 'reference', '')) > 160 then
      raise exception 'Algum campo do endereço está muito longo.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.customers as c (name, phone, email, marketing_opt_in, marketing_opt_in_at)
  values (v_name, v_phone, v_email, v_opt_in, case when v_opt_in then now() end)
  on conflict (phone) do update
    set name = excluded.name,
        email = coalesce(excluded.email, c.email),
        marketing_opt_in = c.marketing_opt_in or excluded.marketing_opt_in,
        marketing_opt_in_at = case
          when not c.marketing_opt_in and excluded.marketing_opt_in then now()
          else c.marketing_opt_in_at
        end
  returning c.id into v_customer_id;

  if v_type = 'delivery' then
    select a.id into v_address_id
    from public.customer_addresses a
    where a.customer_id = v_customer_id
      and coalesce(a.zip_code, '') = coalesce(v_address ->> 'zip_code', '')
      and lower(a.street) = lower(v_address ->> 'street')
      and lower(a.number) = lower(v_address ->> 'number')
      and lower(coalesce(a.complement, '')) = lower(coalesce(v_address ->> 'complement', ''))
    limit 1;

    if v_address_id is null then
      insert into public.customer_addresses
        (customer_id, zip_code, street, number, complement, neighborhood, city, state, reference)
      values (
        v_customer_id,
        v_address ->> 'zip_code', v_address ->> 'street', v_address ->> 'number',
        v_address ->> 'complement', v_address ->> 'neighborhood', v_address ->> 'city',
        v_address ->> 'state', v_address ->> 'reference'
      )
      returning id into v_address_id;
    else
      update public.customer_addresses
         set neighborhood = v_address ->> 'neighborhood',
             city = v_address ->> 'city',
             state = v_address ->> 'state',
             reference = v_address ->> 'reference'
       where id = v_address_id;
    end if;

    update public.customer_addresses
       set is_default = (id = v_address_id)
     where customer_id = v_customer_id;
  end if;

  insert into public.orders (
    customer_id, customer_snapshot, order_type, subtotal, discount, delivery_fee, total,
    payment_method, change_for, coupon_id, address_snapshot, customer_notes, source
  )
  values (
    v_customer_id,
    jsonb_build_object('name', v_name, 'phone', v_phone, 'email', v_email),
    v_type, v_subtotal, v_discount, v_fee, v_total,
    v_payment, v_change_for, v_coupon.id, v_address, v_notes, v_source
  )
  returning id, order_number, public_token into v_order_id, v_order_number, v_token;

  for v_item in select value from jsonb_array_elements(v_priced -> 'items') loop
    insert into public.order_items
      (order_id, product_id, product_name_snapshot, quantity, unit_price, total, notes, sort_order)
    values (
      v_order_id,
      (v_item ->> 'product_id')::uuid,
      v_item ->> 'name',
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric,
      (v_item ->> 'total')::numeric,
      v_item ->> 'notes',
      v_index
    )
    returning id into v_item_id;

    insert into public.order_item_options
      (order_item_id, option_id, group_name_snapshot, option_name_snapshot, additional_price)
    select v_item_id, (o ->> 'option_id')::uuid, o ->> 'group_name', o ->> 'name',
           (o ->> 'additional_price')::numeric
    from jsonb_array_elements(v_item -> 'options') o;

    v_index := v_index + 1;
  end loop;

  insert into public.order_status_history (order_id, previous_status, new_status)
  values (v_order_id, null, 'new');

  -- Fidelidade: brinde no pedido que completa a meta
  perform public._maybe_create_loyalty_reward(v_customer_id, v_order_id);

  return jsonb_build_object(
    'order_number', v_order_number,
    'public_token', v_token,
    'total', v_total
  );
end;
$$;

revoke execute on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

-- =====================================================================
-- Aplicação de status (Etapa 5) — cancelado/recusado expira o brinde
-- =====================================================================
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

  if p_to in ('delivered', 'picked_up') then
    update public.customers
       set total_orders = total_orders + 1,
           total_spent = total_spent + v_total,
           first_order_at = coalesce(first_order_at, v_created_at),
           last_order_at = greatest(coalesce(last_order_at, v_created_at), v_created_at)
     where id = v_customer_id;
  end if;

  -- Pedidos cancelados não contam para fidelidade (seção 24)
  if p_to in ('cancelled', 'refused') then
    update public.loyalty_rewards set status = 'expired'
     where order_id = p_order_id and status = 'available';
  end if;
end;
$$;

revoke execute on function public._apply_order_status(uuid, public.order_status, public.order_status, uuid, text, text)
  from public, anon, authenticated;

-- =====================================================================
-- Acompanhamento público (Etapa 3) — inclui o cupom usado
-- =====================================================================
create or replace function public.get_order_by_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'customer_name', o.customer_snapshot ->> 'name',
    'subtotal', o.subtotal,
    'discount', o.discount,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'payment_method', o.payment_method,
    'change_for', o.change_for,
    'coupon_code', (select cp.code from public.coupons cp where cp.id = o.coupon_id),
    'address', o.address_snapshot,
    'notes', o.customer_notes,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.product_name_snapshot,
        'quantity', i.quantity,
        'unit_price', i.unit_price,
        'total', i.total,
        'notes', i.notes,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object(
            'group_name', io.group_name_snapshot,
            'name', io.option_name_snapshot,
            'additional_price', io.additional_price
          ))
          from public.order_item_options io
          where io.order_item_id = i.id
        ), '[]'::jsonb)
      ) order by i.sort_order)
      from public.order_items i
      where i.order_id = o.id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('status', h.new_status, 'at', h.created_at) order by h.created_at)
      from public.order_status_history h
      where h.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where p_token ~ '^[0-9a-f]{64}$'
    and o.public_token = p_token
$$;

-- =====================================================================
-- Origem dos pedidos (QR Code rastreável, seção 17) — somente Admin
-- =====================================================================
create or replace function public.get_source_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(t order by t.orders desc)
    from (
      select coalesce(source, 'direto') as source, count(*)::int as orders,
             max(created_at) as last_order_at
      from public.orders
      where status not in ('cancelled', 'refused')
      group by coalesce(source, 'direto')
    ) t
  ), '[]'::jsonb);
end;
$$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.loyalty_rules   enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.promotions      enable row level security;
alter table public.coupons         enable row level security;

revoke all on public.loyalty_rules, public.loyalty_rewards, public.promotions, public.coupons from anon;
revoke insert, update, delete, truncate on public.loyalty_rewards from authenticated;

-- Leitura: Admin e Operador (o operador vê a regra e os brindes para atender)
create policy "loyalty_rules_select_staff" on public.loyalty_rules
  for select to authenticated using ((select public.is_staff()));
create policy "loyalty_rewards_select_staff" on public.loyalty_rewards
  for select to authenticated using ((select public.is_staff()));
create policy "promotions_select_staff" on public.promotions
  for select to authenticated using ((select public.is_staff()));
create policy "coupons_select_admin" on public.coupons
  for select to authenticated using ((select public.is_admin()));

-- Escrita: somente Admin
create policy "loyalty_rules_write_admin" on public.loyalty_rules
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "promotions_write_admin" on public.promotions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "coupons_write_admin" on public.coupons
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Permissões das funções
revoke execute on function public._maybe_create_loyalty_reward(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._validate_coupon(text, numeric, text) from public, anon, authenticated;
revoke execute on function public._promotion_in_window(time, time) from public, anon, authenticated;

revoke execute on function public.product_effective_price(uuid) from public;
grant execute on function public.product_effective_price(uuid) to anon, authenticated;
revoke execute on function public.get_promotion_prices() from public;
grant execute on function public.get_promotion_prices() to anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'set_customer_notes(uuid, text)', 'revoke_marketing_consent(uuid)',
    'redeem_loyalty_reward(uuid)', 'get_source_stats()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
