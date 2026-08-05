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
  width:  620,
  height: 980,

  front: {
    nama:  { x: 220, y: 542, w: 320, h: 54, fontSize: 20 },
    nim:   { x: 220, y: 622, w: 320, h: 54, fontSize: 20 },
    gugus: { x: 220, y: 702, w: 320, h: 54, fontSize: 20 },
    textColor: '#3b0764',   // ungu gelap sesuai tema
    fontFamily: 'Arial, sans-serif',
  },

  back: {
    qr: { x: 103, y: 320, size: 320 }, // geser sedikit ke bawah agar tidak overlap teks PKKMB
  },
};

/**
 * Build SVG teks untuk overlay ke ID card depan.
 */
function buildFrontSvg(name, nim, gugus) {
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
        x="${front.nama.x + front.nama.w / 2}"
        y="${front.nama.y + front.nama.h / 2}"
        font-size="${front.nama.fontSize}"
        text-anchor="middle"
      >${truncate(name, 28)}</text>

      <!-- NIM -->
      <text
        x="${front.nim.x + front.nim.w / 2}"
        y="${front.nim.y + front.nim.h / 2}"
        font-size="${front.nim.fontSize}"
        text-anchor="middle"
      >${truncate(nim, 20)}</text>

      <!-- GUGUS -->
      <text
        x="${front.gugus.x + front.gugus.w / 2}"
        y="${front.gugus.y + front.gugus.h / 2}"
        font-size="${front.gugus.fontSize}"
        text-anchor="middle"
      >${truncate(gugus || 'Belum Ditentukan', 24)}</text>
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
    color: { dark: '#3b0764', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Generate ID Card depan (dengan nama, NIM, gugus ditempel ke template).
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateFrontCard(name, nim, gugus) {
  if (!fs.existsSync(FRONT_TEMPLATE)) {
    throw new Error(`Template depan tidak ditemukan: ${FRONT_TEMPLATE}\nLetakkan file front.png di folder server/templates/`);
  }

  const svgOverlay = buildFrontSvg(name, nim, gugus);

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

  return sharp(BACK_TEMPLATE)
    .resize(COORDS.width, COORDS.height)
    .composite([{
      input: qrBuffer,
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
async function generateIdCard(name, nim, gugus) {
  const [front, back] = await Promise.all([
    generateFrontCard(name, nim, gugus),
    generateBackCard(nim),
  ]);
  return { front, back };
}

module.exports = { generateIdCard, generateFrontCard, generateBackCard };
