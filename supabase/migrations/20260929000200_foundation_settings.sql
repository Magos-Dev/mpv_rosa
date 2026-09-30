-- =====================================================================
-- ETAPA 1 — Fundação: configurações do estabelecimento
-- =====================================================================
-- Tabela de linha única (single-tenant no MVP). Quando o sistema evoluir
-- para multi-loja, basta adicionar store_id e remover o índice singleton.
-- =====================================================================

create table public.settings (
  id                    uuid primary key default gen_random_uuid(),
  store_name            varchar(120) not null,
  logo_url              text,
  phone                 varchar(20),
  whatsapp              varchar(20),
  address               text,
  -- Formato: { "mon": [{"open":"18:00","close":"23:00"}], "tue": [], ... }
  opening_hours         jsonb not null default '{}'::jsonb,
  minimum_order         numeric(10, 2) not null default 0 check (minimum_order >= 0),
  default_delivery_fee  numeric(10, 2) not null default 0 check (default_delivery_fee >= 0),
  accepting_orders      boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint settings_opening_hours_is_object check (jsonb_typeof(opening_hours) = 'object')
);

comment on table public.settings is
  'Configurações do estabelecimento. Linha única no MVP.';

-- Garante uma única linha
create unique index settings_singleton_idx on public.settings ((true));

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS — settings
-- Dados da loja são públicos (nome, logo, horário, contato).
-- Somente admin altera. Não há insert/delete pela API.
-- ---------------------------------------------------------------------
alter table public.settings enable row level security;

create policy "settings_select_public"
  on public.settings for select
  to anon, authenticated
  using (true);

create policy "settings_update_admin"
  on public.settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke insert, update, delete on public.settings from anon, authenticated;
grant update (
  store_name, logo_url, phone, whatsapp, address, opening_hours,
  minimum_order, default_delivery_fee, accepting_orders
) on public.settings to authenticated;

-- Linha inicial
insert into public.settings (store_name, opening_hours)
values (
  'Rosa e Rose',
  '{"mon":[],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]}'::jsonb
);
