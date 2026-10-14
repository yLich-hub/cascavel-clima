import { describe, expect, it } from "vitest";
import {
  formatAge,
  formatDayLabel,
  formatDayLong,
  formatHour,
  formatMm,
  formatPct,
  formatTemp,
  formatTime,
  formatWindSpeed,
  windCardinal,
} from "@/lib/format";

describe("horários no fuso de Cascavel", () => {
  it("formata hora local a partir de ISO com offset", () => {
    expect(formatTime("2026-10-14T15:30-03:00")).toBe("15:30");
    expect(formatHour("2026-10-14T09:00-03:00")).toBe("09h");
  });

  it("converte instantes UTC para o horário de Cascavel", () => {
    expect(formatTime("2026-10-15T02:30:00.000Z")).toBe("23:30");
    expect(formatHour("2026-10-15T03:00:00.000Z")).toBe("00h");
  });
});

describe("rótulos de dia", () => {
  const today = "2026-10-14"; // quarta-feira

  it("usa Hoje e Amanhã", () => {
    expect(formatDayLabel("2026-10-14", today)).toBe("Hoje");
    expect(formatDayLabel("2026-10-15", today)).toBe("Amanhã");
  });

  it("usa dia da semana abreviado, sem ponto", () => {
    expect(formatDayLabel("2026-10-16", today)).toBe("Sex");
    expect(formatDayLabel("2026-10-18", today)).toBe("Dom");
  });

  it("calcula Amanhã na virada de mês", () => {
    expect(formatDayLabel("2026-11-01", "2026-10-31")).toBe("Amanhã");
  });

  it("gera nome completo para leitores de tela", () => {
    expect(formatDayLong("2026-10-14")).toBe("quarta-feira, 14/10");
  });
});

describe("números e unidades", () => {
  it("arredonda temperatura e evita -0", () => {
    expect(formatTemp(19.5)).toBe("20°");
    expect(formatTemp(-0.4)).toBe("0°");
    expect(formatTemp(-2.6)).toBe("-3°");
  });

  it("usa vírgula decimal em milímetros", () => {
    expect(formatMm(0)).toBe("0,0 mm");
    expect(formatMm(17.75)).toBe("17,8 mm");
  });

  it("formata porcentagem e vento", () => {
    expect(formatPct(87)).toBe("87%");
    expect(formatWindSpeed(4.3)).toBe("4 km/h");
  });

  it("mostra — para dado ausente, nunca 0", () => {
    expect(formatTemp(null)).toBe("—");
    expect(formatMm(null)).toBe("—");
    expect(formatPct(null)).toBe("—");
  });
});

describe("windCardinal", () => {
  it.each([
    [0, "N"],
    [22, "N"],
    [23, "NE"],
    [90, "L"],
    [180, "S"],
    [225, "SO"],
    [270, "O"],
    [345, "N"],
    [360, "N"],
    [-45, "NO"],
  ])("%i° → %s", (degrees, expected) => {
    expect(windCardinal(degrees).short).toBe(expected);
  });
});

describe("formatAge", () => {
  it.each([
    [0, "agora"],
    [8, "há 8 min"],
    [60, "há 1 h"],
    [130, "há 2 h 10 min"],
  ])("%i min → %s", (minutes, expected) => {
    expect(formatAge(minutes)).toBe(expected);
  });

  it("explica quando a idade é desconhecida", () => {
    expect(formatAge(null)).toBe("horário desconhecido");
  });
});
