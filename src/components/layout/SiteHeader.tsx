import { CloudSun } from "lucide-react";
import Link from "next/link";
import { HeaderLinks } from "@/components/layout/MobileNav";

export function SiteHeader() {
  return (
    <header className="site-header border-b">
      <nav
        aria-label="Principal"
        className="site-nav mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3"
      >
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <CloudSun aria-hidden="true" className="size-5 text-sky-300" />
          Clima Cascavel
        </Link>
        {/* No celular, a navegação fica no menu inferior (MobileNav). */}
        <HeaderLinks />
      </nav>
    </header>
  );
}
