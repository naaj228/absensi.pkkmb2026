import { useContext, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { isHadir, getStatusBadge } from '../../utils/statusHelper';

const displayGugusId = (id) => {
  if (!id) return '';
  if (id.startsWith('00000000-0000-0000-0000-')) {
    const parts = id.split('-');
    const lastPart = parts[parts.length - 1];
    return parseInt(lastPart, 10).toString();
  }
  return id.length > 8 ? id.substring(0, 8) : id;
};

export default function AdminGugusDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { peserta, gugus, mentors, deletePeserta, hasAdminNotifications } = useContext(AppContext);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Find the gugus
  const group = gugus.find(g => g.id === id);

  if (!group) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background text-on-background">
        <span className="material-symbols-outlined text-[64px] text-error mb-4">grid_off</span>
        <h2 className="text-headline-lg font-headline-lg mb-2">Gugus Tidak Ditemukan</h2>
        <button onClick={() => navigate('/admin/gugus')} className="bg-primary text-on-primary px-6 py-3 rounded-xl hover:bg-primary-fixed shadow-md transition-all font-label-md cursor-pointer">
          Kembali ke Manajemen Gugus
        </button>
      </div>
    );
  }

  // Find mentor details
  const mentor = mentors.find(m => m.gugusId === group.id || m.id === group.mentorId);
  const mentorName = mentor ? mentor.name : 'Belum Ditentukan';

  // Get participants of this gugus
  const gugusStudents = peserta.filter(p => p.gugusId === group.id);

  // Stats calculation
  const totalStudents = gugusStudents.length;
  const totalHadir = gugusStudents.filter(p => isHadir(p.status)).length;
  const totalIzin = gugusStudents.filter(p => p.status === 'Izin').length;
  const totalAlpha = gugusStudents.filter(p => p.status === 'Alpha' || !p.status).length;
  const persentaseKehadiran = totalStudents > 0 ? ((totalHadir / totalStudents) * 100).toFixed(1) : '0';

  // Filtered participants
  const filteredStudents = gugusStudents.filter(student => {
    return student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.includes(searchTerm) ||
      (student.fakultas && student.fakultas.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Pagination calculation
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

  const handleDeleteOne = (studentId, studentName) => {
    window.confirmAction(`Hapus ${studentName} dari database?`, () => {
      deletePeserta(studentId);
      alert("Peserta berhasil dihapus.");
    });
  };

  return (
    <div className="w-full">
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/gugus')} className="hidden lg:flex hover:bg-surface-variant p-2 rounded-full transition-colors items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-headline-md text-on-surface">Detail Gugus</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>
            {hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>

        </div>
      </header>

      <main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col gap-4 sm:gap-6 pb-6 sm:pb-8">
          {/* Gugus Header Card */}
          <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between gap-4 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold shadow-inner">
                <span className="material-symbols-outlined text-[28px] sm:text-[32px]">grid_view</span>
              </div>
              <div className="text-center sm:text-left space-y-1">
                <h2 className="text-base sm:text-headline-lg font-bold text-on-surface leading-tight">{group.name}</h2>
                <p className="text-[10px] sm:text-body-sm text-on-surface-variant font-mono">ID Gugus: {displayGugusId(group.id)} • Kapasitas: {group.capacity} Mahasiswa</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-label-sm bg-secondary-container text-on-secondary-container font-semibold">
                    Mentor: {mentorName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-surface rounded-xl p-3 sm:p-4 shadow-sm border border-outline-variant/30 flex items-center justify-between">
              <div>
                <p className="text-[9px] sm:text-label-sm text-on-surface-variant uppercase tracking-wider">Total Anggota</p>
                <p className="text-lg sm:text-headline-lg font-bold text-on-surface mt-0.5">{totalStudents}</p>
              </div>
              <span className="material-symbols-outlined text-[24px] sm:text-[32px] text-primary/40">groups</span>
            </div>
            <div className="bg-[#ecfdf5] rounded-xl p-3 sm:p-4 shadow-sm border border-[#a7f3d0]/30 flex items-center justify-between">
              <div>
                <p className="text-[9px] sm:text-label-sm text-[#059669] uppercase tracking-wider">Hadir</p>
                <p className="text-lg sm:text-headline-lg font-bold text-[#059669] mt-0.5">{totalHadir}</p>
              </div>
              <span className="material-symbols-outlined text-[24px] sm:text-[32px] text-[#059669]/40">how_to_reg</span>
            </div>
            <div className="bg-[#fffbeb] rounded-xl p-3 sm:p-4 shadow-sm border border-[#fde68a]/30 flex items-center justify-between">
              <div>
                <p className="text-[9px] sm:text-label-sm text-[#d97706] uppercase tracking-wider">Izin</p>
                <p className="text-lg sm:text-headline-lg font-bold text-[#d97706] mt-0.5">{totalIzin}</p>
              </div>
              <span className="material-symbols-outlined text-[24px] sm:text-[32px] text-[#d97706]/40">info</span>
            </div>
            <div className="bg-[#fef2f2] rounded-xl p-3 sm:p-4 shadow-sm border border-[#fecaca]/30 flex items-center justify-between">
              <div>
                <p className="text-[9px] sm:text-label-sm text-[#dc2626] uppercase tracking-wider">Alpa</p>
                <p className="text-lg sm:text-headline-lg font-bold text-[#dc2626] mt-0.5">{totalAlpha}</p>
              </div>
              <span className="material-symbols-outlined text-[24px] sm:text-[32px] text-[#dc2626]/40">cancel</span>
            </div>
            <div className="bg-primary/5 rounded-xl p-3 sm:p-4 shadow-sm border border-primary/10 flex items-center justify-between col-span-2 lg:col-span-1">
              <div>
                <p className="text-[9px] sm:text-label-sm text-primary uppercase tracking-wider">Kehadiran %</p>
                <p className="text-lg sm:text-headline-lg font-bold text-primary mt-0.5">{persentaseKehadiran}%</p>
              </div>
              <span className="material-symbols-outlined text-[24px] sm:text-[32px] text-primary/40">query_stats</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-surface-container rounded-xl shadow-sm overflow-hidden flex flex-col w-full relative z-10 border border-outline-variant/30">
            <div className="p-4 sm:p-5 pb-3 border-b border-surface-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm sm:text-headline-sm font-bold text-on-surface">Daftar Mahasiswa Gugus</h2>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                <input
                  className="w-full sm:w-64 pl-9 pr-4 py-1.5 bg-surface rounded-lg text-xs sm:text-sm font-medium text-on-surface placeholder:text-on-surface-variant/70 border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="Cari Nama, NIM..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface/50 border-b border-surface-variant">
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold font-sans">Nama</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold font-sans">NIM</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold font-sans">Jurusan</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold font-sans">Status</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold text-right font-sans">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant/40">
                  {currentItems.length > 0 ? (
                    currentItems.map((student) => (
                      <tr key={student.id} className="hover:bg-surface-variant/20 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-secondary-container/50 text-secondary font-headline-sm flex items-center justify-center border border-secondary/10 shrink-0 font-bold">
                              {student.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-body-md font-semibold text-on-surface truncate group-hover:text-primary transition-colors">{student.name}</p>
                              <p className="text-label-sm text-on-surface-variant/80 truncate">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-body-sm font-semibold text-on-surface font-mono bg-surface-container-low px-2.5 py-1 rounded-md border border-outline-variant/20">{student.id}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-body-sm font-semibold text-on-surface">{student.fakultas || 'Belum Diisi'}</span>
                        </td>
                        <td className="py-4 px-6">
                          {(() => {
                            const b = getStatusBadge(student.status); return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-bold ${b.bg} ${b.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`}></span>
                                {b.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => navigate(`/admin/peserta/${student.id}`)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-md transition-colors cursor-pointer" title="Lihat Detail">
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            <button onClick={() => handleDeleteOne(student.id, student.name)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-md transition-colors cursor-pointer" title="Hapus">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-on-surface-variant text-body-md">Tidak ada data peserta ditemukan di gugus ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="block md:hidden divide-y divide-outline-variant/10">
              {currentItems.length > 0 ? (
                currentItems.map((student) => (
                  <div key={student.id} className="p-4 flex flex-col gap-2 bg-surface/10 hover:bg-surface-variant/5 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-secondary-container/50 text-secondary text-xs flex items-center justify-center border border-secondary/10 shrink-0 font-bold">
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p onClick={() => navigate(`/admin/peserta/${student.id}`)} className="text-xs font-bold text-on-surface hover:underline cursor-pointer truncate max-w-[140px]">{student.name}</p>
                          <p className="text-[9px] text-on-surface-variant/80 truncate max-w-[140px]">{student.email}</p>
                        </div>
                      </div>
                      {(() => {
                        const b = getStatusBadge(student.status);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${b.bg} ${b.text}`}>
                            <span className={`w-1 h-1 rounded-full ${b.dot}`}></span>
                            {b.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant mt-0.5">
                      <span>NIM: <span className="font-mono font-medium text-on-surface">{student.id}</span></span>
                      <span className="truncate max-w-[120px] font-medium">{student.fakultas || 'Belum Diisi'}</span>
                    </div>
                    <div className="flex justify-end gap-3 mt-1.5 pt-1.5 border-t border-outline-variant/10">
                      <button onClick={() => navigate(`/admin/peserta/${student.id}`)} className="flex items-center gap-1 text-[10px] font-bold text-primary cursor-pointer hover:underline">
                        <span className="material-symbols-outlined text-[14px]">visibility</span> Detail
                      </button>
                      <button onClick={() => handleDeleteOne(student.id, student.name)} className="flex items-center gap-1 text-[10px] font-bold text-error cursor-pointer hover:underline">
                        <span className="material-symbols-outlined text-[14px]">delete</span> Hapus
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-on-surface-variant text-xs">Tidak ada data peserta ditemukan di gugus ini.</div>
              )}
            </div>

            <div className="p-4 border-t border-surface-variant flex items-center justify-between bg-surface/30">
              <span className="text-body-sm font-body-sm text-on-surface-variant">Menampilkan {indexOfFirstItem + 1} sampai {Math.min(indexOfLastItem, totalItems)} dari {totalItems} entri</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-md transition-colors disabled:opacity-50" disabled={currentPage === 1}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-label-sm font-label-md transition-colors ${currentPage === i + 1 ? 'bg-primary text-on-primary' : 'hover:bg-surface-variant text-on-surface'
                    }`}>{i + 1}</button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-md transition-colors disabled:opacity-50" disabled={currentPage === totalPages}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
