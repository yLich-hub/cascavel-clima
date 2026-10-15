import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScenesGallery } from "./ScenesGallery";

export const metadata: Metadata = {
  title: "Cenas (desenvolvimento)",
  robots: { index: false, follow: false },
};

/** Só existe em `npm run dev`. No build de produção responde 404. */
export default function DevScenesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ScenesGallery />;
}
