// Gera public/grain.png: ruído em tons de cinza (128×128) para o grão de filme.
// Uma imagem pronta custa muito menos ao navegador do que o filtro feTurbulence
// do SVG, que era redesenhado na carga (medido: até 300 ms a mais de bloqueio).
// Rodar só se quiser outro ruído: node scripts/make-grain.mjs
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const SIZE = 128;
// Gerador com semente: o arquivo sai sempre igual (sem mudar a cada execução).
let seed = 7;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

const raw = Buffer.alloc((SIZE + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE + 1)] = 0; // filtro "nenhum" no início de cada linha
  // 16 tons bastam com 4% de opacidade, e comprimem bem melhor que 256.
  for (let x = 0; x < SIZE; x++) raw[y * (SIZE + 1) + 1 + x] = Math.floor(random() * 16) * 17;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8; // 8 bits
header[9] = 0; // tons de cinza
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync("public/grain.png", png);
console.log(`public/grain.png (${SIZE}×${SIZE}, ${png.length} bytes)`);
