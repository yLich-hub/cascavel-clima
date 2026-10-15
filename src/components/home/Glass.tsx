import type { ReactNode } from "react";
import { GLASS, rgb } from "@/lib/weather/scene-palette";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
  labelledBy?: string;
};

/**
 * Card de vidro fosco sobre a cena. A cor/opacidade vem de scene-palette.ts e
 * é a que tests/contrast.test.ts valida: texto branco ≥ 4,5:1 em qualquer cena.
 * Use `text-white` ou no mínimo `text-white/90` para texto pequeno.
 */
export function Glass({ children, className = "", as: Tag = "section", labelledBy }: Props) {
  return (
    <Tag
      aria-labelledby={labelledBy}
      className={`rounded-3xl p-5 text-white ring-1 ring-white/15 backdrop-blur-xl ${className}`}
      style={{ background: rgb(GLASS.color, GLASS.alpha) }}
    >
      {children}
    </Tag>
  );
}
