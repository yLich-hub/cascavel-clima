"use client";

import { useEffect, useState } from "react";

type Flash = { id: number; left: number; path: string };

/** Raio em zigue-zague, do topo até ~60% da altura (coordenadas do viewBox 40×100). */
function boltPath(random: () => number): string {
  let x = 20;
  const points = [`${x},0`];
  for (let y = 12; y <= 100; y += 11 + random() * 6) {
    x = Math.min(36, Math.max(4, x + (random() - 0.5) * 18));
    points.push(`${x.toFixed(1)},${Math.min(y, 100).toFixed(1)}`);
  }
  return points.join(" ");
}

/**
 * Clarões de raio a cada 6–15 s, com no máximo 2 clarões por evento (ver
 * `.scene-flash` em globals.css). Desativado com movimento reduzido e não
 * dispara com a aba em segundo plano.
 */
export function Lightning() {
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let next: ReturnType<typeof setTimeout>;
    let clear: ReturnType<typeof setTimeout>;

    const schedule = () => {
      next = setTimeout(() => {
        if (!reduced.matches && !document.hidden) {
          setFlash({ id: Date.now(), left: 12 + Math.random() * 70, path: boltPath(Math.random) });
          clear = setTimeout(() => setFlash(null), 900);
        }
        schedule();
      }, 6000 + Math.random() * 9000);
    };
    schedule();

    return () => {
      clearTimeout(next);
      clearTimeout(clear);
    };
  }, []);

  if (!flash) return null;
  return (
    <>
      <div key={`flash-${flash.id}`} className="scene-flash" />
      <svg
        key={`bolt-${flash.id}`}
        className="scene-bolt"
        style={{ left: `${flash.left}%` }}
        viewBox="0 0 40 100"
        preserveAspectRatio="none"
        width="40"
      >
        <polyline
          points={flash.path}
          fill="none"
          stroke="rgb(236 242 255)"
          strokeWidth="1.6"
          strokeLinejoin="bevel"
        />
      </svg>
    </>
  );
}
