# BRIEFING TÉCNICO --- SISTEMA DE CARDÁPIO DIGITAL + PEDIDOS + ENTREGA

## 1. Visão geral do projeto

Desenvolver um sistema web responsivo de **cardápio digital próprio para
restaurante/delivery**, com foco em substituir ou complementar os
pedidos feitos por plataformas de terceiros.

O sistema deve ser simples para o estabelecimento operar e fácil para o
cliente comprar pelo celular.

O objetivo principal da primeira versão NÃO é criar um ERP completo. O
MVP deve concentrar-se em:

1.  Cardápio digital online;
2.  Recebimento e acompanhamento de pedidos;
3.  Cadastro/base de clientes para fidelização;
4.  Promoções e descontos;
5.  QR Code para acesso ao cardápio;
6.  Controle básico de recorrência/quantidade de pedidos por cliente;
7.  Gestão simples de entregas com motoboys cadastrados;
8.  Painel administrativo simples e objetivo.

------------------------------------------------------------------------

# 2. OBJETIVO DO NEGÓCIO

Criar um canal próprio de vendas no qual o cliente possa:

-   acessar o cardápio pelo celular;
-   escolher os produtos;
-   adicionar complementos;
-   montar o carrinho;
-   informar os dados para entrega ou retirada;
-   finalizar o pedido;
-   acompanhar o andamento;
-   ser identificado como cliente recorrente;
-   receber promoções posteriormente pelo WhatsApp.

Para o restaurante, o sistema deve permitir:

-   administrar o cardápio;
-   receber os pedidos em tempo real;
-   alterar o status do pedido;
-   consultar clientes;
-   saber quantos pedidos cada cliente já realizou;
-   criar promoções;
-   aplicar descontos;
-   identificar clientes elegíveis para brindes/fidelização;
-   chamar motoboys disponíveis;
-   acompanhar o status básico das entregas;
-   gerar QR Code do cardápio.

------------------------------------------------------------------------

# 3. PERFIS DO SISTEMA

O projeto deverá possuir inicialmente quatro contextos de acesso.

## 3.1 Cliente

Não deve ser obrigatório criar senha para realizar um pedido.

O cliente deverá poder informar:

-   nome;
-   telefone/WhatsApp;
-   e-mail;
-   endereço;
-   número;
-   complemento;
-   bairro;
-   referência;
-   CEP, se necessário.

O telefone deve ser o principal identificador do cliente.

Sempre que possível, ao informar um telefone já existente, o sistema
deve recuperar os dados anteriores do cliente para agilizar o pedido.

------------------------------------------------------------------------

## 3.2 Administrador

O administrador terá acesso ao painel completo.

Poderá:

-   cadastrar produtos;
-   editar produtos;
-   excluir/desativar produtos;
-   criar categorias;
-   alterar preços;
-   criar promoções;
-   cadastrar cupons;
-   consultar pedidos;
-   alterar status;
-   consultar clientes;
-   consultar histórico;
-   verificar quantidade de pedidos;
-   acompanhar entregas;
-   cadastrar motoboys;
-   ativar/desativar motoboys;
-   gerar QR Code;
-   alterar configurações do estabelecimento.

------------------------------------------------------------------------

## 3.3 Operador

Opcionalmente poderá existir um perfil de funcionário/atendente.

Terá acesso somente a:

-   pedidos;
-   atualização de status;
-   clientes;
-   despacho de entrega.

Não deverá acessar configurações críticas.

------------------------------------------------------------------------

## 3.4 Motoboy

Cada motoboy deverá possuir acesso próprio.

O motoboy poderá visualizar:

-   entregas oferecidas;
-   endereço da entrega;
-   nome do cliente;
-   telefone, quando permitido;
-   observações;
-   valor a receber, quando aplicável;
-   forma de pagamento;
-   distância/rota futuramente.

Status do motoboy:

-   Disponível;
-   Ocupado;
-   Offline.

------------------------------------------------------------------------

# 4. FLUXO PRINCIPAL DO CLIENTE

## Etapa 1 --- Entrada

O cliente acessa por:

-   QR Code da mesa;
-   QR Code de panfleto;
-   link do WhatsApp;
-   Instagram;
-   Google;
-   link direto do estabelecimento.

Exemplo:

`https://dominio.com/cardapio`

------------------------------------------------------------------------

## Etapa 2 --- Cardápio

Exibir:

