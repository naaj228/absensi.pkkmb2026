import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { isHadir, CLAIM_STATUS_OPTIONS, getStatusBadge } from '../../utils/statusHelper';

export default function MentorAbsensiManual() {
  const { peserta, gugus, addClaim, currentUser, hasMentorNotifications } = useContext(AppContext);
  const navigate = useNavigate();

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

  const gugusStudents = peserta.filter(p => p.gugusId === mentorGugusId);
  const totalStudents = gugusStudents.length;
  const hadirStudents = gugusStudents.filter(p => isHadir(p.status)).length;
  const pendingStudents = gugusStudents.filter(p => p.status === 'Manual (Pending)').length;
  const alphaStudents = gugusStudents.filter(p => p.status === 'Alpha' || !p.status).length;
  const attendancePercentage = totalStudents > 0 ? Math.round((hadirStudents / totalStudents) * 100) : 0;
  const strokeDash = `${attendancePercentage}, 100`;

  const filteredStudents = gugusStudents.filter(student => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = student.name.toLowerCase().includes(term) || student.id.includes(term);
    let matchesTab = true;
    if (filterTab === 'Alpha') matchesTab = student.status === 'Alpha' || !student.status;
    else if (filterTab === 'Hadir') matchesTab = isHadir(student.status);
    else if (filterTab === 'Pending') matchesTab = student.status === 'Manual (Pending)';
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

  const TABS = [
    { key: 'Semua', label: 'Semua', count: totalStudents, icon: 'groups' },
    { key: 'Hadir', label: 'Hadir', count: hadirStudents, icon: 'task_alt' },
    { key: 'Pending', label: 'Pending', count: pendingStudents, icon: 'pending_actions' },
    { key: 'Alpha', label: 'Alpha', count: alphaStudents, icon: 'cancel' },
  ];

  return (
    <div className="w-full">
      {/* Top Bar */}
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <h1 className="text-headline-sm font-headline-md text-on-surface">Absensi Manual</h1>
        <div className="relative">
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/mentor/notifikasi')}>notifications</span>
          {hasMentorNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
        </div>
      </header>

      <main className="pt-20 min-h-screen px-8 pb-10 max-w-5xl mx-auto">
        <div className="flex flex-col gap-6">

          {/* Page Title */}
          <div className="flex items-center gap-3 pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-surface-container-high text-on-surface-variant text-label-sm font-label-sm rounded-full">Mentor Mode</span>
                <span className="px-2.5 py-0.5 bg-primary text-on-primary text-label-sm font-label-sm rounded-full uppercase tracking-wider">{mentorGugusName}</span>
              </div>
              <h2 className="text-display-sm font-headline-lg text-on-background">Absensi Manual</h2>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-primary rounded-[20px] px-7 py-5 relative overflow-hidden flex items-center justify-between shadow-lg group">
            <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30 transition-transform duration-1000 group-hover:scale-110" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDyQ-tLaTOlqixNcYPCvCMwXyXegOOKQctw-eKamX7QrCDkDYSqbMtrHj2aNWWDzQViBiayv9TlPLJww4qm5i8oLpRvncP6vHBM1LRWjvZxeCESiD20oO9CRaRdTPpOG9XuFaVekHiWhYfOcCRVSdVYd4iOQ3R_7bhMAGu0VP0RWtztDlZKHPCdayFQeeijK42Wvg758NNyOnhJAbBltHqg1qOeOPGQ5NRmF4hayiKEj_Tv9oTV4uREhg')"}}></div>
            {/* Left */}
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[20px]">supervised_user_circle</span>
              </div>
              <div>
                <p className="text-label-xs text-primary-fixed-dim uppercase tracking-widest">Kelompok</p>
                <p className="text-headline-md font-headline-md text-on-primary leading-none">{mentorGugusName}</p>
              </div>
            </div>
            {/* Right: mini stats */}
            <div className="relative z-10 flex items-center gap-6">
              <div className="text-center">
                <p className="text-[11px] text-primary-fixed-dim uppercase tracking-wider">Hadir</p>
                <p className="text-headline-md font-headline-md text-on-primary">{hadirStudents}<span className="text-label-md text-primary-fixed-dim">/{totalStudents}</span></p>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5"/>
                  <path className="text-white drop-shadow" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={strokeDash} strokeLinecap="round" strokeWidth="3.5"/>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-on-primary">{attendancePercentage}%</span>
              </div>
            </div>
          </div>

          {/* Toolbar: Search + Filter Tabs */}
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">search</span>
              <input
                id="searchInput"
                className="w-full bg-surface-container-lowest text-on-surface text-body-md py-3 pl-12 pr-4 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/50"
                placeholder="Cari Nama atau NIM..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-sm font-label-sm transition-all duration-200 cursor-pointer ${
                    filterTab === tab.key
                      ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high shadow-sm'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[15px]`}>{tab.icon}</span>
                  {tab.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    filterTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Student Grid */}
          <div>
            <p className="text-label-sm text-on-surface-variant mb-4">{filteredStudents.length} anggota ditemukan</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="studentGrid">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const b = getStatusBadge(student.status);
                  return (
                    <div key={student.id} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4">
                      {/* Top row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-md flex-shrink-0">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-body-sm font-semibold text-on-surface truncate">{student.name}</span>
                            <span className="text-label-xs text-on-surface-variant font-mono">{student.id}</span>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-1 ${b.bg} ${b.text} text-[11px] font-semibold rounded-lg flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`}></span>
                          {b.label}
                        </span>
                      </div>
                      {/* Action button */}
                      {student.status === 'Manual (Pending)' ? (
                        <div className="w-full bg-surface-container py-2.5 rounded-xl text-label-sm text-on-surface-variant flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                          Menunggu Persetujuan
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenModal(student)}
                          className={`w-full py-2.5 rounded-xl text-label-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer hover:opacity-90 ${
                            student.status === 'Manual (Ditolak)' ? 'bg-error/10 text-error hover:bg-error/20' : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{student.status === 'Manual (Ditolak)' ? 'refresh' : 'edit_note'}</span>
                          {student.status === 'Manual (Ditolak)' ? 'Ajukan Lagi' : 'Absen Manual'}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full flex flex-col items-center py-16 text-on-surface-variant gap-2">
                  <span className="material-symbols-outlined text-[48px] opacity-30">search_off</span>
                  <p className="text-body-md">Tidak ada anggota ditemukan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-md bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden">
            {/* Header */}
            <div className="bg-primary px-6 py-5 text-on-primary">
              <p className="text-label-sm text-primary-fixed-dim uppercase tracking-wider">Absensi Manual</p>
              <h3 className="text-headline-sm font-headline-md mt-0.5">{selectedStudent.name}</h3>
              <p className="text-label-sm text-primary-fixed-dim font-mono mt-0.5">{selectedStudent.id}</p>
            </div>
            {/* Body */}
            <form onSubmit={handleModalSubmit}>
              <div className="p-6 flex flex-col gap-5">
                {/* Alasan */}
                <div className="flex flex-col gap-2">
                  <label className="text-label-md font-semibold text-on-surface">Alasan Kendala</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'kamera', icon: 'no_photography', label: 'Kamera Rusak' },
                      { key: 'jaringan', icon: 'wifi_off', label: 'Jaringan Lambat' },
                      { key: 'qr_error', icon: 'qr_code_2', label: 'QR Error' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setReason(opt.key)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                          reason === opt.key ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-surface-container hover:bg-surface-container-high'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${reason === opt.key ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                          <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                        </div>
                        <span className="text-[11px] font-medium text-on-surface text-center leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-2">
                  <label className="text-label-md font-semibold text-on-surface">Status yang Diajukan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CLAIM_STATUS_OPTIONS.map(opt => {
                      const isSelected = requestedStatus === opt.value;
                      const icon = opt.value === 'Hadir Penuh' ? 'task_alt' : opt.value === 'Hadir Sebagian' ? 'contrast' : 'description';
                      const shortLabel = opt.value === 'Hadir Penuh' ? 'Hadir Penuh' : opt.value === 'Hadir Sebagian' ? 'Sebagian' : 'Izin';
                      return (
                        <button key={opt.value} type="button" onClick={() => setRequestedStatus(opt.value)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-surface-container hover:bg-surface-container-high'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                            <span className="material-symbols-outlined text-[20px]">{icon}</span>
                          </div>
                          <span className="text-[11px] font-medium text-on-surface text-center leading-tight">{shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Catatan */}
                <div className="flex flex-col gap-2">
                  <label className="text-label-md font-semibold text-on-surface">Catatan <span className="font-normal text-on-surface-variant">(opsional)</span></label>
                  <input
                    className="w-full bg-surface-container text-on-surface text-body-sm p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/50"
                    placeholder="Tuliskan detail jika diperlukan..."
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-label-md text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer">
                  Batal
                </button>
                <button type="submit"
                  className="flex-1 py-3 rounded-xl text-label-md font-semibold bg-primary text-on-primary hover:opacity-90 transition-all shadow-md shadow-primary/20 cursor-pointer">
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
