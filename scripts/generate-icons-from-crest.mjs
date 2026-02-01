import sharp from "sharp";
import fs from "fs";

const INPUT = "public/crest.jpg";   // your crest file
const BG = "#0b0b0b";
const PADDING = 0.12;

async function makeIcon(outPath, size) {
  const pad = Math.round(size * PADDING);
  const crestSize = size - pad * 2;

  const crest = await sharp(INPUT)
    .resize(crestSize, crestSize, { fit: "contain" })
    .png()
    .toBuffer();

  const bg = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  });

  const composed = await bg
    .composite([{ input: crest, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(outPath, composed);
  console.log("Wrote", outPath);
}

async function main() {
  await makeIcon("public/icons/icon-192.png", 192);
  await makeIcon("public/icons/icon-512.png", 512);
  await makeIcon("public/apple-touch-icon.png", 180);
}

main();
