/**
 * Configuração central do projeto. Valores verificados em 2026-10-14
 * (ver "Verificações da Etapa 0" no README).
 */

export const LOCATION = {
  name: "Cascavel",
  state: "PR",
  // GeoNames 3466779 via geocoding do Open-Meteo. Atenção: existe outro
  // "Cascavel" no PR (distrito de Guarapuava, -25.4/-51.53) — não é este.
  lat: -24.95583,
  lon: -53.45528,
  elevationM: 786,
  timezone: "America/Sao_Paulo",
} as const;

/** Por quanto tempo uma resposta do provedor é reaproveitada antes de buscar de novo. */
export const CACHE_TTL_SECONDS = 10 * 60;

/** Limites de "frescor" do dado, em minutos (seção 5 da proposta). */
export const FRESHNESS = {
  current: { staleAfterMin: 30, expiredAfterMin: 3 * 60 },
  forecast: { staleAfterMin: 6 * 60, expiredAfterMin: 24 * 60 },
} as const;

export const PROVIDER_TIMEOUT_MS = 8_000;
export const PROVIDER_MAX_RETRIES = 1;

export const ATTRIBUTION = {
  openMeteo: {
    text: "Weather data by Open-Meteo.com",
    url: "https://open-meteo.com/",
    license: "CC BY 4.0",
    licenseUrl: "https://open-meteo.com/en/licence",
  },
} as const;

/** Fontes oficiais de alerta. Este site não emite nem interpreta alertas. */
export const OFFICIAL_ALERT_SOURCES = [
  { name: "INMET — Avisos meteorológicos", url: "https://avisos.inmet.gov.br/" },
  { name: "Defesa Civil do Paraná", url: "https://www.defesacivil.pr.gov.br/" },
  {
    name: "Alertas da Defesa Civil por SMS (envie seu CEP para 40199)",
    url: "https://www.parana.pr.gov.br/servicos/Seguranca/Defesa-Civil/Receber-alertas-da-Defesa-Civil-por-SMS-ERrZ4PN6",
  },
] as const;

/**
 * Dados do El Niño (NOAA CPC). Mudam devagar: semanal e mensal. Buscar a cada
 * 6 h basta para mostrar um dado novo poucas horas depois de publicado.
 */
export const ENSO_CACHE_TTL_SECONDS = 6 * 60 * 60;

/**
 * Frescor dos dados do El Niño, em dias, contados a partir da data do PRÓPRIO
 * dado (não de quando buscamos): o centro da semana, o fim do trimestre e a
 * data do boletim. Folgas pensadas no ritmo normal de publicação do CPC:
 * - semanal: sai ~5 dias após o centro da semana; 14 dias = perdeu uma semana;
 * - RONI: sai até ~10 dias após o fim do trimestre; 45 dias = perdeu um mês;
 * - boletim: sai uma vez por mês; 40 dias = atrasou.
 * Expirado = não exibir o valor.
 */
export const ENSO_FRESHNESS_DAYS = {
  weekly: { staleAfter: 14, expiredAfter: 35 },
  roni: { staleAfter: 45, expiredAfter: 100 },
  discussion: { staleAfter: 40, expiredAfter: 75 },
} as const;
