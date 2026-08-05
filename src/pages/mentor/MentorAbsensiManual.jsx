import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { isHadir, CLAIM_STATUS_OPTIONS, getStatusBadge } from '../../utils/statusHelper';

export default function MentorAbsensiManual() {
  const { peserta, gugus, addClaim, currentUser, hasMentorNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('Semua');
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reason, setReason] = useState('jaringan');
  const [note, setNote] = useState('');
  const [requestedStatus, setRequestedStatus] = useState('Hadir Penuh');

  const mentorGugusId = currentUser?.gugusId || '';
  const mentorGugus = gugus.find(g => g.id === mentorGugusId);
  const mentorGugusName = mentorGugus?.name || 'Gugus Saya';

  // Get mentor's group students
  const gugusStudents = peserta.filter(p => p.gugusId === mentorGugusId);

  // Statistics
  const totalStudents = gugusStudents.length;
  const hadirStudents = gugusStudents.filter(p => isHadir(p.status)).length;
  const attendancePercentage = totalStudents > 0 ? Math.round((hadirStudents / totalStudents) * 100) : 0;
  const strokeDash = `${attendancePercentage}, 100`;

  // Search and tabs filters
  const filteredStudents = gugusStudents.filter(student => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = student.name.toLowerCase().includes(term) || student.id.includes(term);
    
    let matchesTab = true;
    if (filterTab === 'Alpha') {
      matchesTab = student.status === 'Alpha' || !student.status;
    }
    
    return matchesSearch && matchesTab;
  });

  const handleOpenModal = (student) => {
    setSelectedStudent(student);
    setReason('jaringan');
    setNote('');
    setRequestedStatus('Hadir Penuh');
    setShowModal(true);
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    let reasonLabel = 'Jaringan Tidak Stabil';
    if (reason === 'kamera') reasonLabel = 'Kamera / Scanner Rusak';
    if (reason === 'qr_error') reasonLabel = 'QR Code Tidak Terbaca';

    addClaim(selectedStudent.id, reasonLabel, note, requestedStatus);
    setShowModal(false);
    alert(`Pengajuan absensi manual untuk ${selectedStudent.name} dikirim.`);
  };

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Absensi Manual</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/mentor/notifikasi')}>notifications</span>{hasMentorNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div><button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert("Profile mentor")}><span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span><span className="text-label-md text-on-surface">Profil</span></button></div></header><main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full gap-10 relative">
{/* Decorative Background Blob */}
<div className="absolute -top-32 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none"></div>
{/* Header Section */}
<div className="flex flex-col gap-2 relative z-10">
<div className="flex items-center gap-3 mb-2">
<span className="px-3 py-1 bg-surface-container-high text-on-surface-variant text-label-sm font-label-sm rounded-full shadow-sm">Mentor Mode</span>
<span className="px-3 py-1 bg-primary text-on-primary text-label-sm font-label-sm rounded-full shadow-sm tracking-widest uppercase">{mentorGugusName}</span>
</div>
<h2 className="text-display-lg text-display-lg text-on-background">Absensi Manual</h2>
</div>
{/* Top Dash / Bento Grid */}
<div className="grid grid-cols-12 gap-gutter w-full relative z-10">
{/* Gugus Identity & Progress (Col 4) */}
<div className="col-span-12 lg:col-span-4 bg-primary text-on-primary rounded-[24px] p-8 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[260px] group">
<div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-40 transition-transform duration-1000 group-hover:scale-110" data-alt="Abstract architectural lines." style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDyQ-tLaTOlqixNcYPCvCMwXyXegOOKQctw-eKamX7QrCDkDYSqbMtrHj2aNWWDzQViBiayv9TlPLJww4qm5i8oLpRvncP6vHBM1LRWjvZxeCESiD20oO9CRaRdTPpOG9XuFaVekHiWhYfOcCRVSdVYd4iOQ3R_7bhMAGu0VP0RWtztDlZKHPCdayFQeeijK42Wvg758NNyOnhJAbBltHqg1qOeOPGQ5NRmF4hayiKEj_Tv9oTV4uREhg')"}}></div>
<div className="relative z-10 flex justify-between items-start">
<div className="flex flex-col">
<span className="text-label-md font-label-md text-primary-fixed-dim uppercase tracking-widest mb-1">Kelompok</span>
<h3 className="text-display-lg font-display-lg text-on-primary leading-none">{mentorGugusName}</h3>
</div>
<div className="w-12 h-12 bg-on-primary text-primary rounded-full flex items-center justify-center shadow-lg">
<span className="material-symbols-outlined text-[24px]">supervised_user_circle</span>
</div>
</div>
<div className="relative z-10 flex items-end justify-between mt-8">
<div className="flex flex-col gap-1">
<span className="text-label-sm font-label-sm text-primary-fixed-dim">Kehadiran</span>
<span className="text-headline-lg font-headline-lg text-on-primary">{hadirStudents}<span className="text-headline-sm font-headline-sm text-primary-fixed-dim">/{totalStudents}</span></span>
</div>
{/* Inline SVG Circular Progress */}
<div className="relative w-16 h-16">
<svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
<path className="text-primary-fixed-dim/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
<path className="text-primary-fixed drop-shadow-md transition-all duration-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={strokeDash} strokeLinecap="round" strokeWidth="4" style={{strokeDasharray: strokeDash}}></path>
</svg>
<span className="absolute inset-0 flex items-center justify-center text-label-sm font-label-sm text-on-primary">{attendancePercentage}%</span>
</div>
</div>
</div>
{/* Search Area (Col 8) */}
<div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-[24px] shadow-sm hover:shadow-md transition-shadow p-8 flex flex-col justify-end">
<div className="relative w-full">
<span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant text-[28px] pointer-events-none">search</span>
<input className="w-full bg-surface-container text-on-surface text-body-lg font-body-lg py-5 pl-16 pr-6 rounded-2xl focus:outline-none focus:bg-surface-container-high transition-colors shadow-inner placeholder:text-on-surface-variant/50" id="searchInput" placeholder="Cari Nama atau NIM..." type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
</div>
</div>
</div>
{/* Student List Section */}
<div className="flex flex-col gap-6 mt-6 relative z-10">
<div className="flex items-center justify-between">
<h3 className="text-headline-sm font-headline-sm text-on-surface">Daftar Anggota</h3>
<div className="flex gap-2">
<button onClick={() => setFilterTab('Semua')} className={`px-4 py-2 rounded-lg text-label-sm font-label-sm shadow-sm transition-colors cursor-pointer ${
  filterTab === 'Semua' ? 'bg-surface-container-high text-on-surface' : 'bg-surface text-on-surface-variant hover:bg-surface-container-high'
}`}>Semua</button>
<button onClick={() => setFilterTab('Alpha')} className={`px-4 py-2 rounded-lg text-label-sm font-label-sm shadow-sm transition-colors cursor-pointer ${
  filterTab === 'Alpha' ? 'bg-surface-container-high text-on-surface' : 'bg-surface text-on-surface-variant hover:bg-surface-container-high'
}`}>Alpha</button>
</div>
</div>
{/* Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="studentGrid">
  {filteredStudents.length > 0 ? (
    filteredStudents.map((student) => (
      <div key={student.id} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col gap-5 relative group student-card">
      <div className="flex items-start justify-between gap-2 min-w-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center shadow-sm flex-shrink-0 text-on-surface-variant font-bold text-headline-sm">
          {student.name.substring(0, 2).toUpperCase()}
        </div>
      <div className="flex flex-col min-w-0">
      <span className="text-body-md font-body-md text-on-surface font-semibold truncate w-full">{student.name}</span>
      <span className="text-label-sm font-label-sm text-on-surface-variant font-mono mt-1">{student.id}</span>
      </div>
      </div>
      {/* Status badge */}
      {(() => { const b = getStatusBadge(student.status); return (
        <span className={`px-3 py-1.5 ${b.bg} ${b.text} text-label-sm font-label-sm rounded-lg shadow-sm flex-shrink-0 flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`}></span> {b.label}
        </span>
      ); })()}
      </div>
      {student.status === 'Manual (Pending)' ? (
        <div className="w-full bg-surface-container-low text-on-surface-variant py-3 rounded-xl text-label-md font-label-md flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-[18px]">pending_actions</span>
        Manual: Tertunda
        </div>
      ) : (
        <button onClick={() => handleOpenModal(student)} className={`w-full py-3 rounded-xl text-label-md font-label-md hover:shadow-md transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
          student.status === 'Manual (Ditolak)' ? 'bg-error text-on-error hover:bg-error/90' : 'bg-primary text-on-primary hover:bg-primary/90'
        }`}>
          <span className="material-symbols-outlined text-[18px]">{student.status === 'Manual (Ditolak)' ? 'refresh' : 'edit_note'}</span>
          {student.status === 'Manual (Ditolak)' ? 'Ajukan Lagi' : 'Absen Manual'}
        </button>
      )}
      </div>
    ))
  ) : (
    <div className="col-span-full text-center py-12 text-on-surface-variant">Tidak ada mahasiswa.</div>
  )}
