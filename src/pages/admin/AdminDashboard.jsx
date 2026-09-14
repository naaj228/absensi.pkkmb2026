import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { isHadir } from '../../utils/statusHelper';
import { toISOKey, getTodayISOKey } from '../../utils/dateHelper';

export default function AdminDashboard() {
  const { peserta, mentors, gugus, logs, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Filter logs for TODAY ONLY
  const todayKey = getTodayISOKey();
  const todayLogs = logs.filter(log => toISOKey(log.date) === todayKey);

  const totalPeserta = peserta.length;
  const totalMentor = mentors.length;
  const totalGugus = gugus.length;
  
  // Hadir hari ini strictly based on today's valid scan logs
  const hadirHariIni = new Set(todayLogs.filter(l => l.status === 'Valid').map(l => l.nim)).size;

  const alphaCount = Math.max(0, totalPeserta - hadirHariIni);
  const persentaseKehadiran = totalPeserta > 0 ? ((hadirHariIni / totalPeserta) * 100).toFixed(1) : '0';

  // Get top 8 recent scans for TODAY ONLY
  const recentScans = todayLogs.slice(0, 8);

  return (
    <div className="w-full">
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-sm font-headline-md text-on-surface">Dashboard Admin</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span 
              className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" 
              onClick={() => navigate('/admin/notifikasi')}
            >
              notifications
            </span>
            {hasAdminNotifications && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>
            )}
          </div>
        </div>
      </header>

      <main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col w-full gap-8 pb-12">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Card 1: Total Peserta */}
            <div 
              className="bg-surface-container-lowest rounded-[16px] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer flex flex-col justify-between" 
              onClick={() => navigate('/admin/peserta')}
            >
              <div className="flex items-start justify-between gap-1 mb-3">
                <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider leading-tight">Total Peserta</p>
                <div className="w-7 h-7 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[16px]">group</span>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-on-surface leading-none">{totalPeserta}</h3>
            </div>

            {/* Card 2: Total Mentor */}
            <div 
              className="bg-surface-container-lowest rounded-[16px] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer flex flex-col justify-between" 
              onClick={() => navigate('/admin/mentor')}
            >
              <div className="flex items-start justify-between gap-1 mb-3">
                <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider leading-tight">Total Mentor</p>
                <div className="w-7 h-7 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[16px]">school</span>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-on-surface leading-none">{totalMentor}</h3>
            </div>

            {/* Card 3: Total Gugus */}
            <div 
              className="bg-surface-container-lowest rounded-[16px] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer flex flex-col justify-between" 
              onClick={() => navigate('/admin/gugus')}
            >
              <div className="flex items-start justify-between gap-1 mb-3">
                <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider leading-tight">Total Gugus</p>
                <div className="w-7 h-7 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[16px]">grid_view</span>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-on-surface leading-none">{totalGugus}</h3>
            </div>

            {/* Card 4: Hadir Hari Ini */}
            <div 
              className="bg-surface-container-lowest rounded-[16px] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer flex flex-col justify-between" 
              onClick={() => navigate('/admin/riwayat')}
            >
              <div className="flex items-start justify-between gap-1 mb-3">
                <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider leading-tight">Hadir Hari Ini</p>
                <div className="w-7 h-7 rounded-full bg-[#ecfdf5] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] text-[16px]">check_circle</span>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-on-surface leading-none">{hadirHariIni}</h3>
            </div>

            {/* Card 5: Belum Hadir */}
            <div 
              className="bg-surface-container-lowest rounded-[16px] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer flex flex-col justify-between" 
              onClick={() => navigate('/admin/peserta')}
            >
              <div className="flex items-start justify-between gap-1 mb-3">
                <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider leading-tight">Belum Hadir</p>
                <div className="w-7 h-7 rounded-full bg-[#fef2f2] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#ef4444] text-[16px]">cancel</span>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-on-surface leading-none">{alphaCount}</h3>
            </div>

            {/* Card 6: Persentase Kehadiran */}
            <div className="bg-primary rounded-[16px] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(20,44,142,0.15)] text-on-primary flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1 mb-3">
                <p className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider leading-tight">Kehadiran</p>
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-primary text-[16px]">percent</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-on-primary leading-none">{persentaseKehadiran}%</h3>
                <div className="mt-2.5 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#10b981] rounded-full transition-all duration-500" style={{ width: `${persentaseKehadiran}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Section (TODAY ONLY) */}
          <div className="bg-surface-container-lowest rounded-[16px] p-6 shadow-[0_10px_30px_rgba(13,27,77,0.05)] flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 relative">
              <div className="flex items-center gap-2">
                <h2 className="text-headline-sm font-headline-md text-on-surface">Scan Terbaru Hari Ini</h2>
              </div>
              <button 
                className="text-label-sm text-secondary hover:text-primary transition-colors cursor-pointer" 
                onClick={() => navigate('/admin/riwayat')}
              >
                Lihat Semua Riwayat
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-outline-variant/30"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentScans.length > 0 ? (
                recentScans.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex-shrink-0 bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {log.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-md font-medium text-on-surface truncate">{log.name}</p>
                        <p className="text-body-sm text-on-surface-variant truncate">{log.gugusName} • {log.scanner}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                      <span className="text-label-sm text-on-surface-variant">{log.timestamp}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'Valid' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-error-container/50 text-error'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-on-surface-variant text-body-md">
                  Belum ada log scan untuk hari ini.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
