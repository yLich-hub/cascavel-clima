import { House, Info, Waves, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; short: string; icon: LucideIcon };

/** Páginas principais: mesmas no cabeçalho (computador) e no menu inferior (celular). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", short: "Início", icon: House },
  { href: "/el-nino", label: "El Niño", short: "El Niño", icon: Waves },
  { href: "/sobre", label: "Sobre e fontes", short: "Sobre", icon: Info },
];

/** A página atual é a do item? ("/" só conta na própria Início.) */
export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
