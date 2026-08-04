import { useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

export default function AdminPesertaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { peserta, gugus, mentors, logs, updatePeserta, deletePeserta, addLog } = useContext(AppContext);

  // Find the student
  const student = peserta.find(p => p.id === id);

  if (!student) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background text-on-background">
        <span className="material-symbols-outlined text-[64px] text-error mb-4">person_off</span>
        <h2 className="text-headline-lg font-headline-lg mb-2">Tidak Ditemukan</h2>
        <button onClick={() => navigate('/admin/peserta')} className="bg-primary text-on-primary px-6 py-3 rounded-xl hover:bg-primary-fixed shadow-md transition-all font-label-md cursor-pointer">
          Kembali
        </button>
      </div>
    );
  }

  // Find gugus & mentor details
  const group = gugus.find(g => g.id === student.gugusId);
  const groupName = group ? group.name : '-';
  const mentor = mentors.find(m => m.gugusId === student.gugusId || (group && m.id === group.mentorId));
  const mentorName = mentor ? mentor.name : 'Belum Ditentukan';

  // Find attendance logs for this student
  const studentLogs = logs.filter(log => log.nim === student.id);

  const handleStatusChange = (newStatus) => {
    updatePeserta(student.id, { status: newStatus });
    addLog(student.name, student.id, groupName, 'Admin (Manual Override)', 'Valid');
    alert(`Status ${student.name} diubah menjadi ${newStatus}.`);
  };

  const handleDelete = () => {
    window.confirmAction(`Hapus ${student.name}?`, () => {
      deletePeserta(student.id);
      navigate('/admin/peserta');
      alert("Peserta berhasil dihapus.");
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Hadir': return 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]';
      case 'Alpa': return 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]';
      case 'Izin': return 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]';
      default: return 'bg-surface-container-highest text-on-surface-variant border-outline-variant';
    }
  };

  return (
    <div className="w-full">
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/peserta')} className="hover:bg-surface-variant p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="text-headline-sm font-headline-md text-on-surface">Detail Peserta</h1>
        </div>
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert("Profile admin")}>
            <span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span>
            <span className="text-label-md text-on-surface">Profil</span>
          </button>
        </div>
      </header>

      <main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col gap-8 pb-12">
          {/* Header Card */}
          <div className="bg-surface-container rounded-[24px] p-8 shadow-sm flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-display-lg text-display-md font-bold shadow-inner">
                {student.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-center sm:text-left space-y-2">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <h2 className="text-headline-lg font-headline-md text-on-surface leading-tight">{student.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-label-md font-label-md border font-semibold ${getStatusBadgeClass(student.status)}`}>
                    {student.status}
                  </span>
                </div>
                <p className="text-body-md text-on-surface-variant font-mono">{student.email} • NIM: {student.id}</p>
              </div>
            </div>

            {/* Danger Actions */}
            <div className="flex items-center gap-3 relative z-10 self-center md:self-end">
              <button onClick={handleDelete} className="bg-error/10 hover:bg-error/20 text-error px-4 py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center gap-2 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Hapus
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Details & Quick Override */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Profile Details */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30">
                <h3 className="text-headline-sm font-headline-md text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  Informasi Akademik
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Fakultas</p>
                    <p className="text-body-lg text-on-surface font-medium">{student.fakultas}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Gugus</p>
                    <p className="text-body-lg text-on-surface font-medium">{groupName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Mentor</p>
                    <p className="text-body-lg text-on-surface font-medium">{mentorName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Metode Kehadiran</p>
                    <p className="text-body-lg text-on-surface font-medium">
                      {student.status === 'Hadir' ? 'Scan QR / Manual' : 'Belum Terabsen'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Manual Override */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30">
                <h3 className="text-headline-sm font-headline-md text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">tune</span>
                  Override Kehadiran
                </h3>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => handleStatusChange('Hadir')} className="bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#059669] px-6 py-3 rounded-xl font-label-md text-label-md flex items-center gap-2 border border-[#a7f3d0] transition-colors cursor-pointer">
                    <span className="material-symbols-outlined">check_circle</span>
                    Hadir
                  </button>
                  <button onClick={() => handleStatusChange('Izin')} className="bg-[#fffbeb] hover:bg-[#fef3c7] text-[#d97706] px-6 py-3 rounded-xl font-label-md text-label-md flex items-center gap-2 border border-[#fde68a] transition-colors cursor-pointer">
                    <span className="material-symbols-outlined">info</span>
                    Izin
                  </button>
                  <button onClick={() => handleStatusChange('Alpa')} className="bg-[#fef2f2] hover:bg-[#fee2e2] text-[#dc2626] px-6 py-3 rounded-xl font-label-md text-label-md flex items-center gap-2 border border-[#fecaca] transition-colors cursor-pointer">
                    <span className="material-symbols-outlined">cancel</span>
                    Alpa
                  </button>
                  <button onClick={() => handleStatusChange('Belum Hadir')} className="bg-surface-container hover:bg-surface-container-high text-on-surface-variant px-6 py-3 rounded-xl font-label-md text-label-md flex items-center gap-2 border border-outline-variant transition-colors cursor-pointer">
                    <span className="material-symbols-outlined">schedule</span>
                    Belum Hadir
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: QR Code Card & Scans timeline */}
            <div className="flex flex-col gap-8">
              {/* Simulated QR Code Card */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col items-center text-center">
                <h3 className="text-headline-sm font-headline-md text-on-surface mb-6 self-start flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary">qr_code_2</span>
                  QR Code
                </h3>
                <div className="w-48 h-48 bg-white rounded-xl p-3 border border-outline-variant/30 flex items-center justify-center shadow-inner relative overflow-hidden group mb-6">
                  {/* Simulated QR Pattern */}
                  <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTAgMGgxMDB2MTAwSDB6bTIwMCAwaDEwMHYxMDBIMjAwek0wIDIwMGgxMDB2MTAwSDB6IiBmaWxsPSIjMTAxMTE1Ii8+PC9zdmc+')] bg-contain bg-center bg-no-repeat opacity-85"></div>
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => alert("Mengunduh QR Code PNG...")} className="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center justify-center gap-2 border border-outline-variant cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Unduh
                  </button>
                  <button onClick={() => alert(`Kirim QR Code ke email ${student.email}...`)} className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center justify-center gap-2 shadow-md hover:bg-primary-fixed cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                    Email
                  </button>
                </div>
              </div>

              {/* Attendance Log Timeline */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex-1 flex flex-col">
                <h3 className="text-headline-sm font-headline-md text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history</span>
                  Log Kehadiran
                </h3>
                <div className="flex-1 overflow-y-auto space-y-6">
                  {studentLogs.length > 0 ? (
                    studentLogs.map((log, index) => (
                      <div key={log.id} className="flex items-start gap-4 relative">
                        {index < studentLogs.length - 1 && (
                          <div className="absolute left-[15px] top-[30px] bottom-[-24px] w-[2px] bg-outline-variant/30"></div>
                        )}
                        <div className="w-8 h-8 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] flex items-center justify-center z-10 shrink-0">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-md font-medium text-on-surface truncate">Absen Tercatat - {log.status}</p>
                          <p className="text-body-sm text-on-surface-variant mt-0.5">Scanner: {log.scanner}</p>
                          <p className="text-label-sm text-on-surface-variant font-mono mt-1">{log.date} {log.timestamp}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[40px] opacity-20 mb-2">pending_actions</span>
                      <p className="text-body-sm">Belum ada log.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
