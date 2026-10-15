import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

/** Usada para qualquer endereço que não existe no site (HTTP 404). */
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-10 pt-10">
      <p className="text-sm font-medium text-sky-800">Erro 404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        Página não encontrada
      </h1>
      <p className="mt-2 text-sm text-zinc-700">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <ul className="mt-5 space-y-2 text-sm">
        <li>
          <Link href="/" className="font-medium text-sky-800 underline underline-offset-2">
            Ver a previsão do tempo para Cascavel
          </Link>
        </li>
        <li>
          <Link href="/el-nino" className="text-sky-800 underline underline-offset-2">
            El Niño: contexto climático
          </Link>
        </li>
        <li>
          <Link href="/sobre" className="text-sky-800 underline underline-offset-2">
            Sobre e fontes
          </Link>
        </li>
      </ul>
    </main>
  );
}
