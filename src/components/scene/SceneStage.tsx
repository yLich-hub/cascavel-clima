"use client";

import { useEffect, useState } from "react";
import { WeatherScene } from "@/components/scene/WeatherScene";
import type { Scene } from "@/lib/weather/scenes";

/** O que muda o desenho da cena; mudou → transição suave entre a antiga e a nova. */
const sceneKey = (scene: Scene) =>
  [scene.id, scene.phase, scene.rain, scene.snow, scene.clouds.count, scene.clouds.tone].join("|");

const FADE_MS = 1400;

/**
 * Fundo fixo da Início. Quando a atualização automática traz outra condição
 * (ex.: de nublado para chuva, ou o entardecer), a cena antiga desaparece aos
 * poucos sobre a nova em vez de trocar de repente. Com "reduzir movimento",
 * a troca é imediata (globals.css).
 */
export function SceneStage({ scene, className = "fixed inset-0 -z-10" }: { scene: Scene; className?: string }) {
  const key = sceneKey(scene);
  const [layers, setLayers] = useState([{ key, scene }]);
  const [shownKey, setShownKey] = useState(key);

  // Cena nova: entra por baixo; a anterior sai por cima (ajuste de estado durante a renderização).
  if (key !== shownKey) {
    setShownKey(key);
    setLayers((current) => [{ key, scene }, ...current.slice(0, 1)]);
  }

  useEffect(() => {
    if (layers.length < 2) return;
    const timer = setTimeout(() => setLayers((current) => current.slice(0, 1)), FADE_MS);
    return () => clearTimeout(timer);
  }, [layers.length]);

  return (
    <div className={className}>
      {layers.map((layer, i) => (
        <div key={layer.key} className={`absolute inset-0 ${i > 0 ? "scene-layer-out" : ""}`}>
          <WeatherScene scene={layer.scene} />
        </div>
      ))}
    </div>
  );
}