</div>
</div>
</div>

{/* Modal Quick Input (Conditional rendering) */}
{showModal && selectedStudent && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" id="manualModal">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-primary/20 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
  {/* Modal Content */}
  <div className="relative w-full max-w-lg bg-surface-container-lowest shadow-2xl rounded-[24px] flex flex-col overflow-hidden transform scale-100 opacity-100 transition-all duration-300" id="modalContent">
  {/* Header */}
  <div className="bg-primary p-8 text-on-primary relative overflow-hidden">
  <div className="absolute -right-10 -top-10 w-32 h-32 bg-on-primary/10 rounded-full blur-2xl"></div>
  <h3 className="text-headline-md font-headline-md relative z-10">Absen Manual</h3>
  <span className="text-headline-sm font-headline-sm text-on-primary block mt-1" id="modalStudentName">{selectedStudent.name}</span>
  </div>
  {/* Body */}
  <form onSubmit={handleModalSubmit}>
  <div className="p-8 flex flex-col gap-6 bg-surface-container-lowest">
  <div>
  <label className="text-label-md font-label-md text-on-surface block mb-3">Pilih Alasan Kendala</label>
  <div className="grid grid-cols-1 gap-3">
  {/* Option 1 */}
  <label className="flex items-center justify-between p-4 bg-surface-container rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors group">
  <div className="flex items-center gap-4">
  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
  <span className="material-symbols-outlined">no_photography</span>
  </div>
  <span className="text-body-md font-body-md text-on-surface">Kamera / Scanner Rusak</span>
  </div>
  <input checked={reason === 'kamera'} onChange={() => setReason('kamera')} className="w-5 h-5 accent-primary cursor-pointer" name="reason" type="radio" value="kamera" />
  </label>
  {/* Option 2 */}
  <label className="flex items-center justify-between p-4 bg-surface-container rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors group">
  <div className="flex items-center gap-4">
  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
  <span className="material-symbols-outlined">wifi_off</span>
  </div>
  <span className="text-body-md font-body-md text-on-surface">Jaringan Tidak Stabil</span>
  </div>
  <input checked={reason === 'jaringan'} onChange={() => setReason('jaringan')} className="w-5 h-5 accent-primary cursor-pointer" name="reason" type="radio" value="jaringan" />
  </label>
  {/* Option 3 */}
  <label className="flex items-center justify-between p-4 bg-surface-container rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors group">
  <div className="flex items-center gap-4">
  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
  <span className="material-symbols-outlined">qr_code_2</span>
  </div>
  <span className="text-body-md font-body-md text-on-surface">QR Code Tidak Terbaca</span>
  </div>
  <input checked={reason === 'qr_error'} onChange={() => setReason('qr_error')} className="w-5 h-5 accent-primary cursor-pointer" name="reason" type="radio" value="qr_error" />
  </label>
  </div>
  </div>
  <div className="flex flex-col gap-2">
  <label className="text-label-md font-label-md text-on-surface">Status yang Diajukan</label>
  <div className="grid grid-cols-1 gap-2">
    {CLAIM_STATUS_OPTIONS.map(opt => (
      <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
        requestedStatus === opt.value ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container hover:bg-surface-container-high'
      }`}>
        <input type="radio" name="reqStatus" value={opt.value} checked={requestedStatus === opt.value} onChange={() => setRequestedStatus(opt.value)} className="accent-primary" />
        <span className="text-body-md text-on-surface">{opt.label}</span>
      </label>
    ))}
  </div>
  </div>
  <div className="flex flex-col gap-2">
  <label className="text-label-md font-label-md text-on-surface">Catatan Tambahan (Opsional)</label>
  <input className="w-full bg-surface-container text-on-surface text-body-sm font-body-sm p-4 rounded-xl focus:outline-none focus:bg-surface-container-high transition-colors" placeholder="Tuliskan detail jika diperlukan..." type="text" value={note} onChange={(e) => setNote(e.target.value)} />
  </div>
  </div>
  {/* Footer */}
  <div className="p-6 bg-surface-container-low flex justify-end gap-3 rounded-b-[24px]">
  <button type="button" className="px-6 py-3 text-label-md font-label-md text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors cursor-pointer" onClick={() => setShowModal(false)}>Batal</button>
  <button type="submit" className="px-6 py-3 text-label-md font-label-md bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-105 hover:bg-on-primary-fixed-variant rounded-xl transition-all duration-300 cursor-pointer">Konfirmasi</button>
  </div>
  </form>
  </div>
  </div>
)}

</main></div>
  );
}
