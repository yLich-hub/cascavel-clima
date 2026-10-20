import "server-only";
import { ENSO_FRESHNESS_DAYS } from "@/lib/config";
import type { ProviderError } from "@/lib/providers/http";
import {
  CPC_URLS,
  fetchDiscussion,
  fetchRoni,
  fetchWeeklyNino,
} from "@/lib/providers/noaa-cpc";
import {
  runtimeCacheStore,
  type LastGoodStore,
} from "@/lib/sources/last-good-store";
import { createResilientSource, type ResilientSourceDeps } from "@/lib/sources/resilient-source";
import type {
  DiscussionReport,
  EnsoDiscussion,
  RoniPoint,
  RoniReport,
  WeeklyNino,
  WeeklyNinoReport,
} from "@/types/enso";

/** Uma parte dos dados do El Niño sem dado novo nem anterior. */
export class EnsoUnavailableError extends Error {
  constructor(
    readonly part: string,
    readonly providerError: ProviderError,
  ) {
    super(`El Niño (${part}) indisponível (${providerError.kind}): ${providerError.message}`);
    this.name = "EnsoUnavailableError";
  }
}

// --- Validação do que volta do Runtime Cache ----------------------------------

/** Mude ao alterar o formato dos relatórios abaixo: dados antigos passam a ser ignorados. */
export const ENSO_SCHEMA_VERSION = 1;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const hasMeta = (value: Record<string, unknown>) =>
  isObject(value.meta) && typeof value.meta.fetchedAt === "string" && typeof value.meta.sourceUrl === "string";

export const isWeeklyReport = (value: unknown): value is WeeklyNinoReport =>
  isObject(value) &&
  hasMeta(value) &&
  Array.isArray(value.weeks) &&
  value.weeks.length > 0 &&
  value.weeks.every((week) => isObject(week) && typeof week.weekCenter === "string" && isObject(week.regions));

export const isRoniReport = (value: unknown): value is RoniReport =>
  isObject(value) &&
  hasMeta(value) &&
  Array.isArray(value.points) &&
  value.points.length > 0 &&
  value.points.every((point) => isObject(point) && typeof point.anomalyC === "number");

export const isDiscussionReport = (value: unknown): value is DiscussionReport =>
  isObject(value) &&
  hasMeta(value) &&
  isObject(value.discussion) &&
  typeof value.discussion.issuedOn === "string" &&
  Array.isArray(value.discussion.statuses);

const DAY_SECONDS = 24 * 60 * 60;
const store = <T>(name: string, ttlDays: number, isValid: (value: unknown) => value is T) =>
  runtimeCacheStore<T>({
    key: `enso-${name}-last-good-v${ENSO_SCHEMA_VERSION}`,
    // Depois de expirado o dado não é exibido, então não vale guardar mais que isso.
    ttlSeconds: ttlDays * DAY_SECONDS,
    isValid,
  });

// --- Serviços -----------------------------------------------------------------

type Shared = Partial<Pick<ResilientSourceDeps<unknown, unknown>, "now" | "sleep" | "maxRetries" | "retryDelayMs" | "log">>;

type Deps = Shared & {
  fetchWeekly?: () => Promise<WeeklyNino[]>;
  fetchRoni?: () => Promise<RoniPoint[]>;
  fetchDiscussion?: () => Promise<EnsoDiscussion>;
  stores?: {
    weekly?: LastGoodStore<WeeklyNinoReport>;
    roni?: LastGoodStore<RoniReport>;
    discussion?: LastGoodStore<DiscussionReport>;
  };
};

const meta = (fetchedAt: Date, sourceUrl: string) => ({ fetchedAt: fetchedAt.toISOString(), sourceUrl });
const fetchedAtOf = (report: { meta: { fetchedAt: string } }) => report.meta.fetchedAt;

/**
 * Três fontes independentes do NOAA CPC, cada uma com retentativa e último
 * dado bom (ver createResilientSource). Uma falhar não derruba as outras.
 */
export function createEnsoServices({
  fetchWeekly = () => fetchWeeklyNino(),
  fetchRoni: fetchRoniRaw = () => fetchRoni(),
  fetchDiscussion: fetchDiscussionRaw = () => fetchDiscussion(),
  stores = {},
  ...shared
}: Deps = {}) {
  return {
    weekly: createResilientSource<WeeklyNino[], WeeklyNinoReport>({
      name: "enso-semanal",
      fetchRaw: fetchWeekly,
      normalize: (weeks, at) => ({ weeks, meta: meta(at, CPC_URLS.weekly) }),
      fetchedAtOf,
      unavailable: (error) => new EnsoUnavailableError("semanal", error),
      store: stores.weekly ?? store("weekly", ENSO_FRESHNESS_DAYS.weekly.expiredAfter, isWeeklyReport),
      ...shared,
    }),
    roni: createResilientSource<RoniPoint[], RoniReport>({
      name: "enso-roni",
      fetchRaw: fetchRoniRaw,
      normalize: (points, at) => ({ points, meta: meta(at, CPC_URLS.roni) }),
      fetchedAtOf,
      unavailable: (error) => new EnsoUnavailableError("RONI", error),
      store: stores.roni ?? store("roni", ENSO_FRESHNESS_DAYS.roni.expiredAfter, isRoniReport),
      ...shared,
    }),
    discussion: createResilientSource<EnsoDiscussion, DiscussionReport>({
      name: "enso-boletim",
      fetchRaw: fetchDiscussionRaw,
      normalize: (discussion, at) => ({ discussion, meta: meta(at, CPC_URLS.discussion) }),
      fetchedAtOf,
      unavailable: (error) => new EnsoUnavailableError("boletim", error),
      store: stores.discussion ?? store("discussion", ENSO_FRESHNESS_DAYS.discussion.expiredAfter, isDiscussionReport),
      ...shared,
    }),
  };
}

export const ensoServices = createEnsoServices();
