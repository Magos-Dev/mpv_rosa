-- =====================================================================
-- ETAPA 5 — parte 1/2: novo status "Motoboy a caminho" (seção 10)
-- Precisa rodar ANTES e SEPARADO da parte 2: o Postgres não permite usar
-- um valor novo de enum na mesma transação em que ele foi criado.
-- =====================================================================

alter type public.order_status add value if not exists 'courier_assigned' after 'awaiting_courier';
