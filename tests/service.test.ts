import { describe, expect, it } from "vitest";
import {
  ProviderError,
  parseOpenMeteoResponse,
  type OpenMeteoResponse,
} from "@/lib/providers/open-meteo";
import {
  isWeatherReport,
  memoryStore,
  runtimeCacheStore,
  type LastGoodStore,
} from "@/lib/weather/last-good-store";
import { normalizeOpenMeteo } from "@/lib/weather/normalize";
import { WeatherUnavailableError, createWeatherService } from "@/lib/weather/service";
import fixture from "./fixtures/open-meteo-cascavel.json";

const raw = () => parseOpenMeteoResponse(structuredClone(fixture));

/** Provedor falso que responde, em ordem, cada item do roteiro. */
function scriptedProvider(script: Array<OpenMeteoResponse | Error>) {
  let calls = 0;
  const fetchRaw = async () => {
    const step = script[calls++];
    if (step === undefined) throw new Error("roteiro esgotado");
    if (step instanceof Error) throw step;
    return step;
  };
  return { fetchRaw, calls: () => calls };
}

function setup(script: Array<OpenMeteoResponse | Error>, store: LastGoodStore = memoryStore()) {
  const provider = scriptedProvider(script);
  const logs: string[] = [];
  const sleeps: number[] = [];
  let clock = new Date("2026-10-14T18:20:00Z");
  const service = createWeatherService({
    fetchRaw: provider.fetchRaw,
    now: () => clock,
    sleep: async (ms) => void sleeps.push(ms),
    log: (message) => void logs.push(message),
    store,
  });
  return {
    service,
    calls: provider.calls,
    logs,
    sleeps,
    advance: (minutes: number) => (clock = new Date(clock.getTime() + minutes * 60_000)),
  };
}

const http = (status: number) => new ProviderError("http", `HTTP ${status}`, status);
const timeout = () => new ProviderError("timeout", "sem resposta em 8000 ms");
const invalid = () => new ProviderError("invalid-response", "campo ausente");

describe("weather service", () => {
  it("devolve dado ao vivo com o horário da busca", async () => {
    const { service, calls } = setup([raw()]);
    const result = await service.load();
    expect(result.servedFrom).toBe("live");
    expect(result.report.meta.fetchedAt).toBe("2026-10-14T18:20:00.000Z");
    expect(calls()).toBe(1);
  });

  it("repete uma vez após timeout e aceita a segunda resposta", async () => {
    const { service, calls, sleeps } = setup([timeout(), raw()]);
    const result = await service.load();
    expect(result.servedFrom).toBe("live");
    expect(calls()).toBe(2);
    expect(sleeps).toEqual([500]);
  });

  it("repete uma vez após HTTP 500, mas não insiste além disso", async () => {
    const { service, calls } = setup([http(500), http(500), raw()]);
    await expect(service.load()).rejects.toBeInstanceOf(WeatherUnavailableError);
    expect(calls()).toBe(2);
  });

  it("não repete em HTTP 400 (erro nosso)", async () => {
    const { service, calls } = setup([http(400), raw()]);
    await expect(service.load()).rejects.toBeInstanceOf(WeatherUnavailableError);
    expect(calls()).toBe(1);
  });

  it("não repete em resposta inválida", async () => {
    const { service, calls } = setup([invalid(), raw()]);
    await expect(service.load()).rejects.toBeInstanceOf(WeatherUnavailableError);
    expect(calls()).toBe(1);
  });

  it("sem dado anterior, falha com erro explícito (nunca dado inventado)", async () => {
    const { service } = setup([timeout(), timeout()]);
    const error = await service.load().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WeatherUnavailableError);
    expect((error as WeatherUnavailableError).providerError.kind).toBe("timeout");
  });

  it("com dado anterior, devolve o último dado bom marcado como fallback, com a idade real", async () => {
    const { service, advance, logs } = setup([raw(), http(503), http(503)]);
    const first = await service.load();
    advance(40);
    const second = await service.load();
    expect(second.servedFrom).toBe("fallback");
    expect(second.report).toEqual(first.report);
    // fetchedAt continua sendo o da busca original, não o momento do fallback
    expect(second.report.meta.fetchedAt).toBe("2026-10-14T18:20:00.000Z");
    expect(logs.some((line) => line.includes("provedor falhou (http)"))).toBe(true);
  });

  it("volta a servir dado ao vivo quando o provedor se recupera", async () => {
    const { service, advance } = setup([raw(), invalid(), raw()]);
    await service.load();
    advance(10);
    expect((await service.load()).servedFrom).toBe("fallback");
    advance(10);
    const recovered = await service.load();
    expect(recovered.servedFrom).toBe("live");
    expect(recovered.report.meta.fetchedAt).toBe("2026-10-14T18:40:00.000Z");
  });

  it("trata exceção desconhecida como falha de rede", async () => {
    const { service } = setup([new TypeError("fetch failed"), new TypeError("fetch failed")]);
    const error = (await service.load().catch((e: unknown) => e)) as WeatherUnavailableError;
    expect(error.providerError.kind).toBe("network");
  });
});

