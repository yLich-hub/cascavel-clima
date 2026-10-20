"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "@/components/layout/nav-items";

/**
 * Menu inferior fixo, só no celular (abaixo de 640 px): alvos de toque de
 * 56 px, página atual marcada (aria-current) e espaço para a barra de gestos
 * do aparelho (safe-area). Fundo escuro opaco o bastante para texto branco
 * sobre qualquer cena (tests/contrast.test.ts).
 */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu inferior" className="site-tabbar fixed inset-x-0 bottom-0 z-20 border-t sm:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {NAV_ITEMS.map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "font-bold text-white" : "font-medium text-white/90"
                }`}
              >
                {active && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-orange-300" />}
                <Icon aria-hidden="true" className={`size-6 ${active ? "text-orange-300" : "text-white/90"}`} strokeWidth={active ? 2.4 : 2} />
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Links do cabeçalho (computador e tablet), com a página atual marcada. */
export function HeaderLinks() {
  const pathname = usePathname();
  return (
    <div className="hidden items-center gap-4 text-sm font-medium text-white sm:flex">
      {NAV_ITEMS.filter((item) => item.href !== "/").map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`underline-offset-4 hover:underline ${active ? "underline decoration-orange-300 decoration-2" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
