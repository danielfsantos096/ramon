# Dashboard — Black Friday 2026 · Captação

Next.js 14 (App Router, TypeScript) + Tailwind + componentes estilo shadcn/ui + Recharts + Framer Motion.
Fonte de dados: Google Sheets (Service Account, leitura somente no servidor), abas **Meta Ads** e **Leads** da planilha da campanha e aba **Hotmart** da planilha "Ramon Souza - Vendas Gerais", com cache de 5 minutos.

## Páginas
- `/` Visão geral — 6 KPIs, evolução diária, origem dos leads, investimento diário e leads diários (tráfego x AC) — **só Captação**
- `/meta-ads` **Captação** — KPIs, funil, CTR/CPM/Tx. carregamento/Tx. conversão, verba por público, tabelas ordenáveis (campanha, público, criativo) com heatmap, 3 melhores criativos + pior, botão Melhor → Pior
- `/avisos` **Avisos** e `/rmkt` **RMKT** — mesma estrutura, para as campanhas cujo nome contém "Avisos" / "RMKT" (ver `STAGE_TERMS` em `lib/config.ts`). Em **RMKT** a métrica principal é a compra (Website Purchases: compras, CPA, valor de conversão, ROAS, checkouts), sem nada de lead. Em Avisos, sem Website Leads na etapa, o resultado é a visualização da página (custo por visualização)
- `/vendas` **Hotmart** — vendas dos produtos que contêm `SALES_PRODUCT_TERM` ("TI TOTAL") no nome, com caixa de seleção de produto (padrão: `SALES_DEFAULT_PRODUCT`): vendas, faturamento, ticket médio, investimento da Meta (todas as etapas), ROAS, CAC, devoluções, vendas por dia, pagamento, origem, campanha/criativo (UTMs) e status
- `/leads` — leads totais/tráfego/orgânico/sem UTMs/CPL, leads por dia, barras por Source, Content, Term, Medium e Campaign

**Etapas e datas:** a etapa de cada campanha é definida pelo nome (contém "RMKT" → RMKT; contém "Avisos" → Avisos; o resto é Captação). O período padrão de cada aba vai do primeiro ao último dia com investimento na etapa (se ainda está rodando, o fim é hoje); a Hotmart usa do início da captação até hoje.

Filtros globais: período (padrão: início da captação → hoje), campanha, público, criativo e "só leads novos". Os KPIs mostram a variação (%) contra o período anterior de mesma duração.

## Configuração passo a passo

### 1. Service Account no Google Cloud
1. Em https://console.cloud.google.com crie (ou escolha) um projeto.
2. **APIs e serviços → Biblioteca** → ative **Google Sheets API**.
3. **IAM e administrador → Contas de serviço → Criar conta de serviço**.
4. Na conta criada: **Chaves → Adicionar chave → JSON**. Baixe o arquivo.
5. Do JSON, copie `client_email` e `private_key`.

### 2. Compartilhar a planilha
Abra a planilha → **Compartilhar** → adicione o `client_email` como **Leitor**.
O `SHEET_ID` é o trecho da URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`.

### 3. Variáveis de ambiente
```bash
cp .env.example .env.local
```
Preencha:

| Variável | Descrição |
|---|---|
| `SHEET_ID` | ID da planilha |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` do JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` do JSON, entre aspas, em uma linha, com `\n` literais (o código aplica `.replace(/\\n/g, "\n")`) |
| `SALES_SHEET_ID` | (opcional) ID da planilha de vendas; padrão = "Ramon Souza - Vendas Gerais". Compartilhe-a com a Service Account como Leitor |
| `CAMPAIGN_START` | (opcional) início da captação `AAAA-MM-DD`; padrão = menor data das abas |
| `DEMO_MODE` | (opcional) `true` usa dados fictícios para pré-visualizar |

### 4. Rodar
```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

### 5. Deploy (Vercel)
Suba o repositório no GitHub, importe na Vercel e cadastre as mesmas variáveis em **Settings → Environment Variables** (cole a `GOOGLE_PRIVATE_KEY` entre aspas, com `\n`).

