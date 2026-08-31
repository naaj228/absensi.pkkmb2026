import { useContext, useState, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { isHadir, getStatusBadge, STATUS_OPTIONS } from '../../utils/statusHelper';

export default function MentorPeserta() {
  const { peserta, gugus, addPeserta, updatePeserta, currentUser, hasMentorNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Get gugus ID from the currently logged-in mentor
  const mentorGugusId = currentUser?.gugusId || '';
  const mentorGugus = gugus.find(g => g.id === mentorGugusId);
  const rawGugusName = mentorGugus?.name || 'Gugus Saya';
  const mentorGugusName = rawGugusName.toLowerCase().includes('panitia')
    ? 'Gugus'
    : (rawGugusName.startsWith('Gugus') ? rawGugusName : `Gugus ${rawGugusName}`);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudentId, setEditStudentId] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrStudent, setQrStudent] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    gugusId: mentorGugusId,
    fakultas: '',
    status: 'Alpha'
  });

  // Filter students belonging to mentor's group
  const mentorStudents = peserta.filter(p => p.gugusId === mentorGugusId);
  const hadirCount = mentorStudents.filter(p => isHadir(p.status)).length;
  const alphaCount = mentorStudents.length - hadirCount;

  const filteredStudents = mentorStudents.filter(student => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = student.name.toLowerCase().includes(term) || student.id.includes(term);
    
    let matchesStatus = true;
    if (statusFilter === 'hadir') {
      matchesStatus = isHadir(student.status);
    } else if (statusFilter === 'belum') {
      matchesStatus = !isHadir(student.status);
    }

    return matchesSearch && matchesStatus;
  });

  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadZip = async () => {
    if (mentorStudents.length === 0) {
      alert("Tidak ada data peserta di gugus Anda.");
      return;
    }
    setDownloadingZip(true);
    try {
      const serverUrl = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001';
      const studentsData = mentorStudents.map(p => ({
        id: p.id,
        name: p.name,
        gugusName: mentorGugusName
      }));

      const response = await fetch(`${serverUrl}/api/generate-gugus-zip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students: studentsData }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengunduh file ZIP dari server.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ID_Cards_${mentorGugusName.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Terjadi kesalahan saat mengunduh ZIP: " + err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadQr = useCallback(async (student) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(student.id)}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-${student.name.replace(/\s+/g, '_')}-${student.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh QR Code. Pastikan koneksi internet tersedia.');
    }
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      id: '',
      name: '',
      email: '',
      gugusId: mentorGugusId,
      fakultas: '',
      status: 'Belum Hadir'
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (student) => {
    setEditStudentId(student.id);
    setFormData({
      id: student.id,
      name: student.name,
      email: student.email,
      gugusId: student.gugusId,
      fakultas: student.fakultas,
      status: student.status
    });
    setShowEditModal(true);
  };

  const handleOpenQrModal = (student) => {
    setQrStudent(student);
    setShowQrModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (showAddModal) {
        if (peserta.some(p => p.id === formData.id)) {
          alert("NIM sudah digunakan!");
          return;
        }
        await addPeserta(formData);
        setShowAddModal(false);
        alert("Pengajuan tambah peserta baru berhasil dikirim ke Admin.");
      } else if (showEditModal) {
        await updatePeserta(editStudentId, formData);
        setShowEditModal(false);
        alert("Pengajuan edit data peserta berhasil dikirim ke Admin.");
      }
    } catch {
      // Error is already alerted by AppContext
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header - Fixed to top, padded for mobile hamburger menu */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">groups</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Anggota {mentorGugusName}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div 
            className="relative group cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/mentor/notifikasi')}
            title="Notifikasi Mentor"
          >
            <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors text-[22px] sm:text-[24px]">notifications</span>
            {hasMentorNotifications && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-20 px-3 sm:px-6 lg:px-8 max-w-container-max mx-auto space-y-4 sm:space-y-6">
        
        {/* Banner & Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#012060]/5 text-[#012060] px-2.5 py-0.5 rounded-full border border-[#012060]/10">
                {mentorGugusName}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {mentorStudents.length} Mahasiswa
              </span>
            </div>
            <h2 className="text-body-lg sm:text-headline-md font-bold text-[#012060]">Daftar Anggota Gugus</h2>
            <p className="text-[11px] sm:text-body-sm text-slate-500 mt-0.5">
              Kelola data presensi mahasiswa bimbingan Anda, unduh QR Code, atau ajukan penambahan peserta.
            </p>
          </div>

          <div className="flex flex-row w-full sm:w-auto gap-2.5 shrink-0">
            <button 
              onClick={handleDownloadZip} 
              disabled={downloadingZip}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[#012060] px-4 py-2.5 rounded-xl text-label-md font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px]">{downloadingZip ? 'sync' : 'download'}</span>
              <span>{downloadingZip ? 'Mengunduh...' : 'Unduh ZIP'}</span>
            </button>
            
            <button 
              onClick={handleOpenAddModal} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[#012060] hover:bg-[#022b80] text-white px-4 py-2.5 rounded-xl text-label-md font-bold transition-all shadow-md cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Tambah</span>
            </button>
          </div>
        </div>

        {/* Main Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col w-full relative z-10">
          
          {/* Toolbar (Search & Filter Tabs) */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#f8fafc]/40">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input 
                className="w-full bg-white border border-slate-200 text-slate-800 text-body-sm font-semibold py-2.5 pl-9 pr-8 rounded-xl shadow-2xs focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-400" 
                placeholder="Cari Nama atau NIM..." 
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

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button 
                onClick={() => setStatusFilter('all')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] sm:text-body-sm font-bold transition-all cursor-pointer ${
                  statusFilter === 'all' 
                    ? 'bg-white shadow-xs text-[#012060]' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua ({mentorStudents.length})
              </button>

              <button 
                onClick={() => setStatusFilter('hadir')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] sm:text-body-sm font-bold transition-all cursor-pointer ${
                  statusFilter === 'hadir' 
                    ? 'bg-white shadow-xs text-emerald-700' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hadir ({hadirCount})
              </button>

              <button 
                onClick={() => setStatusFilter('belum')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] sm:text-body-sm font-bold transition-all cursor-pointer ${
                  statusFilter === 'belum' 
                    ? 'bg-white shadow-xs text-rose-700' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Belum ({alphaCount})
              </button>
            </div>
          </div>

          {/* MOBILE VIEW GRID (2 Kolom pada Layar Mobile < md) */}
          <div className="block md:hidden p-3 bg-slate-50/50 border-b border-slate-100">
            {filteredStudents.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {filteredStudents.map((student) => {
                  const b = getStatusBadge(student.status);
                  const isStudentHadir = isHadir(student.status);

                  return (
                    <div 
                      key={student.id} 
                      className={`bg-white rounded-2xl p-3 shadow-xs border flex flex-col justify-between gap-2.5 hover:shadow-md transition-all relative overflow-hidden group ${
                        isStudentHadir ? 'border-l-4 border-l-emerald-500 border-slate-200/80' : 'border-l-4 border-l-rose-500 border-slate-200/80'
                      }`}
                    >
                      {/* Top Bar: Status Badge */}
                      <div className="flex items-center justify-end">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 border flex items-center gap-1 ${
                          isStudentHadir 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isStudentHadir ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                          <span>{b.label}</span>
                        </span>
                      </div>

                      {/* Name & NIM */}
                      <div className="overflow-hidden">
                        <h4 className="text-body-sm font-bold text-slate-800 line-clamp-1 leading-snug" title={student.name}>
                          {student.name}
                        </h4>
                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[#012060]/5 border border-[#012060]/10">
                          <span className="text-[8px] font-extrabold uppercase text-slate-400">NIM</span>
                          <span className="text-[10px] font-bold text-[#012060] font-mono tracking-tight">{student.id}</span>
                        </div>
                      </div>

                      {/* Jurusan & Email Info */}
                      <div className="text-[10px] space-y-0.5 text-slate-500 border-t border-slate-100 pt-2 font-medium">
                        <div className="truncate text-slate-700 font-semibold">
                          {student.fakultas || 'Belum Ditentukan'}
                        </div>
                        <div className="truncate text-slate-400 text-[9.5px]">
                          {student.email || '-'}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                        <button 
                          onClick={() => handleOpenQrModal(student)}
                          className="py-1.5 bg-[#012060] hover:bg-[#022b80] active:scale-95 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                          title="Lihat QR"
                        >
                          <span className="material-symbols-outlined text-[13px]">qr_code_2</span>
                          <span>QR</span>
                        </button>

                        <button 
                          onClick={() => handleOpenEditModal(student)}
                          className="py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-200/60"
                          title="Ubah Data"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                          <span>Ubah</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-body-sm">
                Tidak ada data anggota gugus ditemukan.
              </div>
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on screen >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100">
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mahasiswa</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIM</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jurusan</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Kehadiran</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const b = getStatusBadge(student.status);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex flex-col min-w-0">
                            <span className="text-body-sm font-bold text-slate-800 truncate">{student.name}</span>
                            <span className="text-[11px] text-slate-400 truncate">{student.email}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="text-body-sm font-bold text-[#012060] font-mono bg-[#012060]/5 px-2.5 py-1 rounded-lg border border-[#012060]/10">{student.id}</span>
                        </td>

                        <td className="py-4 px-6 text-body-sm text-slate-700 font-medium">
                          {student.fakultas || '-'}
                        </td>

                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold ${b.bg} ${b.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`}></span>
                            {b.label}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => handleOpenQrModal(student)} 
                              className="p-1.5 text-[#012060] hover:bg-[#012060]/10 rounded-lg transition-colors cursor-pointer" 
                              title="Lihat QR Code"
                            >
                              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                            </button>

                            <button 
                              onClick={() => handleOpenEditModal(student)} 
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" 
                              title="Edit Data Peserta"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-slate-400 text-body-md">Tidak ada data anggota gugus.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-[#f8fafc]/50">
            <span className="text-[11px] sm:text-body-sm font-medium text-slate-500">
              Menampilkan {filteredStudents.length} dari {mentorStudents.length} mahasiswa gugus
            </span>
          </div>

        </div>
      </main>

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg bg-white shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col z-10 border border-slate-100 animate-fade-in">
            <div className="bg-[#012060] p-3.5 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                  <span className="material-symbols-outlined text-[16px] sm:text-[20px] text-white">person_add</span>
                </div>
                <div>
                  <h3 className="text-body-md sm:text-body-lg font-bold">Tambah Anggota Gugus</h3>
                  <p className="text-[10px] sm:text-[11px] text-white/80 mt-0.5">Pengajuan penambahan peserta baru ke Admin</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-3.5 sm:p-6 space-y-2.5 sm:space-y-4">
                <div>
                  <label className="block text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NIM (Nomor Induk Mahasiswa)</label>
                  <div className="relative">
                    <input className="w-full bg-[#f8fafc] text-slate-800 font-semibold p-2.5 sm:p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 text-body-sm pl-9 transition-all" required type="text" placeholder="Masukkan NIM..." value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] sm:text-[18px]">badge</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
                  <div className="relative">
                    <input className="w-full bg-[#f8fafc] text-slate-800 font-semibold p-2.5 sm:p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 text-body-sm pl-9 transition-all" required type="text" placeholder="Nama..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] sm:text-[18px]">person</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Mahasiswa</label>
                  <div className="relative">
                    <input className="w-full bg-[#f8fafc] text-slate-800 font-semibold p-2.5 sm:p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 text-body-sm pl-9 transition-all" required type="email" placeholder="mahasiswa@student.univ.ac.id" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] sm:text-[18px]">mail</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jurusan / Program Studi</label>
                  <div className="relative">
                    <input className="w-full bg-[#f8fafc] text-slate-800 font-semibold p-2.5 sm:p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 text-body-sm pl-9 transition-all" required type="text" placeholder="Cth: Teknik Informatika" value={formData.fakultas} onChange={(e) => setFormData({...formData, fakultas: e.target.value})} />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] sm:text-[18px]">school</span>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" className="px-4 py-2 text-body-sm font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer" onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className="px-4 py-2 text-body-sm font-bold bg-[#012060] text-white hover:bg-[#022b80] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Kirim Pengajuan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg bg-white shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col z-10 border border-slate-100 animate-fade-in">
            {/* Header */}
            <div className="bg-[#012060] p-3.5 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                  <span className="material-symbols-outlined text-[16px] sm:text-[20px] text-white">edit_note</span>
                </div>
                <div>
                  <h3 className="text-body-md sm:text-body-lg font-bold">Edit Data Anggota</h3>
                  <p className="text-[10px] sm:text-[11px] text-white/80 mt-0.5">Pengajuan perubahan profil ke Admin</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-3.5 sm:p-6 space-y-2.5 sm:space-y-4">
                {/* NIM Readonly */}
                <div>
                  <label className="block text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NIM (Nomor Induk Mahasiswa)</label>
                  <div className="relative">
                    <input className="w-full bg-slate-100 text-slate-500 font-mono font-bold p-2.5 sm:p-3 rounded-xl border border-slate-200 text-body-sm pl-9" disabled type="text" value={formData.id} />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] sm:text-[18px]">lock</span>
                  </div>
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
                  <div className="relative">
                    <input className="w-full bg-[#f8fafc] text-slate-800 font-semibold p-2.5 sm:p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 text-body-sm pl-9 transition-all" required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] sm:text-[18px]">person</span>
                  </div>
                </div>

                {/* Email Mahasiswa */}
                <div>
                  <label className="block text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Mahasiswa</label>
                  <div className="relative">
                    <input className="w-full bg-[#f8fafc] text-slate-800 font-semibold p-2.5 sm:p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 text-body-sm pl-9 transition-all" required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] sm:text-[18px]">mail</span>
                  </div>
                </div>

                {/* Jurusan / Prodi */}
                <div>
                  <label className="block text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jurusan / Program Studi</label>
                  <div className="relative">
                    <input className="w-full bg-[#f8fafc] text-slate-800 font-semibold p-2.5 sm:p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 text-body-sm pl-9 transition-all" required type="text" value={formData.fakultas} onChange={(e) => setFormData({...formData, fakultas: e.target.value})} />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] sm:text-[18px]">school</span>
                  </div>
                </div>

                {/* Status Kehadiran */}
                <div>
                  <label className="block text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Kehadiran</label>
                  <div className="relative">
                    <select className="w-full bg-[#f8fafc] text-slate-800 font-semibold p-2.5 sm:p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 cursor-pointer text-body-sm appearance-none pl-9 pr-8 transition-all" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] sm:text-[18px]">fact_check</span>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[16px] sm:text-[18px]">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-4 bg-slate-50 flex items-center justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  className="px-4 py-2 text-body-sm font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer" 
                  onClick={() => setShowEditModal(false)}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-body-sm font-bold bg-[#012060] text-white hover:bg-[#022b80] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {showQrModal && qrStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQrModal(false)}></div>
          <div className="relative w-full max-w-sm bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col z-10 border border-slate-100 animate-fade-in p-6 items-center text-center">
            <div className="w-full flex items-center justify-between mb-3">
              <h3 className="text-body-lg font-bold text-[#012060]">QR Code Mahasiswa</h3>
              <button onClick={() => setShowQrModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="w-48 h-48 bg-white rounded-2xl p-3 border border-slate-200 flex items-center justify-center shadow-xs mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrStudent.id)}`} 
                alt={`QR Code NIM: ${qrStudent.id}`}
                className="w-full h-full object-contain"
              />
            </div>
            
            <p className="text-body-md font-bold text-slate-800">{qrStudent.name}</p>
            <p className="text-body-sm text-slate-500 font-mono mb-5">NIM: {qrStudent.id}</p>

            <div className="flex gap-2.5 w-full">
              <button onClick={() => handleDownloadQr(qrStudent)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-label-md font-bold transition-colors border border-slate-200 flex items-center justify-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Unduh</span>
              </button>
              <button onClick={() => setShowQrModal(false)} className="flex-1 bg-[#012060] text-white py-2.5 rounded-xl text-label-md font-bold transition-colors shadow-md hover:bg-[#022b80] cursor-pointer">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
