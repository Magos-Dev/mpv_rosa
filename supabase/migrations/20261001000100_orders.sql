-- =====================================================================
-- ETAPA 3 — Compra: clientes, endereços, pedidos, itens, histórico
-- =====================================================================
-- O navegador NUNCA grava diretamente nestas tabelas. Tudo passa por
-- funções no banco que validam e RECALCULAM preços (seção 24 do briefing).
-- Visitantes não leem clientes/pedidos; o acompanhamento público usa um
-- token aleatório (não o número sequencial do pedido).
-- =====================================================================

create type public.order_type as enum ('delivery', 'pickup');

create type public.order_status as enum (
  'new',               -- NOVO
  'confirmed',         -- CONFIRMADO
  'preparing',         -- EM PREPARO
  'ready',             -- PRONTO (entrega)
  'awaiting_courier',  -- AGUARDANDO MOTOBOY
  'out_for_delivery',  -- SAIU PARA ENTREGA
  'delivered',         -- ENTREGUE
  'ready_for_pickup',  -- PRONTO PARA RETIRADA
  'picked_up',         -- RETIRADO
  'cancelled',         -- CANCELADO
  'refused'            -- RECUSADO
);

create type public.payment_method as enum ('pix', 'cash', 'card_on_delivery');

-- ---------------------------------------------------------------------
-- customers — telefone (somente dígitos, DDD + número) é o identificador
-- ---------------------------------------------------------------------
create table public.customers (
  id                   uuid primary key default gen_random_uuid(),
  name                 varchar(120) not null check (length(btrim(name)) >= 2),
  phone                varchar(11) not null unique check (phone ~ '^[1-9]{2}9?[0-9]{8}$'),
  email                varchar(255),
  -- Consentimento de marketing guardado separadamente (LGPD).
  -- Fazer um pedido NÃO implica consentimento.
  marketing_opt_in     boolean not null default false,
  marketing_opt_in_at  timestamptz,
  -- Estatísticas: atualizadas somente quando o pedido é ENTREGUE/RETIRADO (Etapa 4)
  total_orders         integer not null default 0 check (total_orders >= 0),
  total_spent          numeric(12, 2) not null default 0 check (total_spent >= 0),
  first_order_at       timestamptz,
  last_order_at        timestamptz,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- customer_addresses
-- ---------------------------------------------------------------------
create table public.customer_addresses (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers (id) on delete cascade,
  zip_code      varchar(8) check (zip_code ~ '^[0-9]{8}$'),
  street        varchar(160) not null,
  number        varchar(20) not null,
  complement    varchar(80),
  neighborhood  varchar(80) not null,
  city          varchar(80) not null,
  state         varchar(2) check (state ~ '^[A-Z]{2}$'),
  reference     varchar(160),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index customer_addresses_customer_idx on public.customer_addresses (customer_id);

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
create sequence public.order_number_seq start with 1001;

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       bigint not null unique default nextval('public.order_number_seq'),
  -- Token do link de acompanhamento: 64 hex (≈ 244 bits aleatórios)
  public_token       varchar(64) not null unique default (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  customer_id        uuid not null references public.customers (id) on delete restrict,
  -- Dados do cliente no momento do pedido (o cadastro pode mudar depois)
  customer_snapshot  jsonb not null,
  order_type         public.order_type not null,
  status             public.order_status not null default 'new',
  subtotal           numeric(10, 2) not null check (subtotal >= 0),
  discount           numeric(10, 2) not null default 0 check (discount >= 0),
  delivery_fee       numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total              numeric(10, 2) not null check (total >= 0),
  payment_method     public.payment_method not null,
  change_for         numeric(10, 2) check (change_for > 0),
  -- FK para coupons será criada na Etapa 6 (Marketing)
  coupon_id          uuid,
  address_snapshot   jsonb,
  customer_notes     text,
  source             varchar(40),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  confirmed_at       timestamptz,
  ready_at           timestamptz,
  delivered_at       timestamptz,
  cancelled_at       timestamptz,
  constraint orders_total_consistent check (total = subtotal - discount + delivery_fee),
  constraint orders_address_for_delivery check (order_type = 'pickup' or address_snapshot is not null),
  constraint orders_change_only_cash check (change_for is null or payment_method = 'cash')
);

create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_created_idx on public.orders (created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- order_items — snapshots de nome e preço (seção 42 do briefing)
-- ---------------------------------------------------------------------
create table public.order_items (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references public.orders (id) on delete cascade,
  product_id             uuid references public.products (id) on delete set null,
  product_name_snapshot  varchar(120) not null,
  quantity               integer not null check (quantity between 1 and 99),
  -- Preço unitário final (produto + adicionais) no momento do pedido
  unit_price             numeric(10, 2) not null check (unit_price >= 0),
  total                  numeric(10, 2) not null check (total >= 0),
  notes                  text,
  sort_order             integer not null default 0,
  constraint order_items_total_consistent check (total = unit_price * quantity)
);

create index order_items_order_idx on public.order_items (order_id, sort_order);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_item_options (
  id                    uuid primary key default gen_random_uuid(),
  order_item_id         uuid not null references public.order_items (id) on delete cascade,
  option_id             uuid references public.product_options (id) on delete set null,
  group_name_snapshot   varchar(80) not null,
  option_name_snapshot  varchar(80) not null,
  additional_price      numeric(10, 2) not null check (additional_price >= 0),
  quantity              integer not null default 1 check (quantity >= 1)
);

create index order_item_options_item_idx on public.order_item_options (order_item_id);

-- ---------------------------------------------------------------------
-- order_status_history
-- ---------------------------------------------------------------------
create table public.order_status_history (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  previous_status  public.order_status,
  new_status       public.order_status not null,
  changed_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- =====================================================================
-- RLS — somente Admin/Operador leem. Nenhuma escrita direta pela API.
-- =====================================================================
alter table public.customers            enable row level security;
alter table public.customer_addresses   enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_item_options   enable row level security;
alter table public.order_status_history enable row level security;

revoke all on
  public.customers, public.customer_addresses, public.orders, public.order_items,
  public.order_item_options, public.order_status_history
from anon;

revoke insert, update, delete, truncate on
  public.customers, public.customer_addresses, public.orders, public.order_items,
  public.order_item_options, public.order_status_history
from authenticated;

revoke all on sequence public.order_number_seq from anon, authenticated;

create policy "customers_select_staff" on public.customers
  for select to authenticated using ((select public.is_staff()));
create policy "customer_addresses_select_staff" on public.customer_addresses
  for select to authenticated using ((select public.is_staff()));
create policy "orders_select_staff" on public.orders
  for select to authenticated using ((select public.is_staff()));
create policy "order_items_select_staff" on public.order_items
  for select to authenticated using ((select public.is_staff()));
create policy "order_item_options_select_staff" on public.order_item_options
  for select to authenticated using ((select public.is_staff()));
create policy "order_status_history_select_staff" on public.order_status_history
  for select to authenticated using ((select public.is_staff()));

-- =====================================================================
-- Funções
-- =====================================================================

-- Mensagens de erro de regra de negócio usam errcode P0001 e são
-- exibidas ao cliente como estão.

-- ---------------------------------------------------------------------
-- Precifica e valida os itens do carrinho (uso interno).
-- Entrada: [{ product_id, quantity, notes, option_ids: [uuid] }]
-- ---------------------------------------------------------------------
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

    -- Todas as opções precisam pertencer a este produto e estar disponíveis
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

    -- Limites mínimo/máximo de cada grupo
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

    v_unit := coalesce(v_product.promotional_price, v_product.price) + v_options_sum;
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

-- ---------------------------------------------------------------------
-- Cotação do carrinho (preços oficiais antes de finalizar). Pública.
-- ---------------------------------------------------------------------
create or replace function public.quote_order(p_items jsonb, p_order_type public.order_type)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings public.settings%rowtype;
  v_priced   jsonb;
  v_fee      numeric(10, 2);
  v_subtotal numeric(10, 2);
begin
  select * into v_settings from public.settings limit 1;
  v_priced := public._price_order_items(p_items);
  v_subtotal := (v_priced ->> 'subtotal')::numeric;
  v_fee := case when p_order_type = 'delivery' then v_settings.default_delivery_fee else 0 end;

  return jsonb_build_object(
    'items', v_priced -> 'items',
    'subtotal', v_subtotal,
    'discount', 0,
    'delivery_fee', v_fee,
    'total', v_subtotal + v_fee,
    'minimum_order', v_settings.minimum_order,
    'accepting_orders', v_settings.accepting_orders
  );
end;
$$;

revoke execute on function public.quote_order(jsonb, public.order_type) from public;
grant execute on function public.quote_order(jsonb, public.order_type) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Criação do pedido — transação única. Pública (cliente não tem login).
-- ---------------------------------------------------------------------
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
  v_priced       jsonb;
  v_subtotal     numeric(10, 2);
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
  -- Loja aberta?
  select * into v_settings from public.settings limit 1;
  if not coalesce(v_settings.accepting_orders, false) then
    raise exception 'A loja não está recebendo pedidos no momento.' using errcode = 'P0001';
  end if;

  -- Cliente
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

  -- Tipo e pagamento
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

  -- Proteção contra abuso: no máximo 5 pedidos por telefone a cada 10 minutos
  if (
    select count(*) from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.phone = v_phone and o.created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Muitos pedidos em sequência. Aguarde alguns minutos.' using errcode = 'P0001';
  end if;

  -- Itens e valores (recalculados aqui)
  v_priced := public._price_order_items(p_payload -> 'items');
  v_subtotal := (v_priced ->> 'subtotal')::numeric;
  if v_subtotal < v_settings.minimum_order then
    raise exception 'O pedido mínimo é de R$ %.', replace(to_char(v_settings.minimum_order, 'FM999990.00'), '.', ',')
      using errcode = 'P0001';
  end if;
  v_fee := case when v_type = 'delivery' then v_settings.default_delivery_fee else 0 end;
  v_total := v_subtotal + v_fee;

  if v_payment = 'cash' then
    if v_change_for is not null and v_change_for < v_total then
      raise exception 'O valor para troco deve ser maior que o total do pedido.' using errcode = 'P0001';
    end if;
  else
    v_change_for := null;
  end if;

  -- Endereço (entrega)
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

  -- Cliente: busca pelo telefone; cria ou atualiza
  insert into public.customers as c (name, phone, email, marketing_opt_in, marketing_opt_in_at)
  values (v_name, v_phone, v_email, v_opt_in, case when v_opt_in then now() end)
  on conflict (phone) do update
    set name = excluded.name,
        email = coalesce(excluded.email, c.email),
        -- Consentimento só é concedido aqui; revogação é feita por outro fluxo
        marketing_opt_in = c.marketing_opt_in or excluded.marketing_opt_in,
        marketing_opt_in_at = case
          when not c.marketing_opt_in and excluded.marketing_opt_in then now()
          else c.marketing_opt_in_at
        end
  returning c.id into v_customer_id;

  -- Endereço: reaproveita se for o mesmo; marca como padrão
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

  -- Pedido
  insert into public.orders (
    customer_id, customer_snapshot, order_type, subtotal, discount, delivery_fee, total,
    payment_method, change_for, address_snapshot, customer_notes, source
  )
  values (
    v_customer_id,
    jsonb_build_object('name', v_name, 'phone', v_phone, 'email', v_email),
    v_type, v_subtotal, 0, v_fee, v_total,
    v_payment, v_change_for, v_address, v_notes, v_source
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

  return jsonb_build_object(
    'order_number', v_order_number,
    'public_token', v_token,
    'total', v_total
  );
end;
$$;

revoke execute on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Acompanhamento público pelo token (dados apenas deste pedido)
-- ---------------------------------------------------------------------
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

revoke execute on function public.get_order_by_token(text) from public;
grant execute on function public.get_order_by_token(text) to anon, authenticated;
