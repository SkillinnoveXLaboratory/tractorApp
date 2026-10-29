/* global __dirname */
// Builds every launcher/splash image from the two source logos in assets/images:
//   tractor_app_logo_installer_launch_icon.png → app icon, Android adaptive icon (foreground/background/monochrome)
//   tractor_app_logo_main.png                  → splash tile (native splash) and favicon
// Run after changing either source logo:  node scripts/make-brand-assets.js
const path = require("path");
const Jimp = require("jimp-compact");

const DIR = path.join(__dirname, "..", "assets", "images");
const SIZE = 1024;
// Splash tile, in the units of the splash design (a 144dp tile drawn from a 288dp-wide image).
const TILE = 144;
const TILE_RADIUS = 32;
const LOGO_WIDTH_IN_TILE = 100;
const RED = [0xc8, 0x1d, 0x25];

// Solid-white background → transparency, keeping anti-aliased edges exact when drawn on white again.
function unWhite(image) {
  const { data } = image.bitmap;
  for (let i = 0; i < data.length; i += 4) {
    const a = Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]) / 255;
    if (a <= 0.02) {
      data[i + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(Math.min(255, Math.max(0, (data[i + c] - 255 * (1 - a)) / a)));
    data[i + 3] = Math.round(a * 255);
  }
  return image;
}

// Smallest box around the artwork (anything that isn't near-white).
function artBox(image) {
  const { width: w, height: h, data } = image.bitmap;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Cropped, transparent logo scaled to `width` px.
async function logoAt(file, width) {
  const src = await Jimp.read(path.join(DIR, file));
  const box = artBox(src);
  const art = src.clone().crop(box.x, box.y, box.w, box.h);
  art.resize(width, Math.round((box.h * width) / box.w), Jimp.RESIZE_BICUBIC);
  return unWhite(art);
}

const canvas = (color = 0x00000000) => new Jimp(SIZE, SIZE, color);
const save = (image, name) => image.writeAsync(path.join(DIR, name)).then(() => console.log("wrote", name));

(async () => {
  // App icon (iOS / legacy Android): the installer artwork exactly as supplied (it is already 1024×1024 on white).
  const installer = await Jimp.read(path.join(DIR, "tractor_app_logo_installer_launch_icon.png"));
  require("fs").copyFileSync(path.join(DIR, "tractor_app_logo_installer_launch_icon.png"), path.join(DIR, "icon.png"));
  console.log("wrote icon.png");

  // Adaptive icon: launchers crop the 108dp layer to shapes inside a 66dp safe circle (0.61 of the canvas).
  // The logo's diagonal is kept at 0.58 of the canvas so no launcher shape cuts it.
  const box = artBox(installer);
  const fgWidth = Math.round((0.58 * SIZE * box.w) / Math.hypot(box.w, box.h));
  const fgLogo = await logoAt("tractor_app_logo_installer_launch_icon.png", fgWidth);
  const fg = canvas();
  fg.composite(fgLogo, Math.round((SIZE - fgLogo.bitmap.width) / 2), Math.round((SIZE - fgLogo.bitmap.height) / 2));
  await save(fg, "android-icon-foreground.png");
  await save(canvas(0xffffffff), "android-icon-background.png");
  // Themed (monochrome) icon: the artwork's shape in white; Android tints it.
  const mono = fg.clone();
  mono.scan(0, 0, SIZE, SIZE, function scan(x, y, i) {
    this.bitmap.data[i] = 255; this.bitmap.data[i + 1] = 255; this.bitmap.data[i + 2] = 255;
  });
  await save(mono, "android-icon-monochrome.png");

  // Native splash image: the white tile (rounded, red corner accent) with the logo, centred on a transparent
  // 1024 canvas. app.json draws it 288dp wide, so the tile is 144dp — the same tile the animated splash shows.
  const k = SIZE / 2 / TILE; // px per dp
  const t0 = (SIZE - TILE * k) / 2;
  const splash = canvas();
  const { data } = splash.bitmap;
  const SS = 4; // supersampling for smooth edges
  for (let py = 0; py < SIZE; py++)
    for (let px = 0; px < SIZE; px++) {
      let inTile = 0, inRed = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          // Point in tile units (0..144).
          const x = (px + (sx + 0.5) / SS - t0) / k;
          const y = (py + (sy + 0.5) / SS - t0) / k;
          if (x < 0 || y < 0 || x > TILE || y > TILE) continue;
          const cx = Math.min(Math.max(x, TILE_RADIUS), TILE - TILE_RADIUS);
          const cy = Math.min(Math.max(y, TILE_RADIUS), TILE - TILE_RADIUS);
          if (Math.hypot(x - cx, y - cy) > TILE_RADIUS) continue;
          inTile++;
          // 48dp square turned 45°, centred 12dp past the corner and clipped by the tile.
          if (Math.abs(x - 132) + Math.abs(y - 132) <= 24 * Math.SQRT2) inRed++;
        }
      if (!inTile) continue;
      const i = (py * SIZE + px) * 4;
      const red = inRed / inTile;
      data[i] = Math.round(255 * (1 - red) + RED[0] * red);
      data[i + 1] = Math.round(255 * (1 - red) + RED[1] * red);
      data[i + 2] = Math.round(255 * (1 - red) + RED[2] * red);
      data[i + 3] = Math.round((255 * inTile) / (SS * SS));
    }
  const tileLogo = await logoAt("tractor_app_logo_main.png", Math.round(LOGO_WIDTH_IN_TILE * k));
  splash.composite(tileLogo, Math.round((SIZE - tileLogo.bitmap.width) / 2), Math.round((SIZE - tileLogo.bitmap.height) / 2));
  await save(splash, "splash-icon.png");

  // Favicon (web).
  const fav = new Jimp(48, 48, 0xffffffff);
  const favLogo = await logoAt("tractor_app_logo_main.png", 44);
  fav.composite(favLogo, 2, Math.round((48 - favLogo.bitmap.height) / 2));
  await save(fav, "favicon.png");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
