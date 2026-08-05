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
  const mentorGugusName = mentorGugus?.name || 'Gugus Saya';

  // Search & Tab states
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

  // Filter students
  const mentorStudents = peserta.filter(p => p.gugusId === mentorGugusId);

  const filteredStudents = mentorStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.id.includes(searchTerm);
    
    let matchesStatus = true;
    if (statusFilter === 'hadir') {
      matchesStatus = isHadir(student.status);
    } else if (statusFilter === 'belum') {
      matchesStatus = student.status === 'Alpha' || !student.status;
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
      status: 'Alpha'
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (showAddModal) {
      if (peserta.some(p => p.id === formData.id)) {
        alert("NIM sudah digunakan!");
        return;
      }
      addPeserta(formData);
      setShowAddModal(false);
      alert("Pengajuan tambah peserta baru berhasil dikirim ke Admin.");
    } else if (showEditModal) {
      updatePeserta(editStudentId, formData);
      setShowEditModal(false);
      alert("Pengajuan edit data peserta berhasil dikirim ke Admin.");
    }
  };

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Anggota Gugus</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/mentor/notifikasi')}>notifications</span>{hasMentorNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div></div></header><main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full h-full relative">
{/* Floating Header Actions / Title */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
<div className="flex flex-col gap-2">
<div className="flex items-center gap-3">
<h2 className="text-headline-lg font-headline-lg text-on-background">Daftar Peserta - {mentorGugusName}</h2>
<span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-label-sm font-label-md">{mentorStudents.length} Total</span>
</div>
</div>
<div className="flex items-center gap-3 shrink-0">
<button 
  onClick={handleDownloadZip} 
  disabled={downloadingZip}
  className="flex items-center gap-2 bg-surface text-primary border border-outline-variant hover:bg-primary/5 px-5 py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
>
  <span className="material-symbols-outlined text-[20px]">{downloadingZip ? 'sync' : 'download'}</span>
  <span className="text-label-md font-label-md">{downloadingZip ? 'Mengunduh...' : 'Unduh ZIP ID Card & QR'}</span>
</button>
<button onClick={handleOpenAddModal} className="group relative flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary/90 transition-all px-5 py-3 rounded-xl shadow-[0_8px_16px_-6px_rgba(0,4,35,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(0,4,35,0.5)] overflow-hidden cursor-pointer">
<div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
<span className="material-symbols-outlined text-[20px] relative z-10">person_add</span>
<span className="text-label-md font-label-md relative z-10">Tambah</span>
</button>
</div>
</div>
{/* Main Content Card */}
<div className="bg-surface-container-lowest rounded-[24px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.06)] overflow-hidden relative z-0 flex flex-col min-h-[500px]">
{/* Toolbar (Search, Filter, Bulk Actions) */}
<div className="p-6 bg-surface-container-lowest border-b border-outline-variant/30 flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
{/* Search & Filters */}
<div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto gap-6">
<div className="relative w-full sm:w-[320px]">
<span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">search</span>
<input className="w-full bg-surface-container-low text-on-surface placeholder:text-outline-variant text-body-md font-body-md pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" placeholder="Cari..." type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
</div>
<div className="flex items-center gap-3">
<button onClick={() => setStatusFilter(prev => prev === 'hadir' ? 'all' : 'hadir')} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-label-md text-label-md border transition-all ${
  statusFilter === 'hadir' ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]' : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
}`}>
  <span className="material-symbols-outlined text-[18px]">verified_user</span>
  <span>Hadir</span>
</button>
<button onClick={() => setStatusFilter(prev => prev === 'belum' ? 'all' : 'belum')} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-label-md text-label-md border transition-all ${
  statusFilter === 'belum' ? 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]' : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
}`}>
  <span className="material-symbols-outlined text-[18px]">cancel</span>
  <span>Alpha</span>
