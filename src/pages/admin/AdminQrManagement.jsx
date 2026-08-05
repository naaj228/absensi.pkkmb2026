import { useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { sendQrEmail, sendBulkQrEmail, checkEmailServerHealth } from '../../lib/emailService';

export default function AdminQrManagement() {
  const { peserta, gugus, updatePeserta, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGugus, setSelectedGugus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Selected student for QR Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Email Server & API Health status
  const [emailServerOnline, setEmailServerOnline] = useState(true);

  useEffect(() => {
    checkEmailServerHealth().then(res => {
      setEmailServerOnline(res.ok);
    });
  }, []);

  // Filtered participants list
  const filteredStudents = peserta.filter(student => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = student.name.toLowerCase().includes(term) || 
                          student.id.includes(term) || 
                          (student.fakultas && student.fakultas.toLowerCase().includes(term));
    const matchesGugus = selectedGugus === 'all' || student.gugusId === selectedGugus;
    return matchesSearch && matchesGugus;
  });

  // Pagination calculation
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

  const getGugusName = (gugusId) => {
    if (!gugusId) return 'Belum Ditentukan';
    const g = gugus.find(item => item.id === gugusId);
    return g ? g.name : gugusId;
  };

  // Download QR Code PNG untuk peserta tertentu
  const handleDownloadQr = useCallback(async (student) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(student.id)}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-${student.name.replace(/\s+/g, '_')}-${student.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh QR Code. Pastikan koneksi internet tersedia.');
    }
  }, []);

  // ── Single QR email send ──────────────────────────────────────────────────
  const [emailSending, setEmailSending] = useState(false);
  const handleEmailQr = useCallback(async (student) => {
    if (emailSending) return;
    setEmailSending(true);
    const groupName = getGugusName(student.gugusId);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(student.id)}`;
    const result = await sendQrEmail({
      toEmail: student.email,
      toName:  student.name,
      nim:     student.id,
      gugus:   groupName,
      mentor:  '',
      qrUrl,
    });
    setEmailSending(false);
    alert(result.message);
  }, [emailSending]);

  // ── Bulk QR email send ────────────────────────────────────────────────────
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { current, total, sent, failed, done, errors }
  const [bulkPauseMsg, setBulkPauseMsg] = useState('');
  const bulkAbort = useRef(false);

  const handleBulkEmailSend = async () => {
    if (peserta.length === 0) { alert('Tidak ada data peserta.'); return; }
    setShowBulkModal(true);
    bulkAbort.current = false;
    setBulkPauseMsg('');
    setBulkProgress({ current: 0, total: peserta.length, sent: 0, failed: 0, done: false });

    // Siapkan data untuk semua peserta
    const students = peserta.map(p => {
      const groupName = getGugusName(p.gugusId);
      return {
        toEmail: p.email,
        toName:  p.name,
        nim:     p.id,
        gugus:   groupName,
        mentor:  '',
        qrUrl:   `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(p.id)}`,
      };
    });

    try {
      const result = await sendBulkQrEmail(students, (event) => {
        if (event.type === 'progress') {
          setBulkProgress({ current: event.current, total: event.total, sent: event.sent, failed: event.failed, done: false });
          setBulkPauseMsg('');
        } else if (event.type === 'batch_pause') {
          setBulkPauseMsg(event.message);
        }
      });
      setBulkProgress(prev => ({ ...prev, ...result, done: true }));
    } catch (err) {
      setBulkProgress(prev => ({ ...prev, done: true, errorMsg: err.message }));
    }
  };

  const handleDownloadAllZip = async () => {
    if (peserta.length === 0) {
      alert('Tidak ada data peserta untuk diunduh.');
      return;
    }
    
    alert('Sedang membuat file ZIP berisi ID Card & QR Code seluruh peserta. Proses ini membutuhkan waktu beberapa saat...');
    
    try {
      const API_BASE = (import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001') + '/api';
      const studentsData = peserta.map(p => ({
        id: p.id,
        name: p.name,
        gugusName: getGugusName(p.gugusId)
      }));
      
      const res = await fetch(`${API_BASE}/generate-gugus-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsData })
      });
      
      if (!res.ok) {
        throw new Error('Gagal menghubungi backend email. Pastikan server sudah dijalankan.');
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ID_Cards_PKKMB_All.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('File ZIP berhasil dibuat dan mulai diunduh!');
    } catch (err) {
      alert(`Gagal membuat file ZIP: ${err.message}. Pastikan server email berjalan.`);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-sm font-headline-md text-on-surface">Manajemen QR Code</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>
            {hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>
          
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col w-full gap-gutter">
          
          {/* Email Server Status Alert Banner */}
          {!emailServerOnline && (
            <div className="bg-error/10 border border-error/20 rounded-2xl p-5 flex items-center gap-4 text-error relative z-10">
              <span className="material-symbols-outlined text-[32px]">error</span>
              <div className="flex-1">
                <h4 className="font-semibold text-body-md">Server Email & ID Card Offline</h4>
                <p className="text-body-sm text-error/85 mt-0.5">Kirim email massal dan unduh ZIP membutuhkan server backend aktif. Jalankan perintah <code className="bg-error/15 px-1.5 py-0.5 rounded font-mono text-xs font-bold text-error">npm run dev:all</code> di terminal Anda untuk mengaktifkan seluruh fitur.</p>
              </div>
            </div>
          )}
          
          {/* Dashboard Header Panel */}
          <div className="bg-surface-container rounded-[24px] p-6 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px]">qr_code_2</span>
              </div>
              <div>
                <h2 className="text-headline-md font-headline-md text-on-surface">QR Code Unik Peserta</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">Setiap peserta mendapatkan QR Code unik berisi NIM untuk dipindai oleh Mentor saat absensi.</p>
              </div>
            </div>
            {/* Bulk Actions Panel */}
            <div className="flex flex-wrap gap-3 z-10">
              <button onClick={handleDownloadAllZip} className="bg-surface border border-outline-variant hover:bg-surface-variant text-on-surface px-4 py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center gap-2 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Unduh Semua ZIP
              </button>
              <button
                onClick={handleBulkEmailSend}
                disabled={showBulkModal}
                className="bg-primary text-on-primary hover:bg-primary-fixed shadow-md px-4 py-2.5 rounded-xl text-label-md font-label-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                Kirim Email Massal ({peserta.length})
              </button>
            </div>
          </div>

          {/* Stats Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="bg-surface rounded-xl p-5 shadow-sm border border-outline-variant/30 flex items-center justify-between">
              <div>
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total QR Dibuat</p>
                <p className="text-headline-lg font-bold text-on-surface mt-1">{peserta.length} QR</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-primary/40">qr_code</span>
            </div>
            <div className="bg-surface rounded-xl p-5 shadow-sm border border-outline-variant/30 flex items-center justify-between">
              <div>
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Gugus Terdaftar</p>
                <p className="text-headline-lg font-bold text-on-surface mt-1">{gugus.length} Gugus</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-secondary/40">grid_view</span>
            </div>
            <div className="bg-[#ecfdf5] rounded-xl p-5 shadow-sm border border-[#a7f3d0]/30 flex items-center justify-between">
              <div>
                <p className="text-label-sm text-[#059669] uppercase tracking-wider">Telah Absen Scan</p>
                <p className="text-headline-lg font-bold text-[#059669] mt-1">
                  {peserta.filter(p => ['Hadir Penuh','Hadir Sebagian','Izin'].includes(p.status)).length} <span className="text-xs text-on-surface-variant font-normal">/{peserta.length}</span>
                </p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-[#059669]/40">check_circle</span>
            </div>
          </div>

          {/* Main Table Directory */}
          <div className="bg-surface-container rounded-xl shadow-sm overflow-hidden flex flex-col w-full relative z-10">
            <div className="p-6 pb-4 border-b border-surface-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Direktori QR Code Peserta</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                  <input 
                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-surface rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" 
                    placeholder="Cari Nama, NIM, Jurusan..." 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  />
                </div>
                <div className="relative group">
                  <select 
                    className="w-full sm:w-40 appearance-none pl-4 pr-10 py-2.5 bg-surface rounded-lg text-body-sm font-body-sm text-on-surface border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors cursor-pointer" 
                    value={selectedGugus} 
                    onChange={(e) => { setSelectedGugus(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">Semua Gugus</option>
                    {gugus.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface/50 border-b border-surface-variant">
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Nama Peserta</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">NIM</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Gugus</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Jurusan</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {currentItems.length > 0 ? (
                    currentItems.map((student) => (
                      <tr key={student.id} className="hover:bg-surface-variant/30 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary-container/50 text-secondary font-headline-sm flex items-center justify-center border border-secondary/10 shrink-0 font-bold">
                              {student.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-body-md font-body-md text-on-surface font-medium truncate group-hover:text-primary transition-colors">{student.name}</p>
                              <p className="text-label-sm font-label-sm text-on-surface-variant truncate">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-body-sm font-body-sm text-on-surface font-mono bg-surface px-2 py-1 rounded-md border border-outline-variant/30">{student.id}</span>
                        </td>
                        <td className="py-4 px-6 text-body-sm text-on-surface">
                          {getGugusName(student.gugusId)}
                        </td>
                        <td className="py-4 px-6 text-body-sm text-on-surface-variant truncate max-w-[150px]">
                          {student.fakultas || '-'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setSelectedStudent(student)} className="px-3 py-1.5 text-primary hover:bg-primary/5 rounded-lg text-label-sm font-label-md transition-colors flex items-center gap-1 cursor-pointer" title="Lihat QR Code">
                              <span className="material-symbols-outlined text-[16px]">qr_code</span>
                              Lihat QR
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-on-surface-variant text-body-md">Tidak ada data peserta ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-4 border-t border-surface-variant flex items-center justify-between bg-surface/30">
              <span className="text-body-sm font-body-sm text-on-surface-variant">Menampilkan {indexOfFirstItem + 1} sampai {Math.min(indexOfLastItem, totalItems)} dari {totalItems} entri</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-md transition-colors disabled:opacity-50" disabled={currentPage === 1}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-label-sm font-label-md transition-colors ${
                    currentPage === i + 1 ? 'bg-primary text-on-primary' : 'hover:bg-surface-variant text-on-surface'
                  }`}>{i + 1}</button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-md transition-colors disabled:opacity-50" disabled={currentPage === totalPages}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* SINGLE PARTICIPANT QR MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-md" onClick={() => setSelectedStudent(null)}></div>
          <div className="relative w-full max-w-sm bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col z-10 border border-outline-variant/30">
            <div className="bg-primary p-6 text-on-primary flex items-center justify-between">
              <div>
                <h3 className="text-headline-sm font-headline-md">QR Code Peserta</h3>
                <p className="text-label-sm opacity-80 mt-1">Gugus: {getGugusName(selectedStudent.gugusId)}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-on-primary hover:bg-white/10 p-1 rounded-full cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col items-center text-center">
              <p className="text-headline-md font-bold text-on-surface mb-1">{selectedStudent.name}</p>
              <p className="text-body-md text-on-surface-variant font-mono mb-6">NIM: {selectedStudent.id}</p>
              
              {/* Real dynamic QR Code generated using public QR Server API */}
              <div className="w-56 h-56 bg-white rounded-xl p-3 border border-outline-variant/30 flex items-center justify-center shadow-md relative overflow-hidden group mb-6">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedStudent.id)}`} 
                  alt={`QR Code NIM: ${selectedStudent.id}`}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => handleDownloadQr(selectedStudent)}
                  className="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center justify-center gap-2 border border-outline-variant cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Unduh PNG
                </button>
                <button
                  onClick={() => handleEmailQr(selectedStudent)}
                  disabled={emailSending}
                  className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center justify-center gap-2 shadow-md hover:bg-primary-fixed cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {emailSending ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                      Kirim Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK EMAIL PROGRESS MODAL ──────────────────────────────────── */}
      {showBulkModal && bulkProgress && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col z-10 border border-outline-variant/30">

            {/* Header */}
            <div className={`p-6 text-on-primary flex items-center gap-3 ${bulkProgress.done ? (bulkProgress.errorMsg ? 'bg-error' : 'bg-[#059669]') : 'bg-primary'}`}>
              <span className={`material-symbols-outlined text-[28px] ${!bulkProgress.done ? 'animate-spin' : ''}`}>
                {bulkProgress.done ? (bulkProgress.errorMsg ? 'error' : 'check_circle') : 'progress_activity'}
              </span>
              <div>
                <h3 className="text-headline-sm font-headline-md">
                  {bulkProgress.done
                    ? (bulkProgress.errorMsg ? 'Pengiriman Gagal' : 'Pengiriman Selesai!')
                    : 'Mengirim QR Code...'}
                </h3>
                <p className="text-label-sm opacity-80 mt-0.5">
                  {bulkProgress.done
                    ? `${bulkProgress.sent} berhasil, ${bulkProgress.failed} gagal`
                    : `${bulkProgress.current} / ${bulkProgress.total} peserta`}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">

              {/* Progress Bar */}
              {!bulkProgress.done && (
                <div>
                  <div className="flex justify-between text-label-sm text-on-surface-variant mb-2">
                    <span>Progress</span>
                    <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-display-sm font-bold text-primary">{bulkProgress.current}</p>
                  <p className="text-label-xs text-on-surface-variant mt-1">Diproses</p>
                </div>
                <div className="bg-[#ecfdf5] rounded-xl p-3 text-center">
                  <p className="text-display-sm font-bold text-[#059669]">{bulkProgress.sent}</p>
                  <p className="text-label-xs text-[#059669] mt-1">Terkirim</p>
                </div>
                <div className="bg-[#fef2f2] rounded-xl p-3 text-center">
                  <p className="text-display-sm font-bold text-[#dc2626]">{bulkProgress.failed}</p>
                  <p className="text-label-xs text-[#dc2626] mt-1">Gagal</p>
                </div>
              </div>

              {/* Batch pause notice */}
              {bulkPauseMsg && !bulkProgress.done && (
                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#d97706] text-[20px]">hourglass_top</span>
                  <p className="text-body-sm text-[#92400e]">{bulkPauseMsg}</p>
                </div>
              )}

              {/* Error msg jika koneksi gagal */}
              {bulkProgress.errorMsg && (
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3">
                  <p className="text-body-sm text-error font-medium mb-1">Terjadi kesalahan:</p>
                  <p className="text-body-sm text-error/80 font-mono text-xs break-all">{bulkProgress.errorMsg}</p>
                </div>
              )}

              {/* Error list jika ada yang gagal */}
              {bulkProgress.done && bulkProgress.errors?.length > 0 && (
                <div className="bg-surface-container rounded-xl p-3 max-h-28 overflow-y-auto">
                  <p className="text-label-sm font-semibold text-on-surface mb-2">Email yang gagal:</p>
                  {bulkProgress.errors.map((e, i) => (
                    <p key={i} className="text-label-xs text-on-surface-variant font-mono py-0.5">
                      {e.nim} — {e.toEmail}: {e.error}
                    </p>
                  ))}
                </div>
              )}

              {/* Gmail limit info */}
              {!bulkProgress.done && (
                <p className="text-label-xs text-on-surface-variant text-center">
                  Pengiriman dibatasi 50 email/menit sesuai batas Gmail.<br/>
                  Jangan tutup tab ini selama proses berlangsung.
                </p>
              )}
            </div>

            {/* Footer */}
            {bulkProgress.done && (
              <div className="px-6 pb-6">
                <button
                  onClick={() => { setShowBulkModal(false); setBulkProgress(null); setBulkPauseMsg(''); }}
                  className="w-full bg-primary text-on-primary py-3 rounded-xl text-label-md font-label-md hover:bg-primary-fixed transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
