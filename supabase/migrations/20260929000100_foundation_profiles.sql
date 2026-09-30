-- =====================================================================
-- ETAPA 1 — Fundação: perfis de acesso (Admin, Operador, Motoboy)
-- =====================================================================
-- A tabela `profiles` corresponde à tabela `users` do briefing (seção 23).
-- Ela é 1:1 com `auth.users` e guarda o papel (role) de cada usuário
-- interno. Clientes finais NÃO possuem login e não ficam aqui.
-- =====================================================================

create type public.user_role as enum ('admin', 'operator', 'courier');

-- ---------------------------------------------------------------------
-- Função utilitária para manter updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        varchar(120) not null default '',
  email       varchar(255) not null unique,
  role        public.user_role not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Usuários internos (admin, operador, motoboy). 1:1 com auth.users.';

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Criação automática do profile ao criar usuário no Auth.
--
-- O papel é lido de raw_app_meta_data (só pode ser definido com a
-- service role / Dashboard), NUNCA de raw_user_meta_data (editável pelo
-- próprio usuário). Se o papel não vier informado, o profile nasce
-- INATIVO como motoboy, sem acesso a nada até um admin liberar.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_text text := new.raw_app_meta_data ->> 'role';
  v_role public.user_role;
  v_active boolean := true;
begin
  if v_role_text in ('admin', 'operator', 'courier') then
    v_role := v_role_text::public.user_role;
  else
    v_role := 'courier';
    v_active := false;
  end if;

  insert into public.profiles (id, name, email, role, active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    v_role,
    v_active
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém o e-mail sincronizado caso seja alterado no Auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- Helpers de autorização (usados nas políticas RLS)
-- SECURITY DEFINER evita recursão de RLS ao consultar profiles.
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.active
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('admin', 'operator'), false)
$$;

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS — profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Nenhum acesso anônimo
revoke all on public.profiles from anon;

-- Usuário autenticado lê o próprio perfil; admin lê todos
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Somente admin altera perfis (nome, papel, ativo).
-- Inserção acontece apenas via trigger; exclusão via auth.users (cascade).
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke insert, delete, update on public.profiles from authenticated;
grant update (name, role, active) on public.profiles to authenticated;

-- Impede que o sistema fique sem nenhum admin ativo
create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and old.active
     and (new.role <> 'admin' or not new.active)
     and not exists (
       select 1 from public.profiles
       where role = 'admin' and active and id <> old.id
     )
  then
    raise exception 'Não é possível remover ou desativar o último administrador ativo.';
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_last_admin_removal() from public, anon, authenticated;

create trigger profiles_prevent_last_admin_removal
  before update on public.profiles
  for each row execute function public.prevent_last_admin_removal();
