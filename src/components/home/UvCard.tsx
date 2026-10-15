import { Glass } from "@/components/home/Glass";
import { uvCategory } from "@/lib/weather/insights";

/** Escala de cores convencional do Índice UV (verde → violeta). Decorativa: o nível vai em texto. */
const SCALE = "linear-gradient(90deg, #4ade80 0%, #facc15 27%, #fb923c 55%, #ef4444 73%, #a855f7 100%)";

/** Índice UV máximo previsto para hoje, na escala da OMS. */
export function UvCard({ uvIndexMax }: { uvIndexMax: number | null }) {
  const uv = uvCategory(uvIndexMax);
  const position = uv ? Math.min(uv.value, 11) / 11 : 0;

  return (
    <Glass labelledBy="uv">
      <h2 id="uv" className="text-sm font-medium text-white/90">
        Índice UV máximo hoje
      </h2>
      {uv ? (
        <>
          <p className="mt-1 text-3xl font-light">
            {uv.value} <span className="text-base capitalize">{uv.level}</span>
          </p>
          <div aria-hidden="true" className="relative mt-3 h-2 rounded-full" style={{ background: SCALE }}>
            <span
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-slate-900"
              style={{ left: `${position * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-white/90">Escala da OMS: baixo até 2, extremo a partir de 11.</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/90">Índice UV indisponível no momento.</p>
      )}
    </Glass>
  );
}
