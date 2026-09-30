-- =====================================================================
-- ETAPA 7D — Taxa de entrega por bairro (decisão: bairro fora da lista
-- é BLOQUEADO; o cliente pode escolher retirar no local).
-- Enquanto não houver nenhum bairro ativo, vale a taxa padrão das
-- configurações (comportamento anterior), para não travar a loja.
-- Ajusta quote_order e create_order (Etapas 3/6).
-- =====================================================================

-- Normaliza nomes de lugares: sem acento, minúsculo, espaços simples.
-- IMMUTABLE (usa translate) para poder ser usada em coluna gerada/índice.
create or replace function public._norm_place(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
    lower(translate(btrim(coalesce(p_text, '')),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
    '\s+', ' ', 'g')
$$;

create table public.delivery_zones (
  id              uuid primary key default gen_random_uuid(),
  neighborhood    varchar(80) not null check (length(btrim(neighborhood)) > 0),
  city            varchar(80) not null check (length(btrim(city)) > 0),
  fee             numeric(10, 2) not null check (fee >= 0),
  estimated_time  varchar(40),
  active          boolean not null default true,
  neighborhood_key text generated always as (public._norm_place(neighborhood)) stored,
  city_key         text generated always as (public._norm_place(city)) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint delivery_zones_unique unique (neighborhood_key, city_key)
);

create trigger delivery_zones_set_updated_at
  before update on public.delivery_zones
  for each row execute function public.set_updated_at();

alter table public.delivery_zones enable row level security;
revoke insert, update, delete, truncate on public.delivery_zones from anon;

-- Leitura pública só dos bairros ativos (lista do checkout); Admin vê e edita tudo
create policy "delivery_zones_select_public" on public.delivery_zones
  for select to anon using (active);
create policy "delivery_zones_select_auth" on public.delivery_zones
  for select to authenticated using (active or (select public.is_admin()));
create policy "delivery_zones_write_admin" on public.delivery_zones
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Taxa para um endereço.
-- Retorna {fee, zone:{neighborhood,city,estimated_time}|null, error|null}
-- ---------------------------------------------------------------------
create or replace function public._delivery_fee_for(p_address jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_default numeric(10, 2);
  v_zone    public.delivery_zones%rowtype;
  v_hood    text := nullif(btrim(coalesce(p_address ->> 'neighborhood', '')), '');
  v_city    text := nullif(btrim(coalesce(p_address ->> 'city', '')), '');
begin
  -- Sem bairros cadastrados: taxa padrão (modo anterior)
  if not exists (select 1 from public.delivery_zones where active) then
    select default_delivery_fee into v_default from public.settings limit 1;
    return jsonb_build_object('fee', coalesce(v_default, 0), 'zone', null, 'error', null);
  end if;

  if v_hood is null then
    return jsonb_build_object('fee', null, 'zone', null, 'error', null);
  end if;

  select * into v_zone
  from public.delivery_zones
  where active
    and neighborhood_key = public._norm_place(v_hood)
    and (v_city is null or city_key = public._norm_place(v_city))
  limit 1;

  if v_zone.id is null then
    return jsonb_build_object(
      'fee', null, 'zone', null,
      'error', format('Ainda não entregamos no bairro %s. Você pode retirar no local.', v_hood)
    );
  end if;

  return jsonb_build_object(
    'fee', v_zone.fee,
    'zone', jsonb_build_object('neighborhood', v_zone.neighborhood, 'city', v_zone.city,
                               'estimated_time', v_zone.estimated_time),
    'error', null
  );
end;
$$;

revoke execute on function public._delivery_fee_for(jsonb) from public, anon, authenticated;

-- =====================================================================
-- Cotação — nova assinatura com endereço (taxa por bairro)
-- =====================================================================
drop function if exists public.quote_order(jsonb, public.order_type, text);

create or replace function public.quote_order(
  p_items jsonb,
  p_order_type public.order_type,
  p_coupon_code text default null,
  p_address jsonb default null
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
  v_fee          numeric(10, 2) := 0;
  v_subtotal     numeric(10, 2);
  v_discount     numeric(10, 2) := 0;
  v_coupon       public.coupons%rowtype;
  v_coupon_error text;
  v_delivery     jsonb := null;
begin
  select * into v_settings from public.settings limit 1;
  v_priced := public._price_order_items(p_items);
  v_subtotal := (v_priced ->> 'subtotal')::numeric;

  if p_order_type = 'delivery' then
    v_delivery := public._delivery_fee_for(p_address);
    -- Sem bairro ainda (ou fora da área): taxa 0 na cotação; o erro vai em delivery_error
    v_fee := coalesce((v_delivery ->> 'fee')::numeric, 0);
  end if;

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
    'coupon_error', v_coupon_error,
    -- Taxa por bairro
    'delivery_zone', v_delivery -> 'zone',
    'delivery_error', v_delivery ->> 'error',
    'delivery_fee_pending', p_order_type = 'delivery' and v_delivery ->> 'fee' is null and v_delivery ->> 'error' is null
  );
end;
$$;

revoke execute on function public.quote_order(jsonb, public.order_type, text, jsonb) from public;
grant execute on function public.quote_order(jsonb, public.order_type, text, jsonb) to anon, authenticated;

-- =====================================================================
-- Criação do pedido — taxa pelo bairro do endereço (bloqueia fora da área)
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
  v_delivery     jsonb;
  v_priced       jsonb;
  v_subtotal     numeric(10, 2);
  v_discount     numeric(10, 2) := 0;
  v_fee          numeric(10, 2) := 0;
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

  -- Endereço (entrega) — validado antes da taxa, que depende do bairro
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

    -- Taxa pelo bairro (7D). Fora da área: bloqueia.
    v_delivery := public._delivery_fee_for(v_address);
    if v_delivery ->> 'error' is not null then
      raise exception '%', v_delivery ->> 'error' using errcode = 'P0001';
    end if;
    v_fee := coalesce((v_delivery ->> 'fee')::numeric, 0);
  end if;

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
