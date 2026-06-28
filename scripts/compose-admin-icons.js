const sharp = require('sharp');
const path = require('path');

const IMAGES = path.join(__dirname, '..', 'assets', 'images');
const OUT = path.join(__dirname, '..', 'admin-panel', 'public');
const BG = '#0D0D0D';

async function squareIconOnBg(srcFile, outFile, canvasSize, markRatio) {
  const markSize = Math.round(canvasSize * markRatio);
  const mark = await sharp(path.join(IMAGES, srcFile))
    .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background: BG },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, outFile));
}

(async () => {
  await squareIconOnBg('icon green.png', 'icon-192.png', 192, 0.62);
  await squareIconOnBg('icon green.png', 'icon-512.png', 512, 0.62);
  console.log('Done: admin-panel icon-192.png, icon-512.png');
})();
