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

    if (reason === 'lainnya' && !note.trim()) {
      alert("Catatan wajib diisi jika memilih alasan kendala 'Lainnya'.");
      return;
    }

    let reasonLabel = 'Jaringan Tidak Stabil';
    if (reason === 'kamera') reasonLabel = 'Kamera / Scanner Rusak';
    if (reason === 'qr_error') reasonLabel = 'QR Code Tidak Terbaca';
    if (reason === 'lainnya') reasonLabel = 'Lainnya';

    addClaim(selectedStudent.id, reasonLabel, note, requestedStatus);
    setShowModal(false);
    alert(`Pengajuan absensi manual untuk ${selectedStudent.name} dikirim.`);
  };

  const TABS = [
    { key: 'Semua', label: 'Semua', count: totalStudents },
    { key: 'Hadir', label: 'Hadir', count: hadirStudents },
    { key: 'Pending', label: 'Pending', count: pendingStudents },
    { key: 'Alpha', label: 'Alpha', count: alphaStudents },
  ];

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header - Fixed to top, padded for mobile hamburger menu */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">edit_note</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Absensi Manual
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
        
        {/* Welcome / Stats Banner Card */}
        <div className="relative w-full rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#012060] via-[#022b80] to-[#043fa6] text-white p-4 sm:p-6 shadow-md overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/15 mb-1.5">
                <span className="material-symbols-outlined text-[13px] text-amber-300">grid_view</span>
                <span>{mentorGugusName}</span>
              </div>
              <h2 className="text-body-lg sm:text-headline-lg font-extrabold tracking-tight">
                Pengajuan Absensi Manual
              </h2>
              <p className="text-[11px] sm:text-body-sm text-white/80 max-w-xl mt-0.5 leading-snug">
                Fasilitasi absensi peserta yang mengalami kendala teknis kamera, QR Code, atau jaringan.
              </p>
            </div>

            {/* Attendance Percentage Badge */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
              <div>
                <span className="text-[9.5px] text-white/70 block uppercase font-bold tracking-wider">Tingkat Kehadiran</span>
                <span className="text-body-md sm:text-headline-sm font-extrabold text-white leading-none">
                  {attendancePercentage}% <span className="text-[10px] text-emerald-300 font-bold">({hadirStudents}/{totalStudents})</span>
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar Section (Search & Filter Tabs) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                id="searchInput"
                className="w-full bg-[#f8fafc] text-slate-800 font-semibold text-body-sm py-2.5 pl-9 pr-8 rounded-xl border border-slate-200 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400"
                placeholder="Cari Nama atau NIM..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filterTab === tab.key
                      ? 'bg-white text-[#012060] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                    filterTab === tab.key ? 'bg-[#012060]/10 text-[#012060]' : 'bg-slate-200 text-slate-600'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-medium text-slate-400">
            Menampilkan <strong className="text-slate-700">{filteredStudents.length}</strong> dari {totalStudents} anggota gugus
          </div>
        </div>

        {/* Student Grid Section */}
        {/* MOBILE VIEW GRID (2 Kolom pada Layar Mobile < md) */}
        <div className="block md:hidden">
          {filteredStudents.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {filteredStudents.map((student) => {
                const b = getStatusBadge(student.status);
                const isStudentHadir = isHadir(student.status);
                const isPending = student.status === 'Manual (Pending)';
                const isDitolak = student.status === 'Manual (Ditolak)';

                return (
                  <div 
                    key={student.id} 
                    className={`bg-white rounded-2xl p-3 shadow-xs border flex flex-col justify-between gap-2.5 hover:shadow-md transition-all relative overflow-hidden ${
                      isStudentHadir 
                        ? 'border-l-4 border-l-emerald-500 border-slate-200/80' 
                        : isPending 
                        ? 'border-l-4 border-l-amber-500 border-slate-200/80'
                        : 'border-l-4 border-l-rose-500 border-slate-200/80'
                    }`}
                  >
                    {/* Top Bar: Status Badge */}
                    <div className="flex items-center justify-end">
                      <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold shrink-0 border flex items-center gap-1 ${
                        isStudentHadir 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : isPending 
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isStudentHadir ? 'bg-emerald-500 animate-pulse' : isPending ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                        <span>{b.label}</span>
                      </span>
                    </div>

                    {/* Name & NIM */}
                    <div className="overflow-hidden">
                      <h4 className="text-body-xs font-bold text-slate-800 line-clamp-1 leading-snug" title={student.name}>
                        {student.name}
                      </h4>
                      <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[#012060]/5 border border-[#012060]/10">
                        <span className="text-[7.5px] font-extrabold uppercase text-slate-400">NIM</span>
                        <span className="text-[9.5px] font-bold text-[#012060] font-mono tracking-tight">{student.id}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-1.5 border-t border-slate-100">
                      {isPending ? (
                        <div className="w-full py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-[9.5px] font-bold flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
                          <span>Pending</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenModal(student)}
                          className={`w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 ${
                            isDitolak 
                              ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100' 
                              : 'bg-[#012060] hover:bg-[#022b80] text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{isDitolak ? 'refresh' : 'edit_note'}</span>
                          <span>{isDitolak ? 'Ajukan Lagi' : 'Absen Manual'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-body-sm bg-white rounded-2xl border border-slate-100">
              Tidak ada data mahasiswa ditemukan.
            </div>
          )}
        </div>

        {/* DESKTOP VIEW GRID (Visible on screen >= md) */}
        <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => {
              const b = getStatusBadge(student.status);
              const isPending = student.status === 'Manual (Pending)';
              const isDitolak = student.status === 'Manual (Ditolak)';

              return (
                <div key={student.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between gap-3 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-body-sm font-bold text-slate-800 truncate">{student.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">NIM: {student.id}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold shrink-0 flex items-center gap-1 ${b.bg} ${b.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`}></span>
                      {b.label}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    {isPending ? (
                      <div className="w-full bg-amber-50 border border-amber-200 py-2 rounded-xl text-body-xs font-bold text-amber-700 flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
                        Menunggu Persetujuan Admin
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenModal(student)}
                        className={`w-full py-2 rounded-xl text-body-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98 ${
                          isDitolak ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' : 'bg-[#012060] hover:bg-[#022b80] text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{isDitolak ? 'refresh' : 'edit_note'}</span>
                        {isDitolak ? 'Ajukan Ulang Manual' : 'Proses Absensi Manual'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-10 text-slate-400 text-body-sm bg-white rounded-2xl border border-slate-100">
              Tidak ada data mahasiswa ditemukan.
            </div>
          )}
        </div>

      </main>

      {/* MANUAL ATTENDANCE MODAL */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-sm sm:max-w-md bg-white shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col z-10 border border-slate-100 animate-fade-in">
            {/* Header */}
            <div className="bg-[#012060] p-3.5 sm:p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-white">edit_note</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-body-sm sm:text-body-md font-bold truncate">{selectedStudent.name}</h3>
                  <p className="text-[10px] font-mono text-white/80">NIM: {selectedStudent.id}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleModalSubmit}>
              <div className="p-3.5 sm:p-5 flex flex-col gap-3.5">
                {/* Alasan Kendala */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alasan Kendala Presensi</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: 'kamera', icon: 'no_photography', label: 'Kamera Rusak' },
                      { key: 'jaringan', icon: 'wifi_off', label: 'Jaringan Lambat' },
                      { key: 'qr_error', icon: 'qr_code_2', label: 'QR Error' },
                      { key: 'lainnya', icon: 'more_horiz', label: 'Lainnya' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setReason(opt.key)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                          reason === opt.key 
                            ? 'border-[#012060] bg-[#012060]/5 text-[#012060]' 
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                        <span className="text-[9px] font-bold text-center leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status yang Diajukan */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status yang Diajukan</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CLAIM_STATUS_OPTIONS.map(opt => {
                      const isSelected = requestedStatus === opt.value;
                      const icon = opt.value === 'Hadir Penuh' ? 'task_alt' : opt.value === 'Hadir Sebagian' ? 'contrast' : 'description';
                      const shortLabel = opt.value === 'Hadir Penuh' ? 'Hadir Penuh' : opt.value === 'Hadir Sebagian' ? 'Sebagian' : 'Izin';
                      return (
                        <button 
                          key={opt.value} 
                          type="button" 
                          onClick={() => setRequestedStatus(opt.value)}
                          className={`flex items-center justify-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-[#012060] bg-[#012060] text-white shadow-xs' 
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{icon}</span>
                          <span className="text-[10px] font-bold">{shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Catatan */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Catatan Kendala {reason === 'lainnya' ? <span className="text-rose-600 font-bold">* (Wajib)</span> : <span className="font-normal text-slate-400">(opsional)</span>}
                  </label>
                  <input
                    className="w-full bg-[#f8fafc] text-slate-800 text-body-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400"
                    placeholder={reason === 'lainnya' ? "Tuliskan alasan kendala kustom Anda..." : "Tuliskan detail jika diperlukan..."}
                    required={reason === 'lainnya'}
                    maxLength={100}
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-4 bg-slate-50 flex gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl text-body-sm font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-body-sm font-bold bg-[#012060] text-white hover:bg-[#022b80] transition-all shadow-md active:scale-95 cursor-pointer"
                >
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
