# Dashboard — Black Friday 2026 · Captação

Next.js 14 (App Router, TypeScript) + Tailwind + componentes estilo shadcn/ui + Recharts + Framer Motion.
Fonte de dados: Google Sheets (Service Account, leitura somente no servidor), abas **Meta Ads** e **Leads**, com cache de 5 minutos.

## Páginas
- `/` Visão geral — 6 KPIs, evolução diária, origem dos leads, investimento diário e leads diários (tráfego x AC)
- `/meta-ads` — KPIs, funil, CTR/CPM/Tx. carregamento/Tx. conversão, verba por público, tabelas ordenáveis (campanha, público, criativo) com heatmap e melhor/pior criativo
- `/leads` — leads totais/tráfego/orgânico/sem UTMs/CPL, leads por dia, barras por Source, Content, Term, Medium e Campaign

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
| Leads | **somente `D:L`** (UTMs e data) — Nome, Email e Telefone nunca são lidos; os leads chegam ao navegador agregados por dia/UTMs |

Nenhuma outra aba é lida; todas as métricas são calculadas dessas duas abas brutas.

- Colunas são localizadas pelo **nome do cabeçalho** (com fallback pela posição indicada no pedido).
- Conversões: `R$ 1.234,56` e `225,84` → número; `dd/mm/aaaa` → ISO; `#N/A`, linhas vazias e linhas de template (ex.: "Campaign Name") são ignoradas; UTMs vazias viram "Sem UTM".
- `/api/data` usa `revalidate = 300` + `unstable_cache` (5 min); o cliente usa SWR com `refreshInterval` de 5 min e o badge "Atualizado há X min" (clique para atualizar).

## Definições de métrica
- **Valor investido** e **Leads Tráfego** (Website Leads) vêm da aba Meta Ads. **Leads AC** = linhas da aba Leads.
- **CPL Tráfego** = valor ÷ leads tráfego · **CPL AC** = valor ÷ leads AC · **CPL AC-UTMs** = valor ÷ leads AC com Campaign preenchida.
- **CTR** = cliques ÷ impressões · **CPC** = valor ÷ cliques · **CPM** = valor ÷ impressões × 1000 · **Tx. carregamento** = LPV ÷ cliques · **Tx. conversão** = leads ÷ LPV.
- **Sem UTMs** = Campaign vazia. **Tráfego / Orgânico** (página Leads): com Campaign, é tráfego quando `Source` é plataforma paga (fb, ig, meta…) ou `Medium` indica mídia paga; senão, orgânico. Ajuste em `lib/config.ts` (`PAID_SOURCES`, `PAID_MEDIUM_HINTS`).
- Filtros de público/criativo: nos leads do AC usam `Medium` e `Content`.

## Estrutura
```
app/api/data/route.ts     rota com cache de 5 min
app/(dashboard)/          páginas (/, /meta-ads, /leads)
lib/sheets.ts             cliente Google Sheets (server-only)
lib/normalize.ts          parsing das abas
lib/parse.ts              números/datas pt-BR
lib/metrics.ts            filtros, KPIs, séries, deltas
```
