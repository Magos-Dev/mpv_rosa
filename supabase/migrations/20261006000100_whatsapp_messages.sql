-- =====================================================================
-- ETAPA 7B — WhatsApp com mensagens prontas (envio manual pelo atendente)
-- O sistema monta o texto; o atendente abre o WhatsApp e envia. Aqui
-- registramos QUEM abriu QUAL mensagem e QUANDO (evita aviso repetido).
-- Quando houver provedor, o canal passa a ser automático (channel).
-- =====================================================================

-- Textos personalizados pelo Admin (chave → texto). Vazio = texto padrão.
alter table public.settings
  add column whatsapp_templates jsonb not null default '{}'::jsonb
  constraint settings_whatsapp_templates_is_object check (jsonb_typeof(whatsapp_templates) = 'object');

grant update (whatsapp_templates) on public.settings to authenticated; -- RLS: só admin

create table public.message_logs (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references public.orders (id) on delete cascade,
  customer_id   uuid references public.customers (id) on delete cascade,
  template      varchar(40) not null check (template ~ '^[a-z_]{2,40}$'),
  channel       varchar(20) not null default 'whatsapp_manual',
  sent_by       uuid references public.profiles (id) on delete set null,
  sent_by_name  varchar(120),
  created_at    timestamptz not null default now(),
  constraint message_logs_target check (order_id is not null or customer_id is not null)
);

create index message_logs_order_idx on public.message_logs (order_id, created_at desc);
create index message_logs_customer_idx on public.message_logs (customer_id, created_at desc);

alter table public.message_logs enable row level security;
revoke all on public.message_logs from anon;
revoke insert, update, delete, truncate on public.message_logs from authenticated;

create policy "message_logs_select_staff" on public.message_logs
  for select to authenticated using ((select public.is_staff()));

-- Registro feito pela função (quem enviou vem do perfil logado, não do navegador)
create or replace function public.log_message(p_order_id uuid, p_customer_id uuid, p_template text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile  public.profiles%rowtype := public._staff_profile();
  v_customer uuid := p_customer_id;
  v_opt_in   boolean;
begin
  if p_template !~ '^[a-z_]{2,40}$' then
    raise exception 'Mensagem inválida.' using errcode = 'P0001';
  end if;

  if p_order_id is not null then
    select customer_id into v_customer from public.orders where id = p_order_id;
    if v_customer is null then
      raise exception 'Pedido não encontrado.' using errcode = 'P0001';
    end if;
  end if;

  -- Promoção só para quem consentiu (LGPD)
  if p_template = 'promotion' then
    select marketing_opt_in into v_opt_in from public.customers where id = v_customer;
    if not coalesce(v_opt_in, false) then
      raise exception 'Este cliente não aceitou receber promoções.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.message_logs (order_id, customer_id, template, sent_by, sent_by_name)
  values (p_order_id, v_customer, p_template, v_profile.id, v_profile.name);
end;
$$;

revoke execute on function public.log_message(uuid, uuid, text) from public, anon;
grant execute on function public.log_message(uuid, uuid, text) to authenticated;
