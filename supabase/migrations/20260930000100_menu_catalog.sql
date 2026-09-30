-- =====================================================================
-- ETAPA 2 — Cardápio: categorias, produtos, grupos de opções, imagens
-- =====================================================================
-- Produtos NUNCA são apagados fisicamente: usa-se `active = false`
-- (arquivado). `available` é o controle rápido Disponível / Esgotado.
-- Leitura pública apenas do que está ativo; escrita somente pelo admin.
-- =====================================================================

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         varchar(80) not null check (length(btrim(name)) > 0),
  slug         varchar(100) not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text,
  image_url    text,
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index categories_sort_idx on public.categories (sort_order, name);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  -- RESTRICT: não é possível apagar categoria que possui produtos
  category_id        uuid not null references public.categories (id) on delete restrict,
  name               varchar(120) not null check (length(btrim(name)) > 0),
  slug               varchar(140) not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description        text,
  image_url          text,
  price              numeric(10, 2) not null check (price >= 0),
  promotional_price  numeric(10, 2) check (promotional_price >= 0),
  available          boolean not null default true,
  featured           boolean not null default false,
  best_seller        boolean not null default false,
  active             boolean not null default true,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint products_promotional_below_price
    check (promotional_price is null or promotional_price < price)
);

create index products_category_sort_idx on public.products (category_id, sort_order, name);
create index products_active_idx on public.products (active) where active;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- option_groups  (ex.: "Ponto da carne" obrigatório máx. 1)
-- ---------------------------------------------------------------------
create table public.option_groups (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  name         varchar(80) not null check (length(btrim(name)) > 0),
  required     boolean not null default false,
  min_choices  integer not null default 0 check (min_choices >= 0),
  max_choices  integer not null default 1 check (max_choices >= 1),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint option_groups_min_le_max check (min_choices <= max_choices),
  -- obrigatório ⇔ exige ao menos 1 escolha
  constraint option_groups_required_consistent check (
    (required and min_choices >= 1) or (not required and min_choices = 0)
  )
);

create index option_groups_product_idx on public.option_groups (product_id, sort_order);

create trigger option_groups_set_updated_at
  before update on public.option_groups
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- product_options  (ex.: "Bacon extra + R$ 5,00")
-- ---------------------------------------------------------------------
create table public.product_options (
  id                uuid primary key default gen_random_uuid(),
  option_group_id   uuid not null references public.option_groups (id) on delete cascade,
  name              varchar(80) not null check (length(btrim(name)) > 0),
  additional_price  numeric(10, 2) not null default 0 check (additional_price >= 0),
  available         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index product_options_group_idx on public.product_options (option_group_id, sort_order);

create trigger product_options_set_updated_at
  before update on public.product_options
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.option_groups   enable row level security;
alter table public.product_options enable row level security;

revoke insert, update, delete, truncate on
  public.categories, public.products, public.option_groups, public.product_options
from anon;

-- ---- Leitura: visitantes veem apenas itens ativos ---------------------
create policy "categories_select_public" on public.categories
  for select to anon using (active);

create policy "categories_select_auth" on public.categories
  for select to authenticated using (active or (select public.is_staff()));

create policy "products_select_public" on public.products
  for select to anon using (
    active and exists (
      select 1 from public.categories c where c.id = category_id and c.active
    )
  );

create policy "products_select_auth" on public.products
  for select to authenticated using (
    (select public.is_staff())
    or (active and exists (
      select 1 from public.categories c where c.id = category_id and c.active
    ))
  );

-- Grupos/opções herdam a visibilidade do produto (RLS de products se aplica na subconsulta)
create policy "option_groups_select" on public.option_groups
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id)
  );

create policy "product_options_select" on public.product_options
  for select to anon, authenticated using (
    exists (select 1 from public.option_groups g where g.id = option_group_id)
  );

-- ---- Escrita: somente admin ------------------------------------------
create policy "categories_write_admin" on public.categories
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "products_write_admin" on public.products
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "option_groups_write_admin" on public.option_groups
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_options_write_admin" on public.product_options
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Produtos não são apagados fisicamente (preserva histórico de pedidos)
revoke delete on public.products from authenticated;

