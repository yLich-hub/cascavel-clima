import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileNav } from "@/components/layout/MobileNav";
import { ServiceWorker } from "@/components/layout/ServiceWorker";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { siteMetadata, siteViewport } from "@/lib/site-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = siteMetadata;

export const viewport = siteViewport;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* No celular, espaço no fim para o menu inferior fixo não cobrir o rodapé. */}
      <body className="flex min-h-full flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <SiteHeader />
        {children}
        <SiteFooter />
        <MobileNav />
        <ServiceWorker />
      </body>
    </html>
  );
}
