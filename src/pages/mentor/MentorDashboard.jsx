import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { isHadir, STATUS } from '../../utils/statusHelper';

export default function MentorDashboard() {
  const { peserta, gugus, currentUser, hasMentorNotifications } = useContext(AppContext);
  const navigate = useNavigate();
  // Get gugus ID from the currently logged-in mentor
  const mentorGugusId = currentUser?.gugusId || '';
  const mentorGugus = gugus.find(g => g.id === mentorGugusId);
  const mentorGugusName = mentorGugus?.name || 'Gugus Saya';

  // Filter participants belonging to mentor's group
  const gugusStudents = peserta.filter(p => p.gugusId === mentorGugusId);

  // Stats
  const totalStudents = gugusStudents.length;
  const hadirCount = gugusStudents.filter(p => isHadir(p.status)).length;
  const alphaCount = gugusStudents.filter(p => p.status === STATUS.ALPHA || !p.status).length;
  const pendingCount = gugusStudents.filter(p => p.status === STATUS.PENDING).length;

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Dashboard</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/mentor/notifikasi')}>notifications</span>{hasMentorNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div></div></header><main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full gap-gutter">
{/* Header / Welcome */}
<div className="relative w-full rounded-2xl bg-primary-container overflow-hidden p-8 flex items-center justify-between shadow-lg">
<div className="relative z-10 flex flex-col gap-2 max-w-2xl">
<h2 className="font-headline-lg text-headline-lg text-on-primary">Dashboard {mentorGugusName}</h2>
<p className="font-body-lg text-body-lg text-secondary-fixed-dim">Halo, {currentUser?.name || 'Mentor'}.</p>
</div>
{/* Abstract Decoration */}
<div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
<svg className="absolute -right-20 -top-20 w-96 h-96 text-secondary-fixed animate-[spin_60s_linear_infinite]" fill="currentColor" viewBox="0 0 100 100">
<circle cx="50" cy="50" fill="none" r="40" stroke="currentColor" strokeDasharray="10 5" strokeWidth="2"></circle>
<path d="M50 10 L90 90 L10 90 Z" fill="none" stroke="currentColor" strokeWidth="1"></path>
</svg>
</div>
</div>
{/* Summary Stats Bento Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
{/* Stat 1: Total Peserta */}
<div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
<div className="flex justify-between items-start z-10">
<div className="w-12 h-12 rounded-xl bg-primary-fixed/20 flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[24px]">groups</span>
</div>
</div>
<div className="z-10 mt-2">
<p className="font-display-lg text-display-lg text-on-surface">{totalStudents}</p>
<p className="font-label-md text-label-md text-on-surface-variant mt-1 uppercase tracking-wider">Total Peserta</p>
</div>
<div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary-fixed/30 rounded-full blur-2xl group-hover:bg-primary-fixed/50 transition-colors"></div>
</div>
{/* Stat 2: Hadir */}
<div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
<div className="flex justify-between items-start z-10">
<div className="w-12 h-12 rounded-xl bg-secondary-fixed/30 flex items-center justify-center text-secondary">
<span className="material-symbols-outlined text-[24px]">check_circle</span>
</div>
</div>
<div className="z-10 mt-2">
<p className="font-display-lg text-display-lg text-on-surface">{hadirCount}</p>
<p className="font-label-md text-label-md text-on-surface-variant mt-1 uppercase tracking-wider">Hadir</p>
</div>
<div className="absolute -bottom-8 -right-8 w-32 h-32 bg-secondary-fixed/40 rounded-full blur-2xl group-hover:bg-secondary-fixed/60 transition-colors"></div>
</div>
{/* Stat 3: Alpha */}
<div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
<div className="flex justify-between items-start z-10">
<div className="w-12 h-12 rounded-xl bg-error-container/50 flex items-center justify-center text-error">
<span className="material-symbols-outlined text-[24px]">cancel</span>
</div>
</div>
<div className="z-10 mt-2">
<p className="font-display-lg text-display-lg text-on-surface">{alphaCount}</p>
<p className="font-label-md text-label-md text-on-surface-variant mt-1 uppercase tracking-wider">Alpha</p>
</div>
<div className="absolute -bottom-8 -right-8 w-32 h-32 bg-error-container/40 rounded-full blur-2xl group-hover:bg-error-container/60 transition-colors"></div>
</div>
{/* Stat 4: Pengajuan Manual */}
<div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
<div className="flex justify-between items-start z-10">
<div className="w-12 h-12 rounded-xl bg-tertiary-fixed/40 flex items-center justify-center text-tertiary">
<span className="material-symbols-outlined text-[24px]">assignment_late</span>
</div>
</div>
<div className="z-10 mt-2">
<p className="font-display-lg text-display-lg text-on-surface">{pendingCount}</p>
<p className="font-label-md text-label-md text-on-surface-variant mt-1 uppercase tracking-wider">Manual (Tertunda)</p>
</div>
<div className="absolute -bottom-8 -right-8 w-32 h-32 bg-tertiary-fixed/50 rounded-full blur-2xl group-hover:bg-tertiary-fixed/70 transition-colors"></div>
</div>
</div>
{/* Primary Actions */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mt-4">
{/* Scanner Action */}
<button onClick={() => navigate('/mentor/scanner-qr')} className="relative overflow-hidden group bg-primary text-on-primary rounded-2xl p-8 flex items-center justify-between shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer">
<div className="flex flex-col items-start gap-2 relative z-10 text-left">
<div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center mb-2">
<span className="material-symbols-outlined text-[32px] text-white">qr_code_scanner</span>
</div>
<h3 className="font-headline-md text-headline-md">Scanner QR</h3>
</div>
<div className="relative z-10 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
<span className="material-symbols-outlined text-[24px]">arrow_forward</span>
</div>
{/* Scan line animation */}
<div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-500 overflow-hidden">
<div className="absolute top-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_10px_#ef4444] animate-[scan_2s_linear_infinite]"></div>
</div>
</button>
{/* Manual Action */}
<button onClick={() => navigate('/mentor/absensi-manual')} className="relative overflow-hidden group bg-surface-container-highest text-on-surface rounded-2xl p-8 flex items-center justify-between shadow-sm hover:shadow-md hover:bg-surface-variant transition-all duration-300 border-2 border-transparent hover:border-outline-variant cursor-pointer">
<div className="flex flex-col items-start gap-2 relative z-10 text-left">
<div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-2">
<span className="material-symbols-outlined text-[32px] text-secondary">person_add</span>
</div>
<h3 className="font-headline-md text-headline-md text-on-surface">Absensi Manual</h3>
</div>
<div className="relative z-10 w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[24px] text-on-surface-variant">edit_document</span>
</div>
</button>
</div>

<style>{`
    @keyframes scan {
      0% { top: 0%; }
      50% { top: 100%; }
      100% { top: 0%; }
    }
  `}</style>
</div></main></div>

  );
}
