# Clima Cascavel – PR

Condições atuais e previsão do tempo para Cascavel, Paraná, com contexto
educativo sobre El Niño. Projeto de portfólio, sem fins comerciais.

> **EN summary:** Portfolio weather web app for Cascavel (Paraná, Brazil).
> Next.js + TypeScript, server-side caching of the free Open-Meteo API, explicit
> handling of stale data and provider failures, and a strict separation between
> forecasts, official alerts and El Niño climate context.

**Status:** v1 publicada em **https://cascavel-clima.vercel.app** (Etapas 0–6 concluídas).

## Princípios

- **Previsão ≠ alerta oficial ≠ contexto climático.** O site exibe previsão de
  modelo numérico, aponta para fontes oficiais de alerta (sem emitir ou
  interpretar alertas) e explica El Niño citando fonte e data.
- **Nada inventado.** Sem dado válido, o site mostra "indisponível", nunca
  valores de exemplo. Dados antigos aparecem com aviso de idade.
- **Nenhuma chave no navegador.** O navegador fala só com o nosso servidor.

## Rodando localmente

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testes (Vitest)
npm run lint
npm run typecheck
npm run build
```

Não há variáveis de ambiente obrigatórias hoje. Veja `.env.example`.

## Arquitetura

```
Navegador ──▶ Next.js (servidor, Vercel) ──▶ cache (10 min) ──▶ Open-Meteo
                         │
                         └─ GET /api/weather (JSON normalizado)
