import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

const displayGugusId = (id) => {
  if (!id) return '';
  if (id.startsWith('00000000-0000-0000-0000-')) {
    const parts = id.split('-');
    const lastPart = parts[parts.length - 1];
    return parseInt(lastPart, 10).toString();
  }
  return id.length > 8 ? id.substring(0, 8) : id;
};

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
    // Generate a simple number-like UUID for the new Gugus
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    const padded = String(randomNum).padStart(12, '0');
    const autoId = `00000000-0000-0000-0000-${padded}`;

    setFormData({
      id: autoId,
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
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Gugus</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>{hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div></div></header><main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full relative">
{/* Decorative Background Blur */}
<div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
{/* Header Section */}
<div className="flex flex-row justify-between items-center mb-6 sm:mb-8 relative z-10">
  <div className="flex flex-col">
    <div className="flex items-center gap-2.5">
      <span className="material-symbols-outlined text-primary text-[20px] sm:text-[24px] p-1.5 sm:p-2 bg-primary/10 rounded-xl">grid_view</span>
      <h2 className="font-bold text-base sm:text-headline-lg text-on-surface">Manajemen Gugus</h2>
    </div>
  </div>
  <button onClick={handleOpenAddModal} className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-md group cursor-pointer text-xs sm:text-label-md font-semibold">
    <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:rotate-90 transition-transform duration-300">add</span>
    <span>Tambah Gugus</span>
  </button>
</div>
{/* Summary Stats */}
<div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 relative z-10">
  {/* Card 1: Total Gugus */}
  <div className="bg-surface rounded-xl p-4 shadow-sm border-l-4 border-primary relative overflow-hidden group">
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
    <div className="flex items-center justify-between relative z-10">
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] sm:text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5 truncate">Total Gugus</span>
        <span className="text-xl sm:text-2xl md:text-display-lg font-bold text-on-surface leading-none">{gugus.length}</span>
      </div>
      <span className="material-symbols-outlined text-[28px] sm:text-[36px] text-primary/40 shrink-0">groups_3</span>
    </div>
  </div>
  {/* Card 2: Mentor */}
  <div className="bg-surface rounded-xl p-4 shadow-sm border-l-4 border-secondary relative overflow-hidden group">
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
    <div className="flex items-center justify-between relative z-10">
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] sm:text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5 truncate">Mentor</span>
        <span className="text-xl sm:text-2xl md:text-display-lg font-bold text-on-surface leading-none">{mentors.length}</span>
      </div>
      <span className="material-symbols-outlined text-[28px] sm:text-[36px] text-secondary/40 shrink-0">school</span>
    </div>
  </div>
  {/* Card 3: Total Peserta */}
  <div className="bg-surface rounded-xl p-4 shadow-sm border-l-4 border-tertiary relative overflow-hidden group col-span-2 md:col-span-1">
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
    <div className="flex items-center justify-between relative z-10">
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] sm:text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5 truncate">Total Peserta</span>
        <span className="text-xl sm:text-2xl md:text-display-lg font-bold text-on-surface leading-none">{peserta.length}</span>
      </div>
      <span className="material-symbols-outlined text-[28px] sm:text-[36px] text-tertiary/40 shrink-0">bar_chart</span>
    </div>
  </div>
