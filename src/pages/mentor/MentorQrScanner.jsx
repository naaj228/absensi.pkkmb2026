import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

export default function MentorQrScanner() {
  const { peserta, logs, recordScan, hasMentorNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  const mentorGugusId = 'G-12-FT';
  const [showFeedback, setShowFeedback] = useState(false);
  const [scannedName, setScannedName] = useState('');
  const [isReady, setIsReady] = useState(true);

  // Filter logs related to Gugus 12
  const gugusLogs = logs.filter(log => log.gugusName === 'Gugus 12');

  const handleSimulateScan = () => {
    if (!isReady) return;

    // Find any student in Gugus 12 who is "Belum Hadir"
    const unverifiedStudents = peserta.filter(p => p.gugusId === mentorGugusId && p.status === 'Belum Hadir');

    if (unverifiedStudents.length === 0) {
      alert("Semua mahasiswa Gugus 12 sudah terabsen!");
      return;
    }

    // Pick a random student
    const randomIndex = Math.floor(Math.random() * unverifiedStudents.length);
    const targetStudent = unverifiedStudents[randomIndex];

    setIsReady(false);
    recordScan(targetStudent.id);
    setScannedName(targetStudent.name);
    setShowFeedback(true);

    // Simple beep sound using browser's AudioContext
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000 Hz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // beep for 150ms
    } catch (e) {
      console.log('Audio Context not supported or allowed yet');
    }

    // Hide feedback after 2 seconds
    setTimeout(() => {
      setShowFeedback(false);
      setIsReady(true);
    }, 2000);
  };

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Scanner QR</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/mentor/notifikasi')}>notifications</span>{hasMentorNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div><button className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all" onClick={() => alert("Profile mentor")}><span className="material-symbols-outlined text-on-surface text-[20px]">account_circle</span><span className="text-label-md text-on-surface">Profil</span></button></div></header><main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full h-full relative space-y-gutter">
<div className="absolute inset-0 -z-10 bg-primary/20 backdrop-blur-sm rounded-xl" style={{maskImage: "radial-gradient(circle at center, transparent 0%, black 100%)"}}></div>
<div className="flex flex-col md:flex-row gap-gutter h-full">
{/* Scanner Container */}
<div onClick={handleSimulateScan} className="w-full md:w-2/3 flex flex-col h-full rounded-2xl bg-surface/5 backdrop-blur-2xl shadow-xl overflow-hidden relative border border-white/5 cursor-pointer group">
<div className="p-6 flex items-center justify-between z-10 bg-gradient-to-b from-primary/80 to-transparent">
<div>
<h2 className="text-headline-md font-headline-md text-on-primary">Scanner</h2>
<p className="text-body-sm font-body-sm text-on-primary/70">Klik area untuk simulasi scan</p>
</div>
<div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
<span className={`w-2 h-2 rounded-full bg-current ${isReady ? 'animate-pulse' : ''}`}></span>
<span className="text-label-md font-label-md">{isReady ? 'Siap' : 'Memproses...'}</span>
</div>
</div>
<div className="flex-1 relative flex items-center justify-center p-8 min-h-[350px]">
<div className="absolute inset-0 bg-primary/40"></div>
<div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay" data-alt="A blurred background showing a busy university registration event." style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCP-I8sywr_FloVey4XPcYMJp-hT1vEWr4IXPmfkuPyY2T7QkWuRRCaBEbWPMcgaumEv9MdV7BeRvyMCnqtMxBmAZFiSxleEO9fJcqN_mZIAcavD26kG8KLEqA9sKX694ikCO4BOACrIiNML0Ka6DUTXPnovSltx8fmuH2QVMwGnUS0zOzgxdFzFN3nLWVvOz03R2LnBqbS8e0JLoRk0v86zaX-CA-Ry2BzUM-X2LZFFCP66xorHGrDRw')"}}></div>
<div className="relative w-64 h-64 md:w-80 md:h-80 z-20">
<svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
<path d="M0,20 L0,0 L20,0" fill="none" stroke="#BE112D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
<path d="M80,0 L100,0 L100,20" fill="none" stroke="#BE112D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
<path d="M100,80 L100,100 L80,100" fill="none" stroke="#BE112D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
<path d="M20,100 L0,100 L0,80" fill="none" stroke="#BE112D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
</svg>
<div className="absolute top-0 left-0 w-full h-1 bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite_alternate]"></div>
<div className="absolute inset-0 flex items-center justify-center opacity-50 mix-blend-screen">
<span className="material-symbols-outlined text-on-primary text-[64px]">qr_code_scanner</span>
</div>
</div>
</div>
{/* Success scan feedback banner */}
<div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500/90 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-30 transition-all duration-300 ${
  showFeedback ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
}`} id="scan-feedback">
<span className="material-symbols-outlined text-[32px]">check_circle</span>
<div>
<p className="text-label-sm font-label-sm opacity-80">Berhasil Memindai</p>
<p className="text-headline-sm font-headline-sm" id="scanned-name">{scannedName}</p>
</div>
</div>
<div className="p-4 z-10 bg-gradient-to-t from-primary/90 to-transparent flex justify-center gap-4">
<button onClick={(e) => { e.stopPropagation(); alert("Mengubah kamera..."); }} className="flex items-center gap-2 bg-[#BE112D] text-white px-6 py-3 rounded-xl hover:scale-105 transition-transform shadow-[0_4px_14px_0_rgba(190,17,45,0.39)] cursor-pointer">
<span className="material-symbols-outlined text-[20px]">cameraswitch</span>
<span className="text-label-md font-label-md">Kamera</span>
</button>
<button onClick={(e) => { e.stopPropagation(); navigate('/mentor/absensi-manual'); }} className="flex items-center gap-2 border border-[#142C8E] text-white bg-[#142C8E]/20 px-6 py-3 rounded-xl hover:bg-[#142C8E]/40 transition-colors cursor-pointer">
<span className="material-symbols-outlined text-[20px]">keyboard</span>
<span className="text-label-md font-label-md">Manual</span>
</button>
</div>
</div>
{/* Recent Scans Sidebar */}
<div className="w-full md:w-1/3 flex flex-col h-full rounded-2xl bg-surface-container/90 backdrop-blur-md shadow-lg overflow-hidden border border-white/10">
<div className="p-6 border-b border-outline-variant/30 bg-surface-container">
<h3 className="text-headline-sm font-headline-sm text-on-surface">Scan Terbaru</h3>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-3">
  {gugusLogs.length > 0 ? (
    gugusLogs.map((log) => (
      <div key={log.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface hover:bg-surface-container-high transition-colors group cursor-default shadow-sm border border-outline-variant/20">
      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
      <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
      </div>
      <div className="flex-1 min-w-0">
      <p className="text-label-md font-label-md text-on-surface truncate">{log.name}</p>
      <p className="text-body-sm font-body-sm text-on-surface-variant truncate">NIM: {log.nim}</p>
      </div>
      <span className="text-label-sm font-label-sm text-on-surface-variant">{log.timestamp}</span>
      </div>
    ))
  ) : (
    <div className="text-center py-8 text-on-surface-variant text-body-md">Belum ada scan.</div>
  )}
</div>
<div className="p-4 bg-surface border-t border-outline-variant/30 flex justify-between items-center">
<span className="text-body-sm font-body-sm text-on-surface-variant">Total Scan: <strong className="text-on-surface">{gugusLogs.length}</strong></span>
<button onClick={() => navigate('/mentor/dashboard')} className="text-[#142C8E] text-label-sm font-label-sm hover:underline cursor-pointer">Lihat Semua</button>
</div>
</div>
</div>
</div>
<style>{`
@keyframes scan {
    0% {
        top: 0;
        opacity: 0;
    }
    10% {
        opacity: 1;
    }
    90% {
        opacity: 1;
    }
    100% {
        top: 100%;
        opacity: 0;
    }
}
`}</style>
</main></div>
  );
}
