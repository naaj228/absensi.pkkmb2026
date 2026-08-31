import { useContext, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { sendQrEmail } from '../../lib/emailService';
import { isHadir, STATUS_OPTIONS, getStatusBadge } from '../../utils/statusHelper';

export default function AdminPesertaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { peserta, gugus, mentors, logs, updatePeserta, deletePeserta, addLog } = useContext(AppContext);

  // Find the student
  const student = peserta.find(p => p.id === id);

  // Email sending state & count tracking
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentCounts, setEmailSentCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('pkkmb_email_sent_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // QR Code URL — same format as AdminQrManagement: NIM encoded into QR
  const qrUrl = student 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(student.id)}`
    : '';

  // Find gugus & mentor details
  const group = student ? gugus.find(g => g.id === student.gugusId) : null;
  const groupName = group ? group.name : '-';
  const mentor = (group && group.mentorId && group.mentorId !== 'Unassigned')
    ? mentors.find(m => m.id === group.mentorId)
    : (student?.gugusId ? mentors.find(m => m.gugusId === student.gugusId && m.gugusId !== 'Unassigned') : null);
  const mentorName = mentor ? mentor.name : 'Belum Ditentukan';

  // Download QR Code PNG
  const handleDownloadQr = useCallback(async () => {
    if (!student) return;
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
  }, [qrUrl, student]);

  // Kirim QR Code otomatis via EmailJS
  const handleEmailQr = useCallback(async () => {
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
      const result = await sendQrEmail({
        toEmail: student.email,
        toName:  student.name,
        nim:     student.id,
        gugus:   groupName,
        mentor:  mentorName,
        qrUrl,
        prodi:   student.fakultas,
      });
      setEmailSending(false);
      
      if (result.ok || result.success || (result.message && !result.message.toLowerCase().includes('gagal'))) {
        const nextCount = count + 1;
        const updated = { ...emailSentCounts, [student.id]: nextCount };
        setEmailSentCounts(updated);
        try {
          localStorage.setItem('pkkmb_email_sent_counts', JSON.stringify(updated));
        } catch (e) {
          console.error("Failed saving email count", e);
        }
        
        if (nextCount >= 2) {
          alert(`⚠️ Email QR Code berhasil dikirim ke ${student.name}! (Total email terkirim: ${nextCount}x)`);
        } else {
          alert(result.message || `Email QR Code berhasil dikirim ke ${student.name}!`);
        }
      } else {
        alert(result.message || 'Gagal mengirim email.');
      }
    });
  }, [student, groupName, mentorName, qrUrl, emailSending, emailSentCounts]);

  if (!student) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background text-on-background">
        <span className="material-symbols-outlined text-[64px] text-error mb-4">person_off</span>
        <h2 className="text-headline-lg font-headline-lg mb-2">Tidak Ditemukan</h2>
        <button onClick={() => navigate('/admin/peserta')} className="bg-primary text-on-primary px-6 py-3 rounded-xl hover:bg-primary-fixed shadow-md transition-all font-label-md cursor-pointer">
          Kembali
        </button>
      </div>
    );
  }

  // Find attendance logs for this student
  const studentLogs = logs.filter(log => log.nim === student.id);

  const handleStatusChange = (newStatus) => {
    if (student.status === newStatus) return;
    window.confirmAction(`Apakah Anda yakin ingin mengubah status kehadiran ${student.name} menjadi "${newStatus}"?`, () => {
      updatePeserta(student.id, { status: newStatus });
      addLog(student.name, student.id, groupName, 'Admin (Manual Override)', 'Valid');
      alert(`Status ${student.name} diubah menjadi ${newStatus}.`);
    });
  };

  const handleDelete = () => {
    window.confirmAction(`Hapus ${student.name}?`, () => {
      deletePeserta(student.id);
      navigate('/admin/peserta');
      alert("Peserta berhasil dihapus.");
    });
  };



  return (
    <div className="w-full">
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/peserta')} className="hidden lg:flex hover:bg-surface-variant p-2 rounded-full transition-colors items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-headline-md text-on-surface">Detail Peserta</h1>
        </div>
        <div className="flex items-center gap-6">
          
        </div>
      </header>

      <main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col gap-4 sm:gap-6 pb-12">
          {/* Header Card */}
          <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between gap-4 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 relative z-10">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg sm:text-xl shadow-inner shrink-0">
                {student.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-center sm:text-left space-y-1">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                  <h2 className="text-base sm:text-lg md:text-headline-sm font-bold text-on-surface leading-tight">{student.name}</h2>
                  {(() => {
                    const badge = getStatusBadge(student.status);
                    const borderColor = badge.text.replace('text-', 'border-');
                    return (
                      <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border flex items-center gap-1.5 ${badge.bg} ${badge.text} ${borderColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                        {student.status}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant font-mono">{student.email} • NIM: {student.id}</p>
              </div>
            </div>

            {/* Danger Actions */}
            <div className="flex items-center gap-3 relative z-10 self-center md:self-end">
              <button onClick={handleDelete} className="bg-error/10 hover:bg-error/20 text-error px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-label-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">delete</span>
                Hapus
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column: Details & Quick Override */}
            <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">
              {/* Profile Details */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-outline-variant/30 border-l-4 border-l-primary">
                <h3 className="text-sm sm:text-base font-bold text-primary mb-4 sm:mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                  Informasi Akademik
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/20 space-y-1">
                    <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Jurusan</p>
                    <p className="text-xs sm:text-sm text-[#012060] font-bold">{student.fakultas || 'Belum Diisi'}</p>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/20 space-y-1">
                    <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Gugus</p>
                    <p className={`text-xs sm:text-sm font-bold ${groupName === '-' ? 'text-on-surface-variant italic font-normal' : 'text-[#012060]'}`}>
                      {groupName === '-' ? 'Belum Ditentukan' : groupName}
                    </p>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/20 space-y-1">
                    <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Mentor</p>
                    <p className={`text-xs sm:text-sm font-bold ${mentorName === 'Belum Ditentukan' ? 'text-on-surface-variant italic font-normal' : 'text-[#012060]'}`}>
                      {mentorName}
                    </p>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/20 space-y-1">
                    <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Metode Kehadiran</p>
                    <p className="text-xs sm:text-sm text-[#012060] font-bold">
                      {isHadir(student.status) ? student.status : 'Belum Terabsen'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Manual Override */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-outline-variant/30">
                <h3 className="text-sm sm:text-base font-bold text-on-surface mb-4 sm:mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">tune</span>
                  Override Kehadiran
                </h3>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(opt => {
                    const isActive = student.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusChange(opt.value)}
                        className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer hover:scale-[1.03] ${
                          isActive
                            ? 'ring-2 ring-primary ring-offset-2 opacity-100'
                            : 'opacity-80 hover:opacity-100'
                        } ${
                          opt.value === 'Hadir Penuh'    ? 'bg-green-500/15 text-green-700 border-green-300' :
                          opt.value === 'Hadir Sebagian' ? 'bg-amber-500/15 text-amber-700 border-amber-300' :
                          opt.value === 'Izin'           ? 'bg-blue-500/15  text-blue-700  border-blue-300'  :
                                                          'bg-red-500/15   text-red-700   border-red-300'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                          {opt.value === 'Hadir Penuh' ? 'check_circle' :
                           opt.value === 'Hadir Sebagian' ? 'contrast' :
                           opt.value === 'Izin' ? 'description' : 'cancel'}
                        </span>
                        {opt.value}
                        {isActive && <span className="text-[9px] bg-primary text-on-primary rounded-full px-1.5 py-0.5 ml-1">Aktif</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: QR Code Card & Scans timeline */}
            <div className="flex flex-col gap-4 sm:gap-6">
              {/* QR Code Card */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-outline-variant/30 flex flex-col items-center text-center">
                <h3 className="text-sm sm:text-base font-bold text-on-surface mb-3 self-start flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">qr_code_2</span>
                  QR Code
                </h3>
                <p className="text-xs text-on-surface-variant mb-3 self-start text-left">Scan QR ini untuk mencatat kehadiran. Data: <span className="font-mono font-semibold text-primary">{student.id}</span></p>
                <div className="w-36 h-36 sm:w-44 sm:h-44 bg-white rounded-xl p-2 border border-outline-variant/30 flex items-center justify-center shadow-md relative overflow-hidden group mb-4">
                  <img
                    src={qrUrl}
                    alt={`QR Code NIM ${student.id}`}
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={handleDownloadQr}
                    className="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface py-2 rounded-xl text-xs sm:text-label-sm font-semibold transition-colors flex items-center justify-center gap-1.5 border border-outline-variant cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">download</span>
                    Unduh
                  </button>
                  <button
                    onClick={handleEmailQr}
                    disabled={emailSending}
                    className="flex-1 bg-primary text-on-primary py-2 rounded-xl text-xs sm:text-label-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md hover:bg-primary-fixed cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {emailSending ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                        Email
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Attendance Log Timeline */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-outline-variant/30 flex-1 flex flex-col">
                <h3 className="text-sm sm:text-base font-bold text-on-surface mb-4 sm:mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                  Log Kehadiran
                </h3>
                <div className="flex-1 overflow-y-auto space-y-6">
                  {studentLogs.length > 0 ? (
                    studentLogs.map((log, index) => (
                      <div key={log.id} className="flex items-start gap-3 relative">
                        {index < studentLogs.length - 1 && (
                          <div className="absolute left-[13px] top-[26px] bottom-[-24px] w-[2px] bg-outline-variant/30"></div>
                        )}
                        <div className="w-7 h-7 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] flex items-center justify-center z-10 shrink-0">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-on-surface truncate">Absen Tercatat - {log.status}</p>
                          <p className="text-[10px] sm:text-xs text-on-surface-variant mt-0.5">Scanner: {log.scanner}</p>
                          <p className="text-[9px] sm:text-[10px] text-on-surface-variant font-mono mt-1">{log.date} {log.timestamp}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[32px] opacity-20 mb-2">pending_actions</span>
                      <p className="text-body-sm">Belum ada log.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
