import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminPeserta() {
  const { peserta, gugus, addPeserta, updatePeserta, deletePeserta, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGugus, setSelectedGugus] = useState('');
  
  // Selection states
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudentId, setEditStudentId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    gugusId: '',
    fakultas: '',
    status: 'Belum Hadir'
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filtered participants
  const filteredPeserta = peserta.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.id.includes(searchTerm);
    const matchesGugus = selectedGugus === '' || student.gugusId === selectedGugus;
    return matchesSearch && matchesGugus;
  });

  // Pagination calculation
  const totalItems = filteredPeserta.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPeserta.slice(indexOfFirstItem, indexOfLastItem);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentItems.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    window.confirmAction(`Hapus ${selectedIds.length} peserta terpilih?`, () => {
      selectedIds.forEach(id => deletePeserta(id));
      setSelectedIds([]);
      alert("Peserta berhasil dihapus.");
    });
  };

  const handleDeleteOne = (id) => {
    window.confirmAction("Hapus peserta ini?", () => {
      deletePeserta(id);
      setSelectedIds(prev => prev.filter(item => item !== id));
      alert("Peserta berhasil dihapus.");
    });
  };

  const handleOpenAddModal = () => {
    setFormData({
      id: '',
      name: '',
      email: '',
      gugusId: gugus[0]?.id || '',
      fakultas: 'Fakultas Teknik',
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (showAddModal) {
      if (peserta.some(p => p.id === formData.id)) {
        alert("NIM sudah digunakan!");
        return;
      }
      addPeserta(formData);
      setShowAddModal(false);
      alert("Peserta berhasil ditambahkan.");
    } else if (showEditModal) {
      updatePeserta(editStudentId, formData);
      setShowEditModal(false);
      alert("Peserta berhasil diperbarui.");
    }
  };

  const handleImportSimulate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv, .xlsx';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        alert(`Berhasil impor data dari file: ${file.name}.`);
        addPeserta({ id: `240${Date.now().toString().slice(-6)}`, name: 'Impor Mahasiswa A', email: 'impor.a@univ.ac.id', gugusId: 'G-01-FT', status: 'Belum Hadir', fakultas: 'Fakultas Teknik' });
        addPeserta({ id: `240${(Date.now() + 1).toString().slice(-6)}`, name: 'Impor Mahasiswa B', email: 'impor.b@univ.ac.id', gugusId: 'G-02-FE', status: 'Belum Hadir', fakultas: 'Fakultas Ekonomi' });
      }
    };
    input.click();
  };

  const getGugusName = (gugusId) => {
    const g = gugus.find(item => item.id === gugusId);
    return g ? g.name : '-';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Hadir': return 'bg-[#ecfdf5] text-[#059669]';
      case 'Alpa': return 'bg-[#fef2f2] text-[#dc2626]';
      case 'Izin': return 'bg-[#fffbeb] text-[#d97706]';
      case 'Manual (Pending)': return 'bg-surface-variant text-on-surface-variant';
      default: return 'bg-surface-container-highest text-on-surface-variant';
    }
  };

  const totalHadir = peserta.filter(p => p.status === 'Hadir').length;
  const persentaseKehadiran = peserta.length > 0 ? ((totalHadir / peserta.length) * 100).toFixed(1) : '0';

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Peserta</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>{hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div><button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert("Profile admin")}><span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span><span className="text-label-md text-on-surface">Profile</span></button></div></header><main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full space-y-gutter relative">
<div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mt-2">
<div className="bg-surface-container rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
<div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
<div className="flex items-center justify-between mb-4 relative z-10">
<span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Total Peserta</span>
<div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
<span className="material-symbols-outlined text-on-primary text-[20px]">groups</span>
</div>
</div>
<div className="relative z-10">
<div className="flex items-end gap-3">
<span className="text-display-lg font-display-lg text-primary">{peserta.length}</span>
</div>
</div>
</div>
<div className="bg-surface-container rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
<div className="absolute -right-4 -top-4 w-32 h-32 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors"></div>
<div className="flex items-center justify-between mb-4 relative z-10">
<span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Hadir</span>
<div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
<span className="material-symbols-outlined text-on-secondary-container text-[20px]">how_to_reg</span>
</div>
</div>
<div className="relative z-10">
<div className="flex items-end gap-3">
<span className="text-display-lg font-display-lg text-secondary">{totalHadir}</span>
<span className="text-body-sm font-body-sm text-[#059669] mb-2 flex items-center font-medium">
<span className="material-symbols-outlined text-[16px] mr-1">trending_up</span> {persentaseKehadiran}%
                    </span>
