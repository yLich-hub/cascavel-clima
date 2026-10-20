import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { siteMetadata as metadata } from "@/lib/site-metadata";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/config";

describe("compartilhamento e buscadores", () => {
  it("links absolutos usam o endereço público do site", () => {
    expect(metadata.metadataBase?.toString()).toBe(`${SITE_URL}/`);
    expect(metadata.openGraph).toMatchObject({ locale: "pt_BR", siteName: "Clima Cascavel" });
  });

  it("robots libera as páginas e bloqueia APIs, galeria de desenvolvimento e offline", () => {
    const rules = robots().rules;
    expect(rules).toMatchObject({ allow: "/", disallow: ["/api/", "/dev/", "/offline"] });
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("sitemap lista as três páginas públicas", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([`${SITE_URL}/`, `${SITE_URL}/el-nino`, `${SITE_URL}/sobre`]);
  });
});

describe("região das funções", () => {
  it("roda em São Paulo (gru1), perto dos visitantes", () => {
    expect(JSON.parse(readFileSync("vercel.json", "utf8")).regions).toEqual(["gru1"]);
  });
});

describe("imagem de prévia", () => {
  it("aponta para public/og.png, um PNG 1200×630", () => {
    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ url: "/og.png", width: 1200, height: 630 })]);
    const png = readFileSync("public/og.png");
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe("1200x630");
  });
});
