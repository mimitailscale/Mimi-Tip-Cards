const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const inputUrl = process.argv[2] || process.env.TARGET_URL;
if (!inputUrl) {
  console.error('Usage: npm run qr -- <PUBLIC_URL>');
  process.exit(1);
}

let target;
try {
  target = new URL(inputUrl).toString();
} catch (_error) {
  console.error('Invalid URL. Example: https://your-app.onrender.com');
  process.exit(1);
}

const outDir = path.join(__dirname, '..', 'public', 'qr');
const outPng = path.join(outDir, 'customer-tip-qr.png');
const outSvg = path.join(outDir, 'customer-tip-qr.svg');

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  await QRCode.toFile(outPng, target, {
    type: 'png',
    width: 900,
    margin: 2,
    color: { dark: '#111111', light: '#FFFFFF' }
  });

  const svg = await QRCode.toString(target, {
    type: 'svg',
    margin: 2,
    color: { dark: '#111111', light: '#FFFFFF' }
  });

  fs.writeFileSync(outSvg, svg, 'utf8');
  console.log(`QR created for ${target}`);
  console.log(outPng);
  console.log(outSvg);
}

main().catch((error) => {
  console.error('Failed to generate QR:', error.message);
  process.exit(1);
});
