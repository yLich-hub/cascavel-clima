import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EnsoUnavailableError,
  createEnsoServices,
  isDiscussionReport,
  isRoniReport,
  isWeeklyReport,
} from "@/lib/enso/service";
import { buildEnsoView, seasonEnd } from "@/lib/enso/view";
import { ProviderError } from "@/lib/providers/http";
import { parseDiscussion, parseRoni, parseWeeklyNino } from "@/lib/providers/noaa-cpc";
import { memoryStore } from "@/lib/sources/last-good-store";
import type { Loaded } from "@/lib/sources/resilient-source";
import type { DiscussionReport, RoniReport, WeeklyNinoReport } from "@/types/enso";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const weeks = parseWeeklyNino(fixture("cpc-weekly-nino.txt"));
const points = parseRoni(fixture("cpc-roni.txt"));
const discussion = parseDiscussion(fixture("cpc-ensodisc.html"));

const meta = { fetchedAt: "2026-10-20T03:00:00.000Z", sourceUrl: "https://www.cpc.ncep.noaa.gov/" };
const weeklyReport: WeeklyNinoReport = { weeks, meta };
const roniReport: RoniReport = { points, meta };
const discussionReport: DiscussionReport = { discussion, meta };

const ok = <T>(report: T, servedFrom: "live" | "fallback" = "live"): PromiseSettledResult<Loaded<T>> => ({
  status: "fulfilled",
  value: { report, servedFrom },
});
const failed: PromiseRejectedResult = { status: "rejected", reason: new Error("NOAA fora do ar") };

const all = { weekly: ok(weeklyReport), roni: ok(roniReport), discussion: ok(discussionReport) };
const at = (iso: string) => new Date(iso);

describe("seasonEnd", () => {
  it("fim do trimestre é o último dia do mês seguinte ao central", () => {
    expect(seasonEnd({ centerMonth: "2026-08" })).toBe("2026-09-30T12:00:00.000Z"); // JAS
    expect(seasonEnd({ centerMonth: "2026-12" })).toBe("2027-01-31T12:00:00.000Z"); // NDJ
    expect(seasonEnd({ centerMonth: "2026-01" })).toBe("2026-02-28T12:00:00.000Z"); // DJF
  });
});

describe("buildEnsoView", () => {
  it("em 20/10/2026 os três dados reais estão em dia", () => {
    const view = buildEnsoView(all, at("2026-10-20T12:00:00Z"));
    expect(view.weekly).toMatchObject({ available: true, servedFrom: "live", freshness: { status: "fresh" } });
    expect(view.roni).toMatchObject({ available: true, freshness: { status: "fresh" } });
    expect(view.discussion).toMatchObject({ available: true, freshness: { status: "fresh" } });
  });

  it("frescor conta da data do próprio dado, não da busca", () => {
    // Semana centrada em 14/10: 14 dias depois ainda em dia, 15 dias já atrasada.
    expect(buildEnsoView(all, at("2026-10-28T12:00:00Z")).weekly).toMatchObject({ freshness: { status: "fresh" } });
    expect(buildEnsoView(all, at("2026-10-29T12:00:00Z")).weekly).toMatchObject({ freshness: { status: "stale" } });
  });

  it("dado velho demais não é exibido (expirado)", () => {
    const view = buildEnsoView(all, at("2026-11-19T12:00:00Z")); // 36 dias após a semana de 14/10
    expect(view.weekly).toMatchObject({ available: false, reason: "expired" });
    // O boletim de 08/10 continua exibível, mas já atrasado (42 dias).
    expect(view.discussion).toMatchObject({ available: true, freshness: { status: "stale" } });
  });

  it("uma parte indisponível não derruba as outras", () => {
    const view = buildEnsoView({ ...all, discussion: failed }, at("2026-10-20T12:00:00Z"));
    expect(view.discussion).toEqual({ available: false, reason: "unavailable" });
    expect(view.weekly.available).toBe(true);
    expect(view.roni.available).toBe(true);
  });

  it("repassa quando o dado veio do último dado bom", () => {
    const view = buildEnsoView({ ...all, roni: ok(roniReport, "fallback") }, at("2026-10-20T12:00:00Z"));
    expect(view.roni).toMatchObject({ available: true, servedFrom: "fallback" });
  });
});

describe("createEnsoServices", () => {
  const quiet = { sleep: async () => {}, log: () => {}, now: () => at("2026-10-20T03:00:00Z") };

  it("busca e carimba a fonte e o horário da busca", async () => {
    const services = createEnsoServices({
      ...quiet,
      fetchWeekly: async () => weeks,
      stores: { weekly: memoryStore() },
    });
    const { report, servedFrom } = await services.weekly.load();
    expect(servedFrom).toBe("live");
    expect(report.meta).toEqual({
      fetchedAt: "2026-10-20T03:00:00.000Z",
      sourceUrl: "https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for",
    });
  });

  it("formato mudou: usa o último dado bom guardado", async () => {
    const services = createEnsoServices({
      ...quiet,
      fetchDiscussion: async () => {
        throw new ProviderError("invalid-response", "situação desconhecida");
      },
      stores: { discussion: memoryStore(discussionReport) },
    });
    const result = await services.discussion.load();
    expect(result).toEqual({ report: discussionReport, servedFrom: "fallback" });
  });

  it("sem dado anterior: erro explícito, nunca dado inventado", async () => {
    const services = createEnsoServices({
      ...quiet,
      fetchRoni: async () => {
        throw new ProviderError("http", "HTTP 503", 503);
      },
      stores: { roni: memoryStore() },
    });
    const error = await services.roni.load().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EnsoUnavailableError);
    expect((error as EnsoUnavailableError).providerError.kind).toBe("http");
  });
});

describe("validação do que volta do cache", () => {
  it("aceita os relatórios atuais e recusa formatos inesperados", () => {
    expect(isWeeklyReport(weeklyReport)).toBe(true);
    expect(isRoniReport(roniReport)).toBe(true);
    expect(isDiscussionReport(discussionReport)).toBe(true);
    for (const value of [null, {}, { meta }, { weeks: [], meta }, "texto"]) {
      expect(isWeeklyReport(value)).toBe(false);
      expect(isRoniReport(value)).toBe(false);
      expect(isDiscussionReport(value)).toBe(false);
    }
  });
});