</div>
</div>
</div>
<div className="bg-primary text-on-primary rounded-xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden group">
<div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
<div className="relative z-10">
<h3 className="text-headline-sm font-headline-md mb-4">Aksi Cepat</h3>
</div>
<div className="flex gap-3 relative z-10">
<button onClick={handleOpenAddModal} className="flex-1 bg-white text-primary px-4 py-2.5 rounded-lg text-label-md font-label-md hover:bg-surface-container transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer">
<span className="material-symbols-outlined text-[18px]">person_add</span>
                    Tambah
                </button>
<button onClick={handleImportSimulate} className="bg-primary-fixed-dim/20 text-white px-4 py-2.5 rounded-lg text-label-md font-label-md hover:bg-primary-fixed-dim/30 transition-colors flex items-center justify-center gap-2 border border-white/10 cursor-pointer">
<span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Impor
                </button>
</div>
</div>
</div>

<div className="bg-surface-container rounded-xl shadow-sm overflow-hidden flex flex-col w-full relative z-10">
<div className="p-6 pb-4 border-b border-surface-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div className="flex items-center gap-4">
  <h2 className="text-headline-sm font-headline-sm text-on-surface">Direktori Peserta</h2>
  {selectedIds.length > 0 && (
    <button onClick={handleDeleteSelected} className="bg-error/10 hover:bg-error/20 text-error text-label-sm font-label-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
      <span className="material-symbols-outlined text-[16px]">delete</span>
      Hapus Terpilih ({selectedIds.length})
    </button>
  )}