-   banner;
-   logo;
-   nome do estabelecimento;
-   horário de funcionamento;
-   status "Aberto" ou "Fechado";
-   categorias;
-   produtos;
-   promoções;
-   campo de busca.

Categorias possíveis:

-   Mais pedidos;
-   Promoções;
-   Combos;
-   Hambúrgueres;
-   Porções;
-   Bebidas;
-   Sobremesas.

------------------------------------------------------------------------

## Etapa 3 --- Produto

Ao abrir um produto, mostrar:

-   foto;
-   nome;
-   descrição;
-   preço;
-   preço promocional;
-   complementos;
-   adicionais;
-   opções obrigatórias;
-   observações;
-   quantidade.

Exemplo:

**X-Bacon --- R\$ 29,90**

Adicionais:

-   Bacon extra + R\$ 5,00
-   Queijo extra + R\$ 4,00
-   Ovo + R\$ 3,00

Campo:

`Observação: retirar cebola`

Botão:

`Adicionar ao carrinho`

------------------------------------------------------------------------

# 5. CARRINHO

O carrinho deverá mostrar:

-   produtos;
-   quantidade;
-   adicionais;
-   observações;
-   subtotal;
-   desconto;
-   cupom;
-   taxa de entrega;
-   total.

Permitir:

-   aumentar quantidade;
-   diminuir quantidade;
-   remover produto;
-   editar produto;
-   inserir cupom.

------------------------------------------------------------------------

# 6. CHECKOUT

O checkout deve ser simples.

## Dados pessoais

-   Nome;
-   WhatsApp;
-   E-mail opcional/configurável.

## Tipo do pedido

-   Entrega;
-   Retirada no local.

## Para entrega

Solicitar:

-   CEP;
-   Rua;
-   Número;
-   Complemento;
-   Bairro;
-   Cidade;
-   Ponto de referência.

## Pagamento

Estrutura preparada para:

-   PIX;
-   Dinheiro;
-   Cartão na entrega;
-   Pagamento online futuramente.

Para dinheiro:

`Troco para quanto?`

------------------------------------------------------------------------

# 7. CRIAÇÃO DO CLIENTE

Ao finalizar o pedido:

1.  procurar cliente pelo telefone;
2.  se não existir, cadastrar;
3.  se existir, atualizar dados quando necessário;
4.  vincular o pedido ao cliente;
5.  atualizar estatísticas do cliente.

Guardar:

-   total de pedidos;
-   valor total gasto;
-   ticket médio;
-   primeiro pedido;
-   último pedido;
-   último endereço;
-   data de cadastro.

------------------------------------------------------------------------

# 8. STATUS DO PEDIDO

Fluxo inicial:

`NOVO → CONFIRMADO → EM PREPARO → PRONTO → AGUARDANDO MOTOBOY → SAIU PARA ENTREGA → ENTREGUE`

Outros status:

-   Cancelado;
-   Recusado.

Para retirada:

`NOVO → CONFIRMADO → EM PREPARO → PRONTO PARA RETIRADA → RETIRADO`

Cada mudança deve registrar:

-   status anterior;
-   status novo;
-   data/hora;
-   usuário responsável.

------------------------------------------------------------------------

# 9. TELA DE PEDIDOS DO RESTAURANTE

Criar uma tela estilo Kanban ou painel de produção.

Colunas sugeridas:

### Novos

Pedidos recém-recebidos.

### Em preparo

Pedidos sendo preparados.

### Prontos

Pedidos concluídos pela cozinha.

### Entrega

Pedidos aguardando ou em rota.

### Finalizados

Pedidos entregues/retirados.

Cada card deve mostrar rapidamente:

-   número do pedido;
-   nome do cliente;
-   horário;
-   total;
-   forma de pagamento;
-   tipo: entrega/retirada;
-   tempo desde a criação.

------------------------------------------------------------------------

# 10. DESPACHO DE MOTOBOY

Este é um módulo importante.

Quando o pedido ficar pronto e for entrega, o administrador poderá
clicar:

`CHAMAR MOTOBOY`

O sistema deverá procurar os motoboys com:

`status = DISPONÍVEL`

A corrida deverá ser disponibilizada para os motoboys elegíveis.

O primeiro motoboy que aceitar fica responsável pela entrega.

Depois disso:

