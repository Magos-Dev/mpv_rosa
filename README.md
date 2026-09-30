# Cardápio Digital — Pedidos e Entregas

Especificação oficial: [briefing_cardapio_digital_lovable_claude.md](briefing_cardapio_digital_lovable_claude.md).
Desenvolvimento por etapas; funcionalidades concluídas só são alteradas com autorização.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Auth + Postgres + RLS)

## Status das etapas

| Etapa | Escopo | Status |
| --- | --- | --- |
| 1 — Fundação | Projeto, autenticação, perfis (Admin/Operador/Motoboy), layouts, `settings` | ✅ |
| 2 — Cardápio | Categorias, produtos, adicionais, imagens, cardápio público (leitura) | ✅ |
| 3 — Compra | Carrinho, checkout, clientes, pedido | ⏳ |
| 4 — Operação | Painel de pedidos, status, histórico | ⏳ |
| 5 — Entregas | Motoboys, chamada, aceite atômico | ⏳ |
| 6 — Marketing | Fidelidade, promoções, cupons, QR Code | ⏳ |

## Configuração

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha as chaves (Supabase Dashboard › Project Settings › API).
3. Aplique as migrations, em ordem, no projeto Supabase:
   - `supabase/migrations/20260929000100_foundation_profiles.sql`
   - `supabase/migrations/20260929000200_foundation_settings.sql`
   - `supabase/migrations/20260930000100_menu_catalog.sql`

   Via CLI: `npx supabase login`, `npx supabase link --project-ref rjqjichlkboharrmdyux`, `npm run db:push`.
   Ou cole cada arquivo no SQL Editor do Dashboard.
4. No Dashboard, em **Authentication › Sign In / Providers**, desative **Allow new users to sign up**.
5. `npm run seed:users` cria os usuários de teste:
   - `admin@rosaerose.local` (Admin)
   - `operador@rosaerose.local` (Operador)
   - `motoboy@rosaerose.local` (Motoboy)

   Todos com a senha definida em `SEED_USERS_PASSWORD`.
6. `npm run dev` e acesse `/admin/login` ou `/entregador/login`.

## Scripts

| Script | Descrição |
| --- | --- |
| `dev` / `build` / `start` | Next.js |
| `lint` / `typecheck` / `format` | Qualidade de código |
| `seed:users` | Cria/atualiza usuários de teste (usa service role — só local) |
| `db:push` | Aplica migrations no projeto vinculado |
| `db:types` | Regenera `src/types/database.ts` a partir do banco |

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
