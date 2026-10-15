import { describeWeatherCode } from "@/lib/weather/wmo-codes";

/**
 * Cena de fundo para a condição atual. Lógica pura (testada em tests/scenes.test.ts):
 * os componentes em src/components/scene só desenham o que esta configuração diz.
 *
 * A cena é decorativa: a condição real sempre aparece em texto na tela.
 */

export type SceneId =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm"
  | "snow"
  | "unavailable";

/** 0 = nenhuma, 1 = fraca, 2 = moderada, 3 = forte. */
export type Intensity = 0 | 1 | 2 | 3;

export type CloudTone = "white" | "gray" | "dark";

export type Scene = {
  id: SceneId;
  isNight: boolean;
  /** Gradiente do céu: [topo, base]. */
  sky: [string, string];
  sun: boolean;
  moon: boolean;
  stars: boolean;
  clouds: { count: number; tone: CloudTone };
  fog: boolean;
  rain: Intensity;
  snow: Intensity;
  lightning: boolean;
};

const DAY_SKY: Record<SceneId, [string, string]> = {
  clear: ["#3b7fd0", "#9fc8ef"],
  "partly-cloudy": ["#5a8fcf", "#b4cfe8"],
  cloudy: ["#66768c", "#a7b2c1"],
  fog: ["#8e99a6", "#c7ced6"],
  drizzle: ["#566577", "#8d9aab"],
  rain: ["#3d4a5b", "#6e7b8c"],
  storm: ["#1d2430", "#3b4554"],
  snow: ["#8a97a8", "#d3d9e1"],
  unavailable: ["#3f4652", "#6b7280"],
};

const NIGHT_SKY: Record<SceneId, [string, string]> = {
  clear: ["#070d24", "#1d2b52"],
  "partly-cloudy": ["#0c1430", "#26355c"],
  cloudy: ["#1a212e", "#353f50"],
  fog: ["#262d38", "#4a525e"],
  drizzle: ["#161d29", "#2f3947"],
  rain: ["#11161f", "#28313e"],
  storm: ["#090c12", "#1e242f"],
  snow: ["#232a36", "#4b5462"],
  unavailable: ["#2a2f38", "#4b525e"],
};

/** Intensidade de precipitação a partir do código WMO (tabela em wmo-codes.ts). */
const PRECIPITATION: Record<number, Intensity> = {
  51: 1, 53: 1, 55: 2, // garoa
  56: 1, 57: 2, // garoa congelante
  61: 1, 63: 2, 65: 3, // chuva
  66: 1, 67: 2, // chuva congelante
  80: 1, 81: 2, 82: 3, // pancadas de chuva
  71: 1, 73: 2, 75: 3, 77: 1, // neve
  85: 1, 86: 3, // pancadas de neve
  95: 3, 96: 3, 97: 3, 99: 3, // trovoada
};

function baseScene(code: number | null): SceneId {
  if (code === null) return "unavailable";
  switch (describeWeatherCode(code).icon) {
    case "clear":
      return "clear";
    case "partly-cloudy":
      return "partly-cloudy";
    case "cloudy":
      return "cloudy";
    case "fog":
      return "fog";
    case "drizzle":
      return "drizzle";
    case "rain":
    case "showers":
    case "freezing-rain":
      return "rain";
    case "thunderstorm":
      return "storm";
    case "snow":
      return "snow";
    default:
      return "unavailable";
  }
}

/**
 * @param code  código WMO da condição atual; null = sem dado utilizável
 * @param isDay null (desconhecido) é tratado como dia
 */
export function sceneFor(code: number | null, isDay: boolean | null): Scene {
  const id = baseScene(code);
  const isNight = isDay === false;
  const level: Intensity = code !== null ? (PRECIPITATION[code] ?? 0) : 0;
  const sky = (isNight ? NIGHT_SKY : DAY_SKY)[id];

  const scene: Scene = {
    id,
    isNight,
    sky,
    sun: false,
    moon: false,
    stars: false,
    clouds: { count: 0, tone: "white" },
    fog: false,
    rain: 0,
    snow: 0,
    lightning: false,
  };

  switch (id) {
    case "clear":
      return { ...scene, sun: !isNight, moon: isNight, stars: isNight, clouds: { count: code === 1 ? 1 : 0, tone: "white" } };
    case "partly-cloudy":
      return { ...scene, sun: !isNight, moon: isNight, stars: isNight, clouds: { count: 3, tone: isNight ? "gray" : "white" } };
    case "cloudy":
      return { ...scene, clouds: { count: 6, tone: "gray" } };
    case "fog":
      return { ...scene, fog: true, clouds: { count: 2, tone: "gray" } };
    case "drizzle":
      return { ...scene, clouds: { count: 5, tone: "gray" }, rain: Math.max(1, level) as Intensity };
    case "rain":
      // De dia, nuvens escuras sobre o céu cinza viram "manchas"; céu de chuva é uniforme.
      return { ...scene, clouds: { count: 6, tone: isNight ? "dark" : "gray" }, rain: Math.max(1, level) as Intensity };
    case "storm":
      return { ...scene, clouds: { count: 7, tone: "dark" }, rain: 3, lightning: true };
    case "snow":
      return { ...scene, clouds: { count: 5, tone: "gray" }, snow: Math.max(1, level) as Intensity };
    case "unavailable":
      return scene;
  }
}
