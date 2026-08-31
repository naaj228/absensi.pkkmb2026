import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { isHadir, STATUS } from '../../utils/statusHelper';

export default function MentorDashboard() {
  const { peserta, gugus, currentUser, hasMentorNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Get gugus ID from the currently logged-in mentor
  const mentorGugusId = currentUser?.gugusId || '';
  const mentorGugus = gugus.find(g => g.id === mentorGugusId);
  const rawGugusName = mentorGugus?.name || 'Gugus Saya';
  const mentorGugusName = rawGugusName.toLowerCase().includes('panitia')
    ? 'Gugus'
    : (rawGugusName.startsWith('Gugus') ? rawGugusName : `Gugus ${rawGugusName}`);

  // Filter participants belonging to mentor's group
  const gugusStudents = peserta.filter(p => p.gugusId === mentorGugusId);

  // Stats
  const totalStudents = gugusStudents.length;
  const hadirCount = gugusStudents.filter(p => isHadir(p.status)).length;
  const alphaCount = gugusStudents.filter(p => p.status === STATUS.ALPHA || !p.status).length;
  const pendingCount = gugusStudents.filter(p => p.status === STATUS.PENDING).length;

  const attendancePercent = totalStudents > 0 ? Math.round((hadirCount / totalStudents) * 100) : 0;

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header - Fixed to top, padded for mobile hamburger menu */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">dashboard</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Dashboard Mentor
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
        
        {/* Welcome Banner Card */}
        <div className="relative w-full rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#012060] via-[#022b80] to-[#043fa6] text-white p-5 sm:p-6 shadow-md overflow-hidden">
          <div className="relative z-10 flex flex-col gap-4">
            {/* Top Row: Gugus Badge + Welcome Message */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/15 mb-1.5">
                <span className="material-symbols-outlined text-[13px] text-amber-300">grid_view</span>
                <span>{mentorGugusName}</span>
              </div>
              <h2 className="text-body-lg sm:text-headline-lg font-extrabold tracking-tight">
                Halo, {currentUser?.name || 'Mentor'}! 👋
              </h2>
              <p className="text-[11px] sm:text-body-sm text-white/80 max-w-xl mt-0.5 leading-snug">
                Selamat bertugas. Pantau presensi dan fasilitasi verifikasi mahasiswa gugus Anda dengan cepat.
              </p>
            </div>

            {/* Attendance Percentage & Progress Bar Card */}
            <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[20px]">insights</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Persentase Hadir</span>
                    <span className="text-[9.5px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                      {hadirCount}/{totalStudents} Hadir
                    </span>
                  </div>
                  <div className="text-headline-sm font-extrabold text-white mt-0.5 leading-none">
                    {attendancePercent}%
                  </div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="flex flex-col gap-1 w-full sm:w-44 shrink-0">
                <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/15 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${attendancePercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Background Ambient Glow */}
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* 2-Column Summary Stats Grid on Mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Stat 1: Total Peserta */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:border-[#012060]/30 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Peserta</span>
              <div className="w-8 h-8 rounded-xl bg-[#012060]/10 text-[#012060] flex items-center justify-center border border-[#012060]/15">
                <span className="material-symbols-outlined text-[18px]">groups</span>
              </div>
            </div>
            <div className="flex items-end justify-between mt-2">
              <span className="text-headline-sm sm:text-headline-md font-extrabold text-[#012060] leading-none">{totalStudents}</span>
              <span className="text-[10px] text-slate-400 font-medium">Orang</span>
            </div>
          </div>

          {/* Stat 2: Hadir */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Hadir</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
            </div>
            <div className="flex items-end justify-between mt-2">
              <span className="text-headline-sm sm:text-headline-md font-extrabold text-emerald-600 leading-none">{hadirCount}</span>
              <span className="text-[10px] text-emerald-600/70 font-medium">Peserta</span>
            </div>
          </div>

          {/* Stat 3: Alpha */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:border-rose-200 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Alpha</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </div>
            </div>
            <div className="flex items-end justify-between mt-2">
              <span className="text-headline-sm sm:text-headline-md font-extrabold text-rose-600 leading-none">{alphaCount}</span>
              <span className="text-[10px] text-rose-400 font-medium">Peserta</span>
            </div>
          </div>

          {/* Stat 4: Manual (Pending) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between hover:border-amber-200 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 uppercase tracking-wider">Manual (Pending)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                <span className="material-symbols-outlined text-[18px]">assignment_late</span>
              </div>
            </div>
            <div className="flex items-end justify-between mt-2">
              <span className="text-headline-sm sm:text-headline-md font-extrabold text-amber-600 leading-none">{pendingCount}</span>
              <span className="text-[10px] text-amber-500 font-medium">Pengajuan</span>
            </div>
          </div>

        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Scanner QR Action Button */}
          <button 
            onClick={() => navigate('/mentor/scanner-qr')} 
            className="relative overflow-hidden group bg-[#012060] hover:bg-[#022b80] active:scale-[0.99] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex items-center justify-between shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-4 relative z-10 text-left">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center shrink-0 border border-white/15">
                <span className="material-symbols-outlined text-[26px] sm:text-[30px] text-white">qr_code_scanner</span>
              </div>
              <div>
                <h3 className="text-body-md sm:text-headline-sm font-extrabold">Scanner QR Code</h3>
                <p className="text-[11px] text-white/70 mt-0.5">Pindai QR mahasiswa untuk absen otomatis</p>
              </div>
            </div>

            <div className="relative z-10 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors shrink-0">
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </div>

            {/* Scan animation line */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-red-400 shadow-[0_0_10px_#ef4444] animate-[scan_2s_linear_infinite]"></div>
            </div>
          </button>

          {/* Absensi Manual Action Button */}
          <button 
            onClick={() => navigate('/mentor/absensi-manual')} 
            className="relative overflow-hidden group bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex items-center justify-between shadow-sm border border-slate-200/80 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-4 relative z-10 text-left">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#012060]/10 rounded-2xl flex items-center justify-center shrink-0 border border-[#012060]/15">
                <span className="material-symbols-outlined text-[26px] sm:text-[30px] text-[#012060]">edit_document</span>
              </div>
              <div>
                <h3 className="text-body-md sm:text-headline-sm font-extrabold text-[#012060]">Absensi Manual</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Pengajuan klaim kendala HP / kartu QR</p>
              </div>
            </div>

            <div className="relative z-10 w-10 h-10 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
              <span className="material-symbols-outlined text-[20px] text-slate-600">arrow_forward</span>
            </div>
          </button>
        </div>

        {/* Quick Preview: Anggota Gugus & Ringkasan */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-body-md sm:text-headline-sm font-bold text-[#012060]">Anggota {mentorGugusName}</h3>
              <p className="text-[11px] text-slate-500">Ringkasan status mahasiswa di bawah bimbingan Anda</p>
            </div>

            <button 
              onClick={() => navigate('/mentor/peserta')}
              className="text-[11px] sm:text-body-sm font-bold text-[#012060] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {gugusStudents.slice(0, 6).map((student) => {
              const isStudentHadir = isHadir(student.status);
              return (
                <div 
                  key={student.id}
                  onClick={() => navigate('/mentor/peserta')}
                  className="p-3 bg-[#f8fafc] rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition-colors cursor-pointer"
                >
                  <div className="overflow-hidden">
                    <p className="text-body-sm font-bold text-slate-800 truncate">{student.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">NIM: {student.id}</p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold shrink-0 border ${
                    isStudentHadir 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {isStudentHadir ? student.status : 'Belum Absen'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <style>{`
          @keyframes scan {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
        `}</style>
      </main>
    </div>
  );
}