```

Três camadas de proteção contra dado ruim ou velho:

1. **Serviço** (`src/lib/weather/service.ts`): timeout de 8 s, uma retentativa só
   para erros transitórios. O último dado bom fica no Runtime Cache da Vercel
   (`last-good-store.ts`, compartilhado entre instâncias, válido por 24 h) e é
   usado como fallback se o provedor falhar.
2. **Cache remoto** (`get-weather.ts`, `"use cache: remote"`, Runtime Cache da
   Vercel): no máximo uma chamada ao provedor a cada 10 min, compartilhada entre
   todas as instâncias; falhas nunca entram no cache. O `"use cache"` comum
   (em memória) não bastava na Vercel: verificado no site publicado, cada visita
   chamava o Open-Meteo. O cache remoto recomeça a cada novo deploy.
3. **Visão por requisição** (`freshness.ts`): idade calculada a cada acesso; dado
   expirado some da tela e da API; horas e dias passados são removidos.

| Pasta | Conteúdo |
|---|---|
| `src/lib/config.ts` | Cidade, coordenadas, TTL do cache, limites de frescor, fontes oficiais |
| `src/lib/providers/` | Chamada ao Open-Meteo com validação rígida (zod): unidades, fuso, faixas |
| `src/lib/weather/` | Normalização, códigos WMO em PT-BR, serviço, cache e frescor |
| `src/lib/format.ts` | Formatação pt-BR com fuso explícito (`America/Sao_Paulo`) |
| `src/components/` | Componentes da interface |
| `src/content/el-nino.ts` | Conteúdo curado do El Niño, com fonte por afirmação |
| `src/app/` | Páginas (`/`, `/sobre`, `/el-nino`) e `GET /api/weather` |
| `tests/` | Testes (Vitest), incluindo regras de texto proibido |

## Qualidade

- **119 testes** cobrindo: validação do provedor, normalização, fuso perto da
  meia-noite, regras de frescor, retentativa e fallback, estados da tela
  (fresco, velho, expirado, indisponível), conteúdo do El Niño e uma varredura
  de frases proibidas ("sem alertas", "causado pelo El Niño"…).
- **Lighthouse** (celular, site publicado em cascavel-clima.vercel.app, 14/10/2026):

  | Página | Performance | Acessibilidade | Boas práticas | SEO |
  |---|---|---|---|---|
  | Início | 99 | 100 | 100 | 100 |
  | Sobre | 100 | 100 | 100 | 100 |
  | El Niño | 100 | 100 | 100 | 100 |

- **Segredos:** nenhuma chave no projeto; o JavaScript enviado ao navegador não
  contém referências ao provedor nem padrões de chave/token.

## Deploy (Vercel, plano Hobby)

1. Crie uma conta em [vercel.com](https://vercel.com) entrando com o GitHub.
2. **Add New → Project**, importe este repositório e mantenha as opções padrão
   (o framework Next.js é detectado sozinho). Não há variáveis de ambiente.
3. Cada `git push` na branch `main` publica uma nova versão.

## Escopo da v1

**Inclui:** condições atuais, próximas 24 h, próximos 7 dias, indicador de
atualização, links para alertas oficiais, página El Niño e página Sobre/Fontes.
Prioridade para o navegador do celular.

**Fora da v1** (cada item só entra com aprovação): outras cidades, login,
notificações, integração automática de alertas do INMET, dados observados de
estação, radar/mapas, histórico, status do El Niño automático,
PWA/app nativo, modo escuro, outros idiomas, monetização.

## Fontes e atribuição

- **Dados meteorológicos:** [Open-Meteo.com](https://open-meteo.com/), licença
  [CC BY 4.0](https://open-meteo.com/en/licence). A licença exige um link para
  o Open-Meteo ao lado de onde os dados aparecem.
- **Alertas oficiais (só links):** [INMET – Avisos](https://avisos.inmet.gov.br/),
  [Defesa Civil do Paraná](https://www.defesacivil.pr.gov.br/).
- **El Niño** (conteúdo curado à mão em `src/content/el-nino.ts`, conferido em 14/10/2026):
  [NOAA CPC – ENSO Diagnostic Discussion](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml) (08/10/2026),
  [Painel El Niño 2026–2027, Boletim nº 4 – INPE/INMET](https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias/painel-el-nino-2026-2027-quarto-boletim-sobre-o-monitoramento-do-fenomeno-no-brasil-e-publicado) (01/10/2026),
  [Simepar](https://www.simepar.br/simepar/post/77062) (09/07/2026) e
  [notas técnicas Defesa Civil PR/Simepar](https://www.defesacivil.pr.gov.br/Pagina/NOTAS-TECNICA-CONJUNTA-EL-NINO-OSCILACAO-SUL-ENOS-2026).

### Como atualizar o conteúdo do El Niño

1. Leia o boletim mais recente do NOAA CPC (mensal) e do Painel El Niño (INPE/INMET).
2. Edite `src/content/el-nino.ts`: textos, `publishedAt` de cada fonte, `reviewedAt` e
   `nextExpectedUpdate`. Toda afirmação precisa de uma fonte (`source`).
3. Rode `npm test`: os testes conferem fontes, datas e frases proibidas.

A página mostra um aviso automático se passar a data do próximo boletim ou 45 dias
desde a revisão.

## Verificações da Etapa 0 (2026-10-14)

| Item | Resultado | Fonte |
|---|---|---|
| Coordenadas | -24.95583, -53.45528, 786 m, `America/Sao_Paulo` (GeoNames 3466779). Há outro "Cascavel" no PR (distrito de Guarapuava): **não usar** | Open-Meteo Geocoding |
| Open-Meteo: uso grátis | Só não comercial: sem assinatura nem anúncios | [Termos](https://open-meteo.com/en/terms) |
| Open-Meteo: limites | 600/min, 5.000/h, 10.000/dia, 300.000/mês. Nosso uso estimado: ≤ 144/dia | [Termos](https://open-meteo.com/en/terms) |
| Open-Meteo: atribuição | CC BY 4.0; link "Weather data by Open-Meteo.com" junto aos dados | [Licença](https://open-meteo.com/en/licence) |
| Vercel Hobby | Grátis, **só uso pessoal/não comercial**; 1M invocações de função/mês, 100 GB de transferência. Se passar do limite, o recurso pausa (sem cobrança) | [Hobby](https://vercel.com/docs/plans/hobby) |
| Alertas INMET | Endereço ativo: `avisos.inmet.gov.br` (`alertas2` recusa conexão). O servidor recusa clientes que não se identificam como navegador, por isso a integração automática fica fora da v1 | Teste de conexão |
| Alerta por SMS | Enviar CEP para 40199 (gratuito) | [Paraná – Defesa Civil](https://www.parana.pr.gov.br/servicos/Seguranca/Defesa-Civil/Receber-alertas-da-Defesa-Civil-por-SMS-ERrZ4PN6) |

**Gatilho de revisão:** se o projeto passar a ter receita, anúncios ou
assinatura, os planos grátis do Open-Meteo e da Vercel deixam de valer.

## Plano de etapas

0. ✅ Base do projeto
1. ✅ Provedor Open-Meteo + validação + normalização
2. ✅ Serviço com cache, frescor e tratamento de falhas + `/api/weather`
3. ✅ Tela Início
4. ✅ Página Sobre/Fontes + atribuição + bloco de alertas
5. ✅ Página El Niño (conteúdo revisado pelo autor)
6. ✅ Deploy na Vercel + verificação de segredos no bundle + Lighthouse
