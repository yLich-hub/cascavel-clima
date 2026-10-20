import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeatherScene } from "@/components/scene/WeatherScene";
import { seededRandom } from "@/components/scene/random";
import { sceneFor } from "@/lib/weather/scenes";

// Mesma lista de tests/wmo-codes.test.ts (documentação do Open-Meteo).
const DOCUMENTED_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
  95, 96, 97, 99,
];

describe("sceneFor", () => {
  it.each([
    [0, "clear"],
    [1, "clear"],
    [2, "partly-cloudy"],
    [3, "cloudy"],
    [45, "fog"],
    [53, "drizzle"],
    [63, "rain"],
    [81, "rain"],
    [66, "rain"],
    [95, "storm"],
    [99, "storm"],
    [73, "snow"],
  ])("código %i → cena %s", (code, id) => {
    expect(sceneFor(code, true).id).toBe(id);
  });

  it("todo código documentado tem uma cena (nunca cai em 'indisponível')", () => {
    for (const code of DOCUMENTED_CODES) {
      expect(sceneFor(code, true).id, `código ${code}`).not.toBe("unavailable");
    }
  });

  it("sem dado (código null) usa a cena neutra, sem sol, chuva ou raios", () => {
    const scene = sceneFor(null, true);
    expect(scene).toMatchObject({ id: "unavailable", sun: false, moon: false, rain: 0, lightning: false });
    expect(scene.clouds.count).toBe(0);
  });

  it("céu limpo: sol de dia, lua e estrelas à noite", () => {
    expect(sceneFor(0, true)).toMatchObject({ sun: true, moon: false, stars: false, isNight: false });
    expect(sceneFor(0, false)).toMatchObject({ sun: false, moon: true, stars: true, isNight: true });
  });

  it("dia desconhecido (null) é tratado como dia", () => {
    expect(sceneFor(0, null).sun).toBe(true);
  });

  it("céu da noite é diferente do céu do dia", () => {
    expect(sceneFor(63, false).sky).not.toEqual(sceneFor(63, true).sky);
  });

  it("intensidade da chuva acompanha o código", () => {
    expect([61, 63, 65].map((code) => sceneFor(code, true).rain)).toEqual([1, 2, 3]);
    expect([80, 81, 82].map((code) => sceneFor(code, true).rain)).toEqual([1, 2, 3]);
    expect(sceneFor(51, true).rain).toBe(1);
  });

  it("só trovoada tem raios", () => {
    for (const code of DOCUMENTED_CODES) {
      expect(sceneFor(code, true).lightning, `código ${code}`).toBe(code >= 95);
    }
  });

  it("chuva: nuvens cinza de dia e escuras à noite", () => {
    expect(sceneFor(61, true).clouds.tone).toBe("gray");
    expect(sceneFor(61, false).clouds.tone).toBe("dark");
  });

  it("trovoada: chuva forte e nuvens escuras", () => {
    expect(sceneFor(95, true)).toMatchObject({ rain: 3, clouds: { tone: "dark" } });
  });

  it("neve usa partículas de neve, não de chuva", () => {
    expect(sceneFor(75, true)).toMatchObject({ snow: 3, rain: 0 });
  });
});

describe("WeatherScene (renderização no servidor)", () => {
  const html = (code: number | null, isDay = true) =>
    renderToStaticMarkup(<WeatherScene scene={sceneFor(code, isDay)} />);

  it("é decorativa para leitores de tela", () => {
    expect(html(0)).toMatch(/^<div aria-hidden="true" data-scene="clear"/);
  });

  it("céu limpo de dia desenha o sol e nenhuma chuva", () => {
    const markup = html(0);
    expect(markup).toContain("scene-sun");
    expect(markup).not.toContain("<canvas");
  });

  it("chuva desenha o canvas de partículas", () => {
    expect(html(63)).toContain('data-precipitation="rain"');
    expect(html(73)).toContain('data-precipitation="snow"');
  });

  it("noite limpa tem lua e estrelas", () => {
    const markup = html(0, false);
    expect(markup).toContain("scene-moon");
    expect(markup.match(/scene-star/g)?.length).toBe(48);
  });

  it("nuvens na quantidade da cena", () => {
    expect(html(3).match(/class="scene-cloud"/g)?.length).toBe(sceneFor(3, true).clouds.count);
  });

  it("nenhum raio na primeira renderização (só aparecem depois, no navegador)", () => {
    expect(html(95)).not.toContain("scene-flash");
  });

  it("é determinística: mesmo HTML no servidor e no navegador (sem erro de hidratação)", () => {
    expect(html(95)).toBe(html(95));
    expect(html(2, false)).toBe(html(2, false));
  });

  it("sempre tem a camada de contraste para o texto", () => {
    for (const code of [0, 45, 95, null]) expect(html(code)).toContain("scene-veil");
  });
});

describe("seededRandom", () => {
  it("repete a mesma sequência para a mesma semente e fica entre 0 e 1", () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const values = Array.from({ length: 50 }, () => a());
    expect(values).toEqual(Array.from({ length: 50 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("amanhecer e entardecer", () => {
  it("céu limpo, poucas ou muitas nuvens ganham as cores do amanhecer/entardecer", () => {
    for (const code of [0, 2, 3]) {
      expect(sceneFor(code, true, "dawn").phase).toBe("dawn");
      expect(sceneFor(code, true, "dusk").phase).toBe("dusk");
      expect(sceneFor(code, true, "dusk").sky).not.toEqual(sceneFor(code, true).sky);
    }
    expect(sceneFor(0, true, "dawn").sky).not.toEqual(sceneFor(0, true, "dusk").sky);
  });

  it("chuva, névoa, neve e trovoada mantêm o céu da condição", () => {
    for (const code of [45, 61, 73, 95]) {
      const scene = sceneFor(code, true, "dusk");
      expect(scene.phase).toBe("day");
      expect(scene.sky).toEqual(sceneFor(code, true).sky);
    }
  });

  it("de dia, sol baixo no lugar do sol alto; sem lua nem estrelas", () => {
    expect(sceneFor(0, true, "dusk")).toMatchObject({ sun: false, lowSun: true, moon: false, stars: false, bright: true });
    // Muitas nuvens: céu colorido, mas sem sol à vista.
    expect(sceneFor(3, true, "dusk")).toMatchObject({ lowSun: false, sun: false });
  });

  it("antes do nascer/depois do pôr (noite): horizonte colorido e estrelas, sem sol nem lua", () => {
    expect(sceneFor(0, false, "dawn")).toMatchObject({ phase: "dawn", sun: false, lowSun: false, moon: false, stars: true });
  });

  it("fora das janelas, nada muda", () => {
    expect(sceneFor(0, true, null)).toEqual(sceneFor(0, true));
    expect(sceneFor(0, false).phase).toBe("night");
  });

  it("a cena desenha o sol baixo e marca o momento do dia", () => {
    const html = renderToStaticMarkup(<WeatherScene scene={sceneFor(0, true, "dawn")} />);
    expect(html).toContain("scene-sun-low");
    expect(html).toContain('data-phase="dawn"');
  });
});