</button>
</div>
</div>
</div>
{/* Data Table */}
<div className="overflow-x-auto flex-1">
<table className="w-full text-left border-collapse min-w-[900px]">
<thead>
<tr className="bg-surface/50 border-b border-outline-variant/30">
<th className="py-4 px-6 text-label-sm font-label-sm text-outline uppercase tracking-wider">Mahasiswa</th>
<th className="py-4 px-6 text-label-sm font-label-sm text-outline uppercase tracking-wider">NIM</th>
<th className="py-4 px-6 text-label-sm font-label-sm text-outline uppercase tracking-wider">Jurusan</th>
<th className="py-4 px-6 text-label-sm font-label-sm text-outline uppercase tracking-wider">Status</th>
<th className="py-4 px-6 text-right text-label-sm font-label-sm text-outline uppercase tracking-wider">Aksi</th>
</tr>
</thead>
<tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
  {filteredStudents.length > 0 ? (
    filteredStudents.map((student) => (
      <tr key={student.id} className="hover:bg-surface-container-low/50 transition-colors group">
      <td className="py-4 px-6">
      <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold shadow-inner">
        {student.name.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-col">
      <span className="text-body-md font-semibold text-on-surface">{student.name}</span>
      <span className="text-body-sm font-body-sm text-outline">{student.email}</span>
      </div>
      </div>
      </td>
      <td className="py-4 px-6">
      <span className="text-body-md font-body-md text-on-surface-variant bg-surface-container px-2 py-1 rounded-md font-mono text-sm">{student.id}</span>
      </td>
      <td className="py-4 px-6">
        <span className="text-body-md text-on-surface">{student.fakultas}</span>
      </td>
      <td className="py-4 px-6">
        {(() => { const b = getStatusBadge(student.status); return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${b.bg} ${b.text} text-label-sm font-label-sm h-8`}>
            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`}></span> {b.label}
          </span>
        ); })()}
      </td>
      <td className="py-4 px-6 text-right">
      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={() => handleOpenQrModal(student)} className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer" title="Lihat QR">
      <span className="material-symbols-outlined text-[20px]">qr_code</span>
      </button>
      <button onClick={() => handleOpenEditModal(student)} className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer" title="Edit Data">
      <span className="material-symbols-outlined text-[20px]">edit</span>
      </button>
      </div>
      </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="5" className="text-center py-8 text-on-surface-variant">Tidak ada data anggota gugus.</td>
    </tr>
  )}
</tbody>
</table>
</div>
</div>
</div>

{/* ADD STUDENT MODAL */}
{showAddModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-primary/20 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
    <div className="relative w-full max-w-lg bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col z-10">
      <div className="bg-primary p-6 text-on-primary">
        <h3 className="text-headline-md font-headline-md">Tambah Anggota</h3>
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
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Jurusan</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Cth: Teknik Informatika" value={formData.fakultas} onChange={(e) => setFormData({...formData, fakultas: e.target.value})} />
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
        <h3 className="text-headline-md font-headline-md">Edit Anggota</h3>
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
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Jurusan</label>
            <input className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary font-body-md" required type="text" placeholder="Cth: Teknik Informatika" value={formData.fakultas} onChange={(e) => setFormData({...formData, fakultas: e.target.value})} />
          </div>
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1">Status Kehadiran</label>
            <select className="w-full bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant focus:outline-none focus:border-primary cursor-pointer font-body-md" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
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

{/* SIMULATED QR CODE MODAL */}
{showQrModal && qrStudent && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-primary/20 backdrop-blur-md" onClick={() => setShowQrModal(false)}></div>
    <div className="relative w-full max-w-sm bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col z-10 p-6 items-center text-center">
      <h3 className="text-headline-sm font-headline-md text-on-surface mb-4 self-start">QR Code</h3>
      <div className="w-48 h-48 bg-white rounded-xl p-3 border border-outline-variant/30 flex items-center justify-center shadow-inner mb-6">
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrStudent.id)}`} 
          alt={`QR Code NIM: ${qrStudent.id}`}
          className="w-full h-full object-contain"
        />
      </div>
      <p className="text-body-sm text-on-surface-variant font-mono mb-6">{qrStudent.name} • NIM: {qrStudent.id}</p>
      <div className="flex gap-3 w-full">
        <button onClick={() => handleDownloadQr(qrStudent)} className="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 rounded-xl text-label-md font-label-md transition-colors border border-outline-variant cursor-pointer">
          Unduh
        </button>
        <button onClick={() => setShowQrModal(false)} className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl text-label-md font-label-md transition-colors shadow-md hover:bg-primary-fixed cursor-pointer">
          Tutup
        </button>
      </div>
    </div>
  </div>
)}

</main></div>
  );
}
