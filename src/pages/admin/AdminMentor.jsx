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
                          m.email.toLowerCase().includes(term);
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
    <div className="w-full">
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-sm font-headline-md text-on-surface">Mentor</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>
            {hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>
          
        </div>
      </header>
      
      <main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col w-full h-full relative space-y-8">
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
            <div 
              onClick={() => handleFilterToggle('aktif')}
              className={`bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
                activeFilter === 'aktif' ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
            >
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

            <div 
              onClick={() => handleFilterToggle('unassigned')}
              className={`bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
                activeFilter === 'unassigned' ? 'ring-2 ring-secondary bg-secondary/5' : ''
              }`}
            >
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

            <div 
              onClick={() => handleFilterToggle('alerts')}
              className={`bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
                activeFilter === 'alerts' ? 'ring-2 ring-error bg-error/5' : ''
              }`}
            >
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
            <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low flex-wrap gap-4">
              <div className="relative w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">search</span>
                <input className="w-full pl-10 pr-4 py-2 bg-surface rounded-xl text-body-sm font-body-sm text-on-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Cari mentor..." type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
              </div>
              
              {(activeFilter !== 'all' || searchTerm) && (
                <div className="flex items-center gap-2">
                  {activeFilter !== 'all' && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-sm font-label-sm font-medium ${
                      activeFilter === 'aktif' ? 'bg-primary/10 text-primary' :
                      activeFilter === 'unassigned' ? 'bg-secondary/10 text-secondary' :
                      'bg-error/10 text-error'
                    }`}>
                      Filter: {
                        activeFilter === 'aktif' ? 'Aktif' :
                        activeFilter === 'unassigned' ? 'Belum Ditugaskan' :
                        'Alerts'
                      }
                    </span>
                  )}
                  <button onClick={() => { setActiveFilter('all'); setSearchTerm(''); setCurrentPage(1); }} className="flex items-center gap-1 px-3 py-1 bg-surface hover:bg-surface-variant text-on-surface-variant border border-outline-variant/40 rounded-full text-label-sm font-label-sm transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-label-md font-label-md text-on-surface-variant">
                    <th className="px-6 py-4 whitespace-nowrap">Mentor</th>
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
                            </div>
                          </div>
                        </td>
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
                            {m.phone && (
                              <span className="text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span> {m.phone}</span>
                            )}
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
                      <td colSpan="4" className="text-center py-10 text-on-surface-variant text-body-md">Tidak ada data mentor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Card List */}
            <div className="block md:hidden space-y-4 p-4">
              {currentItems.length > 0 ? (
                currentItems.map((m) => (
                  <div key={m.id} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/40 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {m.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface">{m.name}</p>
                          <span className="text-label-sm text-on-surface-variant">NIP: {m.nip || '-'}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-label-sm font-label-sm ${
                        m.gugusId === 'Unassigned' ? 'bg-surface-variant text-on-surface-variant' : 'bg-secondary/10 text-secondary'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {getGugusName(m.gugusId)}
                      </span>
                    </div>
                    <div className="border-t border-b border-outline-variant/20 py-2.5 my-1 text-body-sm text-on-surface-variant flex flex-col gap-1">
                      {m.email ? (
                        <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">mail</span> {m.email}</span>
                      ) : (
                        <span className="text-error flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">warning</span> Tidak Ada Email</span>
                      )}
                      {m.phone && (
                        <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">call</span> {m.phone}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button onClick={() => handleOpenEditModal(m)} className="flex items-center gap-1.5 px-3 py-1.5 text-label-sm text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg border border-outline-variant/30 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(m.id, m.name)} className="flex items-center gap-1.5 px-3 py-1.5 text-label-sm text-error hover:bg-error/5 rounded-lg border border-error/10 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-on-surface-variant text-body-md bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/60">Tidak ada data mentor.</div>
              )}
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
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1">Nama Lengkap</label>
                    <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Nama..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1">NIM (Nomor Induk Mahasiswa)</label>
                    <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Masukkan NIM..." value={formData.nip} onChange={(e) => setFormData({...formData, nip: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1">Email</label>
                    <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="email" placeholder="mentor@univ.ac.id" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                  {showAddModal && (
                    <div>
                      <label className="block text-label-md font-label-md text-on-surface mb-1">Password Mentor</label>
                      <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" type="password" placeholder="Password (default: pkkmb2026)..." value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    </div>
                  )}
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface mb-1">Nomor Telepon</label>
                    <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="+62 812..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
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
      </main>
    </div>
  );
}
