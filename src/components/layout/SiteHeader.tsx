import { CloudSun } from "lucide-react";
import Link from "next/link";

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
        <div className="flex items-center gap-4 text-sm font-medium text-white">
          <Link href="/el-nino" className="hover:underline">
            El Niño
          </Link>
          <Link href="/sobre" className="hover:underline">
            Sobre e fontes
          </Link>
        </div>
      </nav>
    </header>
  );
}
