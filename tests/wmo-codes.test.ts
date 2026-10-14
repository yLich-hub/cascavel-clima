import { describe, expect, it } from "vitest";
import { describeWeatherCode } from "@/lib/weather/wmo-codes";

// Lista de códigos documentada em https://open-meteo.com/en/docs
const DOCUMENTED_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
  95, 96, 97, 99,
];

describe("describeWeatherCode", () => {
  it("tem descrição em português para todos os códigos documentados", () => {
    for (const code of DOCUMENTED_CODES) {
      const { label, icon } = describeWeatherCode(code);
      expect(icon, `código ${code}`).not.toBe("unknown");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("não adivinha códigos fora da tabela", () => {
    expect(describeWeatherCode(42)).toEqual({ label: "Condição não reconhecida", icon: "unknown" });
  });

  it("indica ausência de dado", () => {
    expect(describeWeatherCode(null)).toEqual({ label: "Sem informação", icon: "unknown" });
  });
});
