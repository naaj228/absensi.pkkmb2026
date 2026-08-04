import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

export default function MentorDashboard() {
  const { peserta, currentUser, hasMentorNotifications } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Mentor Budi Santoso's group is Gugus 12 (G-12-FT)
  const mentorGugusId = 'G-12-FT';

  // Filter participants belonging to Gugus 12
  const gugusStudents = peserta.filter(p => p.gugusId === mentorGugusId);

  // Stats
  const totalStudents = gugusStudents.length;
  const hadirCount = gugusStudents.filter(p => p.status === 'Hadir').length;
  const belumHadirCount = gugusStudents.filter(p => p.status === 'Belum Hadir' || p.status === 'Alpa').length;
  const pendingCount = gugusStudents.filter(p => p.status === 'Manual (Pending)').length;

  // Filter by search keyword
  const filteredStudents = gugusStudents.filter(student => {
    const term = searchTerm.toLowerCase();
    return student.name.toLowerCase().includes(term) || student.id.includes(term);
  });

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Dashboard</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/mentor/notifikasi')}>notifications</span>{hasMentorNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div><button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert(`Logged in as ${currentUser?.name || 'Mentor Budi'}`)}><span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span><span className="text-label-md text-on-surface">Profil</span></button></div></header><main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full gap-gutter">
{/* Header / Welcome */}
<div className="relative w-full rounded-2xl bg-primary-container overflow-hidden p-8 flex items-center justify-between shadow-lg">
<div className="relative z-10 flex flex-col gap-2 max-w-2xl">
<h2 className="font-headline-lg text-headline-lg text-on-primary">Dashboard Gugus 12</h2>
<p className="font-body-lg text-body-lg text-secondary-fixed-dim">Halo, {currentUser?.name || 'Mentor Budi'}.</p>
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
{/* Stat 3: Belum Hadir */}
<div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
<div className="flex justify-between items-start z-10">
<div className="w-12 h-12 rounded-xl bg-error-container/50 flex items-center justify-center text-error">
<span className="material-symbols-outlined text-[24px]">pending_actions</span>
</div>
</div>
<div className="z-10 mt-2">
<p className="font-display-lg text-display-lg text-on-surface">{belumHadirCount}</p>
<p className="font-label-md text-label-md text-on-surface-variant mt-1 uppercase tracking-wider">Belum Hadir</p>
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
{/* Quick List: Peserta */}
<div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col mt-4">
<div className="p-6 bg-surface-container-lowest border-b border-surface-variant flex items-center justify-between">
<div>
<h3 className="font-headline-sm text-headline-sm text-on-surface">Anggota Gugus 12</h3>
</div>
{/* Search/Filter */}
<div className="flex items-center gap-3">
<div className="relative">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
<input className="pl-10 pr-4 py-2 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 transition-all" placeholder="Cari..." type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
</div>
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-[#F8F9FC]">
<th className="py-4 px-6 font-label-md text-label-md text-on-primary-container">NAMA PESERTA</th>
<th className="py-4 px-6 font-label-md text-label-md text-on-primary-container">NIM</th>
<th className="py-4 px-6 font-label-md text-label-md text-on-primary-container">STATUS</th>
<th className="py-4 px-6 font-label-md text-label-md text-on-primary-container text-right">AKSI</th>
</tr>
</thead>
<tbody>
  {filteredStudents.length > 0 ? (
    filteredStudents.map((student) => (
      <tr key={student.id} className="border-b border-surface-variant hover:bg-surface-container-low/50 transition-colors group">
      <td className="py-4 px-6">
      <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-label-md text-primary">
        {student.name.substring(0, 2).toUpperCase()}
      </div>
      <div>
      <p className="font-body-md text-body-md font-medium text-on-surface">{student.name}</p>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{student.fakultas}</p>
      </div>
      </div>
      </td>
      <td className="py-4 px-6 font-body-md text-body-md text-on-surface-variant">{student.id}</td>
      <td className="py-4 px-6">
        {student.status === 'Hadir' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F4EA] text-[#137333] rounded-full font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-[#137333]"></span> Hadir
          </span>
        ) : student.status === 'Manual (Pending)' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FEF3C7] text-[#92400E] rounded-full font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-[#D97706]"></span> Manual (Tertunda)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-error-container text-on-error-container rounded-full font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-error"></span> Belum Hadir
          </span>
        )}
      </td>
      <td className="py-4 px-6 text-right">
        {student.status === 'Hadir' ? (
          <button className="px-4 py-2 bg-surface-container rounded-lg font-label-sm text-label-sm text-on-surface-variant/50 transition-colors" disabled>
            Terpindai
          </button>
        ) : student.status === 'Manual (Pending)' ? (
          <button onClick={() => alert("Klaim manual sedang diverifikasi oleh admin.")} className="px-4 py-2 bg-surface-container-highest text-on-surface rounded-lg font-label-sm text-label-sm hover:bg-surface-variant transition-colors border border-outline-variant cursor-pointer">
            Tinjau
          </button>
        ) : (
          <button onClick={() => navigate('/mentor/scanner-qr')} className="px-4 py-2 bg-[#142C8E] text-white rounded-lg font-label-sm text-label-sm hover:bg-primary transition-colors flex items-center gap-2 ml-auto cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            Scan Sekarang
          </button>
        )}
      </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="4" className="text-center py-8 text-on-surface-variant">Tidak ada peserta.</td>
    </tr>
  )}
</tbody>
</table>
</div>
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
