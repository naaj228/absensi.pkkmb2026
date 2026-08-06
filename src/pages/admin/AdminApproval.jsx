import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminApproval() {
  const { claims, peserta, approveClaim, rejectClaim, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGugus, setSelectedGugus] = useState('all');

  const handleApprove = (id, name) => {
    approveClaim(id);
    alert(`Pengajuan ${name} telah DISETUJUI.`);
  };

  const handleReject = (id, name) => {
    window.promptAction(
      `Tolak pengajuan dari ${name}?`,
      "Berkas pendukung kurang lengkap / kurang valid",
      (reason) => {
        rejectClaim(id, reason || "Ditolak oleh Admin");
        alert(`Pengajuan ${name} telah DITOLAK.`);
      }
    );
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
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Persetujuan Klaim</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>{hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div></div></header><main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-5xl mx-auto"><div className="flex flex-col w-full gap-gutter relative">
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
            {/* Desktop View: Table */}
            <div className="hidden md:block w-full overflow-x-auto lg:overflow-visible">
              <table className="w-full text-left table-auto">
                <thead className="bg-surface-container-highest">
                  <tr>
                    <th className="px-3 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Peserta</th>
                    <th className="px-3 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">NIM</th>
                    <th className="px-3 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Gugus</th>
                    <th className="px-3 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Kendala / Tipe</th>
                    <th className="px-3 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status / Aksi</th>
                    <th className="px-3 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Waktu</th>
                    <th className="px-3 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-surface-container" id="approvalTableBody">
                  {filteredClaims.length > 0 ? (
                    filteredClaims.map((c) => {
                      let detailsText = '';
                      if (c.issue === 'Edit Peserta' && c.catatan) {
                        try {
                          const updated = JSON.parse(c.catatan);
                          const original = peserta.find(p => p.id === c.nim);
                          if (original) {
                            const changes = [];
                            if (original.name !== updated.name) changes.push(`Nama: ${original.name} ➔ ${updated.name}`);
                            if (original.email !== updated.email) changes.push(`Email: ${original.email || '-'} ➔ ${updated.email || '-'}`);
                            if (original.fakultas !== updated.fakultas) changes.push(`Jurusan: ${original.fakultas || '-'} ➔ ${updated.fakultas || '-'}`);
                            if (original.status !== updated.status) changes.push(`Status: ${original.status} ➔ ${updated.status}`);
                            detailsText = changes.join(', ');
                          } else {
                            detailsText = `Nama: ${updated.name}, Email: ${updated.email}`;
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      } else if (c.issue === 'Tambah Peserta' && c.catatan) {
                        try {
                          const data = JSON.parse(c.catatan);
                          detailsText = `Jurusan: ${data.fakultas || '-'} • Email: ${data.email || '-'}`;
                        } catch (err) {
                          console.error(err);
                        }
                      }

                      return (
                        <tr key={c.id} className="group hover:bg-surface-container-high transition-colors approval-row">
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-headline-sm shadow-sm relative">
                                {c.name.substring(0, 2).toUpperCase()}
                                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-error rounded-full border-2 border-surface-container"></span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-headline-sm text-body-md text-on-surface leading-snug">{c.name}</span>
                                {detailsText ? (
                                  <span className="text-[10px] text-primary font-medium mt-0.5 bg-primary/5 px-2 py-0.5 rounded w-max whitespace-normal max-w-[220px] leading-tight">{detailsText}</span>
                                ) : (
                                  <span className="font-body-sm text-body-sm text-on-surface-variant leading-none">{c.fakultas}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 font-body-md text-body-md text-on-surface">{c.nim}</td>
                          <td className="px-3 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-tertiary-container text-on-tertiary-container">
                              {c.gugusName}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            {c.issue === 'Tambah Peserta' ? (
                              <div className="flex items-center gap-1.5 text-primary font-semibold">
                                <span className="material-symbols-outlined text-[16px]">person_add</span>
                                <span className="font-body-sm text-body-sm">Tambah Peserta</span>
                              </div>
                            ) : c.issue === 'Edit Peserta' ? (
                              <div className="flex items-center gap-1.5 text-secondary font-semibold">
                                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                <span className="font-body-sm text-body-sm">Ubah Profil</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-error">
                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                <span className="font-body-sm text-body-sm">{c.issue}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-4">
                            {c.issue === 'Tambah Peserta' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-primary/10 text-primary">Registrasi</span>
                            ) : c.issue === 'Edit Peserta' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-secondary/10 text-secondary">Ubah Data</span>
                            ) : (
                              (() => {
                                const s = c.requestedStatus || 'Hadir Penuh';
                                const colors = s === 'Hadir Penuh' ? 'bg-green-500/15 text-green-700' : s === 'Hadir Sebagian' ? 'bg-amber-500/15 text-amber-700' : 'bg-blue-500/15 text-blue-700';
                                return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm ${colors}`}>{s}</span>;
                              })()
                            )}
                          </td>
                          <td className="px-3 py-4 font-body-sm text-body-sm text-on-surface-variant">{c.time}</td>
                          <td className="px-3 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => handleReject(c.id, c.name)} className="action-btn reject-btn w-9 h-9 rounded-lg bg-surface text-error hover:bg-error-container hover:text-on-error-container shadow-sm flex items-center justify-center transition-colors cursor-pointer" title="Tolak">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                              <button onClick={() => handleApprove(c.id, c.name)} className="action-btn approve-btn w-9 h-9 rounded-lg bg-primary text-on-primary shadow-sm hover:scale-105 flex items-center justify-center transition-all cursor-pointer" title="Setujui">
                                <span className="material-symbols-outlined text-[18px]">check</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-on-surface-variant">Tidak ada klaim manual yang tertunda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Card List */}
            <div className="block md:hidden space-y-4 p-4">
              {filteredClaims.length > 0 ? (
                filteredClaims.map((c) => {
                  let detailsText = '';
                  if (c.issue === 'Edit Peserta' && c.catatan) {
                    try {
                      const updated = JSON.parse(c.catatan);
                      const original = peserta.find(p => p.id === c.nim);
                      if (original) {
                        const changes = [];
                        if (original.name !== updated.name) changes.push(`Nama: ${original.name} ➔ ${updated.name}`);
                        if (original.email !== updated.email) changes.push(`Email: ${original.email || '-'} ➔ ${updated.email || '-'}`);
                        if (original.fakultas !== updated.fakultas) changes.push(`Jurusan: ${original.fakultas || '-'} ➔ ${updated.fakultas || '-'}`);
                        if (original.status !== updated.status) changes.push(`Status: ${original.status} ➔ ${updated.status}`);
                        detailsText = changes.join(', ');
                      } else {
                        detailsText = `Nama: ${updated.name}, Email: ${updated.email}`;
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  } else if (c.issue === 'Tambah Peserta' && c.catatan) {
                    try {
                      const data = JSON.parse(c.catatan);
                      detailsText = `Jurusan: ${data.fakultas || '-'} • Email: ${data.email || '-'}`;
                    } catch (err) {
                      console.error(err);
                    }
                  }

                  return (
                    <div key={c.id} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/40 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-headline-sm shadow-sm relative">
                            {c.name.substring(0, 2).toUpperCase()}
                            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-error rounded-full border-2 border-surface-container"></span>
                          </div>
                          <div>
                            <p className="font-semibold text-on-surface leading-snug">{c.name}</p>
                            <span className="text-label-sm text-on-surface-variant font-mono">NIM: {c.nim}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-tertiary-container text-on-tertiary-container">
                          {c.gugusName}
                        </span>
                      </div>

                      <div className="border-t border-b border-outline-variant/20 py-2.5 my-1 text-body-sm text-on-surface-variant flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-label-sm text-on-surface-variant/60">Tipe Pengajuan:</span>
                          {c.issue === 'Tambah Peserta' ? (
                            <span className="flex items-center gap-1 text-primary font-semibold">
                              <span className="material-symbols-outlined text-[14px]">person_add</span> Registrasi
                            </span>
                          ) : c.issue === 'Edit Peserta' ? (
                            <span className="flex items-center gap-1 text-secondary font-semibold">
                              <span className="material-symbols-outlined text-[14px]">edit_note</span> Ubah Profil
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-error">
                              <span className="material-symbols-outlined text-[14px]">warning</span> {c.issue}
                            </span>
                          )}
                        </div>

                        {detailsText && (
                          <div className="bg-primary/5 p-2 rounded text-[11px] text-primary leading-tight">
                            <strong>Detail Perubahan:</strong> {detailsText}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-label-sm text-on-surface-variant/60">Status Diajukan:</span>
                          {c.issue === 'Tambah Peserta' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px]">Registrasi</span>
                          ) : c.issue === 'Edit Peserta' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[11px]">Ubah Data</span>
                          ) : (
                            (() => {
                              const s = c.requestedStatus || 'Hadir Penuh';
                              const colors = s === 'Hadir Penuh' ? 'bg-green-500/15 text-green-700' : s === 'Hadir Sebagian' ? 'bg-amber-500/15 text-amber-700' : 'bg-blue-500/15 text-blue-700';
                              return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${colors}`}>{s}</span>;
                            })()
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant/60">
                          <span>Waktu Pengajuan:</span>
                          <span>{c.time}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button onClick={() => handleReject(c.id, c.name)} className="flex items-center gap-1.5 px-3 py-1.5 text-label-sm text-error hover:bg-error/5 rounded-lg border border-error/10 transition-colors cursor-pointer">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          Tolak
                        </button>
                        <button onClick={() => handleApprove(c.id, c.name)} className="flex items-center gap-1.5 px-3 py-1.5 text-label-sm text-on-primary bg-primary hover:bg-primary-fixed rounded-lg transition-colors cursor-pointer shadow-sm">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          Setujui
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-on-surface-variant text-body-md bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/60">Tidak ada klaim manual yang tertunda.</div>
              )}
            </div>
<div className="bg-surface-container-high px-6 py-4 flex items-center justify-between mt-auto">
<span className="font-body-sm text-body-sm text-on-surface-variant">Menampilkan {filteredClaims.length} dari {claims.length} klaim tertunda</span>
</div>
</div>
</div>
</main></div>
  );
}