-   corrida deixa de aparecer para os demais;
-   motoboy fica como `OCUPADO`;
-   pedido fica vinculado ao motoboy;
-   status muda para `MOTOBOY A CAMINHO` ou equivalente.

Quando retirar:

`SAIU PARA ENTREGA`

Quando concluir:

`ENTREGUE`

Após conclusão:

`motoboy.status = DISPONÍVEL`

------------------------------------------------------------------------

# 11. CONCORRÊNCIA NA ACEITAÇÃO DA CORRIDA

É obrigatório impedir que dois motoboys aceitem a mesma corrida.

A aceitação deverá acontecer no backend utilizando transação/lock
atômico.

Pseudo-regra:

``` text
SE delivery.status == "OFFERED"
    atualizar delivery para "ACCEPTED"
    atribuir motoboy_id
SENÃO
    retornar "Esta entrega já foi aceita por outro motoboy"
```

Não confiar apenas no frontend.

------------------------------------------------------------------------

# 12. CLIENTES E FIDELIZAÇÃO

Criar página:

`Clientes`

Tabela:

  Cliente   WhatsApp   E-mail     Pedidos   Total gasto Último pedido
  --------- ---------- -------- --------- ------------- ---------------

Ao abrir um cliente:

-   dados pessoais;
-   endereços;
-   histórico de pedidos;
-   quantidade de pedidos;
-   total gasto;
-   ticket médio;
-   último pedido;
-   observações;
-   benefícios liberados.

------------------------------------------------------------------------

# 13. SISTEMA DE BRINDES / FIDELIDADE

Criar configuração administrativa.

Exemplo:

`A cada 10 pedidos, liberar um brinde.`

Configurações:

-   quantidade necessária;
-   tipo de recompensa;
-   produto/brinde;
-   ativo/inativo.

Exemplo:

``` text
Pedidos válidos: 9
Próximo pedido: 10º
Benefício: Refrigerante grátis
```

Quando atingir:

`🎁 CLIENTE ELEGÍVEL PARA BRINDE`

O sistema não precisa aplicar automaticamente no MVP. Pode apenas
alertar o atendente.

------------------------------------------------------------------------

# 14. PROMOÇÕES

Criar módulo:

`Marketing > Promoções`

Permitir:

-   selecionar produto;
-   selecionar categoria;
-   informar percentual;
-   informar valor fixo;
-   preço promocional;
-   data inicial;
-   data final;
-   horário;
-   ativo/inativo.

Exemplos:

`20% de desconto em hambúrgueres`

ou

`X-Bacon de R$ 34,90 por R$ 27,90`

------------------------------------------------------------------------

# 15. CUPONS

Campos:

-   código;
-   descrição;
-   tipo;
-   valor;
-   pedido mínimo;
-   data inicial;
-   validade;
-   limite total;
-   limite por cliente;
-   ativo.

Tipos:

-   percentual;
-   valor fixo;
-   entrega grátis.

Exemplo:

`PRIMEIRACOMPRA10`

------------------------------------------------------------------------

# 16. WHATSAPP

O MVP deverá armazenar telefone e consentimento quando necessário para
permitir campanhas futuras.

Preparar arquitetura para integração posterior com:

-   WhatsApp Business API;
-   Evolution API;
-   UAZAPI;
-   WAHA;
-   outro provedor.

Eventos futuros:

-   pedido recebido;
-   pedido confirmado;
-   saiu para entrega;
-   entregue;
-   promoção;
-   cliente inativo;
-   campanha de fidelização.

**Não implementar disparo em massa diretamente no MVP sem uma integração
definida.**

Criar campos:

-   `marketing_opt_in`
-   `marketing_opt_in_at`

------------------------------------------------------------------------

# 17. QR CODE

No painel:

`Marketing > QR Code`

Gerar QR Code para o endereço público do cardápio.

Exemplo:

`https://dominio.com/cardapio`

Permitir baixar para impressão.

Uso:

-   mesas;
-   balcão;
-   panfletos;
-   embalagens;
-   materiais de divulgação;
-   materiais enviados junto aos pedidos de marketplaces.

Opcional futuramente:

QR Codes com origem rastreável:

`/cardapio?src=mesa01`

`/cardapio?src=panfleto`

`/cardapio?src=ifood`

Assim será possível medir de onde os clientes estão chegando.

------------------------------------------------------------------------

# 18. PAINEL ADMINISTRATIVO

Menu sugerido:

