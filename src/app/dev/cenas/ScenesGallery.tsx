"use client";

import { useEffect, useRef, useState } from "react";
import { WeatherScene } from "@/components/scene/WeatherScene";
import { sceneFor } from "@/lib/weather/scenes";
import { describeWeatherCode } from "@/lib/weather/wmo-codes";

const SAMPLES: Array<{ code: number | null; isDay: boolean }> = [
  { code: 0, isDay: true },
  { code: 0, isDay: false },
  { code: 1, isDay: true },
  { code: 2, isDay: true },
  { code: 2, isDay: false },
  { code: 3, isDay: true },
  { code: 45, isDay: true },
  { code: 53, isDay: true },
  { code: 61, isDay: true },
  { code: 65, isDay: false },
  { code: 81, isDay: true },
  { code: 95, isDay: true },
  { code: 97, isDay: false },
  { code: 73, isDay: true },
  { code: null, isDay: true },
];

const label = (code: number | null, isDay: boolean) =>
  `${code === null ? "Sem dado recente" : describeWeatherCode(code).label} · ${isDay ? "dia" : "noite"}${code === null ? "" : ` · código ${code}`}`;

/** Ferramenta de desenvolvimento: todas as cenas lado a lado + diagnóstico de movimento. */
export function ScenesGallery() {
  const [selected, setSelected] = useState(11);
  const previewRef = useRef<HTMLDivElement>(null);
  const [diag, setDiag] = useState({ reduced: false, cloudAnimation: "-", fps: 0 });
  // Momentos (ms) em que um raio apareceu na cena grande, para conferir a frequência.
  const [flashes, setFlashes] = useState<number[]>([]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const observer = new MutationObserver((mutations) => {
      const added = mutations.some((m) =>
        [...m.addedNodes].some((n) => n instanceof Element && n.classList.contains("scene-flash")),
      );
      if (added) setFlashes((list) => [...list, Math.round(performance.now())]);
    });
    observer.observe(preview, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selected]);
  const current = SAMPLES[selected];

  // `/dev/cenas#3` abre a cena 3 em tamanho grande (útil para capturas).
  useEffect(() => {
    const fromHash = () => {
      const index = Number(window.location.hash.slice(1));
      if (Number.isInteger(index) && index >= 0 && index < SAMPLES.length && window.location.hash) {
        setSelected(index);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  useEffect(() => {
    let frames = 0;
    let raf = requestAnimationFrame(function count() {
      frames++;
      raf = requestAnimationFrame(count);
    });
    const timer = setInterval(() => {
      const cloud = previewRef.current?.querySelector(".scene-cloud");
      setDiag({
        reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        cloudAnimation: cloud ? getComputedStyle(cloud).animationName : "sem nuvens",
        fps: frames,
      });
      frames = 0;
    }, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold text-zinc-900">Cenas do tempo (somente desenvolvimento)</h1>
      <p
        id="diagnostico"
        data-reduced={diag.reduced}
        data-cloud-animation={diag.cloudAnimation}
        className="mt-1 text-sm text-zinc-700"
      >
        Movimento reduzido: <strong>{diag.reduced ? "sim" : "não"}</strong> · animação das nuvens:{" "}
        <strong>{diag.cloudAnimation}</strong> · quadros por segundo: <strong>{diag.fps}</strong>
      </p>
      <p id="raios" data-flashes={flashes.join(",")} className="text-sm text-zinc-700">
        Raios na cena grande: <strong>{flashes.length}</strong>
        {flashes.length > 1 &&
          ` · intervalos (s): ${flashes
            .slice(1)
            .map((t, i) => ((t - flashes[i]) / 1000).toFixed(1))
            .join(", ")}`}
      </p>

      <div ref={previewRef} className="relative mt-4 h-[65vh] overflow-hidden rounded-2xl">
        <WeatherScene key={selected} scene={sceneFor(current.code, current.isDay)} />
        <p className="absolute bottom-4 left-4 text-lg font-medium text-white drop-shadow">
          {label(current.code, current.isDay)}
        </p>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SAMPLES.map((sample, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={i === selected}
              className="relative block h-28 w-full overflow-hidden rounded-xl text-left ring-sky-600 aria-pressed:ring-4"
            >
              <WeatherScene scene={sceneFor(sample.code, sample.isDay)} />
              <span className="absolute inset-x-2 bottom-2 text-xs font-medium text-white drop-shadow">
                {label(sample.code, sample.isDay)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
