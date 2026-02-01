import sharp from "sharp";
import fs from "fs";

const BG = "#0b0b0b";      // background
const FG = "#ffffff";      // text
const ACCENT = "#22c55e";  // accent ring (green)

function svg(size) {
  const s = size;
  const r = Math.round(s * 0.18);          // rounded corner radius
  const ring = Math.max(10, Math.round(s * 0.06));
  const fontSize = Math.round(s * 0.28);

  return Buffer.from(`
  <svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${s}" height="${s}" rx="${r}" fill="${BG}"/>
    <circle cx="${s/2}" cy="${s/2}" r="${(s/2) - ring}" fill="none" stroke="${ACCENT}" stroke-width="${ring}"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
          font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
          font-weight="800"
          font-size="${fontSize}"
          fill="${FG}"
          letter-spacing="2">WWFC</text>
  </svg>
  `);
}

async function makePng(path, size) {
  const img = svg(size);
  await sharp(img).png({ compressionLevel: 9 }).toFile(path);
  console.log("Wrote", path);
}

async function main() {
  fs.mkdirSync("public/icons", { recursive: true });

  await makePng("public/icons/icon-192.png", 192);
  await makePng("public/icons/icon-512.png", 512);

  // Apple touch icon recommended size:
  await makePng("public/apple-touch-icon.png", 180);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
