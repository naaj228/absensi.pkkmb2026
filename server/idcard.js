const sharp = require('sharp');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const TEMPLATES_DIR = path.join(__dirname, 'templates');
const FRONT_TEMPLATE = path.join(TEMPLATES_DIR, 'front.png');
const BACK_TEMPLATE  = path.join(TEMPLATES_DIR, 'back.png');

// ─── Koordinat (estimasi dari template, sesuaikan jika perlu) ────────────────
//
// Template ID Card (portrait ~620x980px):
//
// DEPAN - area teks di panel kanan:
//   NAMA  : kotak di ~y=640, x mulai ~215, lebar ~330
//   NIM   : kotak di ~y=720, x mulai ~215, lebar ~330
//   GUGUS : kotak di ~y=800, x mulai ~215, lebar ~330
//
// BELAKANG - area QR di tengah:
//   QR Box: x=100, y=290, ukuran 350x350
//
// CATATAN: Nilai ini estimasi — admin bisa lihat hasilnya dan minta
// penyesuaian posisi.

const COORDS = {
  // Ukuran target canvas (sharp akan resize template ke ini)
  width:  1024,
  height: 651,

  front: {
    nama:  { x: 585, y: 317, fontSize: 14 },
    nim:   { x: 585, y: 336, fontSize: 14 },
    prodi: { x: 585, y: 354, fontSize: 14 },
    gugus: { x: 585, y: 374, fontSize: 14 },
    textColor: '#ffffff',   // putih kontras dengan dark blue background
    fontFamily: 'Arial, sans-serif',
  },

  back: {
    qr: { x: 387, y: 228, size: 250 },
  },
};

/**
 * Build SVG teks untuk overlay ke ID card depan.
 */
function buildFrontSvg(name, nim, gugus, prodi) {
  const { front, width, height } = COORDS;
  const truncate = (str, max) => str.length > max ? str.substring(0, max - 1) + '…' : str;

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text {
          font-family: ${front.fontFamily};
          fill: ${front.textColor};
          font-weight: 600;
          dominant-baseline: central;
        }
      </style>

      <!-- NAMA -->
      <text
        x="${front.nama.x}"
        y="${front.nama.y}"
        font-size="${front.nama.fontSize}"
        text-anchor="start"
      >${truncate(name, 35)}</text>

      <!-- NIM -->
      <text
        x="${front.nim.x}"
        y="${front.nim.y}"
        font-size="${front.nim.fontSize}"
        text-anchor="start"
      >${truncate(nim, 20)}</text>

      <!-- PRODI -->
      <text
        x="${front.prodi.x}"
        y="${front.prodi.y}"
        font-size="${front.prodi.fontSize}"
        text-anchor="start"
      >${truncate(prodi || 'Belum Diisi', 30)}</text>

      <!-- GUGUS -->
      <text
        x="${front.gugus.x}"
        y="${front.gugus.y}"
        font-size="${front.gugus.fontSize}"
        text-anchor="start"
      >${truncate(gugus || 'Belum Ditentukan', 30)}</text>
    </svg>
  `);
}

/**
 * Generate QR Code sebagai PNG Buffer dari NIM.
 */
async function generateQrBuffer(nim, size) {
  return QRCode.toBuffer(nim, {
    type: 'png',
    width: size,
    margin: 1,
    color: { dark: '#012060', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Generate ID Card depan (dengan nama, NIM, gugus ditempel ke template).
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateFrontCard(name, nim, gugus, prodi) {
  if (!fs.existsSync(FRONT_TEMPLATE)) {
    throw new Error(`Template depan tidak ditemukan: ${FRONT_TEMPLATE}\nLetakkan file front.png di folder server/templates/`);
  }

  const svgOverlay = buildFrontSvg(name, nim, gugus, prodi);

  return sharp(FRONT_TEMPLATE)
    .resize(COORDS.width, COORDS.height)
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/**
 * Generate ID Card belakang (dengan QR code ditempel ke placeholder).
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateBackCard(nim) {
  if (!fs.existsSync(BACK_TEMPLATE)) {
    throw new Error(`Template belakang tidak ditemukan: ${BACK_TEMPLATE}\nLetakkan file back.png di folder server/templates/`);
  }

  const { back } = COORDS;
  const qrBuffer = await generateQrBuffer(nim, back.qr.size);
  
  // Buat SVG untuk membungkus QR Code dengan clip path (rounded corners)
  const base64Qr = qrBuffer.toString('base64');
  const svgQr = Buffer.from(`
    <svg width="${back.qr.size}" height="${back.qr.size}" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="clip">
        <rect x="0" y="0" width="${back.qr.size}" height="${back.qr.size}" rx="14" ry="14" />
      </clipPath>
      <image href="data:image/png;base64,${base64Qr}" width="${back.qr.size}" height="${back.qr.size}" clip-path="url(#clip)" />
    </svg>
  `);

  return sharp(BACK_TEMPLATE)
    .resize(COORDS.width, COORDS.height)
    .composite([{
      input: svgQr,
      top: back.qr.y,
      left: back.qr.x,
    }])
    .png()
    .toBuffer();
}

/**
 * Generate kedua sisi ID card.
 * @returns {Promise<{ front: Buffer, back: Buffer }>}
 */
async function generateIdCard(name, nim, gugus, prodi) {
  const [front, back] = await Promise.all([
    generateFrontCard(name, nim, gugus, prodi),
    generateBackCard(nim),
  ]);
  return { front, back };
}

module.exports = { generateIdCard, generateFrontCard, generateBackCard };
