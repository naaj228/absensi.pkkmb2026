# PKKMB Attendance System (React)

Proyek ini adalah hasil konversi dari mockup HTML (Tailwind CDN) menjadi proyek React + Vite + React Router + Tailwind CSS v4.

## Menjalankan proyek

```bash
npm install
npm run dev
```

Buka http://localhost:5173

## Build produksi

```bash
npm run build
npm run preview
```

## Struktur

- `src/pages/` — setiap halaman dari mockup asli (Login Admin, Login Mentor, Dashboard Admin, Manajemen Peserta, Mentor, Gugus, Approval Manual, QR Management, Riwayat Absensi, Dashboard Mentor, Scanner QR, Absensi Manual, dll).
- `src/layouts/AdminLayout.jsx` & `src/layouts/MentorLayout.jsx` — sidebar navigasi yang dipakai bersama oleh halaman-halaman admin/mentor (memakai `react-router-dom` `NavLink` sehingga menu aktif otomatis mengikuti rute).
- `src/App.jsx` — definisi semua rute (React Router v7).
- `src/index.css` — tema desain (warna, font, spacing) dipindahkan dari konfigurasi Tailwind CDN ke Tailwind v4 (`@theme`).

## Rute yang tersedia

- `/login-admin`, `/login-mentor`
- `/admin/dashboard`, `/admin/peserta`, `/admin/peserta/:id`, `/admin/mentor`, `/admin/gugus`, `/admin/approval`, `/admin/qr-management`, `/admin/riwayat`
- `/mentor/dashboard`, `/mentor/peserta`, `/mentor/scanner-qr`, `/mentor/absensi-manual`

## Catatan

- Markup & styling (Tailwind) dari desain asli dipertahankan seutuhnya per halaman.
- Interaktivitas berbasis `<script>` vanilla JS pada mockup asli (search, modal, dsb.) **belum** diporting ke React state — silakan tambahkan menggunakan `useState`/`useEffect` sesuai kebutuhan (form login sudah diarahkan agar submit membawa ke dashboard masing-masing).
- Gambar masih memakai URL placeholder Google (`lh3.googleusercontent.com`) dari desain asli — ganti dengan aset final sesuai kebutuhan.
