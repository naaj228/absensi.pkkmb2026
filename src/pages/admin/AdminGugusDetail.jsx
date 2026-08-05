import { useContext, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { isHadir, getStatusBadge } from '../../utils/statusHelper';

export default function AdminGugusDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { peserta, gugus, mentors, updatePeserta, deletePeserta, hasAdminNotifications } = useContext(AppContext);

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
  const mentorNip = mentor ? mentor.nip : '-';

  // Get participants of this gugus
  const gugusStudents = peserta.filter(p => p.gugusId === group.id);

  // Stats calculation
  const totalStudents = gugusStudents.length;
  const totalHadir = gugusStudents.filter(p => isHadir(p.status)).length;
  const totalHadirPenuh = gugusStudents.filter(p => p.status === 'Hadir Penuh').length;
  const totalHadirSebagian = gugusStudents.filter(p => p.status === 'Hadir Sebagian').length;
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

  const getStatusColor = (status) => {
    const badge = getStatusBadge(status);
    return `${badge.bg} ${badge.text}`;
  };

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
          <button onClick={() => navigate('/admin/gugus')} className="hover:bg-surface-variant p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-headline-md text-on-surface">Detail Gugus</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>
            {hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>
          <button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert("Profile admin")}>
            <span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span>
            <span className="text-label-md text-on-surface">Profil</span>
          </button>
        </div>
      </header>

      <main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col gap-8 pb-12">
          {/* Gugus Header Card */}
          <div className="bg-surface-container rounded-[24px] p-8 shadow-sm flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-display-lg text-display-md font-bold shadow-inner">
                <span className="material-symbols-outlined text-[40px]">grid_view</span>
              </div>
              <div className="text-center sm:text-left space-y-2">
                <h2 className="text-headline-lg font-headline-md text-on-surface leading-tight">{group.name}</h2>
                <p className="text-body-md text-on-surface-variant font-mono">ID Gugus: {group.id} • Kapasitas: {group.capacity} Mahasiswa</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="px-3 py-1 rounded-full text-label-md bg-secondary-container text-on-secondary-container font-semibold">
                    Mentor: {mentorName}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10 self-center md:self-end">
              <button onClick={() => navigate(`/admin/gugus`)} className="bg-surface border border-outline-variant hover:bg-surface-variant text-on-surface px-4 py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center gap-2 cursor-pointer">
                Kelola Gugus
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-surface rounded-xl p-5 shadow-sm border border-outline-variant/30 flex items-center justify-between">
              <div>
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Anggota</p>
                <p className="text-headline-lg font-bold text-on-surface mt-1">{totalStudents}</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-primary/40">groups</span>
            </div>
            <div className="bg-[#ecfdf5] rounded-xl p-5 shadow-sm border border-[#a7f3d0]/30 flex items-center justify-between">
              <div>
                <p className="text-label-sm text-[#059669] uppercase tracking-wider">Hadir</p>
                <p className="text-headline-lg font-bold text-[#059669] mt-1">{totalHadir}</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-[#059669]/40">how_to_reg</span>
            </div>
            <div className="bg-[#fffbeb] rounded-xl p-5 shadow-sm border border-[#fde68a]/30 flex items-center justify-between">
              <div>
                <p className="text-label-sm text-[#d97706] uppercase tracking-wider">Izin</p>
                <p className="text-headline-lg font-bold text-[#d97706] mt-1">{totalIzin}</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-[#d97706]/40">info</span>
            </div>
            <div className="bg-[#fef2f2] rounded-xl p-5 shadow-sm border border-[#fecaca]/30 flex items-center justify-between">
              <div>
                <p className="text-label-sm text-[#dc2626] uppercase tracking-wider">Alpa</p>
                <p className="text-headline-lg font-bold text-[#dc2626] mt-1">{totalAlpa}</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-[#dc2626]/40">cancel</span>
            </div>
            <div className="bg-primary/5 rounded-xl p-5 shadow-sm border border-primary/10 flex items-center justify-between">
              <div>
                <p className="text-label-sm text-primary uppercase tracking-wider">Kehadiran %</p>
                <p className="text-headline-lg font-bold text-primary mt-1">{persentaseKehadiran}%</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-primary/40">query_stats</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-surface-container rounded-xl shadow-sm overflow-hidden flex flex-col w-full relative z-10">
            <div className="p-6 pb-4 border-b border-surface-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Daftar Mahasiswa Gugus</h2>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input 
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-surface rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" 
                  placeholder="Cari Nama, NIM, Jurusan..." 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface/50 border-b border-surface-variant">
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Nama</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">NIM</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Jurusan</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Status</th>
                    <th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {currentItems.length > 0 ? (
                    currentItems.map((student) => (
                      <tr key={student.id} className="hover:bg-surface-variant/30 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary-container/50 text-secondary font-headline-sm flex items-center justify-center border border-secondary/10 shrink-0 font-bold">
                              {student.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-body-md font-body-md text-on-surface font-medium truncate group-hover:text-primary transition-colors">{student.name}</p>
                              <p className="text-label-sm font-label-sm text-on-surface-variant truncate">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-body-sm font-body-sm text-on-surface font-mono bg-surface px-2 py-1 rounded-md border border-outline-variant/30">{student.id}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-body-sm text-on-surface">{student.fakultas || 'Belum Diisi'}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-md font-medium ${getStatusColor(student.status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {student.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

            <div className="p-4 border-t border-surface-variant flex items-center justify-between bg-surface/30">
              <span className="text-body-sm font-body-sm text-on-surface-variant">Menampilkan {indexOfFirstItem + 1} sampai {Math.min(indexOfLastItem, totalItems)} dari {totalItems} entri</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-md transition-colors disabled:opacity-50" disabled={currentPage === 1}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-label-sm font-label-md transition-colors ${
                    currentPage === i + 1 ? 'bg-primary text-on-primary' : 'hover:bg-surface-variant text-on-surface'
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