describe("último dado bom compartilhado (Runtime Cache)", () => {
  const report = (fetchedAt: string) => normalizeOpenMeteo(raw(), new Date(fetchedAt));

  it("grava no store a cada busca bem-sucedida", async () => {
    const store = memoryStore();
    const { service } = setup([raw()], store);
    await service.load();
    expect((await store.get())?.meta.fetchedAt).toBe("2026-10-14T18:20:00.000Z");
  });

  it("instância nova, sem memória, usa o dado gravado por outra instância", async () => {
    // Cenário da Vercel: a instância que buscou o dado já foi descartada.
    const store = memoryStore(report("2026-10-14T17:00:00Z"));
    const { service } = setup([http(503), http(503)], store);
    const result = await service.load();
    expect(result.servedFrom).toBe("fallback");
    expect(result.report.meta.fetchedAt).toBe("2026-10-14T17:00:00.000Z");
  });

  it("entre memória e store, usa o dado mais recente", async () => {
    const store = memoryStore();
    const { service, advance } = setup([raw(), http(503), http(503)], store);
    await service.load(); // memória e store: 18:20
    await store.set(report("2026-10-14T18:50:00Z")); // outra instância gravou algo mais novo
    advance(40);
    const result = await service.load();
    expect(result.report.meta.fetchedAt).toBe("2026-10-14T18:50:00.000Z");
  });

  it("falha ao gravar no store não derruba a resposta ao vivo", async () => {
    const broken: LastGoodStore = {
      get: async () => null,
      set: async () => {
        throw new Error("runtime cache fora do ar");
      },
    };
    const { service, logs } = setup([raw()], broken);
    expect((await service.load()).servedFrom).toBe("live");
    expect(logs.some((line) => line.includes("não foi possível gravar"))).toBe(true);
  });

  it("falha ao ler o store com provedor fora do ar resulta em 'indisponível', sem travar", async () => {
    const broken: LastGoodStore = {
      get: async () => {
        throw new Error("runtime cache fora do ar");
      },
      set: async () => {},
    };
    const { service, logs } = setup([timeout(), timeout()], broken);
    await expect(service.load()).rejects.toBeInstanceOf(WeatherUnavailableError);
    expect(logs.some((line) => line.includes("não foi possível ler"))).toBe(true);
  });
});

describe("isWeatherReport", () => {
  it("aceita um relatório normalizado", () => {
    expect(isWeatherReport(normalizeOpenMeteo(raw(), new Date()))).toBe(true);
  });

  it.each([null, "texto", 42, {}, { meta: { fetchedAt: "x" } }])(
    "rejeita dado em formato inesperado: %j",
    (value) => {
      expect(isWeatherReport(value)).toBe(false);
    },
  );
});

describe("runtimeCacheStore (getCache real, em memória fora da Vercel)", () => {
  it("grava e lê de volta o relatório", async () => {
    const store = runtimeCacheStore();
    const report = normalizeOpenMeteo(raw(), new Date("2026-10-14T18:20:00Z"));
    await store.set(report);
    expect(await store.get()).toEqual(report);
  });
});