</div>
{/* Gugus Grid */}
<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 relative z-10">
  {gugus.map((g) => {
    const sCount = getStudentCount(g.id);
    const percentage = Math.min(Math.round((sCount / g.capacity) * 100), 100);
    const strokeDash = `${percentage}, 100`;

    return (
      <div key={g.id} className="bg-surface rounded-xl p-3 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col group relative overflow-hidden">
      {/* Decorative geometric corner */}
      <svg className="absolute -top-1 -right-1 w-10 h-10 sm:w-16 sm:h-16 text-primary/10 group-hover:text-primary/20 transition-colors" fill="currentColor" viewBox="0 0 100 100">
      <polygon points="100,0 100,100 0,0"></polygon>
      </svg>
      <div className="flex justify-between items-start mb-3 sm:mb-6">
      <div className="min-w-0">
        <h3 className="text-sm sm:text-headline-md font-bold text-on-surface truncate max-w-[80px] sm:max-w-none">{g.name}</h3>
        <p className="text-[9px] sm:text-body-sm text-on-surface-variant font-mono mt-0.5">ID: {displayGugusId(g.id)}</p>
      </div>
      <div className="flex gap-0.5 relative z-20 shrink-0">
        <button onClick={() => handleOpenEditModal(g)} className="p-1 sm:p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-full transition-colors cursor-pointer" title="Edit">
          <span className="material-symbols-outlined text-[15px] sm:text-[20px]">edit</span>
        </button>
        <button onClick={() => handleDelete(g.id, g.name)} className="p-1 sm:p-2 text-on-surface-variant hover:bg-surface-container hover:text-error rounded-full transition-colors cursor-pointer" title="Hapus">
          <span className="material-symbols-outlined text-[15px] sm:text-[20px]">delete</span>
        </button>
      </div>
      </div>
      <div className="flex-1 space-y-2.5 sm:space-y-4">
      <div className="flex items-center gap-2 sm:gap-3">
      <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-secondary-container/30 flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-secondary text-[14px] sm:text-[20px]">person</span>
      </div>
      <div className="flex flex-col min-w-0">
      <span className="text-[9px] sm:text-label-sm text-on-surface-variant">Mentor</span>
      <span className="text-[10px] sm:text-body-sm text-on-surface font-semibold truncate">{getMentorName(g.mentorId)}</span>
      </div>
      </div>
      <div className="bg-surface-container-low rounded-lg sm:rounded-xl p-2 sm:p-3 flex justify-between items-center">
      <div className="flex flex-col">
      <span className="text-[9px] sm:text-label-sm text-on-surface-variant">Mahasiswa</span>
      <span className="text-xs sm:text-headline-sm font-bold text-on-surface">{sCount}<span className="text-on-surface-variant text-[9px] sm:text-body-sm font-normal">/{g.capacity}</span></span>
      </div>
      <div className="w-10 h-10 sm:w-16 sm:h-16 relative shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
      <path className="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
      <path className="text-primary transition-all duration-1000 ease-out" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={strokeDash} strokeWidth="4" style={{strokeDasharray: strokeDash}}></path>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[9px] sm:text-label-sm text-primary font-bold">{percentage}%</span>
      </div>
      </div>
      </div>
      </div>
      <div className="mt-3 pt-3 sm:mt-6 sm:pt-4 border-t border-surface-container flex gap-3">
      <button onClick={() => {
        navigate(`/admin/gugus/${g.id}`);
      }} className="flex-1 text-[10px] sm:text-label-md text-primary bg-primary/5 hover:bg-primary/10 py-1.5 sm:py-2 rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-2 cursor-pointer font-bold">
                 Detail <span className="material-symbols-outlined text-[12px] sm:text-[16px]">arrow_forward</span>
      </button>
      </div>
      </div>
    );
  })}
</div>
</div>
</main>

{/* ADD/EDIT GUGUS MODAL */}
{(showAddModal || showEditModal) && (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-primary/25 backdrop-blur-md" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}></div>
    <div className="relative w-full max-w-md bg-surface-container-lowest shadow-2xl rounded-2xl overflow-hidden flex flex-col z-10 border border-outline-variant/30">
      <div className="bg-primary p-4 sm:p-5 text-on-primary">
        <h3 className="text-base sm:text-lg font-bold">{showAddModal ? 'Tambah Gugus' : 'Edit Gugus'}</h3>
      </div>
      <form onSubmit={handleFormSubmit}>
        <div className="p-4 sm:p-5 space-y-3">
          {(showAddModal || showEditModal) && (
            <div>
              <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">ID Gugus {showAddModal ? '(Otomatis)' : '(Permanen)'}</label>
              <input className="w-full bg-surface-container-low text-on-surface-variant/70 py-2 px-3 rounded-lg border border-outline-variant/50 opacity-60 text-xs sm:text-sm font-mono cursor-not-allowed" disabled value={displayGugusId(formData.id)} />
            </div>
          )}
          <div>
            <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Nama Gugus</label>
            <input className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-xs sm:text-sm font-medium" required type="text" placeholder="Nama..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Kapasitas Maksimal</label>
            <input className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-xs sm:text-sm font-medium" required type="number" min="5" max="100" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} />
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Mentor Utama</label>
            <select className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary cursor-pointer text-xs sm:text-sm font-medium" value={formData.mentorId} onChange={(e) => setFormData({...formData, mentorId: e.target.value})}>
              <option value="Unassigned">Belum ditunjuk</option>
              {mentors.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 sm:p-5 bg-surface-container-low flex justify-end gap-2.5 border-t border-outline-variant/30">
          <button type="button" className="px-4 py-2 text-xs sm:text-label-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Batal</button>
          <button type="submit" className="px-4 py-2 text-xs sm:text-label-sm font-bold bg-primary text-on-primary shadow-md hover:bg-primary-fixed rounded-lg transition-all cursor-pointer">Simpan</button>
        </div>
      </form>
    </div>
  </div>
)}
</div>
  );
}