</div>
<div className="flex flex-col sm:flex-row gap-3">
<div className="relative">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
<input className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-surface rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" placeholder="Cari Nama atau NIM..." type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
</div>
<div className="relative group">
<select className="w-full sm:w-40 appearance-none pl-4 pr-10 py-2.5 bg-surface rounded-lg text-body-sm font-body-sm text-on-surface border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors cursor-pointer" value={selectedGugus} onChange={(e) => { setSelectedGugus(e.target.value); setCurrentPage(1); }}>
<option value="">Semua Gugus</option>
{gugus.map(g => (
  <option key={g.id} value={g.id}>{g.name}</option>
))}
</select>
<span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">expand_more</span>
</div>
<button className="bg-surface border border-outline-variant text-on-surface p-2.5 rounded-lg hover:bg-surface-variant transition-colors flex items-center justify-center group" title="Hapus Filter" onClick={() => { setSearchTerm(''); setSelectedGugus(''); }}>
<span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">tune</span>
</button>
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface/50 border-b border-surface-variant">
<th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold w-12">
<input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary accent-primary cursor-pointer" type="checkbox" checked={currentItems.length > 0 && currentItems.every(p => selectedIds.includes(p.id))} onChange={handleSelectAll} />
</th>
<th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Nama</th>
<th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">NIM</th>
<th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Gugus</th>
<th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Status</th>
<th className="py-4 px-6 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold text-right">Aksi</th>
</tr>
</thead>
<tbody className="divide-y divide-surface-variant">
  {currentItems.length > 0 ? (
    currentItems.map((student) => (
      <tr key={student.id} className="hover:bg-surface-variant/30 transition-colors group">
      <td className="py-4 px-6">
      <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary accent-primary cursor-pointer" type="checkbox" checked={selectedIds.includes(student.id)} onChange={(e) => handleSelectOne(student.id, e.target.checked)} />
      </td>
      <td className="py-4 px-6">
      <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-secondary-container/50 text-secondary font-headline-sm flex items-center justify-center border border-secondary/10 shrink-0 font-bold">
        {student.name.substring(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
      <p className="text-body-md font-body-md text-on-surface font-medium truncate group-hover:text-primary transition-colors">{student.name}</p>
      <p className="text-label-sm font-label-sm text-on-surface-variant truncate">{student.fakultas}</p>
      </div>
      </div>
      </td>
      <td className="py-4 px-6">
      <span className="text-body-sm font-body-sm text-on-surface font-mono bg-surface px-2 py-1 rounded-md border border-outline-variant/30">{student.id}</span>
      </td>
      <td className="py-4 px-6">
      <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-secondary"></span>
      <span className="text-body-sm font-body-sm text-on-surface">{getGugusName(student.gugusId)}</span>
      </div>
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
      <button onClick={() => handleOpenEditModal(student)} className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-md transition-colors cursor-pointer" title="Edit">
      <span className="material-symbols-outlined text-[18px]">edit</span>
      </button>
      <button onClick={() => handleDeleteOne(student.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-md transition-colors cursor-pointer" title="Hapus">
      <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>
      </div>
      </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="6" className="text-center py-10 text-on-surface-variant text-body-md">Tidak ada data peserta ditemukan.</td>
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

{/* ADD STUDENT MODAL */}
{showAddModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-primary/20 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
    <div className="relative w-full max-w-lg bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col z-10">
      <div className="bg-primary p-6 text-on-primary">
        <h3 className="text-headline-md font-headline-md">Tambah Peserta</h3>
      </div>
      <form onSubmit={handleFormSubmit}>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">NIM</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Masukkan NIM..." value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Nama Lengkap</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Nama..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Email</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="email" placeholder="mahasiswa@student.univ.ac.id" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1">Gugus</label>
              <select className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary cursor-pointer font-body-md" value={formData.gugusId} onChange={(e) => setFormData({...formData, gugusId: e.target.value})}>
                {gugus.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1">Fakultas</label>
              <select className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary cursor-pointer font-body-md" value={formData.fakultas} onChange={(e) => setFormData({...formData, fakultas: e.target.value})}>
                <option value="Fakultas Teknik">Fakultas Teknik</option>
                <option value="Fakultas Ekonomi">Fakultas Ekonomi</option>
                <option value="Fakultas Hukum">Fakultas Hukum</option>
                <option value="Fakultas Kedokteran">Fakultas Kedokteran</option>
                <option value="Fakultas Ilmu Komputer">Fakultas Ilmu Komputer</option>
                <option value="Fakultas ISIP">Fakultas ISIP</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-6 bg-surface-container-low flex justify-end gap-3 border-t border-outline-variant/30">
          <button type="button" className="px-5 py-2.5 text-label-md font-label-md text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors cursor-pointer" onClick={() => setShowAddModal(false)}>Batal</button>
          <button type="submit" className="px-5 py-2.5 text-label-md font-label-md bg-primary text-on-primary shadow-md hover:bg-primary-fixed rounded-xl transition-all cursor-pointer">Simpan</button>
        </div>
      </form>
    </div>
  </div>
)}

{/* EDIT STUDENT MODAL */}
{showEditModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-primary/20 backdrop-blur-md" onClick={() => setShowEditModal(false)}></div>
    <div className="relative w-full max-w-lg bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col z-10">
      <div className="bg-primary p-6 text-on-primary">
        <h3 className="text-headline-md font-headline-md">Edit Peserta</h3>
      </div>
      <form onSubmit={handleFormSubmit}>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">NIM</label>
            <input className="w-full bg-surface-container-low text-on-surface-variant p-3 rounded-xl border border-outline-variant opacity-60 font-body-md" disabled type="text" value={formData.id} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Nama Lengkap</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Email</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1">Gugus</label>
              <select className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary cursor-pointer font-body-md" value={formData.gugusId} onChange={(e) => setFormData({...formData, gugusId: e.target.value})}>
                {gugus.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1">Fakultas</label>
              <select className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary cursor-pointer font-body-md" value={formData.fakultas} onChange={(e) => setFormData({...formData, fakultas: e.target.value})}>
                <option value="Fakultas Teknik">Fakultas Teknik</option>
                <option value="Fakultas Ekonomi">Fakultas Ekonomi</option>
                <option value="Fakultas Hukum">Fakultas Hukum</option>
                <option value="Fakultas Kedokteran">Fakultas Kedokteran</option>
                <option value="Fakultas Ilmu Komputer">Fakultas Ilmu Komputer</option>
                <option value="Fakultas ISIP">Fakultas ISIP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Status Kehadiran</label>
            <select className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary cursor-pointer font-body-md" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
              <option value="Hadir">Hadir</option>
              <option value="Belum Hadir">Belum Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Alpa">Alpa</option>
              <option value="Manual (Pending)">Manual (Pending)</option>
            </select>
          </div>
        </div>
        <div className="p-6 bg-surface-container-low flex justify-end gap-3 border-t border-outline-variant/30">
          <button type="button" className="px-5 py-2.5 text-label-md font-label-md text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors cursor-pointer" onClick={() => setShowEditModal(false)}>Batal</button>
          <button type="submit" className="px-5 py-2.5 text-label-md font-label-md bg-primary text-on-primary shadow-md hover:bg-primary-fixed rounded-xl transition-all cursor-pointer">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  </div>
)}

</main></div>
  );
}
