# Cardápio Digital — Pedidos e Entregas

Especificação oficial: [briefing_cardapio_digital_lovable_claude.md](briefing_cardapio_digital_lovable_claude.md).
Desenvolvimento por etapas; funcionalidades concluídas só são alteradas com autorização.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Auth + Postgres + RLS)

## Status das etapas

| Etapa | Escopo | Status |
| --- | --- | --- |
| 1 — Fundação | Projeto, autenticação, perfis (Admin/Operador/Motoboy), layouts, `settings` | ✅ |
| 2 — Cardápio | Categorias, produtos, adicionais, imagens, cardápio público (leitura) | ✅ |
| 3 — Compra | Carrinho, checkout, clientes, pedido, acompanhamento, configurações da loja | ✅ |
| 4 — Operação | Painel de pedidos em tempo real, status, histórico, estatísticas do cliente, dashboard | ✅ |
| 5 — Entregas | Motoboys, chamada, aceite atômico, app do entregador, entregas | ✅ |
| 6 — Marketing | Clientes, fidelidade, promoções, cupons, QR Code com origem, exportação LGPD | ✅ |
| 7A — Publicação | Cloudflare Workers (OpenNext) em `pedidos.rosaerose.afweb.com.br` | ✅ |
| 7D — Taxa por bairro | Zonas de entrega com taxa e pedido mínimo | ✅ |
| 7B — WhatsApp | Mensagens prontas (modelos editáveis, registro de envio) | ✅ |
| 7E — Notificações | Web Push (novo pedido para a loja, nova entrega para motoboys) e apps instaláveis (PWA) | ✅ |
| 7C — PIX | Pagamento online | adiado |

## Configuração

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha as chaves (Supabase Dashboard › Project Settings › API).
3. Aplique as migrations, em ordem, no projeto Supabase:
   - `supabase/migrations/20260929000100_foundation_profiles.sql`
   - `supabase/migrations/20260929000200_foundation_settings.sql`
   - `supabase/migrations/20260930000100_menu_catalog.sql`
   - `supabase/migrations/20261001000100_orders.sql`
   - `supabase/migrations/20261002000100_order_operations.sql`
   - `supabase/migrations/20261003000100_order_status_courier.sql` (rodar **sozinho**, antes do próximo)
   - `supabase/migrations/20261003000200_deliveries.sql`
   - `supabase/migrations/20261004000100_marketing.sql`
   - `supabase/migrations/20261005000100_delivery_zones.sql`
   - `supabase/migrations/20261006000100_whatsapp_messages.sql`
   - `supabase/migrations/20261007000100_push_subscriptions.sql`

   Via CLI: `npx supabase login`, `npx supabase link --project-ref rjqjichlkboharrmdyux`, `npm run db:push`.
   Ou cole cada arquivo no SQL Editor do Dashboard.
4. No Dashboard, em **Authentication › Sign In / Providers**, desative **Allow new users to sign up**.
5. `npm run seed:users` cria os usuários de teste:
   - `admin@rosaerose.local` (Admin)
   - `operador@rosaerose.local` (Operador)
   - `motoboy@rosaerose.local` (Motoboy)

   Todos com a senha definida em `SEED_USERS_PASSWORD`.
6. `npm run dev` e acesse `/admin/login` ou `/entregador/login`.

## Publicação (Cloudflare Workers)

Produção: **https://pedidos.rosaerose.afweb.com.br** (Worker `rosaerose-pedidos`, via OpenNext).

1. `npx wrangler login` (uma vez).
2. Segredos de runtime (uma vez, ou ao trocar a chave):
   `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
   `npx wrangler secret put VAPID_PRIVATE_KEY` (a chave pública fica em `vars`)
3. `npm run deploy`

O `npm run deploy` usa `scripts/cf-build.mjs`, que **esconde os arquivos `.env` durante o build**.
Sem isso, o OpenNext embutiria os segredos do `.env.local` no código do Worker. As variáveis
públicas vêm de `vars` no `wrangler.jsonc`.

No Supabase (Authentication › URL Configuration), use `https://pedidos.rosaerose.afweb.com.br`
como Site URL.

## Scripts

| Script | Descrição |
| --- | --- |
| `dev` / `build` / `start` | Next.js |
| `lint` / `typecheck` / `format` | Qualidade de código |
| `seed:users` | Cria/atualiza usuários de teste (usa service role — só local) |
| `db:push` | Aplica migrations no projeto vinculado |
| `db:types` | Regenera `src/types/database.ts` a partir do banco |
| `cf:build` / `preview` / `deploy` | Build sem segredos, pré-visualização e publicação na Cloudflare |

## Arquitetura

```text
src/
  app/
    (public)/              /  e  /privacidade
    admin/login/           login Admin/Operador
    admin/(painel)/        área protegida (Admin + Operador)
      (restrito)/          rotas exclusivas do Admin — herdam requireRole(["admin"])
    entregador/login/      login Motoboy
    entregador/(app)/      área protegida mobile first (Motoboy)
    auth/callback|signout  rotas do Auth
  components/ui/           shadcn/ui
  components/layout/       AdminShell, AdminNav, UserMenu, Brand
  components/auth/         LoginForm, LoginShell
  config/navigation.ts     menu do painel + perfis permitidos por item
  lib/supabase/            client (browser), server, admin (service role), proxy
  lib/auth/                roles, session (requireRole), actions (signIn)
  proxy.ts                 renova sessão e barra visitantes sem login
supabase/migrations/       SQL versionado
```

### Autorização em camadas

1. **Proxy** (`src/proxy.ts`): renova a sessão; visitante sem login em `/admin/*` ou `/entregador/*` vai para o login.
2. **Layouts de servidor** (`requireRole`): validam perfil e `active` no banco a cada requisição.
3. **RLS no Postgres**: `profiles` e `settings` com políticas; o perfil (`role`) só é alterável por admin, e o papel inicial vem de `app_metadata` (nunca de dados editáveis pelo usuário).