``` text
Dashboard
Pedidos
Cardápio
  Categorias
  Produtos
  Adicionais
Clientes
Entregas
Motoboys
Marketing
  Promoções
  Cupons
  Fidelidade
  QR Code
Configurações
Usuários
```

------------------------------------------------------------------------

# 19. DASHBOARD

Não criar um BI complexo.

Mostrar somente indicadores úteis:

-   pedidos hoje;
-   pedidos do mês;
-   faturamento hoje;
-   faturamento do mês;
-   ticket médio;
-   novos clientes;
-   clientes recorrentes;
-   pedidos em andamento;
-   entregas em andamento.

Também:

`Produtos mais pedidos`

`Clientes com mais pedidos`

------------------------------------------------------------------------

# 20. GESTÃO DO CARDÁPIO

## Categoria

Campos:

-   nome;
-   descrição;
-   imagem opcional;
-   ordem;
-   ativa.

## Produto

Campos:

-   nome;
-   slug;
-   descrição;
-   imagem;
-   categoria;
-   preço;
-   preço promocional;
-   disponível;
-   destaque;
-   mais vendido;
-   ordem.

Botão rápido:

`Disponível / Esgotado`

------------------------------------------------------------------------

# 21. ADICIONAIS E GRUPOS

Exemplo:

### Escolha o ponto da carne

Obrigatório --- máximo 1.

### Adicionais

Opcional --- máximo 5.

Banco deverá permitir:

`option_groups`

e

`product_options`

Campos:

-   nome;
-   obrigatório;
-   mínimo;
-   máximo;
-   preço adicional;
-   disponibilidade.

------------------------------------------------------------------------

# 22. BANCO DE DADOS

Recomendação para o MVP:

**Supabase + PostgreSQL**

Motivos:

-   autenticação;
-   PostgreSQL;
-   API;
-   realtime;
-   storage;
-   Row Level Security.

------------------------------------------------------------------------

# 23. MODELAGEM INICIAL

## users

``` text
id UUID PK
name VARCHAR
email VARCHAR UNIQUE
role ENUM(admin, operator, courier)
active BOOLEAN
created_at TIMESTAMP
```

## customers

