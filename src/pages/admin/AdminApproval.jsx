import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminApproval() {
  const { claims, gugus, approveClaim, rejectClaim, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGugus, setSelectedGugus] = useState('all');

  const handleApprove = (id, name) => {
    approveClaim(id);
    alert(`Klaim absensi ${name} telah DISETUJUI.`);
  };

  const handleReject = (id, name) => {
    const reason = prompt(`Tolak klaim absensi dari ${name}?\nMasukkan alasan penolakan:`, "Berkas pendukung kurang lengkap / kurang valid");
    if (reason === null) return; // User cancelled prompt
    
    rejectClaim(id, reason || "Ditolak oleh Admin");
    alert(`Klaim absensi ${name} telah DITOLAK.`);
  };

  const filteredClaims = claims.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(term) || c.nim.includes(term) || c.issue.toLowerCase().includes(term);
    const matchesGugus = selectedGugus === 'all' || c.gugusName.toLowerCase() === selectedGugus.toLowerCase();
    return matchesSearch && matchesGugus;
  });

  // Get active unique gugus names that currently have claims pending
  const activeGugusWithClaims = Array.from(new Set(claims.map(c => c.gugusName))).filter(Boolean);

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Persetujuan Klaim</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>{hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div><button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert("Profile admin")}><span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span><span className="text-label-md text-on-surface">Profil</span></button></div></header><main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full gap-gutter relative">
<div className="absolute top-0 right-0 -mt-16 w-[600px] h-[600px] bg-secondary-fixed-dim/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
<div className="flex items-end justify-between w-full relative z-10 mb-unit">
<div className="flex flex-col max-w-2xl gap-unit">
<span className="font-label-md text-label-md text-primary tracking-[0.1em] uppercase bg-primary-fixed w-max px-3 py-1 rounded-full shadow-sm">Penanganan Pengecualian</span>
<h2 className="font-display-lg text-display-lg text-on-background relative">
                Persetujuan Manual
            </h2>
</div>
<div className="hidden lg:flex gap-4">
<div className="bg-surface-container rounded-xl p-4 shadow-md flex items-center gap-4 min-w-[180px]">
<div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]">pending_actions</span>
</div>
<div>
<div className="font-display-lg text-headline-lg text-on-surface">{claims.length}</div>
<div className="font-label-sm text-label-sm text-on-surface-variant">Menunggu</div>
</div>
</div>
</div>
</div>
<div className="bg-surface-container shadow-xl rounded-2xl w-full flex flex-col relative overflow-hidden z-10">
<div className="bg-surface-container-high px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
<div className="relative w-full md:w-[400px]">
<span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
<input className="w-full bg-surface text-on-surface font-body-md text-body-md py-3 pl-12 pr-4 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50" id="nimSearch" placeholder="Cari berdasarkan NIM atau Nama..." type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
</div>
<div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
<button onClick={() => setSelectedGugus('all')} className={`font-label-md text-label-md px-4 py-2 rounded-lg whitespace-nowrap transition-transform ${
  selectedGugus === 'all' ? 'bg-primary text-on-primary shadow-md hover:scale-105' : 'bg-surface text-on-surface shadow-sm hover:bg-surface-dim'
}`}>Semua</button>
{activeGugusWithClaims.map(gName => (
  <button 
    key={gName} 
    onClick={() => setSelectedGugus(gName)} 
    className={`font-label-md text-label-md px-4 py-2 rounded-lg whitespace-nowrap transition-transform ${
      selectedGugus.toLowerCase() === gName.toLowerCase() ? 'bg-primary text-on-primary shadow-md hover:scale-105' : 'bg-surface text-on-surface shadow-sm hover:bg-surface-dim'
    }`}
  >
    {gName}
  </button>
))}
</div>
</div>
<div className="w-full overflow-x-auto">
<table className="w-full text-left whitespace-nowrap">
<thead className="bg-surface-container-highest">
<tr>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Peserta</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">NIM</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Gugus</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Kendala</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status Diajukan</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Waktu</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
</tr>
</thead>
<tbody className="bg-surface-container" id="approvalTableBody">
  {filteredClaims.length > 0 ? (
    filteredClaims.map((c) => (
      <tr key={c.id} className="group hover:bg-surface-container-high transition-colors approval-row">
      <td className="px-6 py-5">
      <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-headline-sm shadow-sm relative">
          {c.name.substring(0, 2).toUpperCase()}
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-error rounded-full border-2 border-surface-container"></span>
      </div>
      <div className="flex flex-col">
      <span className="font-headline-sm text-body-md text-on-surface">{c.name}</span>
      <span className="font-body-sm text-body-sm text-on-surface-variant">{c.fakultas}</span>
      </div>
      </div>
      </td>
      <td className="px-6 py-5 font-body-md text-body-md text-on-surface">{c.nim}</td>
      <td className="px-6 py-5">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-label-sm bg-tertiary-container text-on-tertiary-container">
                                      {c.gugusName}
                                  </span>
      </td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-2 text-error">
      <span className="material-symbols-outlined text-[18px]">warning</span>
      <span className="font-body-sm text-body-sm">{c.issue}</span>
      </div>
      </td>
      <td className="px-6 py-5">
      {(() => {
        const s = c.requestedStatus || 'Hadir Penuh';
        const colors = s === 'Hadir Penuh' ? 'bg-green-500/15 text-green-700' : s === 'Hadir Sebagian' ? 'bg-amber-500/15 text-amber-700' : 'bg-blue-500/15 text-blue-700';
        return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-label-sm font-label-sm ${colors}`}>{s}</span>;
      })()}
      </td>
      <td className="px-6 py-5 font-body-sm text-body-sm text-on-surface-variant">{c.time}</td>
      <td className="px-6 py-5 text-right">
      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={() => handleReject(c.id, c.name)} className="action-btn reject-btn w-10 h-10 rounded-lg bg-surface text-error hover:bg-error-container hover:text-on-error-container shadow-sm flex items-center justify-center transition-colors cursor-pointer" title="Tolak">
      <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
      <button onClick={() => handleApprove(c.id, c.name)} className="action-btn approve-btn w-10 h-10 rounded-lg bg-primary text-on-primary shadow-sm hover:scale-105 flex items-center justify-center transition-all cursor-pointer" title="Setujui">
      <span className="material-symbols-outlined text-[20px]">check</span>
      </button>
      </div>
      </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="7" className="text-center py-10 text-on-surface-variant">Tidak ada klaim manual yang tertunda.</td>
    </tr>
  )}
</tbody>
</table>
</div>
<div className="bg-surface-container-high px-6 py-4 flex items-center justify-between mt-auto">
<span className="font-body-sm text-body-sm text-on-surface-variant">Menampilkan {filteredClaims.length} dari {claims.length} klaim tertunda</span>
</div>
</div>
</div>
</main></div>
  );
}
