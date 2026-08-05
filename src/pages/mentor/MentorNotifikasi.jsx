import { useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function MentorNotifikasi() {
  const { 
    logs, 
    claims, 
    peserta, 
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

  // 1. Scans in mentor's gugus
  const groupLogs = logs.filter(l => l.gugusName === mentorGugusName);
  groupLogs.forEach(l => {
    if (dismissedNotifications.includes(`log-${l.id}`)) return;
    
    const isRejection = l.scanner === 'Admin (Tolak Manual)';
    
    notifications.push({
      id: `log-${l.id}`,
      type: 'scan',
      title: isRejection ? 'Pengajuan Absensi Ditolak' : (l.status === 'Valid' ? 'Kehadiran Terdaftar' : 'Pemberitahuan Scan'),
      message: isRejection 
        ? `Pengajuan absensi manual untuk ${l.name} (NIM: ${l.nim}) DITOLAK. Alasan: ${l.note || 'Berkas tidak lengkap.'}`
        : `${l.name} (NIM: ${l.nim}) tercatat ${l.status === 'Valid' ? 'hadir' : 'tidak valid'} via ${l.scanner}`,
      time: `${l.date} ${l.timestamp}`,
      icon: isRejection ? 'cancel' : (l.status === 'Valid' ? 'check_circle' : 'warning'),
      color: isRejection || l.status !== 'Valid' ? 'text-error bg-error-container/30' : 'text-green-500 bg-green-50',
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
    notifications.push({
      id,
      type: 'claim',
      title: 'Status Klaim Manual',
      message: `Klaim absensi manual untuk ${c.name} (${c.nim}) sedang diverifikasi oleh admin.`,
      time: c.time,
      icon: 'history',
      color: 'text-amber-500 bg-amber-50',
      actionLabel: 'Kelola Absensi',
      action: () => navigate('/mentor/absensi-manual'),
      originalData: c
    });
  });

  const handleClearAll = () => {
    const currentIds = notifications.map(n => n.id);
    dismissAllNotifications(currentIds);
    alert("Semua notifikasi telah dibersihkan.");
  };

  const handleRemove = (id) => {
    dismissNotification(id);
  };

  return (
    <div className="w-full">
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-sm font-headline-md text-on-surface">Notifikasi Mentor</h1>
        </div>
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert("Profile mentor")}>
            <span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span>
            <span className="text-label-md text-on-surface">Profil</span>
          </button>
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

          <div className="bg-surface rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm">
            {notifications.length > 0 ? (
              <div className="divide-y divide-outline-variant/20">
                {notifications.map((n) => (
                  <div key={n.id} className="p-6 flex items-start gap-4 hover:bg-surface-container-lowest transition-colors group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.color}`}>
                      <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-headline-sm text-body-md font-semibold text-on-surface leading-tight">{n.title}</h3>
                        <span className="text-label-sm text-on-surface-variant/70 shrink-0 font-mono">{n.time}</span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">{n.message}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <button onClick={n.action} className="text-primary hover:underline text-label-sm font-label-md cursor-pointer">
                          {n.actionLabel}
                        </button>
                      </div>
                    </div>
                    <button onClick={() => handleRemove(n.id)} className="text-on-surface-variant/40 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-surface-variant shrink-0 cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 text-on-surface-variant px-6">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 text-on-surface-variant/40">
                  <span className="material-symbols-outlined text-[36px]">notifications_off</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">Tidak Ada Notifikasi</h3>
                <p className="text-body-sm max-w-xs">Kotak masuk Gugus Anda bersih! Pemberitahuan scan atau verifikasi klaim akan muncul di sini.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
