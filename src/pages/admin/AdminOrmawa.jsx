import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { ormawaDb } from '../../lib/db';
import { supabase } from '../../lib/supabase';

export default function AdminOrmawa() {
  const [ormawaList, setOrmawaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dbError, setDbError] = useState('');
  
  // Settings State
  const [settings, setSettings] = useState({
    waktuMulai: '07:00',
    waktuSelesai: '17:00',
    isActive: true
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedOrmawa, setSelectedOrmawa] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    namaOrmawa: '',
    namaPerwakilan: '',
    jabatan: '',
    kontak: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Fetch Ormawa list & settings
  const loadData = async () => {
    setLoading(true);
    setDbError('');
    try {
      const data = await ormawaDb.fetchAll();
      setOrmawaList(data);
      const s = await ormawaDb.fetchSettings();
      if (s) setSettings(s);
    } catch (err) {
      console.error('Error fetching ORMAWA list:', err);
      if (err.message && (err.message.includes('relation "public.ormawa" does not exist') || err.code === '42P01')) {
        setDbError('Tabel database "ormawa" belum dibuat di Supabase. Silakan jalankan script SQL migrasi (ormawa_migration.sql) di Supabase SQL Editor.');
      } else {
        setDbError(err.message || 'Gagal memuat data dari database.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscriptions
    const sub1 = supabase
      .channel('ormawa-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ormawa' }, () => {
        loadData();
      })
      .subscribe();

    const sub2 = supabase
      .channel('ormawa-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ormawa_settings' }, () => {
        ormawaDb.fetchSettings().then(s => setSettings(s));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub1);
      supabase.removeChannel(sub2);
    };
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await ormawaDb.updateSettings(settings);
      showToast('⚙️ Jam operasional berhasil disimpan!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Gagal menyimpan pengaturan: ' + (err.message || 'Pastikan tabel ormawa_settings sudah dibuat di Supabase.'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.namaOrmawa.trim()) return;

    setIsSubmitting(true);
    try {
      await ormawaDb.add({
        namaOrmawa: formData.namaOrmawa,
        namaPerwakilan: formData.namaPerwakilan,
        jabatan: formData.jabatan,
        kontak: formData.kontak,
        email: formData.email
      });
      showToast('Data Ormawa berhasil ditambahkan!');
      setFormData({ namaOrmawa: '', namaPerwakilan: '', jabatan: '', kontak: '', email: '' });
      setShowAddModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to add ORMAWA:', err);
      if (err.message && err.message.includes('row-level security')) {
        alert('Terjadi pembatasan RLS di Supabase! Silakan jalankan script perbaikan RLS di Supabase SQL Editor.');
      } else if (err.message && (err.message.includes('relation "public.ormawa" does not exist') || err.code === '42P01')) {
        alert('Tabel "ormawa" di Supabase belum ada! Silakan jalankan file "ormawa_migration.sql" di Supabase SQL Editor.');
      } else {
        showToast('Gagal menambahkan data: ' + (err.message || 'Error tidak diketahui'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus data Ormawa "${nama}"?`)) return;
    try {
      await ormawaDb.delete(id);
      showToast(`Data Ormawa ${nama} berhasil dihapus.`);
      loadData();
    } catch (err) {
      console.error('Failed to delete ORMAWA:', err);
      showToast('Gagal menghapus data.');
    }
  };

  const handleShowQr = async (item) => {
    setSelectedOrmawa(item);
    try {
      const url = await QRCode.toDataURL(item.qr_code, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0d1b4d',
          light: '#ffffff'
        }
      });
      setQrDataUrl(url);
      setShowQrModal(true);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  const downloadQrCode = () => {
    if (!qrDataUrl || !selectedOrmawa) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_ORMAWA_${selectedOrmawa.nama_ormawa.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Send QR via Email
  const handleSendEmail = async (targetItem) => {
    const item = targetItem || selectedOrmawa;
    if (!item) return;

    if (!item.email || !item.email.trim()) {
      alert(`Ormawa "${item.nama_ormawa}" belum memiliki alamat Email. Silakan isi email terlebih dahulu.`);
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch('http://localhost:3001/api/send-ormawa-qr-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: item.email,
          namaOrmawa: item.nama_ormawa,
          namaPerwakilan: item.nama_perwakilan,
          jabatan: item.jabatan,
          qrCode: item.qr_code
        })
      });

      const resData = await response.json();
      if (response.ok && resData.ok) {
        showToast(`✅ QR Code berhasil dikirim ke email: ${item.email}`);
      } else {
        alert(`Gagal mengirim email: ${resData.message || 'Terjadi kesalahan pada email server.'}`);
      }
    } catch (err) {
      console.error('Email send error:', err);
      alert('Gagal terhubung ke email server (port 3001). Pastikan server backend "node server/index.js" sudah berjalan.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const filteredList = ormawaList.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.nama_ormawa?.toLowerCase().includes(term) ||
      item.nama_perwakilan?.toLowerCase().includes(term) ||
      item.qr_code?.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term) ||
      item.jabatan?.toLowerCase().includes(term)
    );
  });

  const totalHadir = ormawaList.filter((i) => i.status === 'Hadir').length;

  return (
    <div className="pt-16 p-3 sm:pt-6 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] bg-[#0d1b4d] text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl border border-white/10 flex items-center gap-2.5 animate-bounce text-xs sm:text-sm">
          <span className="material-symbols-outlined text-emerald-400 text-lg sm:text-xl">check_circle</span>
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Warning Alert if Database Migration is missing */}
      {dbError && (
        <div className="bg-amber-50 border-2 border-amber-200 text-amber-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-600 text-xl sm:text-2xl">warning</span>
            <h3 className="font-bold text-sm sm:text-base">Tabel Database Belum Dibuat di Supabase</h3>
          </div>
          <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
            {dbError}
          </p>
          <div className="pt-2 text-[11px] sm:text-xs font-mono bg-amber-100/70 p-2.5 sm:p-3 rounded-xl text-amber-900">
            📌 <strong>Petunjuk:</strong> Buka <strong>Supabase Dashboard ➡️ SQL Editor</strong>, lalu jalankan isi file <code className="font-bold text-blue-900">ormawa_migration.sql</code>.
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1b4d] to-[#1e3a8a] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/10 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider text-blue-200 uppercase">
              Absensi Ormawa
            </span>
          </div>
          <h1 className="text-lg sm:text-3xl font-bold tracking-tight">Management Ormawa & Tamu</h1>
          <p className="text-white/70 text-xs sm:text-base mt-0.5 sm:mt-1 max-w-xl">
            Kelola QR Code khusus delegasi Ormawa / Panitia di luar peserta PKKMB.
          </p>
        </div>

        {/* Compact Action Buttons for Mobile */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Link
            to="/admin/ormawa/riwayat"
            className="px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[20px]">manage_history</span>
            <span>Riwayat</span>
          </Link>

          <Link
            to="/mentor/scanner-ormawa"
            className="px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[20px]">qr_code_scanner</span>
            <span>Scanner</span>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="col-span-2 sm:col-span-1 px-3 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-white text-[#0d1b4d] hover:bg-blue-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[20px]">add_circle</span>
            <span>+ Tambah Ormawa</span>
          </button>
        </div>
      </div>

      {/* Control Card: Time Window & Operating Hours Settings */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex flex-row justify-between items-center gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-2xl">schedule</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-xs sm:text-base">Pengaturan Jam Operasional</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Tentukan rentang jam scanner QR Ormawa.</p>
            </div>
          </div>
          <div className="shrink-0">
            <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${settings.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {settings.isActive ? '🟢 Aktif' : '🔴 Nonaktif'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 items-end pt-1">
          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 truncate">
              Jam Mulai (WIB)
            </label>
            <select
              required
              value={settings.waktuMulai}
              onChange={(e) => setSettings({ ...settings, waktuMulai: e.target.value })}
              className="w-full px-2.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {Array.from({ length: 96 }).map((_, i) => {
                const h = String(Math.floor(i / 4)).padStart(2, '0');
                const m = String((i % 4) * 15).padStart(2, '0');
                const val = `${h}:${m}`;
                return (
                  <option key={val} value={val}>
                    {val} WIB
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 truncate">
              Jam Selesai (WIB)
            </label>
            <select
              required
              value={settings.waktuSelesai}
              onChange={(e) => setSettings({ ...settings, waktuSelesai: e.target.value })}
              className="w-full px-2.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {Array.from({ length: 96 }).map((_, i) => {
                const h = String(Math.floor(i / 4)).padStart(2, '0');
                const m = String((i % 4) * 15).padStart(2, '0');
                const val = `${h}:${m}`;
                return (
                  <option key={val} value={val}>
                    {val} WIB
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 truncate">
              Status Sesi
            </label>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, isActive: !settings.isActive })}
              className={`w-full px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                settings.isActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {settings.isActive ? 'check_circle' : 'cancel'}
              </span>
              <span>{settings.isActive ? 'Sesi ON' : 'Sesi OFF'}</span>
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full py-2 sm:py-2.5 bg-[#0d1b4d] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              {savingSettings ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  <span>Proses...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Simpan Jam</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Stats Summary - 3 Compact Columns on Mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg sm:text-2xl">groups</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Terdaftar</p>
            <p className="text-base sm:text-2xl font-bold text-gray-900 leading-tight">{ormawaList.length}</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg sm:text-2xl">check_circle</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Sudah Hadir</p>
            <p className="text-base sm:text-2xl font-bold text-emerald-600 leading-tight">{totalHadir}</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg sm:text-2xl">pending</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Belum Hadir</p>
            <p className="text-base sm:text-2xl font-bold text-amber-600 leading-tight">{ormawaList.length - totalHadir}</p>
          </div>
        </div>
      </div>

      {/* Main Data Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Search & Actions Bar */}
        <div className="p-3.5 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Cari nama, email, QR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500 self-end sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Realtime Supabase</span>
          </div>
        </div>

        {/* Mobile View: 1 Card Box Per Item (sm:hidden) */}
        <div className="sm:hidden space-y-3 p-3 bg-gray-50/50">
          {loading ? (
            <div className="py-8 text-center text-gray-400">
              <span className="material-symbols-outlined animate-spin text-2xl mb-1 text-blue-500">sync</span>
              <p className="text-xs">Memuat data Ormawa...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <span className="material-symbols-outlined text-3xl mb-1">folder_off</span>
              <p className="text-xs">Belum ada data Ormawa.</p>
            </div>
          ) : (
            filteredList.map((item) => {
              const initials = (item.nama_ormawa || 'OR').slice(0, 2).toUpperCase();
              return (
                <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                  {/* Header Row: Initials Avatar + Name & Subtitle + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#0d1b4d] font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-snug">{item.nama_ormawa}</h4>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {item.nama_perwakilan ? `${item.nama_perwakilan}${item.jabatan ? ` (${item.jabatan})` : ''}` : 'Delegasi'}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 shrink-0 ${
                      item.status === 'Hadir'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Hadir' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      {item.status === 'Hadir' ? 'Hadir' : 'Belum Hadir'}
                    </span>
                  </div>

                  {/* Metadata Row: QR & Email */}
                  <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Kode QR</p>
                      <p className="font-mono text-blue-900 font-bold text-[11px] truncate">{item.qr_code}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Email / Kontak</p>
                      <p className="font-mono text-gray-700 text-[11px] truncate">{item.email || item.kontak || '-'}</p>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2 flex items-center gap-2 border-t border-gray-50">
                    <button
                      onClick={() => handleShowQr(item)}
                      className="flex-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-blue-200/60 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Detail QR</span>
                    </button>

                    <button
                      onClick={() => handleSendEmail(item)}
                      className="flex-1 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200/60 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">mail</span>
                      <span>Kirim QR</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, item.nama_ormawa)}
                      className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center gap-1 border border-red-200/60 transition-colors cursor-pointer"
                      title="Hapus Data"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Kode QR</th>
                <th className="px-6 py-3">Nama Ormawa / Tamu</th>
                <th className="px-6 py-3">Perwakilan</th>
                <th className="px-6 py-3">Email & Kontak</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    <span className="material-symbols-outlined animate-spin text-2xl mb-1 text-blue-500">sync</span>
                    <p className="text-xs">Memuat data Ormawa...</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    <span className="material-symbols-outlined text-3xl mb-1">folder_off</span>
                    <p className="text-xs">Belum ada data Ormawa.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-[#0d1b4d]">
                      {item.qr_code}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-gray-900 text-sm">
                      {item.nama_ormawa}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-gray-800 text-sm">{item.nama_perwakilan || '-'}</div>
                      <div className="text-xs text-gray-400">{item.jabatan || '-'}</div>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-mono">
                      <div className="text-blue-700 font-semibold">{item.email || '-'}</div>
                      <div className="text-gray-500">{item.kontak || '-'}</div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {item.status === 'Hadir' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Hadir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Belum Hadir
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleShowQr(item)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">qr_code</span>
                          <span>QR</span>
                        </button>

                        <button
                          onClick={() => handleSendEmail(item)}
                          title="Kirim QR via Email"
                          className="p-1.5 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">mail</span>
                        </button>

                        <button
                          onClick={() => handleDelete(item.id, item.nama_ormawa)}
                          className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Hapus Data"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Ormawa Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Tambah Ormawa / Tamu</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg sm:text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nama Ormawa / Komunitas / Tamu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BEM KBM / DPM"
                  value={formData.namaOrmawa}
                  onChange={(e) => setFormData({ ...formData, namaOrmawa: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nama Perwakilan / Delegasi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ahmad Rizky"
                  value={formData.namaPerwakilan}
                  onChange={(e) => setFormData({ ...formData, namaPerwakilan: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Jabatan / Peran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ketua Umum / Sekretaris"
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email Delegasi (Kirim QR)
                </label>
                <input
                  type="email"
                  placeholder="Contoh: ormawa@univ.ac.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  No. WhatsApp / Kontak
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={formData.kontak}
                  onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 sm:gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0d1b4d] hover:bg-blue-900 text-white font-medium rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan & Buat QR</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tampilkan, Download & Kirim Email QR Code */}
      {showQrModal && selectedOrmawa && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl text-center space-y-3.5 border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600">Kartu QR Code Ormawa</span>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl">close</span>
              </button>
            </div>

            <div className="space-y-0.5">
              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">{selectedOrmawa.nama_ormawa}</h3>
              <p className="text-xs text-gray-500">{selectedOrmawa.nama_perwakilan ? `${selectedOrmawa.nama_perwakilan} (${selectedOrmawa.jabatan || 'Utusan'})` : 'Delegasi Resmi'}</p>
              {selectedOrmawa.email && <p className="text-[11px] font-mono text-blue-600">{selectedOrmawa.email}</p>}
            </div>

            {/* QR Image Frame */}
            <div className="p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-200 inline-block shadow-inner">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code Ormawa" className="w-44 h-44 sm:w-56 sm:h-56 mx-auto object-contain rounded-lg" />
              ) : (
                <div className="w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center">
                  <span className="material-symbols-outlined animate-spin text-2xl text-gray-400">sync</span>
                </div>
              )}
            </div>

            <div className="text-[11px] sm:text-xs font-mono bg-blue-50 py-1.5 px-3 rounded-lg text-blue-800 font-bold inline-block">
              {selectedOrmawa.qr_code}
            </div>

            <div className="pt-1 flex flex-col gap-2">
              <button
                onClick={() => handleSendEmail(selectedOrmawa)}
                disabled={isSendingEmail}
                className="w-full py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl sm:rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs sm:text-sm"
              >
                {isSendingEmail ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">sync</span>
                    <span>Mengirim Email...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">mail</span>
                    <span>Kirim QR via Email</span>
                  </>
                )}
              </button>

              <button
                onClick={downloadQrCode}
                className="w-full py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs sm:text-sm"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download Gambar QR</span>
              </button>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-1 text-gray-500 hover:text-gray-700 text-[11px] font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
