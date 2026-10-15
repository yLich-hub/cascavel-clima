import { OCEAN, rgb, veilGradient, warmGradient } from "@/lib/weather/scene-palette";

/**
 * Onda contínua com período 720 numa largura de 2880: deslocar 50% (1440)
 * cai exatamente num ponto igual, então a animação não "pula".
 */
function wavePath(amplitude: number): string {
  const top = 100 - amplitude;
  let d = `M0,100 Q180,${top} 360,100`;
  for (let x = 720; x <= 2880; x += 360) d += ` T${x},100`;
  return `${d} L2880,200 L0,200 Z`;
}

const LAYERS = [
  { amplitude: 26, top: "52%", duration: 38, color: OCEAN.waves[0] },
  { amplitude: 34, top: "62%", duration: 28, color: OCEAN.waves[1] },
  { amplitude: 22, top: "74%", duration: 20, color: OCEAN.waves[2] },
];

/**
 * Fundo da página El Niño: céu noturno, "mancha quente" no Pacífico e ondas.
 * Ilustração decorativa (`aria-hidden`); a página avisa que não representa dados.
 */
export function OceanScene() {
  const [top, bottom] = OCEAN.sky;
  return (
    <div
      aria-hidden="true"
      data-scene="ocean"
      className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 60%)`, containerType: "size" }}
    >
      <div className="ocean-warm" style={{ background: warmGradient() }} />
      {LAYERS.map((layer) => (
        <svg
          key={layer.top}
          className="ocean-wave"
          style={{ top: layer.top, height: `calc(100% - ${layer.top})`, animationDuration: `${layer.duration}s` }}
          viewBox="0 0 2880 200"
          preserveAspectRatio="none"
        >
          <path d={wavePath(layer.amplitude)} fill={rgb(layer.color, 0.92)} />
        </svg>
      ))}
      <div className="scene-veil" style={{ background: veilGradient() }} />
    </div>
  );
}