``` text
id UUID PK
name VARCHAR
phone VARCHAR UNIQUE
email VARCHAR
marketing_opt_in BOOLEAN
marketing_opt_in_at TIMESTAMP
total_orders INTEGER DEFAULT 0
total_spent DECIMAL DEFAULT 0
last_order_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

## customer_addresses

``` text
id UUID PK
customer_id UUID FK
zip_code VARCHAR
street VARCHAR
number VARCHAR
complement VARCHAR
neighborhood VARCHAR
city VARCHAR
state VARCHAR
reference VARCHAR
is_default BOOLEAN
created_at TIMESTAMP
```

## categories

``` text
id UUID PK
name VARCHAR
slug VARCHAR UNIQUE
description TEXT
image_url TEXT
sort_order INTEGER
active BOOLEAN
created_at TIMESTAMP
```

## products

``` text
id UUID PK
category_id UUID FK
name VARCHAR
slug VARCHAR UNIQUE
description TEXT
image_url TEXT
price DECIMAL
promotional_price DECIMAL NULL
available BOOLEAN
featured BOOLEAN
sort_order INTEGER
created_at TIMESTAMP
updated_at TIMESTAMP
```

## option_groups

``` text
id UUID PK
product_id UUID FK
name VARCHAR
required BOOLEAN
min_choices INTEGER
max_choices INTEGER
sort_order INTEGER
```

## product_options

``` text
id UUID PK
option_group_id UUID FK
name VARCHAR
additional_price DECIMAL
available BOOLEAN
sort_order INTEGER
```

## orders

``` text
id UUID PK
order_number BIGINT
customer_id UUID FK
order_type ENUM(delivery, pickup)
status VARCHAR
subtotal DECIMAL
discount DECIMAL
delivery_fee DECIMAL
total DECIMAL
payment_method VARCHAR
change_for DECIMAL NULL
coupon_id UUID NULL
address_snapshot JSONB
customer_notes TEXT
source VARCHAR
created_at TIMESTAMP
confirmed_at TIMESTAMP NULL
ready_at TIMESTAMP NULL
delivered_at TIMESTAMP NULL
```

## order_items

``` text
id UUID PK
order_id UUID FK
product_id UUID FK
product_name_snapshot VARCHAR
quantity INTEGER
unit_price DECIMAL
total DECIMAL
notes TEXT
```

## order_item_options

``` text
id UUID PK
order_item_id UUID FK
option_id UUID NULL
option_name_snapshot VARCHAR
additional_price DECIMAL
quantity INTEGER
```

## order_status_history

``` text
id UUID PK
order_id UUID FK
previous_status VARCHAR
new_status VARCHAR
changed_by UUID NULL
created_at TIMESTAMP
```

## couriers

``` text
id UUID PK
user_id UUID FK
name VARCHAR
phone VARCHAR
vehicle_type VARCHAR
plate VARCHAR
status ENUM(available, busy, offline)
active BOOLEAN
created_at TIMESTAMP
```

## deliveries

``` text
id UUID PK
order_id UUID FK UNIQUE
courier_id UUID FK NULL
status ENUM(waiting, offered, accepted, picked_up, delivered, cancelled)
offered_at TIMESTAMP
accepted_at TIMESTAMP NULL
picked_up_at TIMESTAMP NULL
delivered_at TIMESTAMP NULL
created_at TIMESTAMP
```

## promotions

``` text
id UUID PK
name VARCHAR
type ENUM(percent, fixed, promotional_price)
value DECIMAL
starts_at TIMESTAMP
ends_at TIMESTAMP
active BOOLEAN
created_at TIMESTAMP
```

## coupons

``` text
id UUID PK
code VARCHAR UNIQUE
type ENUM(percent, fixed, free_delivery)
value DECIMAL
minimum_order DECIMAL
usage_limit INTEGER NULL
usage_per_customer INTEGER
starts_at TIMESTAMP
expires_at TIMESTAMP
active BOOLEAN
```

## loyalty_rules

``` text
id UUID PK
name VARCHAR
orders_required INTEGER
reward_type VARCHAR
reward_product_id UUID NULL
reward_description VARCHAR
active BOOLEAN
```

## loyalty_rewards

``` text
id UUID PK
customer_id UUID FK
loyalty_rule_id UUID FK
order_id UUID NULL
status ENUM(available, redeemed, expired)
created_at TIMESTAMP
redeemed_at TIMESTAMP NULL
```

## settings

``` text
id UUID PK
store_name VARCHAR
logo_url TEXT
phone VARCHAR
whatsapp VARCHAR
address TEXT
opening_hours JSONB
minimum_order DECIMAL
default_delivery_fee DECIMAL
accepting_orders BOOLEAN
```

------------------------------------------------------------------------

# 24. REGRAS DE NEGÓCIO IMPORTANTES

## Pedido

Um pedido não poderá ser criado:

-   sem produto;
-   com produto indisponível;
-   com quantidade \<= 0;
-   com opção obrigatória faltando.

O preço final deve ser recalculado no backend.

Nunca confiar no preço enviado pelo navegador.

------------------------------------------------------------------------

## Promoção

Antes de aplicar:

``` text
active = true
AND now >= starts_at
AND now <= ends_at
```

------------------------------------------------------------------------

## Cupom

Validar:

-   ativo;
-   validade;
-   pedido mínimo;
-   quantidade máxima;
-   limite por cliente.

------------------------------------------------------------------------

## Cliente

Após pedido entregue:

``` text
customer.total_orders += 1
customer.total_spent += order.total
customer.last_order_at = now
```

Pedidos cancelados não contam para fidelidade.

------------------------------------------------------------------------

# 25. NOTIFICAÇÕES EM TEMPO REAL

Usar Supabase Realtime ou WebSockets.

Eventos:

-   novo pedido;
-   alteração do pedido;
-   pedido pronto;
-   nova corrida;
-   corrida aceita;
-   entrega finalizada.

O painel deve atualizar sem precisar atualizar a página manualmente.

------------------------------------------------------------------------

# 26. INTERFACE DO MOTOBOY

Mobile first.

Tela inicial:

``` text
Olá, João

STATUS
[ DISPONÍVEL ]

ENTREGAS DISPONÍVEIS

Pedido #1052
Bairro: Centro
Pagamento: PIX
[ ACEITAR ENTREGA ]
```

Após aceitar:

``` text
ENTREGA ATUAL

Pedido #1052

Cliente
Endereço
Referência

[ ABRIR NO MAPS ]

[ PEDIDO RETIRADO ]

