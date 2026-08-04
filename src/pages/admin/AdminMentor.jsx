import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminMentor() {
  const { mentors, gugus, addMentor, updateMentor, deleteMentor, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMentorId, setEditMentorId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    nip: '',
    gugusId: 'Unassigned',
    email: '',
    phone: '',
    role: 'Lecturer'
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredMentors = mentors.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = m.name.toLowerCase().includes(term) || 
                          m.nip.includes(term) || 
                          m.email.toLowerCase().includes(term) ||
                          m.role.toLowerCase().includes(term);
    return matchesSearch;
  });

  // Pagination calculation
  const totalItems = filteredMentors.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMentors.slice(indexOfFirstItem, indexOfLastItem);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      nip: '',
      gugusId: 'Unassigned',
      email: '',
      phone: '',
      role: 'Lecturer'
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (m) => {
    setEditMentorId(m.id);
    setFormData({
      name: m.name,
      nip: m.nip,
      gugusId: m.gugusId,
      email: m.email,
      phone: m.phone,
      role: m.role
    });
    setShowEditModal(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (showAddModal) {
      if (mentors.some(m => m.nip === formData.nip)) {
        alert("NIP sudah terdaftar!");
        return;
      }
      addMentor(formData);
      setShowAddModal(false);
      alert("Mentor berhasil ditambahkan.");
    } else if (showEditModal) {
      updateMentor(editMentorId, formData);
      setShowEditModal(false);
      alert("Mentor berhasil diperbarui.");
    }
  };

  const handleDelete = (id, name) => {
    window.confirmAction(`Hapus mentor ${name}?`, () => {
      deleteMentor(id);
      alert("Mentor berhasil dihapus.");
    });
  };

  const getGugusName = (gugusId) => {
    if (gugusId === 'Unassigned' || !gugusId) return 'Unassigned';
    const g = gugus.find(item => item.id === gugusId);
    return g ? g.name : gugusId;
  };

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Mentor</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>{hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div><button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert("Profile Admin")}><span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span><span className="text-label-md text-on-surface">Profil</span></button></div></header><main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full h-full relative space-y-8">
<div className="flex items-center justify-between">
<div className="flex flex-col space-y-2">
<div className="flex items-center gap-4">
<h2 className="text-headline-lg font-headline-lg text-on-background">Mentor</h2>
<span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-label-sm font-label-sm">Total: {mentors.length}</span>
</div>
</div>
<div className="flex items-center gap-3">
<button onClick={handleOpenAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-xl transition-all shadow-md shadow-primary/20 font-label-md text-label-md cursor-pointer">
<span className="material-symbols-outlined text-[18px]">add</span>
        Tambah
      </button>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
<div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
<div className="flex items-center justify-between mb-4 relative z-10">
<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
<span className="material-symbols-outlined">school</span>
</div>
<span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Aktif</span>
</div>
<div className="relative z-10">
<p className="text-display-lg font-display-lg text-on-background">{mentors.filter(m => m.gugusId !== 'Unassigned').length}</p>
</div>
</div>
<div className="bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
<div className="absolute -right-6 -top-6 w-24 h-24 bg-secondary/5 rounded-full blur-xl group-hover:bg-secondary/10 transition-colors"></div>
<div className="flex items-center justify-between mb-4 relative z-10">
<div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
<span className="material-symbols-outlined">hourglass_empty</span>
</div>
<span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Belum Ditugaskan</span>
</div>
<div className="relative z-10">
<p className="text-display-lg font-display-lg text-on-background">{mentors.filter(m => m.gugusId === 'Unassigned').length}</p>
</div>
</div>
<div className="bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
<div className="absolute -right-6 -top-6 w-24 h-24 bg-error/5 rounded-full blur-xl group-hover:bg-error/10 transition-colors"></div>
<div className="flex items-center justify-between mb-4 relative z-10">
<div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error">
<span className="material-symbols-outlined">warning</span>
</div>
<span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Alerts</span>
</div>
<div className="relative z-10">
<p className="text-display-lg font-display-lg text-on-background">{mentors.filter(m => !m.email || !m.phone).length}</p>
</div>
</div>
</div>
<div className="bg-surface-container rounded-2xl shadow-sm overflow-hidden flex flex-col">
<div className="p-6 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low">
<div className="relative w-64">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">search</span>
<input className="w-full pl-10 pr-4 py-2 bg-surface rounded-xl text-body-sm font-body-sm text-on-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Cari mentor..." type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-low text-label-md font-label-md text-on-surface-variant">
<th className="px-6 py-4 whitespace-nowrap">Mentor</th>
<th className="px-6 py-4 whitespace-nowrap">NIP</th>
<th className="px-6 py-4 whitespace-nowrap">Gugus</th>
<th className="px-6 py-4 whitespace-nowrap">Kontak</th>
<th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
</tr>
</thead>
<tbody className="text-body-sm font-body-sm text-on-background">
  {currentItems.length > 0 ? (
    currentItems.map((m) => (
      <tr key={m.id} className="border-b border-outline-variant/20 hover:bg-surface-container-highest/30 transition-colors group">
      <td className="px-6 py-4">
      <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
        {m.name.substring(0, 2).toUpperCase()}
      </div>
      <div>
      <p className="font-label-md text-on-background">{m.name}</p>
      <p className="text-label-sm text-on-surface-variant">{m.role}</p>
      </div>
      </div>
      </td>
      <td className="px-6 py-4 font-mono text-on-surface-variant">{m.nip}</td>
      <td className="px-6 py-4">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-label-sm font-label-sm ${
        m.gugusId === 'Unassigned' ? 'bg-surface-variant text-on-surface-variant' : 'bg-secondary/10 text-secondary'
      }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {getGugusName(m.gugusId)}
                    </span>
      </td>
      <td className="px-6 py-4">
      <div className="flex flex-col space-y-1">
      {m.email ? (
        <span className="text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">mail</span> {m.email}</span>
      ) : (
        <span className="text-error flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span> Tidak Ada Email</span>
      )}
      <span className="text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span> {m.phone || '-'}</span>
      </div>
      </td>
      <td className="px-6 py-4 text-right">
      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => handleOpenEditModal(m)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-md transition-colors cursor-pointer" title="Edit">
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button onClick={() => handleDelete(m.id, m.name)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-md transition-colors cursor-pointer" title="Hapus">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
      </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="5" className="text-center py-8 text-on-surface-variant">Tidak ada data mentor.</td>
    </tr>
  )}
</tbody>
</table>
</div>
<div className="p-4 border-t border-outline-variant/20 bg-surface-container-low flex items-center justify-between">
<span className="text-label-sm font-label-sm text-on-surface-variant">Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} dari {totalItems} mentor</span>
<div className="flex gap-1">
<button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-50" disabled={currentPage === 1}>
<span className="material-symbols-outlined text-[18px]">chevron_left</span>
</button>
{Array.from({ length: totalPages }).map((_, i) => (
  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-label-sm font-label-sm ${
    currentPage === i + 1 ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-highest'
  }`}>{i + 1}</button>
))}
<button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-50" disabled={currentPage === totalPages}>
<span className="material-symbols-outlined text-[18px]">chevron_right</span>
</button>
</div>
</div>
</div>
</div>

{/* ADD/EDIT MENTOR MODAL */}
{(showAddModal || showEditModal) && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-primary/20 backdrop-blur-md" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}></div>
    <div className="relative w-full max-w-lg bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col z-10">
      <div className="bg-primary p-6 text-on-primary">
        <h3 className="text-headline-md font-headline-md">{showAddModal ? 'Tambah Mentor' : 'Edit Mentor'}</h3>
      </div>
      <form onSubmit={handleFormSubmit}>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">NIP</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Masukkan NIP..." disabled={showEditModal} value={formData.nip} onChange={(e) => setFormData({...formData, nip: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Nama Lengkap</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Nama..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Role / Jabatan</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Contoh: Lecturer..." value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Email</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" type="email" placeholder="mentor@univ.ac.id" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Nomor Telepon</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" type="text" placeholder="+62 812..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Gugus yang Ditugaskan</label>
            <select className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary cursor-pointer font-body-md" value={formData.gugusId} onChange={(e) => setFormData({...formData, gugusId: e.target.value})}>
              <option value="Unassigned">Belum Ditugaskan</option>
              {gugus.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-6 bg-surface-container-low flex justify-end gap-3 border-t border-outline-variant/30">
          <button type="button" className="px-5 py-2.5 text-label-md font-label-md text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors cursor-pointer" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Batal</button>
          <button type="submit" className="px-5 py-2.5 text-label-md font-label-md bg-primary text-on-primary shadow-md hover:bg-primary-fixed rounded-xl transition-all cursor-pointer">Simpan</button>
        </div>
      </form>
    </div>
  </div>
)}

</main></div>
  );
}
