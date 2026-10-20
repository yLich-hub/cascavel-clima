import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/** Buscadores podem indexar as páginas; APIs, galeria de desenvolvimento e a página offline, não. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dev/", "/offline"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
