/**
 * Conteúdo da página El Niño — curado à mão, NUNCA calculado nem gerado.
 *
 * Regras:
 * - toda afirmação aponta para uma fonte (`source`) com data de publicação;
 * - textos parafraseados das fontes, sem números que não estejam nelas;
 * - nada de atribuir um evento local específico ao El Niño.
 *
 * Revisar quando sair novo boletim (ver `nextExpectedUpdate`) ou a cada 45 dias.
 */

export type SourceId = "noaa-cpc" | "painel-brasil" | "simepar" | "defesa-civil-pr";

export type Source = {
  /** Rótulo curto usado nas citações. */
  short: string;
  name: string;
  title: string;
  url: string;
  /** Data de publicação do documento consultado (AAAA-MM-DD); null se for página de índice. */
  publishedAt: string | null;
};

export type Statement = { text: string; source: SourceId };

export const SOURCES: Record<SourceId, Source> = {
  "noaa-cpc": {
    short: "NOAA CPC",
    name: "NOAA Climate Prediction Center (EUA)",
    title: "ENSO Diagnostic Discussion",
    url: "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",
    publishedAt: "2026-10-08",
  },
  "painel-brasil": {
    short: "Painel El Niño (INPE/INMET)",
    name: "INPE, INMET, Cemaden e outros órgãos federais",
    title: "Painel El Niño 2026–2027, Boletim nº 4",
    url: "https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias/painel-el-nino-2026-2027-quarto-boletim-sobre-o-monitoramento-do-fenomeno-no-brasil-e-publicado",
    publishedAt: "2026-10-01",
  },
  simepar: {
    short: "Simepar",
    name: "Simepar (Paraná)",
    title: "Nova atualização do El Niño detalha regiões do Paraná que devem receber mais chuvas",
    url: "https://www.simepar.br/simepar/post/77062",
    publishedAt: "2026-07-09",
  },
  "defesa-civil-pr": {
    short: "Defesa Civil PR/Simepar",
    name: "Defesa Civil do Paraná e Simepar",
    title: "Notas técnicas conjuntas sobre o El Niño (atualizadas periodicamente)",
    url: "https://www.defesacivil.pr.gov.br/Pagina/NOTAS-TECNICA-CONJUNTA-EL-NINO-OSCILACAO-SUL-ENOS-2026",
    publishedAt: null,
  },
};

export const EL_NINO = {
  /** Quando este conteúdo foi conferido nas fontes. */
  reviewedAt: "2026-10-14",
  /** Próximo boletim mensal do NOAA CPC anunciado no boletim de 08/10/2026. */
  nextExpectedUpdate: "2026-11-12",
  maxAgeDays: 45,

  whatIs: [
    {
      text: "O El Niño–Oscilação Sul (ENOS) é um fenômeno do Oceano Pacífico Equatorial, marcado por variações anormais na temperatura da superfície do mar e na circulação da atmosfera. Por alterar a circulação atmosférica global, influencia temperatura e chuva em grandes áreas do planeta por meses ou anos.",
      source: "simepar",
    },
  ] satisfies Statement[],

  /** Fases, em linguagem geral (sem números). */
  phases: [
    { name: "El Niño", text: "águas do Pacífico Equatorial mais quentes que a média" },
    { name: "La Niña", text: "águas do Pacífico Equatorial mais frias que a média" },
    { name: "Neutro", text: "nenhuma das duas condições" },
  ],

  status: {
    headline: "El Niño ativo e em fortalecimento",
    statements: [
      {
        text: "O boletim de 8 de outubro de 2026 mantém o status de El Niño (“El Niño Advisory”) e informa que o fenômeno continua se fortalecendo. O índice Niño-3.4 chegou a +2,1 °C acima da média no último mês.",
        source: "noaa-cpc",
      },
      {
        text: "Segundo o mesmo boletim, um El Niño de intensidade forte a muito forte é provável até o trimestre janeiro–março de 2027, com chance superior a 83%.",
        source: "noaa-cpc",
      },
      {
        text: "O boletim brasileiro de 1º de outubro de 2026 indica 95% de probabilidade de intensidade muito forte no trimestre outubro–novembro–dezembro, com o fenômeno persistindo pelo menos até o primeiro trimestre de 2027.",
        source: "painel-brasil",
      },
    ] satisfies Statement[],
  },

  south: [
    {
      text: "Para outubro–dezembro de 2026, a previsão indica chuva acima da média no Sul do Brasil, com risco de cheias que deve diminuir até dezembro. O documento ressalta que são tendências sazonais e que os impactos podem variar em cada região.",
      source: "painel-brasil",
    },
  ] satisfies Statement[],

  parana: [
    {
      text: "Todas as regiões do Paraná têm chuva prevista acima da média climatológica. As regiões Oeste — onde fica Cascavel — e Sudoeste são as que têm a maior diferença prevista em relação à média.",
      source: "simepar",
    },
    {
      text: "Eventos de El Niño forte a muito forte costumam favorecer tempestades capazes de produzir chuva intensa em pouco tempo, raios, rajadas de vento e, eventualmente, granizo.",
      source: "simepar",
    },
    {
      text: "Os dias em que a chuva vai ocorrer dependem dos sistemas que atuam na região, como frentes frias. Por isso, o acompanhamento diário da previsão do tempo continua indispensável.",
      source: "simepar",
    },
  ] satisfies Statement[],

  caveats: [
    {
      text: "Mesmo os episódios mais intensos de El Niño não produzem necessariamente os mesmos impactos em todas as regiões; eventos mais fortes aumentam a probabilidade dos padrões associados ao fenômeno.",
      source: "simepar",
    },
    {
      text: "Com um evento dessa magnitude, as chances de impactos típicos do El Niño são maiores, mas não garantidas.",
      source: "noaa-cpc",
    },
  ] satisfies Statement[],
} as const;

/**
 * O conteúdo deve ser revisado se passou de `maxAgeDays` desde a revisão ou se já
 * deveria ter saído o próximo boletim. Datas comparadas no fuso de Cascavel.
 */
export function isReviewOverdue(
  today: string,
  content: { reviewedAt: string; nextExpectedUpdate: string; maxAgeDays: number } = EL_NINO,
): boolean {
  const days = (Date.parse(today) - Date.parse(content.reviewedAt)) / 86_400_000;
  return days > content.maxAgeDays || today > content.nextExpectedUpdate;
}