[ ENTREGA CONCLUÍDA ]
```

------------------------------------------------------------------------

# 27. GOOGLE MAPS / WAZE

No MVP não é necessário criar rastreamento GPS próprio.

Criar botão:

`Abrir rota`

Utilizando o endereço do cliente para abrir Google Maps/Waze.

GPS em tempo real poderá ser implementado em uma segunda fase.

------------------------------------------------------------------------

# 28. EXPERIÊNCIA VISUAL

O sistema deve ser:

-   moderno;
-   limpo;
-   rápido;
-   mobile first;
-   fácil para pessoas sem conhecimento técnico;
-   botões grandes no fluxo de pedidos;
-   fotos valorizadas;
-   poucas etapas até finalizar a compra.

Evitar painel administrativo cheio de gráficos desnecessários.

------------------------------------------------------------------------

# 29. TECNOLOGIAS SUGERIDAS

## Frontend

-   Next.js;
-   TypeScript;
-   Tailwind CSS;
-   shadcn/ui.

## Backend

Opção recomendada para MVP:

-   Supabase;
-   PostgreSQL;
-   Supabase Auth;
-   Supabase Storage;
-   Supabase Realtime.

Alternativa:

-   Node.js;
-   NestJS/Express;
-   PostgreSQL;
-   Prisma.

------------------------------------------------------------------------

# 30. RESPONSIVIDADE

O cliente deverá utilizar principalmente celular.

Prioridade:

1.  Mobile;
2.  Tablet;
3.  Desktop.

Admin deve funcionar bem em desktop e tablet.

Motoboy deve ser projetado prioritariamente para smartphone.

------------------------------------------------------------------------

# 31. SEGURANÇA

Implementar:

-   autenticação do admin;
-   autenticação do motoboy;
-   autorização por perfil;
-   Row Level Security se usar Supabase;
-   validação backend;
-   proteção de rotas;
-   sanitização;
-   rate limit em endpoints públicos;
-   logs básicos;
-   variáveis secretas somente no backend.

Nunca expor:

-   service role key;
-   tokens privados;
-   credenciais;
-   chaves de integrações.

------------------------------------------------------------------------

# 32. LGPD

Como serão armazenados nome, telefone, e-mail e endereço:

-   criar Política de Privacidade;
-   informar finalidade da coleta;
-   limitar acesso administrativo;
-   não expor dados de clientes entre motoboys;
-   guardar consentimento de marketing separadamente.

Não considerar a realização do pedido automaticamente como consentimento
para campanhas promocionais.

------------------------------------------------------------------------

# 33. PÁGINAS PÚBLICAS

``` text
/
 /cardapio
 /produto/[slug]
 /carrinho
 /checkout
 /pedido/[token]
 /privacidade
