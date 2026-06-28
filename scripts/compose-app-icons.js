const sharp = require('sharp');
const path = require('path');

const IMAGES = path.join(__dirname, '..', 'assets', 'images');
const BG = '#0B0C10';

async function squareIconOnBg(srcFile, outFile, canvasSize, markRatio, bg) {
  const markSize = Math.round(canvasSize * markRatio);
  const mark = await sharp(path.join(IMAGES, srcFile))
    .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background: bg },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(IMAGES, outFile));
}

async function transparentForeground(srcFile, outFile, canvasSize, markRatio) {
  const markSize = Math.round(canvasSize * markRatio);
  const mark = await sharp(path.join(IMAGES, srcFile))
    .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(IMAGES, outFile));
}

async function splashWithWordmark(srcFile, outFile, width, height, markWidthRatio, bg) {
  const markWidth = Math.round(width * markWidthRatio);
  const mark = await sharp(path.join(IMAGES, srcFile))
    .resize(markWidth, null, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width, height, channels: 4, background: bg },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(IMAGES, outFile));
}

(async () => {
  // App icon (iOS needs opaque background, no transparency)
  await squareIconOnBg('icon green.png', 'icon.png', 1024, 0.62, BG);

  // Android adaptive icon foreground -- transparent, kept well inside the
  // ~66% safe zone so the circular/squircle mask never clips the mark.
  await transparentForeground('icon green.png', 'adaptive-icon.png', 1024, 0.5);

  // Favicon: small opaque square, same composition as the app icon.
  await squareIconOnBg('icon green.png', 'favicon.png', 48, 0.62, BG);

  // Splash: full-bleed background with the wordmark centered.
  await splashWithWordmark('wordmark green.png', 'splash.png', 1284, 2778, 0.72, BG);

  console.log('Done: icon.png, adaptive-icon.png, favicon.png, splash.png');
})();
