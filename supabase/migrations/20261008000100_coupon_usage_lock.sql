-- =====================================================================
-- Ajuste de segurança — limite de usos do cupom sob concorrência
-- Autorizado: complementa a Etapa 6 (cupons).
--
-- _validate_coupon confere os limites sem travar nada: dois pedidos
-- simultâneos com o mesmo cupom podiam ultrapassar usage_limit /
-- usage_per_customer. Este gatilho trava a linha do cupom e reconfere os
-- limites no momento da gravação do pedido — pedidos com o mesmo cupom
-- passam a ser gravados um de cada vez.
-- =====================================================================

create or replace function public._enforce_coupon_limits()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
  v_used   integer;
begin
  if new.coupon_id is null then
    return new;
  end if;

  -- Trava até o fim da transação; a contagem abaixo já enxerga os pedidos
  -- que outras transações gravaram enquanto esta esperava
  select * into v_coupon from public.coupons where id = new.coupon_id for update;

  if v_coupon.usage_limit is not null then
    select count(*) into v_used from public.orders
    where coupon_id = v_coupon.id and status not in ('cancelled', 'refused');
    if v_used >= v_coupon.usage_limit then
      raise exception 'Este cupom atingiu o limite de usos.' using errcode = 'P0001';
    end if;
  end if;

  if v_coupon.usage_per_customer is not null then
    select count(*) into v_used from public.orders
    where coupon_id = v_coupon.id and customer_id = new.customer_id
      and status not in ('cancelled', 'refused');
    if v_used >= v_coupon.usage_per_customer then
      raise exception 'Você já usou este cupom.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public._enforce_coupon_limits() from public, anon, authenticated;

create trigger orders_enforce_coupon_limits
  before insert on public.orders
  for each row execute function public._enforce_coupon_limits();
