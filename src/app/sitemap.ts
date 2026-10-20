import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/** Páginas públicas do site. A previsão muda a toda hora; o conteúdo do El Niño, a cada boletim. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/el-nino`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/sobre`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