```

O link de acompanhamento não deverá expor ID sequencial facilmente
enumerável.

Usar token público seguro.

------------------------------------------------------------------------

# 34. PÁGINAS ADMINISTRATIVAS

``` text
/admin/login
/admin
/admin/pedidos
/admin/pedidos/[id]
/admin/cardapio
/admin/categorias
/admin/produtos
/admin/produtos/novo
/admin/clientes
/admin/clientes/[id]
/admin/entregas
/admin/motoboys
/admin/promocoes
/admin/cupons
/admin/fidelidade
/admin/qrcode
/admin/configuracoes
```

------------------------------------------------------------------------

# 35. PÁGINAS DO MOTOBOY

``` text
/entregador/login
/entregador
/entregador/entregas
/entregador/entrega/[id]
/entregador/historico
```

------------------------------------------------------------------------

# 36. COMPONENTES IMPORTANTES

Criar componentes reutilizáveis:

``` text
ProductCard
CategoryTabs
ProductModal
OptionSelector
CartDrawer
CartItem
OrderSummary
CustomerForm
AddressForm
PaymentSelector
OrderStatusTimeline
OrderCard
OrderKanban
CustomerCard
PromotionForm
CouponForm
QRCodeCard
CourierStatus
DeliveryOfferCard
DeliveryCurrentCard
```

------------------------------------------------------------------------

# 37. ORDEM DE IMPLEMENTAÇÃO

## FASE 1 --- Fundação

-   projeto;
-   banco;
-   autenticação;
-   layout;
-   configurações.

## FASE 2 --- Cardápio

-   categorias;
-   produtos;
-   adicionais;
-   imagens;
-   disponibilidade.

## FASE 3 --- Compra

-   carrinho;
-   checkout;
-   cadastro do cliente;
-   endereço;
-   criação do pedido.

## FASE 4 --- Operação

-   painel de pedidos;
-   mudança de status;
-   histórico.

## FASE 5 --- Entregas

-   cadastro de motoboys;
-   disponibilidade;
-   chamada;
-   aceite;
-   retirada;
-   entrega.

## FASE 6 --- Marketing

-   clientes;
-   fidelidade;
-   promoções;
-   cupons;
-   QR Code.

## FASE 7 --- Integrações

-   WhatsApp;
-   pagamentos;
-   mapas avançados;
-   notificações.

------------------------------------------------------------------------

# 38. O QUE NÃO COLOCAR NO PRIMEIRO MVP

Para evitar transformar o projeto em um ERP caro e demorado, deixar para
fases futuras:

-   estoque completo;
-   compras;
-   fornecedores;
-   contabilidade;
-   folha de pagamento;
-   controle financeiro avançado;
-   DRE;
-   emissão fiscal;
-   roteirização inteligente;
-   GPS em tempo real;
-   aplicativo nativo;
-   marketplace;
-   multiunidades.

------------------------------------------------------------------------

# 39. PREPARAR ARQUITETURA PARA EVOLUÇÃO

Mesmo que o primeiro sistema seja para apenas um estabelecimento,
estruturar o código para futuramente ser possível adicionar:

-   múltiplas lojas;
-   múltiplas unidades;
-   SaaS;
-   assinatura mensal;
-   domínio personalizado;
-   tema personalizado;
-   integração com impressora;
-   KDS para cozinha;
-   integração com marketplaces.

Não implementar multi-tenant completo agora caso não seja necessário.

------------------------------------------------------------------------

# 40. DADOS DO CARDÁPIO EXISTENTE

Se houver um cardápio atual publicado em marketplace, ele poderá ser
usado apenas como referência inicial para:

-   nomes dos produtos;
-   categorias;
-   descrições;
-   adicionais;
-   preços;
-   fotos, quando houver autorização para reutilização.

Não criar dependência técnica do marketplace.

O cardápio próprio deverá funcionar independentemente.

------------------------------------------------------------------------

# 41. CRITÉRIOS DE ACEITE DO MVP

O MVP será considerado funcional quando:

1.  Admin conseguir cadastrar uma categoria.
2.  Admin conseguir cadastrar produto e foto.
3.  Cliente conseguir acessar o cardápio.
4.  Cliente conseguir adicionar produto ao carrinho.
5.  Cliente conseguir finalizar pedido.
6.  Cliente ficar salvo na base.
7.  Pedido aparecer instantaneamente no painel.
8.  Admin conseguir mover pedido entre os status.
9.  Admin conseguir marcar pedido como pronto.
10. Admin conseguir chamar motoboy.
11. Motoboy disponível conseguir visualizar a corrida.
12. Apenas um motoboy conseguir aceitar.
13. Motoboy conseguir marcar retirada.
14. Motoboy conseguir finalizar entrega.
15. Cliente acumular quantidade de pedidos.
16. Admin conseguir visualizar histórico do cliente.
17. Admin conseguir criar promoção.
18. Admin conseguir criar cupom.
19. Sistema conseguir gerar QR Code.
20. Layout funcionar corretamente no celular.

------------------------------------------------------------------------

# 42. PROMPT MESTRE PARA LOVABLE / CLAUDE

Copie a instrução abaixo juntamente com este documento.

``` text
Você é um arquiteto de software e desenvolvedor full-stack sênior.

Quero que desenvolva um sistema de cardápio digital, pedidos e entregas seguindo EXATAMENTE a especificação deste documento.

IMPORTANTE:

- Não transforme o projeto em um ERP.
- Priorize o MVP.
- Use arquitetura limpa, modular e preparada para evolução.
- O sistema deve ser mobile first.
- Use TypeScript.
- Preferencialmente use Next.js + Tailwind + shadcn/ui + Supabase/PostgreSQL.
- Não utilize dados mockados nas funcionalidades finais.
- Crie migrations/tabelas reais.
- Crie relacionamentos e constraints.
- Crie autenticação e autorização por perfil.
- Se usar Supabase, crie as políticas RLS necessárias.
- Nunca confie em preços calculados somente no frontend.
- Todas as regras financeiras devem ser validadas no backend.
- Implemente tratamento de loading, erro e empty state.
- O painel de pedidos deverá atualizar em tempo real.
- A aceitação de entrega pelo motoboy deve ser atômica para impedir aceite duplicado.
- Preserve snapshots de nome e preço dos produtos dentro dos itens do pedido.
- Não apague pedidos antigos quando um produto for excluído.
- Produtos devem preferencialmente ser desativados, não apagados fisicamente.
- Faça o projeto responsivo.
- Escreva código organizado e reutilizável.
- Não crie funções fictícias ou botões sem funcionamento.

