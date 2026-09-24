// Di development: http://localhost:3001/api
// Di production:  URL Railway kamu (set di Vercel Environment Variables)
const API_BASE = (import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001') + '/api';

/**
 * Validasi sintaks email dan deteksi typo domain umum di client-side.
 * @param {string} email 
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateEmailSyntax(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return { valid: false, reason: 'Alamat email kosong.' };
  }
  const cleanEmail = email.trim().toLowerCase();
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicRegex.test(cleanEmail)) {
    return { valid: false, reason: 'Format email tidak valid (kurang @ atau domainextension).' };
  }

  const commonTypoDomains = [
    'gmal.com', 'gmial.com', 'gmaill.com', 'gamil.com', 'gmai.com', 'gmle.com',
    'gmal.co', 'gmial.co', 'gmaill.co', 'gamil.co', 'gmai.co', 'gmail.co',
    'yaho.com', 'yahooo.com', 'yaho.co', 'yaho.co.id', 'hotmial.com', 'hotmai.com'
  ];

  const domain = cleanEmail.split('@')[1] || '';
  
  // 1. Cek typo domain umum (Gmail, Yahoo, dll)
  if (commonTypoDomains.includes(domain)) {
    return { valid: false, reason: `Typo domain terdeteksi (@${domain}). Gunakan domain resmi (contoh: @gmail.com).` };
  }

  // 2. Cek typo domain kampus Digitech University
  const isDigitechTypo = (domain.includes('digitech') || domain.includes('digitek')) && domain !== 'digitechuniversity.ac.id';
  if (isDigitechTypo) {
    return { valid: false, reason: `Typo domain kampus terdeteksi (@${domain}). Gunakan domain resmi kampus (@digitechuniversity.ac.id).` };
  }

  return { valid: true, reason: '' };
}

/**
 * Kirim QR Code ke 1 peserta via backend Nodemailer.
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function sendQrEmail({ toEmail, toName, nim, gugus, mentor, qrUrl }) {
  const check = validateEmailSyntax(toEmail);
  if (!check.valid) {
    return { ok: false, message: `Gagal validasi: ${check.reason}` };
  }

  try {
    const res = await fetch(`${API_BASE}/send-qr-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail, toName, nim, gugus, mentor, qrUrl }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return {
      ok: false,
      message: `Tidak dapat terhubung ke email server. Pastikan server sudah dijalankan dengan "npm run server". Error: ${err.message}`,
    };
  }
}

/**
 * Kirim QR Code ke banyak peserta sekaligus (bulk) dengan progress callback.
 *
 * @param {Array}    students  - Array objek { toEmail, toName, nim, gugus, mentor, qrUrl }
 * @param {Function} onProgress - Callback({ current, total, sent, failed, message? })
 * @returns {Promise<{sent, failed, errors}>}
 */
export function sendBulkQrEmail(students, onProgress) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/send-bulk-qr-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return reject(new Error(err.message || 'Server error'));
        }

        // Baca Server-Sent Events (SSE) dari backend
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // simpan baris yang belum lengkap

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'progress' || event.type === 'batch_pause') {
                onProgress?.(event);
              } else if (event.type === 'done') {
                resolve({ sent: event.sent, failed: event.failed, errors: event.errors });
              }
            } catch { /* skip malformed lines */ }
          }
        }
      } catch (err) {
        reject(new Error(`Tidak dapat terhubung ke email server. Jalankan "npm run server" terlebih dahulu. (${err.message})`));
      }
    })();
  });
}

/**
 * Cek status koneksi ke email server.
 * @returns {Promise<{ok: boolean, gmailConfigured: boolean, gmailUser: string}>}
 */
export async function checkEmailServerHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch {
    return { ok: false, gmailConfigured: false, gmailUser: '' };
  }
}
