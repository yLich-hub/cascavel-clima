// Gera os ícones do app (manifesto, Apple e favicon) a partir de src/app/icon.svg
// e a imagem de prévia ao compartilhar o link (public/og.png).
// Rodar só quando o desenho mudar: node scripts/make-icons.mjs
// O desenho fica dentro da "zona segura" (círculo de 80%), então o mesmo PNG
// serve como ícone comum e "maskable" (Android recorta em círculo ou gota).
import { readFileSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { ImageResponse } from "next/og.js";

const svg = readFileSync("src/app/icon.svg", "utf8");
const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

async function png(size) {
  const image = new ImageResponse(createElement("img", { src, width: size, height: size }), { width: size, height: size });
  return Buffer.from(await image.arrayBuffer());
}

/** ICO com um único PNG embutido (aceito por todos os navegadores atuais). */
function ico(pngData, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: ícone
  header.writeUInt16LE(1, 4); // quantidade de imagens
  header.writeUInt8(size, 6);
  header.writeUInt8(size, 7);
  header.writeUInt16LE(1, 10); // planos de cor
  header.writeUInt16LE(32, 12); // bits por pixel
  header.writeUInt32LE(pngData.length, 14);
  header.writeUInt32LE(22, 18); // posição dos dados
  return Buffer.concat([header, pngData]);
}

for (const [path, size] of [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["src/app/apple-icon.png", 180],
]) {
  writeFileSync(path, await png(size));
  console.log(`${path} (${size}×${size})`);
}
writeFileSync("src/app/favicon.ico", ico(await png(48), 48));
console.log("src/app/favicon.ico (48×48)");

// Prévia ao compartilhar (1200×630). Sem dados do tempo de propósito: uma temperatura
// "congelada" na imagem ficaria desatualizada nas conversas.
const h = createElement;
const og = h(
  "div",
  {
    style: {
      width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "72px 80px", color: "#ffffff",
      background: "linear-gradient(160deg, #123a66 0%, #0b1a33 55%, #071226 100%)",
    },
  },
  h("div", { style: { display: "flex", alignItems: "center", gap: 32 } },
    h("img", { src, width: 150, height: 150, style: { borderRadius: 32 } }),
    h("div", { style: { display: "flex", flexDirection: "column" } },
      h("div", { style: { fontSize: 76, fontWeight: 700, lineHeight: 1.05 } }, "Clima Cascavel"),
      h("div", { style: { fontSize: 40, opacity: 0.9 } }, "Paraná · Brasil"),
    ),
  ),
  h("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
    h("div", { style: { fontSize: 40, fontWeight: 700 } }, "Tempo agora, previsão de 7 dias e El Niño ao vivo"),
    h("div", { style: { fontSize: 26, opacity: 0.9 } }, "Dados do Open-Meteo e do NOAA · projeto de portfólio, não é serviço oficial"),
  ),
);
const ogImage = new ImageResponse(og, { width: 1200, height: 630 });
writeFileSync("public/og.png", Buffer.from(await ogImage.arrayBuffer()));
console.log("public/og.png (1200×630)");
