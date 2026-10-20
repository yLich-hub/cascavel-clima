import type { CSSProperties } from "react";
import { Lightning } from "@/components/scene/Lightning";
import { Precipitation } from "@/components/scene/Precipitation";
import { seededRandom } from "@/components/scene/random";
import { CLOUD_TONES, FOG, VEIL_BRIGHT_ALPHA, lowSunGradient, rgb, sunGradient, veilGradient } from "@/lib/weather/scene-palette";
import type { CloudTone, Scene } from "@/lib/weather/scenes";

/**
 * Fundo animado da condição atual. Preenche o elemento pai (que deve ter
 * `position: relative` ou ser fixo). Puramente decorativo: `aria-hidden`.
 * Camadas estáticas são renderizadas no servidor; só chuva/neve e raios
 * rodam no navegador.
 */
export function WeatherScene({ scene }: { scene: Scene }) {
  const [top, bottom] = scene.sky;
  return (
    <div
      aria-hidden="true"
      data-scene={scene.id}
      data-night={scene.isNight || undefined}
      data-phase={scene.phase}
      className="absolute inset-0 overflow-hidden"
      // `container-type: size`: sol, lua e nuvens medem a própria cena (cqmin/cqw),
      // então ela funciona em tela cheia ou dentro de um card pequeno.
      style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`, containerType: "size" }}
    >
      {scene.stars && <Stars />}
      {scene.sun && <div className="scene-sun" style={{ background: sunGradient() }} />}
      {scene.lowSun && <div className="scene-sun scene-sun-low" style={{ background: lowSunGradient() }} />}
      {scene.moon && <div className="scene-moon" />}
      {scene.fog && <Fog />}
      <Clouds count={scene.clouds.count} tone={scene.clouds.tone} fast={scene.lightning} />
      {scene.rain > 0 && <Precipitation kind="rain" intensity={scene.rain} />}
      {scene.snow > 0 && <Precipitation kind="snow" intensity={scene.snow} />}
      {scene.lightning && <Lightning />}
      <div className="scene-veil" style={{ background: veilGradient() }} />
      {scene.bright && <div className="scene-veil" style={{ background: rgb([0, 0, 0], VEIL_BRIGHT_ALPHA) }} />}
    </div>
  );
}

/**
 * Formato de uma nuvem: "bolhas" sobrepostas e uma base achatada, relativas à
 * caixa (x, y, largura e altura em % da largura da nuvem).
 */
const PUFFS = [
  { x: 2, y: 46, w: 34, h: 34 },
  { x: 18, y: 22, w: 42, h: 42 },
  { x: 38, y: 6, w: 44, h: 44 },
  { x: 58, y: 24, w: 38, h: 38 },
  { x: 72, y: 44, w: 26, h: 26 },
  { x: 8, y: 58, w: 86, h: 22 }, // base achatada
];

function Clouds({ count, tone, fast }: { count: number; tone: CloudTone; fast: boolean }) {
  if (count === 0) return null;
  const random = seededRandom(7 + count);
  const colors = CLOUD_TONES[tone];

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const width = 30 + random() * 28; // % da largura da cena
        const duration = (fast ? 38 : 80) + random() * (fast ? 30 : 70); // s
        const style = {
          top: `${-4 + random() * (count > 4 ? 52 : 40)}%`,
          width: `${width}cqw`,
          height: `${width * 0.48}cqw`,
          opacity: colors.opacity - random() * 0.15,
          animationDuration: `${duration}s`,
          animationDelay: `${-random() * duration}s`,
          "--scale": (0.75 + random() * 0.85).toFixed(2),
          "--rest-x": `${(i / count) * 100 - 10}cqw`,
          "--cloud": rgb(colors.cloud),
          "--cloud-light": rgb(colors.light),
        } as CSSProperties;
        return (
          <div key={i} className="scene-cloud" style={style}>
            {PUFFS.map((puff, j) => (
              <span
                key={j}
                style={{ left: `${puff.x}%`, top: `${puff.y}%`, width: `${puff.w}%`, height: `${(puff.h / 48) * 100}%` }}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function Stars() {
  const random = seededRandom(42);
  return (
    <>
      {Array.from({ length: 48 }, (_, i) => {
        const size = random() < 0.85 ? 1.5 : 2.5;
        return (
          <span
            key={i}
            className="scene-star"
            style={{
              left: `${random() * 100}%`,
              top: `${random() * 55}%`,
              width: size,
              height: size,
              animationDelay: `${-random() * 4}s`,
              animationDuration: `${3 + random() * 3}s`,
            }}
          />
        );
      })}
    </>
  );
}

function Fog() {
  return (
    <>
      {[18, 46, 70].map((top, i) => (
        <div
          key={top}
          className="scene-fog"
          style={
            {
              top: `${top}%`,
              animationDelay: `${-i * 12}s`,
              "--fog": rgb(FOG.color, FOG.alpha),
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}
