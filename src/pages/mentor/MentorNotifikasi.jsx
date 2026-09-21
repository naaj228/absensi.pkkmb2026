import { useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { formatFriendlyDateTime, getTodayISOKey } from '../../utils/dateHelper';

export default function MentorNotifikasi() {
  const { 
    logs, 
    claims, 
    gugus, 
    currentUser, 
    setMentorNotificationsCleared,
    dismissedNotifications,
    dismissNotification,
    dismissAllNotifications
  } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    setMentorNotificationsCleared(true);
  }, [setMentorNotificationsCleared]);

  // Get mentor's gugus from currentUser
  const mentorGugusId = currentUser?.gugusId || '';
  const mentorGugus = gugus.find(g => g.id === mentorGugusId);
  const mentorGugusName = mentorGugus?.name || '';

  const notifications = [];

  // 1. Rejections and Invalid Scans in mentor's gugus (Exclude regular successful scans)
  const groupLogs = logs.filter(l => l.gugusName === mentorGugusName && (l.status !== 'Valid' || l.scanner === 'Admin (Tolak Manual)'));
  groupLogs.forEach(l => {
    if (dismissedNotifications.includes(`log-${l.id}`)) return;
    
    const isRejection = l.scanner === 'Admin (Tolak Manual)';
    const displayTime = formatFriendlyDateTime(l.date, l.timestamp);
    
    notifications.push({
      id: `log-${l.id}`,
      type: 'scan',
      title: isRejection ? 'Pengajuan Absensi Ditolak' : 'Scan Tidak Valid',
      message: isRejection 
        ? `Pengajuan absensi manual untuk ${l.name} (NIM: ${l.nim}) ditolak. Alasan: ${l.note || 'Berkas tidak lengkap.'}`
        : `Scan untuk ${l.name || 'Mahasiswa'} (NIM: ${l.nim}) gagal / tidak valid.`,
      time: displayTime,
      icon: isRejection ? 'cancel' : 'warning',
      color: 'text-rose-600 bg-rose-50 border border-rose-200',
      actionLabel: isRejection ? 'Ajukan Kembali' : 'Lihat Anggota',
      action: () => navigate(isRejection ? '/mentor/absensi-manual' : '/mentor/peserta'),
      originalData: l
    });
  });

  // 2. Claims in mentor's gugus
  const groupClaims = claims.filter(c => c.gugusName === mentorGugusName);
  groupClaims.forEach(c => {
    const id = `claim-${c.id}`;
    if (dismissedNotifications.includes(id)) return;
    const claimDate = c.tanggalHadir || c.date || c.created_at;
    const displayTime = formatFriendlyDateTime(claimDate, c.time);
    notifications.push({
      id,
      type: 'claim',
      title: 'Status Klaim Manual',
      message: `Klaim absensi manual untuk ${c.name} (NIM: ${c.nim}) sedang diverifikasi oleh Admin.`,
      time: displayTime,
      icon: 'pending_actions',
      color: 'text-amber-600 bg-amber-50 border border-amber-200',
      actionLabel: 'Kelola Absensi',
      action: () => navigate('/mentor/absensi-manual'),
      originalData: c
    });
  });

  const handleClearAll = () => {
    window.confirmAction("Apakah Anda yakin ingin membersihkan semua notifikasi?", () => {
      const currentIds = notifications.map(n => n.id);
      dismissAllNotifications(currentIds);
      alert("Semua notifikasi telah dibersihkan.");
    });
  };

  const handleRemove = (id) => {
    window.confirmAction("Apakah Anda yakin ingin menghapus notifikasi ini?", () => {
      dismissNotification(id);
    });
  };

  const renderNotifItem = (n) => (
    <div key={n.id} className="p-4 sm:p-5 flex items-start gap-3.5 hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-0">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 ${n.color}`}>
        <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
          <h3 className="text-body-sm sm:text-body-md font-bold text-[#012060] leading-tight">{n.title}</h3>
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            <span>{n.time}</span>
          </span>
        </div>
        <p className="text-body-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
        <div className="mt-2.5 flex items-center gap-3">
          <button onClick={n.action} className="inline-flex items-center gap-1 text-primary hover:text-[#012060] text-[11px] font-bold cursor-pointer transition-colors bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg">
            <span>{n.actionLabel}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>
      </div>
      <button onClick={() => handleRemove(n.id)} className="text-slate-400 hover:text-rose-600 opacity-60 hover:opacity-100 transition-opacity p-1 rounded-full shrink-0 cursor-pointer" title="Hapus Notifikasi">
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );

  return (
    <div className="w-full">
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl hover:bg-black/5 active:scale-95 transition-all text-on-surface-variant cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-headline-md text-on-surface">Notifikasi Mentor</h1>
        </div>
      </header>

      <main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col w-full relative space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-headline-lg font-headline-lg text-on-surface">Notifikasi {mentorGugusName}</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">Aktivitas kehadiran dan scan terkini di kelompok Anda</p>
            </div>
            {notifications.length > 0 && (
              <button onClick={handleClearAll} className="text-error hover:bg-error/5 text-label-md font-label-md px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">clear_all</span>
                Bersihkan Semua
              </button>
            )}
          </div>

          <div className="space-y-4">
            {notifications.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                {notifications.map(renderNotifItem)}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center py-16 text-slate-400 px-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-300">
                  <span className="material-symbols-outlined text-[32px]">notifications_off</span>
                </div>
                <h3 className="text-body-lg font-bold text-[#012060] mb-1">Tidak Ada Notifikasi</h3>
                <p className="text-body-sm max-w-xs text-slate-500">Kotak masuk Gugus Anda bersih! Pemberitahuan status klaim atau penolakan akan muncul di sini.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
