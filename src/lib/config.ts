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