## Como os dados são lidos
| Aba | Leitura |
|---|---|
| Meta Ads | `A:Q` (colunas auxiliares à direita de Q são ignoradas) |
| Hotmart (planilha de vendas, ou aba "Hotmart" da planilha da campanha como plano B) | `A:B` e `F:W` — Nome, Email e Telefone (`C:E`) nunca são lidos; só produtos que contêm `SALES_PRODUCT_TERM`, sem transações duplicadas; chegam agregadas por dia/status/UTMs |
| Leads | **somente `D:L`** (UTMs e data) — Nome, Email e Telefone nunca são lidos; os leads chegam ao navegador agregados por dia/UTMs |

Nenhuma outra aba é lida; todas as métricas são calculadas dessas duas abas brutas.

- Colunas são localizadas pelo **nome do cabeçalho** (com fallback pela posição indicada no pedido).
- Conversões: `R$ 1.234,56` e `225,84` → número; `dd/mm/aaaa` → ISO; `#N/A`, linhas vazias e linhas de template (ex.: "Campaign Name") são ignoradas; UTMs vazias viram "Sem UTM".
- `/api/data` é sempre dinâmica (`force-dynamic`) e guarda a planilha em cache por 5 min (`s-maxage=300` na CDN + memória da instância; se a leitura falhar, serve o último dado bom). O cliente usa SWR com `refreshInterval` de 5 min, atualiza também ao voltar para a aba e com a aba em segundo plano, e mostra o badge "Atualizado há X min" (clique para atualizar).

## Definições de métrica
- **Valor investido** e **Leads Tráfego** (Website Leads) vêm da aba Meta Ads. **Leads AC** = linhas da aba Leads.
- **CPL Tráfego** = valor ÷ leads tráfego · **CPL AC** = valor ÷ leads AC · **CPL AC-UTMs** = valor ÷ leads AC com Campaign preenchida.
- **CTR** = cliques ÷ impressões · **CPC** = valor ÷ cliques · **CPM** = valor ÷ impressões × 1000 · **Tx. carregamento** = LPV ÷ cliques · **Tx. conversão** = leads ÷ LPV.
- **Sem UTMs** = lead sem nenhuma UTM (campaign, source, medium, content e term vazios). **Tráfego** = a UTM aponta para a Meta: campanha, público (`Medium`) ou criativo (`Content`) existem na aba Meta Ads (comparação sem acento/caixa, ignorando o ID final da Meta), ou `Source` é código da Meta (`PAID_SOURCES`: fb, ig, an, msg), ou `Medium` indica mídia paga (`PAID_MEDIUM_HINTS`). **Orgânico** = tem alguma UTM mas não veio do tráfego. Ajuste em `lib/config.ts`.
- **Gerenciador X Active** (Visão geral): ao filtrar por campanha, público ou criativo aparece um painel que cruza `Campaign Name`/`Ad Set Name`/`Ad Name` (aba Meta Ads) com `utm Campaign`/`Medium`/`Content` (aba Leads, chamada de "Leads Active" no dashboard), mostrando os leads de cada lado e a diferença, por item selecionado. A comparação ignora acento, maiúsculas e o ID final da Meta.
- Filtros: na Visão geral e no Meta Ads o filtro de campanha usa os nomes da aba Meta Ads; na **Análise de Leads** ele lista as campanhas (coluna Campaign) da própria aba Leads, com a contagem de linhas de cada uma. Público/criativo usam `Medium`/`Content` nos leads. Sem investimento no recorte, o CPL aparece como "—".

## Estrutura
```
app/api/data/route.ts     rota com cache de 5 min
app/(dashboard)/          páginas (/, /meta-ads, /leads)
lib/sheets.ts             cliente Google Sheets (server-only)
lib/normalize.ts          parsing das abas
lib/parse.ts              números/datas pt-BR
lib/metrics.ts            filtros, KPIs, séries, deltas
```