ANTES DE CODIFICAR:
1. apresente a arquitetura;
2. apresente a estrutura de pastas;
3. apresente o schema do banco;
4. apresente as rotas;
5. apresente os fluxos;
6. depois implemente por fases.

Não tente implementar todo o sistema em uma única resposta se isso comprometer a qualidade.

Comece pela FASE 1 e prossiga de forma incremental, sempre mantendo compatibilidade com as fases anteriores.
```

------------------------------------------------------------------------

# 43. PROMPT PARA CRIAR O BANCO PRIMEIRO

``` text
Com base na especificação do sistema de cardápio digital, crie agora exclusivamente a camada de banco de dados em Supabase/PostgreSQL.

Entregue:

1. SQL completo das tabelas;
2. enums;
3. primary keys;
4. foreign keys;
5. unique constraints;
6. índices;
7. timestamps;
8. triggers necessários;
9. políticas RLS;
10. funções PostgreSQL necessárias;
11. função/transação segura para um motoboy aceitar uma corrida;
12. função para atualizar estatísticas do cliente somente quando o pedido for concluído;
13. dados seed mínimos para desenvolvimento.

Não implemente a interface ainda.

Explique a ordem correta para executar as migrations.
```

------------------------------------------------------------------------

# 44. PROMPT PARA CRIAR O FRONTEND DO CLIENTE

``` text
Agora implemente somente a experiência do cliente.

Criar:

- página inicial/cardápio;
- categorias;
- busca;
- produtos;
- detalhes;
- adicionais;
- carrinho;
- cupom;
- checkout;
- entrega/retirada;
- identificação do cliente;
- endereço;
- pagamento;
- criação do pedido;
- página de acompanhamento.

O layout deve ser mobile first e profissional.

Não use dados mockados. Conecte ao banco criado anteriormente.

O preço deve ser validado novamente no backend antes de criar o pedido.
```

------------------------------------------------------------------------

# 45. PROMPT PARA O PAINEL ADMIN

``` text
Implemente o painel administrativo do sistema.

Criar:

- login;
- dashboard simples;
- pedidos em tempo real;
- Kanban de pedidos;
- cadastro de categorias;
- cadastro de produtos;
- adicionais;
- clientes;
- histórico de clientes;
- promoções;
- cupons;
- fidelidade;
- motoboys;
- entregas;
- QR Code;
- configurações.

Use permissões por perfil.

Priorize velocidade operacional: o atendente precisa conseguir mudar o status de um pedido com poucos cliques.
```

------------------------------------------------------------------------

# 46. PROMPT PARA O MÓDULO DE MOTOBOY

``` text
Implemente o módulo mobile first de entregadores.

Cada motoboy deverá:

- fazer login;
- ficar online/offline;
- marcar-se disponível;
- receber ofertas de entrega;
- aceitar uma corrida;
- visualizar dados da corrida aceita;
- abrir endereço no mapa;
- marcar pedido retirado;
- marcar pedido entregue;
- consultar histórico.

REGRA CRÍTICA:
Somente um motoboy pode aceitar uma corrida.

Implemente essa regra no banco/backend de forma atômica.

Não resolva concorrência apenas escondendo o botão no frontend.
```

------------------------------------------------------------------------

# 47. RESULTADO ESPERADO

Ao final, o estabelecimento deverá possuir um canal próprio:

``` text
QR CODE / LINK
       ↓
CARDÁPIO DIGITAL
       ↓
CARRINHO
       ↓
CHECKOUT
       ↓
BASE DE CLIENTES
       ↓
PEDIDO NO PAINEL
       ↓
PREPARAÇÃO
       ↓
MOTOBOY
       ↓
ENTREGA
       ↓
FIDELIZAÇÃO
       ↓
NOVAS COMPRAS
```

A prioridade é manter essa jornada simples, rápida e confiável.
