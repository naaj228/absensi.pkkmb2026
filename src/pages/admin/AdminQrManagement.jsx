import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function AdminQrManagement() {
  const { qrCodes, generateQr, expireQr, deleteQr, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Form states
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState('attendance');
  const [targetAudience, setTargetAudience] = useState('all');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Masukkan judul sesi QR!");
      return;
    }
    generateQr({
      title,
      sessionType,
      targetAudience,
      startTime,
      endTime
    });
    setTitle('');
    alert(`QR Code untuk "${title}" berhasil dideploy!`);
  };

  const handlePrint = (sessionTitle) => {
    alert(`Cetak QR "${sessionTitle}"...`);
  };

  const handleDownload = (sessionTitle) => {
    alert(`Download QR "${sessionTitle}" (PNG)...`);
  };

  const totalScans = qrCodes.reduce((acc, curr) => acc + curr.scans, 0);

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Kode QR</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>{hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div><button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert("Profile admin")}><span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span><span className="text-label-md text-on-surface">Profil</span></button></div></header><main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full gap-gutter">
<div className="grid grid-cols-12 gap-gutter">
{/* Left Column: Generator Form */}
<div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter relative z-10">
{/* Decorative BG blur */}
<div className="absolute -top-10 -left-10 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
<div className="bg-surface-container rounded-xl shadow-xl p-gutter relative overflow-hidden group transition-transform duration-300 hover:-translate-y-1">
<div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-0"></div>
<div className="relative z-10 flex flex-col gap-6">
<div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
<h2 className="font-headline-sm text-headline-sm text-on-surface">Buat Kode QR</h2>
<div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm">
<span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
</div>
</div>
<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
<div className="flex flex-col gap-2">
<label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Judul Sesi</label>
<input className="w-full bg-surface border border-outline-variant/50 rounded-lg py-3 px-4 text-on-surface font-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" type="text" placeholder="Judul sesi..." required value={title} onChange={(e) => setTitle(e.target.value)} />
</div>
<div className="flex flex-col gap-2">
<label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Tipe</label>
<div className="relative">
<select className="w-full appearance-none bg-surface border border-outline-variant/50 rounded-lg py-3 px-4 text-on-surface font-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all cursor-pointer" value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
<option value="attendance">Kehadiran Harian</option>
<option value="event">Acara Khusus</option>
<option value="gugus">Check-in Gugus</option>
<option value="meal">Pengambilan Makan</option>
</select>
<span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
</div>
</div>
<div className="flex flex-col gap-2">
<label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Sasaran</label>
<div className="relative">
<select className="w-full appearance-none bg-surface border border-outline-variant/50 rounded-lg py-3 px-4 text-on-surface font-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all cursor-pointer" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}>
<option value="all">Semua Peserta</option>
<option value="gugus-1">Gugus 1 - Alpha</option>
<option value="gugus-2">Gugus 2 - Beta</option>
<option value="gugus-3">Gugus 3 - Gamma</option>
<option value="gugus-12">Gugus 12</option>
</select>
<span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
</div>
</div>
<div className="flex flex-col gap-2">
<label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Masa Berlaku</label>
<div className="grid grid-cols-2 gap-3">
<div className="relative">
<input className="w-full bg-surface border border-outline-variant/50 rounded-lg py-3 px-4 text-on-surface font-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
<span className="text-xs text-on-surface-variant absolute -top-2 left-3 bg-surface-container px-1">Mulai</span>
</div>
<div className="relative">
<input className="w-full bg-surface border border-outline-variant/50 rounded-lg py-3 px-4 text-on-surface font-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
<span className="text-xs text-on-surface-variant absolute -top-2 left-3 bg-surface-container px-1">Selesai</span>
</div>
</div>
</div>
<button className="mt-4 bg-error text-on-error font-label-md text-label-md py-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group relative overflow-hidden cursor-pointer w-full" type="submit">
<span className="material-symbols-outlined text-[20px]">add_circle</span>
                Buat QR
            </button>
