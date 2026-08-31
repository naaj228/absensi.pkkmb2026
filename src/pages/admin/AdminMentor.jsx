import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminMentor() {
  const { mentors, gugus, addMentor, updateMentor, deleteMentor, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'aktif' | 'unassigned' | 'alerts'
  
  const handleFilterToggle = (filterType) => {
    setActiveFilter(prev => prev === filterType ? 'all' : filterType);
    setCurrentPage(1);
  };
  
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
    role: 'mentor',
    password: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const filteredMentors = mentors.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = m.name.toLowerCase().includes(term) || 
                          m.email.toLowerCase().includes(term) ||
                          (m.nip && m.nip.toLowerCase().includes(term));
    if (!matchesSearch) return false;

    if (activeFilter === 'aktif') return m.gugusId !== 'Unassigned';
    if (activeFilter === 'unassigned') return m.gugusId === 'Unassigned';
    if (activeFilter === 'alerts') return !m.email || !m.phone;

    return true;
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
      role: 'mentor',
      password: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (m) => {
    setEditMentorId(m.id);
    setFormData({
      name: m.name,
      nip: m.nip || '',
      gugusId: m.gugusId,
      email: m.email,
      phone: m.phone || '',
      role: m.role || 'mentor',
      password: ''
    });
    setShowEditModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (showAddModal) {
        await addMentor(formData);
        setShowAddModal(false);
        alert("Mentor berhasil ditambahkan.");
      } else if (showEditModal) {
        await updateMentor(editMentorId, formData);
        setShowEditModal(false);
        alert("Mentor berhasil diperbarui.");
      }
    } catch {
      // Error is already alerted by AppContext
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
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header - Fixed to top */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">badge</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Mentor & Pendamping Gugus
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
        
        {/* Top Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-[#012060]/5 text-[#012060] px-2.5 py-0.5 rounded-full border border-[#012060]/10">
                Manajemen Mentor
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {mentors.length} Total Mentor
              </span>
            </div>
            <h2 className="text-body-md sm:text-headline-md font-bold text-[#012060]">Data Mentor PKKMB</h2>
            <p className="text-[10.5px] sm:text-body-sm text-slate-500 mt-0.5">
              Kelola data mentor, penugasan ke gugus, dan akun login.
            </p>
          </div>

          <button 
            onClick={handleOpenAddModal} 
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#012060] hover:bg-[#022b80] text-white px-3.5 py-2 rounded-xl text-body-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Tambah Mentor</span>
          </button>
        </div>

        {/* Quick Filter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
          <div 
            onClick={() => handleFilterToggle('aktif')}
            className={`bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border transition-all cursor-pointer ${
              activeFilter === 'aktif' ? 'border-[#012060] ring-2 ring-[#012060]/10 bg-[#012060]/5' : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-label-sm font-bold text-slate-400 uppercase tracking-wider">Aktif Bertugas</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[16px]">school</span>
              </div>
            </div>
            <p className="text-body-md sm:text-headline-md font-extrabold text-[#012060]">{mentors.filter(m => m.gugusId !== 'Unassigned').length}</p>
          </div>

          <div 
            onClick={() => handleFilterToggle('unassigned')}
            className={`bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border transition-all cursor-pointer ${
              activeFilter === 'unassigned' ? 'border-amber-500 ring-2 ring-amber-500/10 bg-amber-50/30' : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-label-sm font-bold text-slate-400 uppercase tracking-wider">Unassigned</span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
              </div>
            </div>
            <p className="text-body-md sm:text-headline-md font-extrabold text-amber-700">{mentors.filter(m => m.gugusId === 'Unassigned').length}</p>
          </div>

          <div 
            onClick={() => handleFilterToggle('alerts')}
            className={`bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border transition-all cursor-pointer col-span-2 md:col-span-1 ${
              activeFilter === 'alerts' ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-50/30' : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-label-sm font-bold text-slate-400 uppercase tracking-wider">Perlu Kontak</span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[16px]">warning</span>
              </div>
            </div>
            <p className="text-body-md sm:text-headline-md font-extrabold text-rose-700">{mentors.filter(m => !m.email || !m.phone).length}</p>
          </div>
        </div>

        {/* Main Table Container */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col w-full relative z-10">
          
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 bg-[#f8fafc]/50">
            <div className="relative flex-1 sm:max-w-xs">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input 
                className="w-full bg-white border border-slate-200 text-slate-800 text-body-sm font-semibold py-2 pl-8 pr-8 rounded-xl shadow-2xs focus:outline-none focus:border-primary transition-all placeholder:text-slate-400" 
                placeholder="Cari Mentor..." 
                type="text" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {(activeFilter !== 'all' || searchTerm) && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setActiveFilter('all'); 
                    setSearchTerm(''); 
                    setCurrentPage(1); 
                  }} 
                  className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                  <span>Reset Filter</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100">
                  <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mentor</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gugus</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kontak</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {currentItems.length > 0 ? (
                  currentItems.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#012060]/10 text-[#012060] font-bold flex items-center justify-center text-body-sm shrink-0 border border-[#012060]/20">
                            {m.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-body-sm font-bold text-slate-800">{m.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">NIP/NIM: {m.nip || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          m.gugusId === 'Unassigned' ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[#012060]/5 text-[#012060] border border-[#012060]/10'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>{getGugusName(m.gugusId)}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-body-sm text-slate-600">
                        <div className="flex flex-col space-y-0.5">
                          <span className="flex items-center gap-1 text-[11px] font-medium"><span className="material-symbols-outlined text-[13px] text-slate-400">mail</span> {m.email}</span>
                          {m.phone && <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500"><span className="material-symbols-outlined text-[13px] text-slate-400">call</span> {m.phone}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleOpenEditModal(m)} className="p-1.5 text-slate-500 hover:text-[#012060] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Edit Mentor">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(m.id, m.name)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Hapus Mentor">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-slate-400 text-body-sm">Tidak ada data mentor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden space-y-2.5 p-3">
            {currentItems.length > 0 ? (
              currentItems.map((m) => (
                <div key={m.id} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#012060]/10 text-[#012060] font-bold flex items-center justify-center text-xs">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-body-sm font-bold text-slate-800">{m.name}</p>
                        <span className="text-[9.5px] text-slate-400 font-mono">NIP: {m.nip || '-'}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      m.gugusId === 'Unassigned' ? 'bg-slate-100 text-slate-500' : 'bg-secondary/10 text-secondary'
                    }`}>
                      {getGugusName(m.gugusId)}
                    </span>
                  </div>

                  <div className="text-[10.5px] text-slate-500 border-t border-slate-100 pt-1.5 flex flex-col gap-0.5">
                    <span>📧 {m.email}</span>
                    {m.phone && <span>📞 {m.phone}</span>}
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
                    <button onClick={() => handleOpenEditModal(m)} className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg cursor-pointer">Edit</button>
                    <button onClick={() => handleDelete(m.id, m.name)} className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg cursor-pointer">Hapus</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">Tidak ada data mentor.</div>
            )}
          </div>

          {/* Pagination */}
          <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#f8fafc]/50">
            <span className="text-[11px] sm:text-body-sm font-medium text-slate-500">
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} dari {totalItems} mentor
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>

                <span className="text-[11px] font-bold text-[#012060] bg-[#012060]/5 border border-[#012060]/10 px-3 py-1 rounded-lg">
                  {currentPage} / {totalPages}
                </span>

                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ADD/EDIT MENTOR MODAL */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}></div>
          <div className="relative w-full max-w-sm sm:max-w-md bg-white shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col z-10 border border-slate-100">
            <div className="bg-[#012060] p-3.5 sm:p-4 text-white">
              <h3 className="text-body-sm sm:text-body-md font-bold">{showAddModal ? 'Tambah Mentor' : 'Edit Mentor'}</h3>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-3.5 sm:p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
                  <input className="w-full bg-[#f8fafc] text-slate-800 py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-body-sm font-semibold" required type="text" placeholder="Nama..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NIM / NIP</label>
                  <input className="w-full bg-[#f8fafc] text-slate-800 py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-body-sm font-semibold font-mono" required type="text" placeholder="Masukkan NIP..." value={formData.nip} onChange={(e) => setFormData({...formData, nip: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                  <input className="w-full bg-[#f8fafc] text-slate-800 py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-body-sm font-semibold" required type="email" placeholder="mentor@univ.ac.id" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                {showAddModal && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password Mentor</label>
                    <input className="w-full bg-[#f8fafc] text-slate-800 py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-body-sm font-semibold" type="password" placeholder="Password (default: pkkmb2026)..." value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Telepon</label>
                  <input className="w-full bg-[#f8fafc] text-slate-800 py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-body-sm font-semibold" required type="text" placeholder="+62 812..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gugus yang Ditugaskan</label>
                  <select className="w-full bg-[#f8fafc] text-slate-800 py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary cursor-pointer text-body-sm font-semibold" value={formData.gugusId} onChange={(e) => setFormData({...formData, gugusId: e.target.value})}>
                    <option value="Unassigned">Belum Ditugaskan</option>
                    {gugus.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-3.5 sm:p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" className="py-2 px-4 rounded-xl text-body-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Batal</button>
                <button type="submit" className="py-2 px-4 rounded-xl text-body-sm font-bold bg-[#012060] text-white hover:bg-[#022b80] transition-all cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
