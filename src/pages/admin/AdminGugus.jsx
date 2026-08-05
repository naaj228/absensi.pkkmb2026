import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminGugus() {
  const { gugus, mentors, peserta, addGugus, updateGugus, deleteGugus, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGugusId, setEditGugusId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    id: '', // Custom ID, e.g. G-01-FT
    name: '',
    mentorId: 'Unassigned',
    capacity: 50
  });

  const handleOpenAddModal = () => {
    setFormData({
      id: '',
      name: '',
      mentorId: 'Unassigned',
      capacity: 50
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (g) => {
    setEditGugusId(g.id);
    setFormData({
      id: g.id,
      name: g.name,
      mentorId: g.mentorId || 'Unassigned',
      capacity: g.capacity
    });
    setShowEditModal(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (showAddModal) {
      if (gugus.some(g => g.id === formData.id)) {
        alert("ID Gugus sudah digunakan!");
        return;
      }
      addGugus(formData);
      setShowAddModal(false);
      alert("Gugus baru berhasil ditambahkan.");
    } else if (showEditModal) {
      updateGugus(editGugusId, formData);
      setShowEditModal(false);
      alert("Gugus berhasil diperbarui.");
    }
  };

  const handleDelete = (id, name) => {
    window.confirmAction(`Hapus ${name}?`, () => {
      deleteGugus(id);
      alert("Gugus berhasil dihapus.");
    });
  };

  const getMentorName = (mentorId) => {
    if (mentorId === 'Unassigned' || !mentorId) return 'Belum ditentukan';
    const m = mentors.find(item => item.id === mentorId);
    return m ? m.name : 'Belum ditentukan';
  };

  const getStudentCount = (gugusId) => {
    return peserta.filter(p => p.gugusId === gugusId).length;
  };



  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Gugus</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>{hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div></div></header><main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full relative">
{/* Decorative Background Blur */}
<div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
{/* Header Section */}
<div className="flex flex-row justify-between items-end mb-12 relative z-10">
<div className="flex flex-col gap-2">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary text-[28px] p-2 bg-primary/10 rounded-xl">grid_view</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface">Manajemen Gugus</h2>
</div>
</div>
<button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-md group cursor-pointer">
<span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform duration-300">add</span>
<span className="font-label-md text-label-md">Tambah Gugus</span>
</button>
</div>
{/* Summary Stats */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
<div className="bg-surface rounded-2xl p-6 shadow-sm border-l-4 border-primary relative overflow-hidden group">
<div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
<div className="flex items-center justify-between relative z-10">
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Total Gugus</span>
<span className="font-display-lg text-display-lg text-on-surface">{gugus.length}</span>
</div>
<span className="material-symbols-outlined text-[40px] text-primary/40">groups_3</span>
</div>
</div>
<div className="bg-surface rounded-2xl p-6 shadow-sm border-l-4 border-secondary relative overflow-hidden group">
<div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
<div className="flex items-center justify-between relative z-10">
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Mentor</span>
<span className="font-display-lg text-display-lg text-on-surface">{mentors.length}</span>
</div>
<span className="material-symbols-outlined text-[40px] text-secondary/40">school</span>
</div>
</div>
<div className="bg-surface rounded-2xl p-6 shadow-sm border-l-4 border-tertiary relative overflow-hidden group">
<div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
<div className="flex items-center justify-between relative z-10">
<div className="flex flex-col">
<span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Total Peserta</span>
<span className="font-display-lg text-display-lg text-on-surface">{peserta.length}</span>
</div>
<span className="material-symbols-outlined text-[40px] text-tertiary/40">bar_chart</span>
</div>
</div>
</div>
{/* Gugus Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
  {gugus.map((g) => {
    const sCount = getStudentCount(g.id);
    const percentage = Math.min(Math.round((sCount / g.capacity) * 100), 100);
    const strokeDash = `${percentage}, 100`;

    return (
      <div key={g.id} className="bg-surface rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative overflow-hidden">
      {/* Decorative geometric corner */}
      <svg className="absolute -top-1 -right-1 w-16 h-16 text-primary/10 group-hover:text-primary/20 transition-colors" fill="currentColor" viewBox="0 0 100 100">
      <polygon points="100,0 100,100 0,0"></polygon>
      </svg>
      <div className="flex justify-between items-start mb-6">
      <div>
      <h3 className="font-headline-md text-headline-md text-on-surface">{g.name}</h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant font-mono mt-1">ID: {g.id}</p>
      </div>
      <div className="flex gap-1 relative z-20">
        <button onClick={() => handleOpenEditModal(g)} className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-full transition-colors cursor-pointer" title="Edit">
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </button>
        <button onClick={() => handleDelete(g.id, g.name)} className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-error rounded-full transition-colors cursor-pointer" title="Hapus">
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>
      </div>
      <div className="flex-1 space-y-4">
      <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center">
      <span className="material-symbols-outlined text-secondary text-[20px]">person</span>
      </div>
      <div className="flex flex-col">
      <span className="font-label-sm text-label-sm text-on-surface-variant">Mentor</span>
      <span className="font-body-sm text-body-sm text-on-surface font-medium">{getMentorName(g.mentorId)}</span>
      </div>
      </div>
      <div className="bg-surface-container-low rounded-xl p-3 flex justify-between items-center">
      <div className="flex flex-col">
      <span className="font-label-sm text-label-sm text-on-surface-variant">Mahasiswa</span>
      <span className="font-headline-sm text-headline-sm text-on-surface">{sCount}<span className="text-on-surface-variant text-body-sm font-normal">/{g.capacity}</span></span>
      </div>
      <div className="w-16 h-16 relative">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
      <path className="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
      <path className="text-primary transition-all duration-1000 ease-out" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={strokeDash} strokeWidth="4" style={{strokeDasharray: strokeDash}}></path>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
      <span className="font-label-sm text-label-sm text-primary">{percentage}%</span>
      </div>
      </div>
      </div>
      </div>
      <div className="mt-6 pt-4 border-t border-surface-container flex gap-3">
      <button onClick={() => {
        navigate(`/admin/gugus/${g.id}`);
      }} className="flex-1 font-label-md text-label-md text-primary bg-primary/5 hover:bg-primary/10 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
                Detail <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </button>
      </div>
      </div>
    );
  })}
</div>
</div>

{/* ADD/EDIT GUGUS MODAL */}
{(showAddModal || showEditModal) && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-primary/20 backdrop-blur-md" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}></div>
    <div className="relative w-full max-w-lg bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col z-10">
      <div className="bg-primary p-6 text-on-primary">
        <h3 className="text-headline-md font-headline-md">{showAddModal ? 'Tambah Gugus' : 'Edit Gugus'}</h3>
      </div>
      <form onSubmit={handleFormSubmit}>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">ID Gugus</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="ID (Contoh: G-05-FT)..." disabled={showEditModal} value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Nama Gugus</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Nama..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Kapasitas Maksimal</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="number" min="5" max="100" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} />
          </div>

          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Mentor Utama</label>
            <select className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary cursor-pointer font-body-md" value={formData.mentorId} onChange={(e) => setFormData({...formData, mentorId: e.target.value})}>
              <option value="Unassigned">Belum ditunjuk</option>
              {mentors.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
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
