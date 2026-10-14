import { describe, expect, it } from "vitest";
import { parseOpenMeteoResponse } from "@/lib/providers/open-meteo";
import { buildWeatherView, classifyAge, localDate } from "@/lib/weather/freshness";
import { normalizeOpenMeteo } from "@/lib/weather/normalize";
import fixture from "./fixtures/open-meteo-cascavel.json";

// Fixture: condições das 15:15 locais (18:15 UTC), horas de 15:00 do dia 14
// até 14:00 do dia 15, dias de 14 a 20/10/2026. Buscado às 18:20 UTC.
const FETCHED_AT = new Date("2026-10-14T18:20:00Z");
const result = {
  report: normalizeOpenMeteo(parseOpenMeteoResponse(structuredClone(fixture)), FETCHED_AT),
  servedFrom: "live" as const,
};
const at = (minutesAfterFetch: number) =>
  new Date(FETCHED_AT.getTime() + minutesAfterFetch * 60_000);

const RULE = { staleAfterMin: 30, expiredAfterMin: 180 };
const REF = "2026-10-14T15:00-03:00"; // 18:00 UTC
const minutesAfterRef = (m: number) => new Date(Date.parse(REF) + m * 60_000);

describe("classifyAge", () => {
  it.each([
    [0, "fresh"],
    [30, "fresh"],
    [31, "stale"],
    [180, "stale"],
    [181, "expired"],
  ])("%i min → %s", (minutes, status) => {
    const freshness = classifyAge(REF, minutesAfterRef(minutes), RULE);
    expect(freshness.status).toBe(status);
    expect(freshness.ageMinutes).toBe(minutes);
  });

  it("trata horário inválido como expirado", () => {
    expect(classifyAge("ontem", new Date(), RULE)).toEqual({
      status: "expired",
      ageMinutes: null,
      referenceTime: "ontem",
    });
  });

  it("trata horário no futuro (relógio adiantado) como idade zero", () => {
    expect(classifyAge(REF, minutesAfterRef(-10), RULE)).toMatchObject({
      status: "fresh",
      ageMinutes: 0,
    });
  });
});

describe("localDate", () => {
  it("usa o dia de Cascavel, não o dia UTC", () => {
    // 02:30 UTC do dia 15 = 23:30 do dia 14 em Cascavel.
    expect(localDate(new Date("2026-10-15T02:30:00Z"))).toBe("2026-10-14");
    expect(localDate(new Date("2026-10-15T03:00:00Z"))).toBe("2026-10-15");
  });
});

describe("buildWeatherView", () => {
  it("logo após a busca: tudo fresco e completo", () => {
    const view = buildWeatherView(result, at(0));
    expect(view.freshness.current).toMatchObject({ status: "fresh", ageMinutes: 5 });
    expect(view.freshness.forecast).toMatchObject({ status: "fresh", ageMinutes: 0 });
    expect(view.current).not.toBeNull();
    // 15:20 local: o ponto das 15:00 (chuva de 14–15h) já passou; o primeiro é o das 16:00.
    expect(view.hourly[0].time).toBe("2026-10-14T16:00-03:00");
    expect(view.hourly).toHaveLength(23);
    expect(view.daily).toHaveLength(7);
    expect(view.servedFrom).toBe("live");
  });

  it("2 h depois: atual fica 'velho' e horas encerradas saem da lista", () => {
    const view = buildWeatherView(result, at(120)); // 17:20 local
    expect(view.freshness.current.status).toBe("stale");
    expect(view.freshness.forecast.status).toBe("fresh");
    expect(view.current).not.toBeNull();
    expect(view.hourly[0].time).toBe("2026-10-14T18:00-03:00");
    expect(view.hourly).toHaveLength(21);
  });

  it("exatamente na hora cheia, o ponto daquela hora já é passado", () => {
    const view = buildWeatherView(result, new Date("2026-10-14T19:00:00Z")); // 16:00 local
    expect(view.hourly[0].time).toBe("2026-10-14T17:00-03:00");
  });

  it("4 h depois: condições atuais expiram e não são exibidas", () => {
    const view = buildWeatherView(result, at(240));
    expect(view.freshness.current.status).toBe("expired");
    expect(view.current).toBeNull();
    expect(view.hourly.length).toBeGreaterThan(0);
  });

  it("7 h depois: previsão fica 'velha' mas ainda é exibida", () => {
    const view = buildWeatherView(result, at(420));
    expect(view.freshness.forecast.status).toBe("stale");
    expect(view.daily.length).toBeGreaterThan(0);
  });

  it("25 h depois: previsão expira e nada é exibido", () => {
    const view = buildWeatherView(result, at(25 * 60));
    expect(view.freshness.forecast.status).toBe("expired");
    expect(view.current).toBeNull();
    expect(view.hourly).toEqual([]);
    expect(view.daily).toEqual([]);
  });

  it("perto da meia-noite mantém o dia local, mesmo já sendo outro dia em UTC", () => {
    const view = buildWeatherView(result, new Date("2026-10-15T02:30:00Z")); // 23:30 local
    expect(view.daily[0].date).toBe("2026-10-14");
    expect(view.hourly[0].time).toBe("2026-10-15T00:00-03:00");
  });

  it("no dia seguinte remove o dia que já passou", () => {
    const view = buildWeatherView(result, new Date("2026-10-15T03:30:00Z")); // 00:30 local
    expect(view.daily[0].date).toBe("2026-10-15");
    expect(view.daily).toHaveLength(6);
  });

  it("propaga a origem 'fallback' para a interface poder avisar", () => {
    const view = buildWeatherView({ ...result, servedFrom: "fallback" }, at(0));
    expect(view.servedFrom).toBe("fallback");
  });
});