</form>
</div>
</div>
{/* Analytics Mini Card */}
<div className="bg-primary-container rounded-xl shadow-lg p-6 flex items-center justify-between relative overflow-hidden">
<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50"></div>
<div className="flex flex-col relative z-10">
<span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider mb-1">Total Scan</span>
<span className="font-display-lg text-display-lg text-white">{totalScans}</span>
</div>
</div>
</div>
{/* Right Column: QR Gallery */}
<div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
{/* Gallery Header */}
<div className="flex items-end justify-between mb-2">
<div className="flex flex-col">
<h3 className="font-headline-lg text-headline-lg text-on-surface">Penyebaran Aktif</h3>
</div>
</div>
{/* Grid of QR Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {qrCodes.map((qr) => (
    <div key={qr.id} className={`bg-surface rounded-xl shadow-md border border-surface-variant/50 overflow-hidden flex flex-col transition-all hover:shadow-xl group ${
      qr.status === 'Expired' ? 'opacity-70 grayscale-[0.3]' : ''
    }`}>
    <div className="p-5 flex gap-5">
    <div className="w-32 h-32 bg-white rounded-lg p-2 border border-outline-variant/30 flex-shrink-0 relative overflow-hidden">
    {qr.status === 'Active' ? (
      <>
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTAgMGgxMDB2MTAwSDB6bTIwMCAwaDEwMHYxMDBIMjAwek0wIDIwMGgxMDB2MTAwSDB6IiBmaWxsPSIjMTAxMTE1Ii8+PC9zdmc+')] bg-contain bg-center bg-no-repeat opacity-80"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-error/80 blur-[1px] animate-[scan_2s_ease-in-out_infinite]"></div>
      </>
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-surface-container rounded-lg">
        <span className="material-symbols-outlined text-outline text-[48px] opacity-20">qr_code</span>
      </div>
    )}
    </div>
    <div className="flex flex-col flex-1 justify-center py-1 min-w-0">
    <div className="flex items-center justify-between mb-2">
      {qr.status === 'Active' ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F4EA] text-[#137333] font-label-sm text-label-sm tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-[#137333]"></span> Aktif
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-variant text-on-surface-variant font-label-sm text-label-sm tracking-wide">
        Kedaluwarsa
        </span>
      )}
      <button onClick={() => {
        window.confirmAction(`Hapus QR deployment "${qr.title}"?`, () => {
          deleteQr(qr.id);
        });
      }} className="text-on-surface-variant hover:text-error shrink-0 cursor-pointer p-1 rounded-full hover:bg-surface-variant">
        <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
    <h4 className="font-headline-sm text-headline-sm text-on-surface leading-tight mb-1 truncate">{qr.title}</h4>
    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 capitalize">{qr.sessionType} • {qr.targetAudience}</p>
    <div className="mt-3 flex items-center gap-4 text-xs text-on-surface-variant font-mono">
      <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {qr.startTime} - {qr.endTime}</div>
    </div>
    </div>
    </div>
    <div className="bg-surface-container-low px-5 py-3 border-t border-surface-variant/50 flex justify-between items-center mt-auto">
    <div className="text-xs text-on-surface-variant">
    <strong className="text-on-surface font-label-md">{qr.scans}</strong> scan
                 </div>
    <div className="flex gap-2">
    {qr.status === 'Active' && (
      <>
        <button onClick={() => expireQr(qr.id)} className="text-error hover:underline text-xs font-label-md flex items-center justify-center p-1 mr-2 cursor-pointer" title="Nonaktifkan QR">
          Akhiri Sesi
        </button>
        <button onClick={() => handlePrint(qr.title)} className="text-secondary hover:text-on-secondary-fixed transition-colors flex items-center justify-center p-1 cursor-pointer" title="Print">
        <span className="material-symbols-outlined text-[20px]">print</span>
        </button>
        <button onClick={() => handleDownload(qr.title)} className="text-secondary hover:text-on-secondary-fixed transition-colors flex items-center justify-center p-1 cursor-pointer" title="Unduh PNG">
        <span className="material-symbols-outlined text-[20px]">download</span>
        </button>
      </>
    )}
    </div>
    </div>
    </div>
  ))}
</div>
</div>
</div>
</div>
<style>{`
  @keyframes scan {
    0% { transform: translateY(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(112px); opacity: 0; }
  }
`}</style></main></div>

  );
}
