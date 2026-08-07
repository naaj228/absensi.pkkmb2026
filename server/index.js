require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const JSZip = require('jszip');
const QRCode = require('qrcode');
const { generateIdCard, generateFrontCard, generateBackCard } = require('./idcard');

const app = express();
const PORT = process.env.EMAIL_SERVER_PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Nodemailer Transporter ──────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (bukan password biasa)
  },
});

// ─── Verifikasi koneksi SMTP saat server start ───────────────────────────────
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.error('   Pastikan GMAIL_USER dan GMAIL_APP_PASSWORD sudah diisi di .env');
  } else {
    console.log('✅ SMTP server ready — siap kirim email!');
  }
});

// ─── Template HTML Email ─────────────────────────────────────────────────────
// ─── Template HTML Email ─────────────────────────────────────────────────────
function buildEmailHtml({ toName, nim, gugus, mentor, qrUrl, appName, hasIdCards }) {
  const idCardHtml = hasIdCards ? `
      <!-- ID Card Section -->
      <div style="text-align: center; margin-bottom: 28px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px 20px;">
        <p style="color: #64748b; font-size: 11px; font-weight: 700; margin-top: 0; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.08em; font-family: 'Segoe UI', Arial, sans-serif;">ID CARD PKKMB KAMU</p>
        <div style="text-align: center;">
          <img src="cid:idcardfront" alt="ID Card Depan" style="width: 100%; max-width: 320px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 auto 16px auto; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.05);" />
          <img src="cid:idcardback" alt="ID Card Belakang" style="width: 100%; max-width: 320px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 auto; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.05);" />
        </div>
      </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>QR Code Absensi PKKMB</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #012060 0%, #a50022 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 40px; }
    .greeting { font-size: 16px; color: #1e293b; margin-bottom: 20px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
    .info-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; width: 80px; flex-shrink: 0; }
    .info-value { font-size: 14px; color: #1e293b; font-weight: 500; }
    .nim-badge { background: #ede9fe; color: #6366f1; padding: 2px 10px; border-radius: 999px; font-family: monospace; font-size: 13px; font-weight: 700; }
    .qr-section { text-align: center; margin: 24px 0; }
    .qr-section p { color: #64748b; font-size: 13px; margin-bottom: 16px; }
    .qr-img { border: 4px solid #e2e8f0; border-radius: 12px; padding: 8px; background: #fff; display: inline-block; }
    .qr-img img { display: block; width: 200px; height: 200px; }
    .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-top: 20px; }
    .note p { color: #92400e; font-size: 13px; margin: 0; line-height: 1.6; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎓 ${appName || 'Absensi PKKMB 2026'}</h1>
      <p>ID Card & QR Code Absensi Resmi</p>
    </div>
    <div class="body">
      ${idCardHtml}
      <p class="greeting">Halo, <strong>${toName}</strong>! 👋</p>
      <p style="color:#475569;font-size:14px;margin-bottom:20px;">
        Berikut adalah QR Code absensi resmi kamu untuk kegiatan PKKMB. Simpan email ini dan tunjukkan kepada mentor saat proses absensi berlangsung.
      </p>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Nama</span>
          <span class="info-value">${toName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">NIM</span>
          <span class="info-value"><span class="nim-badge">${nim}</span></span>
        </div>
        <div class="info-row">
          <span class="info-label">Gugus</span>
          <span class="info-value">${gugus || 'Belum Ditentukan'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Mentor</span>
          <span class="info-value">${mentor || 'Belum Ditentukan'}</span>
        </div>
      </div>
      <div class="qr-section">
        <p>Scan QR Code ini saat absensi:</p>
        <div class="qr-img">
          <img src="${qrUrl}" alt="QR Code ${nim}" />
        </div>
      </div>
      <div class="note">
        <p>⚠️ <strong>Penting:</strong> QR Code ini bersifat unik dan hanya untuk kamu. Jangan bagikan ke orang lain. Pastikan gambar QR terlihat jelas saat discan.</p>
      </div>
    </div>
    <div class="footer">
      <p>Email ini dikirim otomatis oleh sistem ${appName || 'Absensi PKKMB 2026'}.<br/>Jangan membalas email ini.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── POST /api/send-qr-email  (kirim ke 1 peserta) ───────────────────────────
app.post('/api/send-qr-email', async (req, res) => {
  const { toEmail, toName, nim, gugus, mentor, qrUrl } = req.body;

  if (!toEmail || !toName || !nim) {
    return res.status(400).json({ ok: false, message: 'toEmail, toName, dan nim wajib diisi.' });
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ ok: false, message: 'GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env' });
  }

  try {
    // Generate ID card (depan + belakang)
    let attachments = [];
    let hasIdCards = false;
    try {
      const { front, back } = await generateIdCard(toName, nim, gugus);
      attachments = [
        { filename: `ID-Card-Depan-${nim}.png`, content: front, contentType: 'image/png', cid: 'idcardfront' },
        { filename: `ID-Card-Belakang-${nim}.png`, content: back, contentType: 'image/png', cid: 'idcardback' },
      ];
      hasIdCards = true;
      console.log(`🎨 ID card generated for ${nim}`);
    } catch (cardErr) {
      console.warn(`⚠️  ID card gagal di-generate (${cardErr.message}) — tetap kirim email tanpa attachment.`);
    }

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Panitia PKKMB'}" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `ID Card & QR Code Absensi PKKMB - ${toName}`,
      html: buildEmailHtml({ toName, nim, gugus, mentor, qrUrl, appName: process.env.VITE_APP_NAME, hasIdCards }),
      attachments,
    });

    console.log(`✉️  Sent to ${toEmail} (${nim})`);
    res.json({ ok: true, message: `Email + ID card berhasil dikirim ke ${toEmail}!` });
  } catch (err) {
    console.error(`❌  Failed to send to ${toEmail}:`, err.message);
    res.status(500).json({ ok: false, message: `Gagal mengirim email: ${err.message}` });
  }
});

// ─── POST /api/send-bulk-qr-email  (kirim ke banyak peserta sekaligus) ───────
//
// Body: { students: [ { toEmail, toName, nim, gugus, mentor, qrUrl }, ... ] }
// Response: streaming JSON via SSE (Server-Sent Events) supaya frontend bisa
//           tampilkan progress real-time.
//
app.post('/api/send-bulk-qr-email', async (req, res) => {
  const { students } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ ok: false, message: 'students array wajib diisi.' });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ ok: false, message: 'GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env' });
  }

  // ── Kirim SSE (Server-Sent Events) agar frontend dapat progress live ──
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const BATCH_SIZE = 50;          // Gmail aman ~50/menit
  const DELAY_BETWEEN_BATCH = 60000; // 60 detik jeda antar batch
  const DELAY_BETWEEN_EMAIL = 500;   // 0.5 detik jeda per email (dalam 1 batch)

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < students.length; i++) {
    const { toEmail, toName, nim, gugus, mentor, qrUrl } = students[i];

    try {
      // Generate ID card
      let attachments = [];
      let hasIdCards = false;
      try {
        const { front, back } = await generateIdCard(toName, nim, gugus);
        attachments = [
          { filename: `ID-Card-Depan-${nim}.png`, content: front, contentType: 'image/png', cid: 'idcardfront' },
          { filename: `ID-Card-Belakang-${nim}.png`, content: back, contentType: 'image/png', cid: 'idcardback' },
        ];
        hasIdCards = true;
      } catch (cardErr) {
        console.warn(`⚠️  [${i + 1}] ID card gagal: ${cardErr.message}`);
      }

      await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Panitia PKKMB'}" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: `ID Card & QR Code Absensi PKKMB - ${toName}`,
        html: buildEmailHtml({ toName, nim, gugus, mentor, qrUrl, appName: process.env.VITE_APP_NAME, hasIdCards }),
        attachments,
      });
      sent++;
      console.log(`✉️  [${i + 1}/${students.length}] Sent to ${toEmail}`);
    } catch (err) {
      failed++;
      errors.push({ nim, toEmail, error: err.message });
      console.error(`❌  [${i + 1}/${students.length}] Failed: ${toEmail} — ${err.message}`);
    }

    // Kirim progress update ke frontend
    send({ type: 'progress', current: i + 1, total: students.length, sent, failed });

    // Jeda antar email
    await new Promise(r => setTimeout(r, DELAY_BETWEEN_EMAIL));

    // Jeda antar batch (setiap BATCH_SIZE email, kecuali email terakhir)
    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < students.length) {
      console.log(`⏳ Batch ${Math.ceil((i + 1) / BATCH_SIZE)} selesai. Jeda ${DELAY_BETWEEN_BATCH / 1000}s...`);
      send({ type: 'batch_pause', message: `Menunggu ${DELAY_BETWEEN_BATCH / 1000} detik sebelum batch berikutnya...` });
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCH));
    }
  }

  // Kirim event selesai
  send({ type: 'done', sent, failed, errors });
  res.end();
});

// ─── POST /api/generate-gugus-zip ────────────────────────────────────────────
app.post('/api/generate-gugus-zip', async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ ok: false, message: 'students array wajib diisi.' });
  }

  try {
    const zip = new JSZip();

    for (const student of students) {
      const { id, name, gugusName } = student;
      const folderName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${id}`;
      const folder = zip.folder(folderName);

      // 1. Generate front card image
      try {
        const frontBuffer = await generateFrontCard(name, id, gugusName);
        folder.file('ID_Card_Depan.png', frontBuffer);
      } catch (err) {
        console.warn(`Gagal generate front card untuk ${id}: ${err.message}`);
      }

      // 2. Generate back card image
      try {
        const backBuffer = await generateBackCard(id);
        folder.file('ID_Card_Belakang.png', backBuffer);
      } catch (err) {
        console.warn(`Gagal generate back card untuk ${id}: ${err.message}`);
      }

      // 3. Generate pure QR code image
      try {
        const qrBuffer = await QRCode.toBuffer(id, {
          type: 'png',
          width: 300,
          margin: 1,
          color: { dark: '#3b0764', light: '#ffffff' }
        });
        folder.file('QR_Code.png', qrBuffer);
      } catch (err) {
        console.warn(`Gagal generate QR untuk ${id}: ${err.message}`);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=ID_Cards_Gugus.zip');
    res.send(zipBuffer);
  } catch (err) {
    console.error('Error generating zip:', err);
    res.status(500).json({ ok: false, message: 'Gagal membuat file ZIP: ' + err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    gmailConfigured: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
    gmailUser: process.env.GMAIL_USER || 'not set',
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Email server running at http://localhost:${PORT}`);
  console.log(`   Gmail: ${process.env.GMAIL_USER || '⚠️  GMAIL_USER not set'}`);
  console.log(`   Endpoint: POST /api/send-qr-email`);
  console.log(`   Endpoint: POST /api/send-bulk-qr-email\n`);
});
