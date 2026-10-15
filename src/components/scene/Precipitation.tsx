"use client";

import { useEffect, useRef } from "react";
import type { Intensity } from "@/lib/weather/scenes";

type Kind = "rain" | "snow";

/** Partículas por intensidade numa tela de referência (1280×800); escala com a área. */
const BASE_COUNT: Record<Kind, Record<Intensity, number>> = {
  rain: { 0: 0, 1: 70, 2: 150, 3: 260 },
  snow: { 0: 0, 1: 60, 2: 110, 3: 180 },
};

type Particle = { x: number; y: number; speed: number; length: number; drift: number; layer: 0 | 1 };

/**
 * Chuva ou neve em canvas. Economia de bateria: pausa com a aba em segundo
 * plano ou fora da tela; com movimento reduzido desenha um quadro parado.
 */
export function Precipitation({ kind, intensity }: { kind: Kind; intensity: Intensity }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let last = 0;
    let onScreen = true;
    let seed = 1;
    const random = () => {
      // Aleatoriedade simples e barata; não precisa ser igual no servidor.
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    const spawn = (anywhere: boolean): Particle => {
      const layer: 0 | 1 = random() < 0.35 ? 1 : 0; // 1 = mais perto: maior e mais rápida
      return {
        x: random() * (width + 200) - 100,
        y: anywhere ? random() * height : -30 - random() * 60,
        speed:
          kind === "rain"
            ? (layer ? 900 : 620) + random() * 220
            : (layer ? 55 : 32) + random() * 25,
        length: kind === "rain" ? (layer ? 20 : 12) + random() * 8 : (layer ? 2.4 : 1.4) + random(),
        drift: random() * Math.PI * 2,
        layer,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = Math.min(Math.max((width * height) / (1280 * 800), 0.3), 1.2);
      const count = Math.round(BASE_COUNT[kind][intensity] * area);
      particles = Array.from({ length: count }, () => spawn(true));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const layer of [0, 1] as const) {
        ctx.beginPath();
        for (const p of particles) {
          if (p.layer !== layer) continue;
          if (kind === "rain") {
            // Chuva levemente inclinada pelo vento.
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.length * 0.18, p.y + p.length);
          } else {
            ctx.moveTo(p.x + p.length, p.y);
            ctx.arc(p.x, p.y, p.length, 0, Math.PI * 2);
          }
        }
        if (kind === "rain") {
          ctx.strokeStyle = layer ? "rgb(214 225 240 / 0.5)" : "rgb(200 212 230 / 0.28)";
          ctx.lineWidth = layer ? 1.4 : 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = layer ? "rgb(255 255 255 / 0.85)" : "rgb(255 255 255 / 0.55)";
          ctx.fill();
        }
      }
    };

    const step = (dt: number) => {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speed * dt;
        if (kind === "rain") {
          p.x -= p.speed * 0.18 * dt;
        } else {
          p.drift += dt;
          p.x += Math.sin(p.drift) * 18 * dt;
        }
        if (p.y > height + 30 || p.x < -120) particles[i] = spawn(false);
      }
    };

    const loop = (time: number) => {
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const update = () => {
      const canRun = !reduced.matches && !document.hidden && onScreen;
      if (canRun && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else if (!canRun && raf) {
        stop();
      }
      if (reduced.matches) draw(); // quadro parado
    };

    resize();
    draw();
    update();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    });
    visibility.observe(canvas);
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
    };
  }, [kind, intensity]);

  return <canvas ref={ref} data-precipitation={kind} className="absolute inset-0 h-full w-full" />;
}
