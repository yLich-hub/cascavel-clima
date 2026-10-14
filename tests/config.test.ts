import { describe, expect, it } from "vitest";
import { FRESHNESS, LOCATION, OFFICIAL_ALERT_SOURCES } from "@/lib/config";

describe("config", () => {
  it("aponta para Cascavel no oeste do Paraná, não para o homônimo de Guarapuava", () => {
    expect(LOCATION.lat).toBeCloseTo(-24.956, 2);
    expect(LOCATION.lon).toBeCloseTo(-53.455, 2);
    expect(LOCATION.timezone).toBe("America/Sao_Paulo");
  });

  it("tem limites de frescor em ordem crescente", () => {
    for (const rule of Object.values(FRESHNESS)) {
      expect(rule.staleAfterMin).toBeGreaterThan(0);
      expect(rule.expiredAfterMin).toBeGreaterThan(rule.staleAfterMin);
    }
  });

  it("usa apenas HTTPS nas fontes oficiais", () => {
    for (const source of OFFICIAL_ALERT_SOURCES) {
      expect(source.url.startsWith("https://")).toBe(true);
    }
  });
});
