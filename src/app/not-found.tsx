import type { Metadata } from "next";
import Link from "next/link";
import { Glass } from "@/components/home/Glass";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

const LINKS = [
  { href: "/", label: "Ver a previsão do tempo para Cascavel" },
  { href: "/el-nino", label: "El Niño: contexto climático" },
  { href: "/sobre", label: "Sobre e fontes" },
];

/** Usada para qualquer endereço que não existe no site (HTTP 404). */
export default function NotFound() {
  return (
    <div className="relative isolate flex-1 bg-gradient-to-b from-slate-900 to-slate-800">
      <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-10">
        <Glass as="div" className="enter-up p-6 sm:p-8">
          <p className="text-sm font-medium text-white/90">Erro 404</p>
          <h1 className="display mt-1 font-bold">Página não encontrada</h1>
          <p className="mt-2 text-base">O endereço que você acessou não existe ou foi movido.</p>
          <ul className="mt-5 space-y-2 text-sm">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="pill pill-glass w-full justify-start"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Glass>
      </main>
    </div>
  );
}
