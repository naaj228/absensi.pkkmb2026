import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminApproval() {
  const { claims, peserta, approveClaim, rejectClaim, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGugus, setSelectedGugus] = useState('all');

  const handleApprove = (id, name) => {
    window.confirmAction(
      `Apakah Anda yakin ingin menyetujui pengajuan absensi manual dari ${name}?`,
      async () => {
        try {
          await approveClaim(id);
          alert(`Pengajuan ${name} telah DISETUJUI.`);
        } catch {
          // error is handled in context
        }
      }
    );
  };

  const handleReject = (id, name) => {
    window.promptAction(
      `Tolak pengajuan dari ${name}?`,
      "Berkas pendukung kurang lengkap / kurang valid",
      async (reason) => {
        try {
          await rejectClaim(id, reason || "Ditolak oleh Admin");
          alert(`Pengajuan ${name} telah DITOLAK.`);
        } catch {
          // error is handled in context
        }
      }
    );
  };

  const filteredClaims = claims.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(term) || c.nim.includes(term) || c.issue.toLowerCase().includes(term);
    const matchesGugus = selectedGugus === 'all' || c.gugusName.toLowerCase() === selectedGugus.toLowerCase();
    return matchesSearch && matchesGugus;
  });

  const activeGugusWithClaims = Array.from(new Set(claims.map(c => c.gugusName))).filter(Boolean);

  const regClaimsCount = claims.filter(c => c.issue === 'Tambah Peserta').length;
  const editClaimsCount = claims.filter(c => c.issue === 'Edit Peserta').length;

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header - Fixed to top, padded for mobile hamburger menu */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">rule</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Persetujuan Manual & Klaim
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div 
            className="relative group cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/admin/notifikasi')}
            title="Notifikasi Admin"
          >
            <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors text-[22px] sm:text-[24px]">notifications</span>
            {hasAdminNotifications && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-20 px-3 sm:px-6 lg:px-8 max-w-container-max mx-auto space-y-4 sm:space-y-6">
        
        {/* Banner & Summary Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#012060]/5 text-[#012060] text-[10px] font-extrabold uppercase tracking-wider w-max mb-2 border border-[#012060]/10">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>Penanganan Pengajuan</span>
            </div>
            <h2 className="text-body-lg sm:text-headline-md font-bold text-[#012060]">Verifikasi & Persetujuan Klaim</h2>
            <p className="text-[11px] sm:text-body-sm text-slate-500 mt-1">
              Tinjau pengajuan absensi susulan, registrasi manual, dan perubahan data profil peserta PKKMB.
            </p>
          </div>

          <div className="lg:col-span-4 grid grid-cols-3 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Menunggu</span>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-headline-sm font-extrabold text-[#012060] leading-none">{claims.length}</span>
                <span className="text-[9px] text-slate-400">Klaim</span>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Registrasi</span>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-headline-sm font-extrabold text-blue-600 leading-none">{regClaimsCount}</span>
                <span className="text-[9px] text-blue-400">Orang</span>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Ubah Data</span>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-headline-sm font-extrabold text-amber-600 leading-none">{editClaimsCount}</span>
                <span className="text-[9px] text-amber-500">Ajuan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col w-full relative z-10">
          
          {/* Toolbar & Filter Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#f8fafc]/40">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input 
                className="w-full bg-white border border-slate-200 text-slate-800 text-body-sm font-semibold py-2.5 pl-9 pr-8 rounded-xl shadow-2xs focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-400" 
                placeholder="Cari NIM, Nama, atau Kendala..." 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>

            {/* Gugus Filter Pills */}
            <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button 
                onClick={() => setSelectedGugus('all')} 
                className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedGugus === 'all' 
                    ? 'bg-[#012060] text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Gugus ({claims.length})
              </button>
              {activeGugusWithClaims.map(gName => {
                const count = claims.filter(c => c.gugusName.toLowerCase() === gName.toLowerCase()).length;
                return (
                  <button 
                    key={gName} 
                    onClick={() => setSelectedGugus(gName)} 
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedGugus.toLowerCase() === gName.toLowerCase() 
                        ? 'bg-[#012060] text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {gName} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* MOBILE VIEW GRID (2 Kolom pada Layar Mobile < md) */}
          <div className="block md:hidden p-3 bg-slate-50/50 border-b border-slate-100">
            {filteredClaims.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {filteredClaims.map((c) => {
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
                    } catch {}
                  } else if (c.issue === 'Tambah Peserta' && c.catatan) {
                    try {
                      const data = JSON.parse(c.catatan);
                      detailsText = `Jurusan: ${data.fakultas || '-'} • Email: ${data.email || '-'}`;
                    } catch {}
                  }

                  const isReg = c.issue === 'Tambah Peserta';
                  const isEdit = c.issue === 'Edit Peserta';

                  return (
                    <div 
                      key={c.id} 
                      className={`bg-white rounded-2xl p-3 shadow-xs border flex flex-col justify-between gap-2.5 hover:shadow-md transition-all relative overflow-hidden group ${
                        isReg ? 'border-l-4 border-l-blue-500 border-slate-200/80' : isEdit ? 'border-l-4 border-l-purple-500 border-slate-200/80' : 'border-l-4 border-l-amber-500 border-slate-200/80'
                      }`}
                    >
                      {/* Top Bar: Issue Badge & Gugus */}
                      <div className="flex items-center justify-between gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 border flex items-center gap-1 ${
                          isReg 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : isEdit 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <span className="material-symbols-outlined text-[11px]">
                            {isReg ? 'person_add' : isEdit ? 'edit_note' : 'warning'}
                          </span>
                          <span>{isReg ? 'Registrasi' : isEdit ? 'Ubah Data' : 'Absensi'}</span>
                        </span>

                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[70px]">
                          {c.gugusName}
                        </span>
                      </div>

                      {/* Name & NIM */}
                      <div className="overflow-hidden">
                        <h4 className="text-body-sm font-bold text-slate-800 line-clamp-1 leading-snug" title={c.name}>
                          {c.name}
                        </h4>
                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[#012060]/5 border border-[#012060]/10">
                          <span className="text-[8px] font-extrabold uppercase text-slate-400">NIM</span>
                          <span className="text-[10px] font-bold text-[#012060] font-mono tracking-tight">{c.nim}</span>
                        </div>
                      </div>

                      {/* Issue details or Catatan */}
                      <div className="text-[10px] space-y-1 text-slate-500 border-t border-slate-100 pt-2 font-medium">
                        {!isReg && !isEdit && (
                          <div className="text-amber-800 font-bold bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 line-clamp-2 leading-tight">
                            "{c.issue}" {c.catatan ? `- ${c.catatan}` : ''}
                          </div>
                        )}

                        {detailsText && (
                          <div className="text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 text-[9.5px] leading-tight line-clamp-3">
                            {detailsText}
                          </div>
                        )}

                        <div className="text-slate-400 text-[9.5px] flex items-center gap-1 pt-0.5">
                          <span className="material-symbols-outlined text-[12px] text-slate-400">schedule</span>
                          <span>{c.time}</span>
                        </div>
                      </div>

                      {/* Approve / Reject Action Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                        <button 
                          onClick={() => handleReject(c.id, c.name)}
                          className="py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border border-rose-200/60"
                          title="Tolak"
                        >
                          <span className="material-symbols-outlined text-[13px]">close</span>
                          <span>Tolak</span>
                        </button>

                        <button 
                          onClick={() => handleApprove(c.id, c.name)}
                          className="py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                          title="Setujui"
                        >
                          <span className="material-symbols-outlined text-[13px]">check</span>
                          <span>Setujui</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-body-sm">
                Tidak ada klaim manual yang tertunda.
              </div>
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on screen >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100">
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peserta</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIM</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gugus</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe Pengajuan</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waktu</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
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
                      } catch {}
                    } else if (c.issue === 'Tambah Peserta' && c.catatan) {
                      try {
                        const data = JSON.parse(c.catatan);
                        detailsText = `Jurusan: ${data.fakultas || '-'} • Email: ${data.email || '-'}`;
                      } catch {}
                    }

                    const isReg = c.issue === 'Tambah Peserta';
                    const isEdit = c.issue === 'Edit Peserta';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex flex-col min-w-0">
                            <span className="text-body-sm font-bold text-slate-800 truncate">{c.name}</span>
                            {detailsText ? (
                              <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded mt-0.5 w-max max-w-[240px] leading-tight border border-blue-100">{detailsText}</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">{c.fakultas || '-'}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="text-body-sm font-bold text-[#012060] font-mono bg-[#012060]/5 px-2.5 py-1 rounded-lg border border-[#012060]/10">{c.nim}</span>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-label-sm border border-slate-200/60">
                            {c.gugusName}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          {isReg ? (
                            <div className="flex items-center gap-1.5 text-blue-700 font-bold text-body-sm">
                              <span className="material-symbols-outlined text-[18px]">person_add</span>
                              <span>Registrasi Baru</span>
                            </div>
                          ) : isEdit ? (
                            <div className="flex items-center gap-1.5 text-purple-700 font-bold text-body-sm">
                              <span className="material-symbols-outlined text-[18px]">edit_note</span>
                              <span>Ubah Data</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-amber-700 font-bold text-body-sm">
                                <span className="material-symbols-outlined text-[18px]">warning</span>
                                <span>{c.issue}</span>
                              </div>
                              {c.catatan && (
                                <span className="text-[11px] text-slate-500 italic max-w-[240px] truncate" title={c.catatan}>
                                  "{c.catatan}"
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-6 text-body-sm text-slate-500 font-medium">
                          {c.time}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleReject(c.id, c.name)} 
                              className="px-3 py-1.5 rounded-xl text-label-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-all cursor-pointer flex items-center gap-1"
                              title="Tolak Pengajuan"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                              <span>Tolak</span>
                            </button>

                            <button 
                              onClick={() => handleApprove(c.id, c.name)} 
                              className="px-3.5 py-1.5 rounded-xl text-label-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                              title="Setujui Pengajuan"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              <span>Setujui</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-400 text-body-md">Tidak ada klaim manual yang tertunda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-[#f8fafc]/50">
            <span className="text-[11px] sm:text-body-sm font-medium text-slate-500">
              Menampilkan {filteredClaims.length} dari {claims.length} klaim tertunda
            </span>
          </div>

        </div>
      </main>
    </div>
  );
}