-- =====================================================================
-- Salvar grupos de opções de um produto de forma ATÔMICA.
-- Recebe a lista completa: grupos/opções com "id" são atualizados, sem
-- "id" são criados e os que não vierem são removidos.
-- SECURITY INVOKER: as políticas RLS (somente admin) continuam valendo.
-- =====================================================================
create or replace function public.save_product_option_groups(
  p_product_id uuid,
  p_groups jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_group        jsonb;
  v_option       jsonb;
  v_group_id     uuid;
  v_option_id    uuid;
  v_keep_groups  uuid[] := '{}';
  v_keep_options uuid[];
  v_group_index  integer := 0;
  v_option_index integer;
begin
  if not public.is_admin() then
    raise exception 'Permissão negada.' using errcode = '42501';
  end if;

  if p_groups is null or jsonb_typeof(p_groups) <> 'array' then
    raise exception 'Formato inválido de grupos.' using errcode = '22023';
  end if;

  perform 1 from public.products where id = p_product_id;
  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'P0002';
  end if;

  for v_group in select value from jsonb_array_elements(p_groups) loop
    v_group_id := nullif(v_group ->> 'id', '')::uuid;

    if v_group_id is not null then
      update public.option_groups
         set name        = v_group ->> 'name',
             required    = (v_group ->> 'required')::boolean,
             min_choices = (v_group ->> 'min_choices')::integer,
             max_choices = (v_group ->> 'max_choices')::integer,
             sort_order  = v_group_index
       where id = v_group_id
         and product_id = p_product_id;
      if not found then
        raise exception 'Grupo de opções inválido.' using errcode = 'P0002';
      end if;
    else
      insert into public.option_groups (product_id, name, required, min_choices, max_choices, sort_order)
      values (
        p_product_id,
        v_group ->> 'name',
        (v_group ->> 'required')::boolean,
        (v_group ->> 'min_choices')::integer,
        (v_group ->> 'max_choices')::integer,
        v_group_index
      )
      returning id into v_group_id;
    end if;

    v_keep_groups  := v_keep_groups || v_group_id;
    v_keep_options := '{}';
    v_option_index := 0;

    for v_option in select value from jsonb_array_elements(coalesce(v_group -> 'options', '[]'::jsonb)) loop
      v_option_id := nullif(v_option ->> 'id', '')::uuid;

      if v_option_id is not null then
        update public.product_options
           set name             = v_option ->> 'name',
               additional_price = (v_option ->> 'additional_price')::numeric,
               available        = (v_option ->> 'available')::boolean,
               sort_order       = v_option_index
         where id = v_option_id
           and option_group_id = v_group_id;
        if not found then
          raise exception 'Opção inválida.' using errcode = 'P0002';
        end if;
      else
        insert into public.product_options (option_group_id, name, additional_price, available, sort_order)
        values (
          v_group_id,
          v_option ->> 'name',
          (v_option ->> 'additional_price')::numeric,
          (v_option ->> 'available')::boolean,
          v_option_index
        )
        returning id into v_option_id;
      end if;

      v_keep_options := v_keep_options || v_option_id;
      v_option_index := v_option_index + 1;
    end loop;

    delete from public.product_options
     where option_group_id = v_group_id
       and not (id = any (v_keep_options));

    v_group_index := v_group_index + 1;
  end loop;

  delete from public.option_groups
   where product_id = p_product_id
     and not (id = any (v_keep_groups));
end;
$$;

revoke execute on function public.save_product_option_groups(uuid, jsonb) from public, anon;
grant execute on function public.save_product_option_groups(uuid, jsonb) to authenticated;

-- =====================================================================
-- Storage: imagens do cardápio
-- Leitura pública (bucket público); envio/alteração somente pelo admin.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- SELECT é exigido pela Storage API para remover/substituir arquivos.
-- (A leitura pública pelas URLs não depende desta política.)
create policy "menu_images_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'menu-images' and (select public.is_admin()));

create policy "menu_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu-images' and (select public.is_admin()));

create policy "menu_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'menu-images' and (select public.is_admin()))
  with check (bucket_id = 'menu-images' and (select public.is_admin()));

create policy "menu_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu-images' and (select public.is_admin()));
