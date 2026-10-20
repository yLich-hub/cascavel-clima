// Gera os ícones do app (manifesto, Apple e favicon) a partir de src/app/icon.svg.
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
