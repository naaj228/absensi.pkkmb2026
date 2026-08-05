import { useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminNotifikasi() {
  const { 
    claims, 
    logs, 
    qrCodes, 
    setAdminNotificationsCleared,
    dismissedNotifications,
    dismissNotification,
    dismissAllNotifications
  } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    setAdminNotificationsCleared(true);
  }, [setAdminNotificationsCleared]);

  // Create notifications dynamically based on system states and filter dismissed ones
  const notifications = [];

  // 1. Pending Claims Notifications
  claims.forEach(c => {
    const id = `claim-${c.id}`;
    if (dismissedNotifications.includes(id)) return;
    notifications.push({
      id,
      type: 'claim',
      title: 'Klaim Absensi Manual Baru',
      message: `${c.name} (NIM: ${c.nim}) mengajukan absensi manual: ${c.issue}`,
      time: c.time,
      icon: 'assignment_late',
      color: 'text-amber-500 bg-amber-50',
      actionLabel: 'Tinjau Klaim',
      action: () => navigate('/admin/approval'),
      originalData: c
    });
  });

  // 2. Invalid Scans Notifications
  logs.filter(l => l.status !== 'Valid').forEach(l => {
    const id = `invalid-${l.id}`;
    if (dismissedNotifications.includes(id)) return;
    notifications.push({
      id,
      type: 'invalid_scan',
      title: 'Scan Tidak Valid Dideteksi',
      message: `Mahasiswa ${l.name || 'Tidak Dikenal'} (NIM: ${l.nim}) gagal melakukan scan di ${l.gugusName || 'Gugus'}`,
      time: `${l.date} ${l.timestamp}`,
      icon: 'warning',
      color: 'text-error bg-error-container/30',
      actionLabel: 'Lihat Riwayat',
      action: () => navigate('/admin/riwayat'),
      originalData: l
    });
  });

  // 3. QR Session Created
  qrCodes.forEach(q => {
    const id = `qr-${q.id}`;
    if (dismissedNotifications.includes(id)) return;
    notifications.push({
      id,
      type: 'qr',
      title: 'Sesi QR Code Aktif',
      message: `Sesi "${q.title}" ditargetkan ke ${q.targetAudience === 'all' ? 'Semua Peserta' : q.targetAudience} (${q.startTime} - ${q.endTime})`,
      time: 'Hari Ini',
      icon: 'qr_code_2',
      color: 'text-primary bg-primary/5',
      actionLabel: 'Kelola QR',
      action: () => navigate('/admin/qr-management'),
      originalData: q
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

  // Group notifications for hierarchical display
  const claimNotifs = notifications.filter(n => n.type === 'claim');
  const invalidNotifs = notifications.filter(n => n.type === 'invalid_scan');
  const qrNotifs = notifications.filter(n => n.type === 'qr');

  const renderNotifItem = (n) => (
    <div key={n.id} className="p-5 flex items-start gap-4 hover:bg-surface-container-lowest transition-colors group">
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
  );

  return (
    <div className="w-full">
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-sm font-headline-md text-on-surface">Notifikasi</h1>
        </div>
      </header>

      <main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col w-full relative space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-headline-lg font-headline-lg text-on-surface">Notifikasi Masuk</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">Pemberitahuan terkini mengenai sistem PKKMB Absensi</p>
            </div>
            {notifications.length > 0 && (
              <button onClick={handleClearAll} className="text-error hover:bg-error/5 text-label-md font-label-md px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">clear_all</span>
                Bersihkan Semua
              </button>
            )}
          </div>

          <div className="space-y-6">
            {claimNotifs.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-label-md font-bold text-primary px-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">assignment_late</span>
                  Persetujuan Klaim Absensi ({claimNotifs.length})
                </h3>
                <div className="bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm divide-y divide-outline-variant/20">
                  {claimNotifs.map(renderNotifItem)}
                </div>
              </div>
            )}

            {invalidNotifs.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-label-md font-bold text-error px-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  Peringatan & Kendala Absensi ({invalidNotifs.length})
                </h3>
                <div className="bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm divide-y divide-outline-variant/20">
                  {invalidNotifs.map(renderNotifItem)}
                </div>
              </div>
            )}

            {qrNotifs.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-label-md font-bold text-secondary px-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                  Sesi QR Code Aktif ({qrNotifs.length})
                </h3>
                <div className="bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm divide-y divide-outline-variant/20">
                  {qrNotifs.map(renderNotifItem)}
                </div>
              </div>
            )}
            
            {notifications.length === 0 && (
              <div className="bg-surface rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm flex flex-col items-center justify-center text-center py-20 text-on-surface-variant px-6">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 text-on-surface-variant/40">
                  <span className="material-symbols-outlined text-[36px]">notifications_off</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">Tidak Ada Notifikasi</h3>
                <p className="text-body-sm max-w-xs">Kotak masuk Anda bersih! Notifikasi baru akan muncul di sini.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
