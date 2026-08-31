import { useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { sendQrEmail, sendBulkQrEmail, checkEmailServerHealth } from '../../lib/emailService';

export default function AdminQrManagement() {
  const { peserta, gugus, hasAdminNotifications } = useContext(AppContext);
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

  // Track email sent count per student ID from localStorage
  const [emailSentCounts, setEmailSentCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('pkkmb_email_sent_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const recordEmailSent = useCallback((studentId) => {
    setEmailSentCounts(prev => {
      const nextCount = (prev[studentId] || 0) + 1;
      const updated = { ...prev, [studentId]: nextCount };
      try {
        localStorage.setItem('pkkmb_email_sent_counts', JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save email sent counts", err);
      }
      return updated;
    });
  }, []);

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

  const getGugusName = useCallback((gugusId) => {
    if (!gugusId) return 'Belum Ditentukan';
    const g = gugus.find(item => item.id === gugusId);
    return g ? g.name : gugusId;
  }, [gugus]);

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

  // Single QR email send
  const [emailSending, setEmailSending] = useState(false);
  const handleEmailQr = useCallback(async (student) => {
    if (!student || emailSending) return;
    
    const count = emailSentCounts[student.id] || 0;
    let confirmMessage = `Apakah Anda yakin ingin mengirim email QR Code & ID Card ke ${student.name} (${student.email})?`;
    
    if (count >= 2) {
      confirmMessage = `⚠️ PERINGATAN: Email QR Code ke ${student.name} (${student.email}) SUDAH DIKIRIM SEBANYAK ${count} KALI!\n\nApakah Anda tetap YAKIN ingin mengirim ulang email lagi (Pengiriman ke-${count + 1})?`;
    } else if (count === 1) {
      confirmMessage = `📧 Email QR Code ke ${student.name} (${student.email}) sudah pernah dikirim 1 kali.\n\nApakah Anda yakin ingin mengirim ulang email ini?`;
    }
    
    window.confirmAction(confirmMessage, async () => {
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
        prodi:   student.fakultas,
      });
      
      setEmailSending(false);
      
      if (result.ok || result.success || (result.message && !result.message.toLowerCase().includes('gagal'))) {
        recordEmailSent(student.id);
        const newCount = count + 1;
        if (newCount >= 2) {
          alert(`⚠️ Email QR Code berhasil dikirim ke ${student.name}! (Total email terkirim: ${newCount}x)`);
        } else {
          alert(result.message || `Email QR Code berhasil dikirim ke ${student.name}!`);
        }
      } else {
        alert(result.message || 'Gagal mengirim email.');
      }
    });
  }, [emailSending, getGugusName, emailSentCounts, recordEmailSent]);

  // Bulk QR email send
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [bulkPauseMsg, setBulkPauseMsg] = useState('');
  const bulkAbort = useRef(false);

  const handleBulkEmailSend = async () => {
    if (peserta.length === 0) { alert('Tidak ada data peserta.'); return; }
    
    window.confirmAction(`Apakah Anda yakin ingin mengirim email QR Code & ID Card secara massal ke seluruh ${peserta.length} peserta?`, async () => {
      setShowBulkModal(true);
      bulkAbort.current = false;
      setBulkPauseMsg('');
      setBulkProgress({ current: 0, total: peserta.length, sent: 0, failed: 0, done: false });

      const students = peserta.map(p => {
        const groupName = getGugusName(p.gugusId);
        return {
          toEmail: p.email,
          toName:  p.name,
          nim:     p.id,
          gugus:   groupName,
          mentor:  '',
          qrUrl:   `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(p.id)}`,
          prodi:   p.fakultas,
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

        // Record bulk sent counts
        setEmailSentCounts(prev => {
          const updated = { ...prev };
          peserta.forEach(p => {
            updated[p.id] = (updated[p.id] || 0) + 1;
          });
          try {
            localStorage.setItem('pkkmb_email_sent_counts', JSON.stringify(updated));
          } catch (e) {
            console.error("Failed saving bulk email counts", e);
          }
          return updated;
        });

        setBulkProgress(prev => ({ ...prev, ...result, done: true }));
      } catch (err) {
        setBulkProgress(prev => ({ ...prev, done: true, errorMsg: err.message }));
      }
    });
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
        gugusName: getGugusName(p.gugusId),
        prodi: p.fakultas
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
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header - Fixed to top, properly padded for mobile hamburger menu */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">qr_code_2</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Manajemen QR Code
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div 
            className="relative group cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/admin/notifikasi')}
            title="Notifikasi Admin"
          >
            <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors text-[22px] sm:text-[24px]">notifications</span>
            {hasAdminNotifications && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-20 px-3 sm:px-6 lg:px-8 max-w-container-max mx-auto space-y-4 sm:space-y-6">
        
        {/* Email Server Status Alert Banner */}
        {!emailServerOnline && (
          <div className="bg-error/10 border border-error/20 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-3.5 text-error relative z-10">
            <span className="material-symbols-outlined text-[26px] sm:text-[32px] shrink-0 mt-0.5 sm:mt-0">error</span>
            <div className="flex-1">
              <h4 className="font-bold text-body-sm sm:text-body-md">Server Email & ID Card Offline</h4>
              <p className="text-[11px] sm:text-body-sm text-error/90 mt-0.5 leading-relaxed">
                Kirim email massal dan unduh ZIP membutuhkan server backend aktif. Jalankan perintah <code className="bg-error/15 px-1.5 py-0.5 rounded font-mono text-[10px] sm:text-xs font-bold text-error">npm run dev:all</code> di terminal Anda.
              </p>
            </div>
          </div>
        )}
        
        {/* Dashboard Header Panel */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-[#012060]/5 rounded-full blur-3xl group-hover:bg-[#012060]/10 transition-colors"></div>
          <div className="relative z-10 flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#012060]/10 text-[#012060] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px] sm:text-[34px]">qr_code_2</span>
            </div>
            <div>
              <h2 className="text-body-lg sm:text-headline-md font-bold text-[#012060]">QR Code Unik Peserta</h2>
              <p className="text-[11px] sm:text-body-sm text-slate-500 mt-0.5 leading-relaxed">
                Setiap peserta memiliki QR Code unik berisi NIM untuk dipindai Mentor saat absensi.
              </p>
            </div>
          </div>

          {/* Bulk Actions Panel */}
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-2.5 z-10 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <button 
              onClick={handleDownloadAllZip} 
              className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-label-md font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px] text-[#012060]">download</span>
              <span>Unduh Semua ZIP</span>
            </button>
            <button
              onClick={handleBulkEmailSend}
              disabled={showBulkModal}
              className="w-full sm:w-auto bg-[#012060] hover:bg-[#022b80] text-white shadow-md px-4 py-2.5 rounded-xl text-label-md font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Kirim Email Massal ({peserta.length})</span>
            </button>
          </div>
        </div>

        {/* Stats Widgets */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <div>
              <p className="text-[9px] sm:text-label-sm font-bold text-slate-400 uppercase tracking-wider">Total QR</p>
              <p className="text-body-lg sm:text-headline-lg font-extrabold text-[#012060] mt-0.5 sm:mt-1">{peserta.length}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#012060]/5 hidden sm:flex items-center justify-center text-[#012060]">
              <span className="material-symbols-outlined text-[20px]">qr_code</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <div>
              <p className="text-[9px] sm:text-label-sm font-bold text-slate-400 uppercase tracking-wider">Gugus</p>
              <p className="text-body-lg sm:text-headline-lg font-extrabold text-[#012060] mt-0.5 sm:mt-1">{gugus.length}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#012060]/5 hidden sm:flex items-center justify-center text-[#012060]">
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 rounded-2xl p-3 sm:p-5 shadow-sm border border-emerald-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <div>
              <p className="text-[9px] sm:text-label-sm font-bold text-emerald-700 uppercase tracking-wider">Sudah Absen</p>
              <p className="text-body-lg sm:text-headline-lg font-extrabold text-emerald-700 mt-0.5 sm:mt-1">
                {peserta.filter(p => ['Hadir Penuh','Hadir Sebagian','Izin'].includes(p.status)).length}
                <span className="text-[10px] sm:text-xs font-normal text-emerald-600/80">/{peserta.length}</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 hidden sm:flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col w-full relative z-10">
          
          {/* Filter & Search Toolbar */}
          <div className="p-4 sm:p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <h2 className="text-body-md sm:text-headline-sm font-bold text-[#012060]">Direktori QR Code Peserta</h2>
            
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search Box */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input 
                  className="w-full sm:w-64 pl-10 pr-9 py-2.5 bg-[#f8fafc] rounded-xl text-body-sm font-semibold text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all" 
                  placeholder="Cari Nama, NIM, Jurusan..." 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* Gugus Select Dropdown */}
              <div className="relative group">
                <select 
                  className="w-full sm:w-44 appearance-none pl-3.5 pr-9 py-2.5 bg-[#f8fafc] rounded-xl text-body-sm font-semibold text-slate-800 border border-slate-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all cursor-pointer" 
                  value={selectedGugus} 
                  onChange={(e) => { setSelectedGugus(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">Semua Gugus</option>
                  {gugus.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
              </div>
            </div>
          </div>

          {/* MOBILE VIEW GRID (2 Kolom pada Layar Mobile < md) */}
          <div className="block md:hidden p-3 bg-slate-50/50 border-b border-slate-100">
            {currentItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {currentItems.map((student) => {
                  const isAttended = ['Hadir Penuh', 'Hadir Sebagian', 'Izin'].includes(student.status);

                  return (
                    <div 
                      key={student.id} 
                      className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200/80 flex flex-col justify-between gap-2.5 hover:shadow-md hover:border-[#012060]/30 transition-all relative overflow-hidden group"
                    >
                      {/* Card Top: Status Badge */}
                      <div className="flex items-center justify-end">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 border ${
                          isAttended 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200/80'
                        }`}>
                          {isAttended ? student.status : 'Belum Scan'}
                        </span>
                      </div>

                      {/* Highlighted Info: Name & NIM Badge */}
                      <div className="overflow-hidden">
                        <h4 className="text-body-sm font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors leading-snug" title={student.name}>
                          {student.name}
                        </h4>
                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[#012060]/5 border border-[#012060]/10">
                          <span className="text-[8px] font-extrabold uppercase text-slate-400">NIM</span>
                          <span className="text-[10px] font-bold text-[#012060] font-mono tracking-tight">{student.id}</span>
                        </div>
                      </div>

                      {/* Gugus & Jurusan Info */}
                      <div className="text-[10px] space-y-0.5 text-slate-500 border-t border-slate-100 pt-2 font-medium">
                        <div className="flex items-center gap-1 text-[#012060] font-semibold truncate">
                          <span className="material-symbols-outlined text-[13px] shrink-0 text-[#012060]">grid_view</span>
                          <span className="truncate">{getGugusName(student.gugusId)}</span>
                        </div>
                        <div className="truncate text-slate-400 text-[9.5px]">
                          {student.fakultas || 'Belum ditentukan'}
                        </div>
                      </div>

                      {/* Highlighted Primary Action + Secondary Buttons */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        {/* HIGHLIGHTED MAIN BUTTON: LIHAT QR */}
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="w-full py-2 bg-[#012060] hover:bg-[#022b80] active:scale-95 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                          <span>Lihat QR</span>
                        </button>

                        {/* Secondary Actions */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleDownloadQr(student)}
                            className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors border border-slate-200/60"
                            title="Unduh PNG"
                          >
                            <span className="material-symbols-outlined text-[13px]">download</span>
                            <span>PNG</span>
                          </button>

                          <button
                            onClick={() => handleEmailQr(student)}
                            className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors border ${
                              (emailSentCounts[student.id] || 0) >= 2
                                ? 'bg-amber-100/90 text-amber-900 border-amber-300 font-extrabold shadow-xs'
                                : (emailSentCounts[student.id] || 0) === 1
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            }`}
                            title={`Status Email: ${(emailSentCounts[student.id] || 0)}x terkirim`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {(emailSentCounts[student.id] || 0) >= 2 ? 'warning' : 'mail'}
                            </span>
                            <span>
                              {(emailSentCounts[student.id] || 0) > 0 
                                ? `Email (${emailSentCounts[student.id]}x)` 
                                : 'Email'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-body-sm">
                Tidak ada data peserta ditemukan.
              </div>
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on screen >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100">
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Peserta</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIM</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gugus</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jurusan</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.length > 0 ? (
                  currentItems.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="min-w-0">
                          <p className="text-body-md font-bold text-slate-800 truncate group-hover:text-primary transition-colors">{student.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{student.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-body-sm font-semibold text-slate-700 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">{student.id}</span>
                      </td>
                      <td className="py-4 px-6 text-body-sm font-semibold text-slate-700">
                        {getGugusName(student.gugusId)}
                      </td>
                      <td className="py-4 px-6 text-body-sm text-slate-500 truncate max-w-[150px]">
                        {student.fakultas || '-'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setSelectedStudent(student)} 
                            className="px-3 py-1.5 bg-[#012060]/5 hover:bg-[#012060]/10 text-[#012060] rounded-xl text-label-sm font-bold transition-colors flex items-center gap-1 cursor-pointer" 
                            title="Lihat QR Code"
                          >
                            <span className="material-symbols-outlined text-[16px]">qr_code</span>
                            Lihat QR
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-slate-400 text-body-md">Tidak ada data peserta ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer - Responsive */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#f8fafc]/50">
            <span className="text-[11px] sm:text-body-sm font-medium text-slate-500 text-center sm:text-left">
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} dari {totalItems} entri
            </span>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors text-label-sm font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1 border border-slate-200" 
                disabled={currentPage === 1}
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              <span className="px-3 py-1 text-label-sm font-bold text-[#012060] bg-white border border-slate-200 rounded-xl">
                {currentPage} / {totalPages}
              </span>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors text-label-sm font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1 border border-slate-200" 
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* SINGLE PARTICIPANT QR MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}></div>
          <div className="relative w-full max-w-sm bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col z-10 border border-slate-100 animate-fade-in">
            <div className="bg-[#012060] p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-body-lg font-bold">QR Code Peserta</h3>
                <p className="text-[11px] text-white/80 mt-0.5">Gugus: {getGugusName(selectedStudent.gugusId)}</p>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 sm:p-6 flex flex-col items-center text-center">
              <p className="text-body-lg sm:text-headline-md font-bold text-slate-800 mb-0.5">{selectedStudent.name}</p>
              <p className="text-body-sm text-slate-500 font-mono mb-5">NIM: {selectedStudent.id}</p>
              
              {/* Dynamic QR Code generated using public QR Server API */}
              <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white rounded-2xl p-3 border border-slate-200 flex items-center justify-center shadow-sm relative overflow-hidden mb-5">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedStudent.id)}`} 
                  alt={`QR Code NIM: ${selectedStudent.id}`}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex gap-2.5 w-full">
                <button
                  onClick={() => handleDownloadQr(selectedStudent)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl text-label-md font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Unduh PNG
                </button>
                <button
                  onClick={() => handleEmailQr(selectedStudent)}
                  disabled={emailSending}
                  className={`flex-1 py-3 rounded-2xl text-label-md font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    (emailSentCounts[selectedStudent.id] || 0) >= 2
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-[#012060] hover:bg-[#022b80] text-white'
                  }`}
                >
                  {emailSending ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        {(emailSentCounts[selectedStudent.id] || 0) >= 2 ? 'warning' : 'mail'}
                      </span>
                      <span>
                        {(emailSentCounts[selectedStudent.id] || 0) > 0 
                          ? `Kirim Email (${emailSentCounts[selectedStudent.id]}x)` 
                          : 'Kirim Email'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK EMAIL PROGRESS MODAL */}
      {showBulkModal && bulkProgress && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col z-10 border border-slate-100 animate-fade-in">

            {/* Header */}
            <div className={`p-5 text-white flex items-center gap-3 ${bulkProgress.done ? (bulkProgress.errorMsg ? 'bg-rose-600' : 'bg-emerald-600') : 'bg-[#012060]'}`}>
              <span className={`material-symbols-outlined text-[26px] ${!bulkProgress.done ? 'animate-spin' : ''}`}>
                {bulkProgress.done ? (bulkProgress.errorMsg ? 'error' : 'check_circle') : 'sync'}
              </span>
              <div>
                <h3 className="text-body-lg font-bold">
                  {bulkProgress.done
                    ? (bulkProgress.errorMsg ? 'Pengiriman Gagal' : 'Pengiriman Selesai!')
                    : 'Mengirim QR Code...'}
                </h3>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {bulkProgress.done
                    ? `${bulkProgress.sent} berhasil, ${bulkProgress.failed} gagal`
                    : `${bulkProgress.current} / ${bulkProgress.total} peserta`}
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">

              {/* Progress Bar */}
              {!bulkProgress.done && (
                <div>
                  <div className="flex justify-between text-body-sm font-semibold text-slate-600 mb-1.5">
                    <span>Progress Pengiriman</span>
                    <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#012060] rounded-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <p className="text-headline-sm font-bold text-[#012060]">{bulkProgress.current}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Diproses</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                  <p className="text-headline-sm font-bold text-emerald-600">{bulkProgress.sent}</p>
                  <p className="text-[10px] font-bold text-emerald-600/80 uppercase mt-0.5">Terkirim</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-center">
                  <p className="text-headline-sm font-bold text-rose-600">{bulkProgress.failed}</p>
                  <p className="text-[10px] font-bold text-rose-600/80 uppercase mt-0.5">Gagal</p>
                </div>
              </div>

              {/* Batch pause notice */}
              {bulkPauseMsg && !bulkProgress.done && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center gap-2.5 text-amber-800">
                  <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">hourglass_top</span>
                  <p className="text-[11px] font-medium leading-tight">{bulkPauseMsg}</p>
                </div>
              )}

              {/* Error msg if server connection fails */}
              {bulkProgress.errorMsg && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
                  <p className="text-body-sm text-rose-700 font-bold mb-0.5">Terjadi kesalahan:</p>
                  <p className="text-[11px] text-rose-600 font-mono break-all">{bulkProgress.errorMsg}</p>
                </div>
              )}

              {/* Error list if some failed */}
              {bulkProgress.done && bulkProgress.errors?.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-28 overflow-y-auto">
                  <p className="text-[11px] font-bold text-slate-700 mb-1">Email yang gagal:</p>
                  {bulkProgress.errors.map((e, i) => (
                    <p key={i} className="text-[10px] text-slate-500 font-mono py-0.5">
                      {e.nim} — {e.toEmail}: {e.error}
                    </p>
                  ))}
                </div>
              )}

              {/* Gmail limit info */}
              {!bulkProgress.done && (
                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                  Pengiriman dibatasi 50 email/menit sesuai kuota Gmail.<br/>
                  Harap tetap buka halaman ini selama proses berlangsung.
                </p>
              )}
            </div>

            {/* Footer */}
            {bulkProgress.done && (
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <button
                  onClick={() => { setShowBulkModal(false); setBulkProgress(null); setBulkPauseMsg(''); }}
                  className="w-full bg-[#012060] hover:bg-[#022b80] text-white py-3 rounded-2xl text-label-md font-bold transition-all shadow-md cursor-pointer"
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
