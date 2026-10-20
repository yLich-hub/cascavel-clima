import { describe, expect, it } from "vitest";
import {
  ProviderError,
  buildOpenMeteoUrl,
  fetchOpenMeteo,
  parseOpenMeteoResponse,
} from "@/lib/providers/open-meteo";
import fixture from "./fixtures/open-meteo-cascavel.json";

/** Cópia mutável da resposta real capturada em 2026-10-14. */
const sample = () => structuredClone(fixture) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function expectInvalid(json: unknown) {
  try {
    parseOpenMeteoResponse(json);
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe("invalid-response");
    expect((error as ProviderError).retryable).toBe(false);
    return;
  }
  throw new Error("esperava resposta inválida");
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("buildOpenMeteoUrl", () => {
  it("pede coordenadas, fuso e unidades explicitamente", () => {
    const url = new URL(buildOpenMeteoUrl());
    expect(url.origin).toBe("https://api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe("-24.95583");
    expect(url.searchParams.get("longitude")).toBe("-53.45528");
    expect(url.searchParams.get("timezone")).toBe("America/Sao_Paulo");
    expect(url.searchParams.get("temperature_unit")).toBe("celsius");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
    expect(url.searchParams.get("precipitation_unit")).toBe("mm");
    expect(url.searchParams.get("forecast_days")).toBe("7");
    // Horas dos 7 dias inteiros (detalhe do dia); sem recorte de 24 h no provedor.
    expect(url.searchParams.has("forecast_hours")).toBe(false);
  });

  it("não envia nenhuma chave de API", () => {
    expect(buildOpenMeteoUrl()).not.toMatch(/key|token|apikey/i);
  });
});

describe("parseOpenMeteoResponse", () => {
  it("aceita a resposta real capturada", () => {
    const parsed = parseOpenMeteoResponse(sample());
    expect(parsed.hourly.time).toHaveLength(24);
    expect(parsed.daily.time).toHaveLength(7);
  });

  it("aceita null em séries horárias (provedor sem o dado)", () => {
    const json = sample();
    json.hourly.precipitation_probability[5] = null;
    expect(parseOpenMeteoResponse(json).hourly.precipitation_probability[5]).toBeNull();
  });

  it("rejeita unidade diferente da pedida em vez de converter", () => {
    const json = sample();
    json.current_units.temperature_2m = "°F";
    expectInvalid(json);
  });

  it("rejeita velocidade do vento em outra unidade", () => {
    const json = sample();
    json.current_units.wind_speed_10m = "m/s";
    expectInvalid(json);
  });

  it("rejeita fuso diferente de America/Sao_Paulo", () => {
    const json = sample();
    json.timezone = "GMT";
    expectInvalid(json);
  });

  it("rejeita condição atual sem temperatura", () => {
    const json = sample();
    delete json.current.temperature_2m;
    expectInvalid(json);
  });

  it("rejeita condição atual com temperatura null", () => {
    const json = sample();
    json.current.temperature_2m = null;
    expectInvalid(json);
  });

  it("rejeita séries com tamanhos diferentes", () => {
    const json = sample();
    json.hourly.temperature_2m.pop();
    expectInvalid(json);
  });

  it("rejeita séries vazias", () => {
    const json = sample();
    for (const key of Object.keys(json.daily)) json.daily[key] = [];
    expectInvalid(json);
  });

  it("rejeita valores fisicamente impossíveis", () => {
    const json = sample();
    json.current.relative_humidity_2m = 150;
    expectInvalid(json);
  });

  it("rejeita horário em formato inesperado", () => {
    const json = sample();
    json.current.time = "14/10/2026 15:15";
    expectInvalid(json);
  });

  it("rejeita corpo que não é objeto", () => {
    expectInvalid(null);
    expectInvalid("erro");
  });
});

describe("fetchOpenMeteo", () => {
  async function errorFrom(fetchImpl: typeof fetch, timeoutMs?: number) {
    try {
      await fetchOpenMeteo({ fetchImpl, timeoutMs });
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      return error as ProviderError;
    }
    throw new Error("esperava erro");
  }

  it("devolve a resposta validada em caso de sucesso", async () => {
    const data = await fetchOpenMeteo({ fetchImpl: async () => jsonResponse(sample()) });
    expect(data.current.time).toBe(fixture.current.time);
  });

  it("classifica HTTP 500 como erro que vale repetir", async () => {
    const error = await errorFrom(async () => jsonResponse({ error: true }, 500));
    expect(error.kind).toBe("http");
    expect(error.status).toBe(500);
    expect(error.retryable).toBe(true);
  });

  it("classifica HTTP 429 (limite) como erro que vale repetir", async () => {
    const error = await errorFrom(async () => jsonResponse({ error: true }, 429));
    expect(error.retryable).toBe(true);
  });

  it("classifica HTTP 400 como erro nosso, sem repetir", async () => {
    const error = await errorFrom(async () => jsonResponse({ error: true, reason: "x" }, 400));
    expect(error.kind).toBe("http");
    expect(error.retryable).toBe(false);
  });

  it("classifica corpo não-JSON como resposta inválida", async () => {
    const error = await errorFrom(async () => new Response("<html>manutenção</html>"));
    expect(error.kind).toBe("invalid-response");
  });

  it("classifica falha de rede", async () => {
    const error = await errorFrom(async () => {
      throw new TypeError("fetch failed");
    });
    expect(error.kind).toBe("network");
    expect(error.retryable).toBe(true);
  });

  it("aborta após o timeout", async () => {
    const neverResponds: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    const error = await errorFrom(neverResponds, 20);
    expect(error.kind).toBe("timeout");
    expect(error.retryable).toBe(true);
  });
});

describe("campos do novo visual (vento por hora, sol, UV)", () => {
  it("pede vento por hora, nascer/pôr do sol e UV máximo", () => {
    const url = new URL(buildOpenMeteoUrl());
    expect(url.searchParams.get("hourly")).toContain("wind_speed_10m");
    const daily = url.searchParams.get("daily")!.split(",");
    expect(daily).toEqual(expect.arrayContaining(["sunrise", "sunset", "uv_index_max"]));
  });

  it("rejeita vento por hora em outra unidade", () => {
    const json = sample();
    json.hourly_units.wind_speed_10m = "m/s";
    expectInvalid(json);
  });

  it("rejeita UV com unidade inesperada ou valor impossível", () => {
    const withUnit = sample();
    withUnit.daily_units.uv_index_max = "%";
    expectInvalid(withUnit);

    const tooHigh = sample();
    tooHigh.daily.uv_index_max[0] = 40;
    expectInvalid(tooHigh);
  });

  it("rejeita nascer do sol em formato inesperado", () => {
    const json = sample();
    json.daily.sunrise[0] = "06:00";
    expectInvalid(json);
  });

  it("aceita null em nascer/pôr do sol e UV (provedor sem o dado)", () => {
    const json = sample();
    json.daily.sunrise[1] = null;
    json.daily.uv_index_max[1] = null;
    json.hourly.wind_speed_10m[2] = null;
    const parsed = parseOpenMeteoResponse(json);
    expect(parsed.daily.sunrise[1]).toBeNull();
    expect(parsed.daily.uv_index_max[1]).toBeNull();
    expect(parsed.hourly.wind_speed_10m[2]).toBeNull();
  });
});
