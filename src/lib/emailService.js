// Di development: http://localhost:3001/api
// Di production:  URL Railway kamu (set di Vercel Environment Variables)
const API_BASE = (import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001') + '/api';

/**
 * Kirim QR Code ke 1 peserta via backend Nodemailer.
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function sendQrEmail({ toEmail, toName, nim, gugus, mentor, qrUrl }) {
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
