import { useContext, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { sendQrEmail } from '../../lib/emailService';
import { isHadir, STATUS_OPTIONS } from '../../utils/statusHelper';

export default function AdminPesertaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { peserta, gugus, mentors, logs, updatePeserta, deletePeserta, addLog } = useContext(AppContext);

  // Find the student
  const student = peserta.find(p => p.id === id);

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

  // Find gugus & mentor details
  const group = gugus.find(g => g.id === student.gugusId);
  const groupName = group ? group.name : '-';
  const mentor = mentors.find(m => m.gugusId === student.gugusId || (group && m.id === group.mentorId));
  const mentorName = mentor ? mentor.name : 'Belum Ditentukan';

  // QR Code URL — same format as AdminQrManagement: NIM encoded into QR
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(student.id)}`;

  // Email sending state
  const [emailSending, setEmailSending] = useState(false);

  // Download QR Code PNG
  const handleDownloadQr = useCallback(async () => {
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
  }, [qrUrl, student.name, student.id]);

  // Kirim QR Code otomatis via EmailJS
  const handleEmailQr = useCallback(async () => {
    if (emailSending) return;
    setEmailSending(true);
    const result = await sendQrEmail({
      toEmail: student.email,
      toName:  student.name,
      nim:     student.id,
      gugus:   groupName,
      mentor:  mentorName,
      qrUrl,
    });
    setEmailSending(false);
    alert(result.message);
  }, [student, groupName, mentorName, qrUrl, emailSending]);

  // Find attendance logs for this student
  const studentLogs = logs.filter(log => log.nim === student.id);

  const handleStatusChange = (newStatus) => {
    updatePeserta(student.id, { status: newStatus });
    addLog(student.name, student.id, groupName, 'Admin (Manual Override)', 'Valid');
    alert(`Status ${student.name} diubah menjadi ${newStatus}.`);
  };

  const handleDelete = () => {
    window.confirmAction(`Hapus ${student.name}?`, () => {
      deletePeserta(student.id);
      navigate('/admin/peserta');
      alert("Peserta berhasil dihapus.");
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Hadir': return 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]';
      case 'Alpa': return 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]';
      case 'Izin': return 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]';
      default: return 'bg-surface-container-highest text-on-surface-variant border-outline-variant';
    }
  };

  return (
    <div className="w-full">
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/peserta')} className="hover:bg-surface-variant p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-headline-md text-on-surface">Detail Peserta</h1>
        </div>
        <div className="flex items-center gap-6">
          
        </div>
      </header>

      <main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col gap-8 pb-12">
          {/* Header Card */}
          <div className="bg-surface-container rounded-[24px] p-8 shadow-sm flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-display-lg text-display-md font-bold shadow-inner">
                {student.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-center sm:text-left space-y-2">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <h2 className="text-headline-lg font-headline-md text-on-surface leading-tight">{student.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-label-md font-label-md border font-semibold ${getStatusBadgeClass(student.status)}`}>
                    {student.status}
                  </span>
                </div>
                <p className="text-body-md text-on-surface-variant font-mono">{student.email} • NIM: {student.id}</p>
              </div>
            </div>

            {/* Danger Actions */}
            <div className="flex items-center gap-3 relative z-10 self-center md:self-end">
              <button onClick={handleDelete} className="bg-error/10 hover:bg-error/20 text-error px-4 py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center gap-2 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Hapus
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Details & Quick Override */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Profile Details */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30">
                <h3 className="text-headline-sm font-headline-md text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  Informasi Akademik
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Jurusan</p>
                    <p className="text-body-lg text-on-surface font-medium">{student.fakultas || 'Belum Diisi'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Gugus</p>
                    <p className={`text-body-lg font-medium ${groupName === '-' ? 'text-on-surface-variant italic' : 'text-on-surface'}`}>
                      {groupName === '-' ? 'Belum Ditentukan' : groupName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Mentor</p>
                    <p className={`text-body-lg font-medium ${mentorName === 'Belum Ditentukan' ? 'text-on-surface-variant italic' : 'text-on-surface'}`}>
                      {mentorName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Metode Kehadiran</p>
                    <p className="text-body-lg text-on-surface font-medium">
                      {isHadir(student.status) ? student.status : 'Belum Terabsen'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Manual Override */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30">
                <h3 className="text-headline-sm font-headline-md text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">tune</span>
                  Override Kehadiran
                </h3>
                <div className="flex flex-wrap gap-3">
                  {STATUS_OPTIONS.map(opt => {
                    const isActive = student.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusChange(opt.value)}
                        className={`px-5 py-2.5 rounded-xl font-label-md text-label-md flex items-center gap-2 border transition-all cursor-pointer hover:scale-105 ${
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
                        <span className="material-symbols-outlined text-[18px]">
                          {opt.value === 'Hadir Penuh' ? 'check_circle' :
                           opt.value === 'Hadir Sebagian' ? 'contrast' :
                           opt.value === 'Izin' ? 'description' : 'cancel'}
                        </span>
                        {opt.value}
                        {isActive && <span className="text-[10px] bg-primary text-on-primary rounded-full px-1.5 py-0.5 ml-1">Aktif</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: QR Code Card & Scans timeline */}
            <div className="flex flex-col gap-8">
              {/* QR Code Card */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col items-center text-center">
                <h3 className="text-headline-sm font-headline-md text-on-surface mb-4 self-start flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary">qr_code_2</span>
                  QR Code
                </h3>
                <p className="text-body-sm text-on-surface-variant mb-4 self-start">Scan QR ini untuk mencatat kehadiran. Data: <span className="font-mono font-semibold text-primary">{student.id}</span></p>
                <div className="w-52 h-52 bg-white rounded-xl p-2 border border-outline-variant/30 flex items-center justify-center shadow-md relative overflow-hidden group mb-6">
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
                    className="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center justify-center gap-2 border border-outline-variant cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Unduh
                  </button>
                  <button
                    onClick={handleEmailQr}
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
                        Email
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Attendance Log Timeline */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex-1 flex flex-col">
                <h3 className="text-headline-sm font-headline-md text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history</span>
                  Log Kehadiran
                </h3>
                <div className="flex-1 overflow-y-auto space-y-6">
                  {studentLogs.length > 0 ? (
                    studentLogs.map((log, index) => (
                      <div key={log.id} className="flex items-start gap-4 relative">
                        {index < studentLogs.length - 1 && (
                          <div className="absolute left-[15px] top-[30px] bottom-[-24px] w-[2px] bg-outline-variant/30"></div>
                        )}
                        <div className="w-8 h-8 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] flex items-center justify-center z-10 shrink-0">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-md font-medium text-on-surface truncate">Absen Tercatat - {log.status}</p>
                          <p className="text-body-sm text-on-surface-variant mt-0.5">Scanner: {log.scanner}</p>
                          <p className="text-label-sm text-on-surface-variant font-mono mt-1">{log.date} {log.timestamp}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[40px] opacity-20 mb-2">pending_actions</span>
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
