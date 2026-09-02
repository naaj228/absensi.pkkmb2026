import { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { AppContext } from '../../context/AppContext';

// Calculate distance between two coordinates in meters
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

export default function MentorQrScanner() {
  const { peserta, logs, gugus, currentUser, recordScan, hasMentorNotifications, locationSettings, getTodayWibString } = useContext(AppContext);
  const navigate = useNavigate();

  const mentorGugusId = currentUser?.gugusId || '';
  const mentorGugus   = gugus.find(g => g.id === mentorGugusId);
  const mentorGugusName = mentorGugus?.name || 'Gugus Saya';

  const [showFeedback, setShowFeedback]   = useState(false);
  const [feedbackType, setFeedbackType]   = useState('success');
  const [feedbackMsg,  setFeedbackMsg]    = useState('');
  const [scannedName,  setScannedName]    = useState('');
  const [isReady,      setIsReady]        = useState(true);
  const [cameraActive, setCameraActive]   = useState(false);
  const [facingMode,   setFacingMode]     = useState('environment');

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const isReadyRef  = useRef(true);

  // Geofencing states
  const [gpsStatus, setGpsStatus] = useState('checking'); // 'checking', 'active', 'denied', 'out-of-range'
  const [mentorCoords, setMentorCoords] = useState(null);
  const [distanceToCenter, setDistanceToCenter] = useState(null);

  const gpsStatusRef = useRef(gpsStatus);
  const mentorCoordsRef = useRef(mentorCoords);
  const distanceToCenterRef = useRef(distanceToCenter);

  useEffect(() => { gpsStatusRef.current = gpsStatus; }, [gpsStatus]);
  useEffect(() => { mentorCoordsRef.current = mentorCoords; }, [mentorCoords]);
  useEffect(() => { distanceToCenterRef.current = distanceToCenter; }, [distanceToCenter]);

  // Keep latest context values accessible inside the rAF loop via refs
  const pesertaRef       = useRef(peserta);
  const logsRef          = useRef(logs);
  const mentorGugusIdRef = useRef(mentorGugusId);
  const mentorGugusNameRef = useRef(mentorGugusName);
  const recordScanRef    = useRef(recordScan);

  useEffect(() => { pesertaRef.current = peserta; },             [peserta]);
  useEffect(() => { logsRef.current = logs; },                   [logs]);
  useEffect(() => { mentorGugusIdRef.current = mentorGugusId; }, [mentorGugusId]);
  useEffect(() => { mentorGugusNameRef.current = mentorGugusName; }, [mentorGugusName]);
  useEffect(() => { recordScanRef.current = recordScan; },       [recordScan]);
  useEffect(() => { isReadyRef.current = isReady; },             [isReady]);

  const todayWib = getTodayWibString ? getTodayWibString() : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const gugusLogs = logs.filter(log => log.gugusName === mentorGugusName && log.date === todayWib);

  // Audio beep
  const playBeep = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      
      const freq = type === 'success' ? 1200 : type === 'already' ? 700 : 400;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      
      osc.start(); 
      osc.stop(ctx.currentTime + (type === 'success' ? 0.12 : 0.25));
    } catch { /* silent */ }
  };

  // Show result banner
  const showResult = (type, name, msg) => {
    setFeedbackType(type);
    setScannedName(name);
    setFeedbackMsg(msg);
    setShowFeedback(true);
    setIsReady(false);
    isReadyRef.current = false;
    playBeep(type);
    setTimeout(() => {
      setShowFeedback(false);
      setIsReady(true);
      isReadyRef.current = true;
    }, 2200);
  };

  // Process a scanned / typed NIM
  const processNim = (nim) => {
    if (!nim) return;
    const students = pesertaRef.current;
    const gugusId  = mentorGugusIdRef.current;
    const gugusName = mentorGugusNameRef.current;

    // 1. Check if student exists
    const student = students.find(p => String(p.id) === String(nim.trim()));
    if (!student) {
      showResult('invalid', `NIM: ${nim}`, '❌ QR Code tidak ditemukan');
      return;
    }

    // 2. Check if student is in mentor's gugus
    if (student.gugusId !== gugusId) {
      showResult('invalid', student.name, `Bukan anggota ${gugusName}`);
      return;
    }

    // 3. Check if student has already scanned today (1 scan per day in WIB)
    const todayStr = getTodayWibString ? getTodayWibString() : todayWib;
    const alreadyScannedToday = logsRef.current.some(log => 
      String(log.nim) === String(student.id) && 
      log.date === todayStr &&
      log.status === 'Valid'
    );

    if (alreadyScannedToday) {
      showResult('already', student.name, '⚠️ Sudah melakukan absensi hari ini');
      return;
    }

    // 4. Record the scan
    const locationData = {
      latitude: mentorCoordsRef.current?.latitude || null,
      longitude: mentorCoordsRef.current?.longitude || null,
      locationStatus: 'Dalam Area',
      distanceMeters: distanceToCenterRef.current || 0
    };
    recordScanRef.current(student.id, locationData);
    showResult('success', student.name, '✅ Berhasil Absen');
  };

  // rAF scan loop
  const scanLoop = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (isReadyRef.current && gpsStatusRef.current === 'active') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code?.data) {
          processNim(code.data);
        }
      }
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  };

  // Start / restart camera
  const startCamera = async (mode) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    setCameraActive(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode ?? facingMode }
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.oncanplay = () => {
          video.play().catch(() => {});
          setCameraActive(true);
          rafRef.current = requestAnimationFrame(scanLoop);
        };
      }
    } catch (err) {
      console.warn('Kamera tidak diizinkan:', err);
    }
  };

  // Start camera on mount & Setup Geolocation watching
  useEffect(() => {
    startCamera('environment');

    if (!navigator.geolocation) {
      setGpsStatus('denied');
    } else {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMentorCoords({ latitude, longitude });

          if (locationSettings) {
            const dist = getHaversineDistance(
              latitude,
              longitude,
              locationSettings.latitude,
              locationSettings.longitude
            );
            setDistanceToCenter(Math.round(dist));

            if (dist <= locationSettings.radiusMeters) {
              setGpsStatus('active');
            } else {
              setGpsStatus('out-of-range');
            }
          } else {
            setGpsStatus('active');
          }
        },
        (error) => {
          console.error("GPS Watch error:", error);
          setGpsStatus('denied');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [locationSettings]);

  const handleSwitchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const handleManualScan = () => {
    const el = document.getElementById('sim-nim-input');
    if (el?.value.trim()) {
      processNim(el.value.trim());
      el.value = '';
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header - Fixed to top, padded for mobile hamburger menu */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">qr_code_scanner</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Scanner QR Absensi
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
        
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">

          {/* Scanner Panel */}
          <div className="w-full lg:w-2/3 bg-[#012060] rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden flex flex-col border border-[#022b80] text-white">
            
            {/* Top Bar Info */}
            <div className="p-3.5 sm:p-5 flex items-center justify-between z-10 bg-gradient-to-b from-black/40 via-black/20 to-transparent border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                  <span className="material-symbols-outlined text-[20px] text-amber-300">crop_free</span>
                </div>
                <div>
                  <h2 className="text-body-md sm:text-body-lg font-bold">Pemindai QR</h2>
                  <p className="text-[10.5px] sm:text-[11px] text-white/70">
                    {cameraActive ? 'Posisikan QR di dalam bingkai' : 'Memuat kamera…'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-body-xs font-bold border backdrop-blur-md ${
                isReady ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isReady ? 'Kamera Aktif' : 'Memproses…'}</span>
              </div>
            </div>

            {/* Video Viewfinder Box */}
            <div className="relative w-full aspect-square sm:aspect-video min-h-[300px] sm:min-h-[380px] bg-slate-950 flex items-center justify-center overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="absolute inset-0 w-full h-full object-cover z-0" 
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 bg-blue-950/20 z-10 pointer-events-none" />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-2 bg-slate-950/80 p-4 text-center">
                  <span className="material-symbols-outlined text-white/40 text-[56px]">no_photography</span>
                  <p className="text-white/70 text-body-sm font-semibold">Aktifkan izin kamera pada peramban Anda</p>
                </div>
              )}

              {/* GPS Overlay Notifications */}
              {gpsStatus === 'checking' && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-40 gap-3 text-white p-6 text-center">
                  <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin"></div>
                  <div>
                    <p className="font-bold text-body-md">Menghubungkan GPS...</p>
                    <p className="text-white/60 text-[11px] mt-0.5">Memverifikasi titik lokasi absensi Anda.</p>
                  </div>
                </div>
              )}

              {gpsStatus === 'denied' && (
                <div className="absolute inset-0 bg-rose-950/95 flex flex-col items-center justify-center z-40 gap-3 text-white p-6 text-center">
                  <span className="material-symbols-outlined text-rose-400 text-[48px] animate-pulse">location_off</span>
                  <div>
                    <p className="font-bold text-body-md text-rose-300">Akses GPS Diperlukan!</p>
                    <p className="text-white/80 text-[11px] mt-1 max-w-xs mx-auto leading-relaxed">
                      Wajib mengaktifkan izin GPS pada peramban untuk dapat melakukan absensi QR.
                    </p>
                  </div>
                </div>
              )}

              {gpsStatus === 'out-of-range' && (
                <div className="absolute inset-0 bg-amber-950/95 flex flex-col items-center justify-center z-40 gap-3 text-white p-6 text-center">
                  <span className="material-symbols-outlined text-amber-400 text-[48px]">explore_off</span>
                  <div>
                    <p className="font-bold text-body-md text-amber-300">Di Luar Radius Absensi!</p>
                    <p className="text-white/85 text-[11px] mt-1 max-w-xs mx-auto leading-relaxed">
                      Jarak Anda <strong className="text-amber-300 font-bold">{distanceToCenter} m</strong> dari <strong className="text-white">{locationSettings?.locationName || 'Gedung Utama'}</strong>.
                      (Maksimal radius {locationSettings?.radiusMeters || 150} m).
                    </p>
                  </div>
                </div>
              )}

              {/* Viewfinder Target Box */}
              <div className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 z-20">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,20 L0,0 L20,0" fill="none" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M80,0 L100,0 L100,20" fill="none" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M100,80 L100,100 L80,100" fill="none" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M20,100 L0,100 L0,80" fill="none" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
                </svg>
                {cameraActive && (
                  <div className="absolute left-0 w-full h-1 bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.9)] animate-[scan_2s_ease-in-out_infinite_alternate]" />
                )}
              </div>

              {/* Scan Feedback Dialog */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-30 transition-all duration-300 border border-white/20 max-w-[90%] ${
                feedbackType === 'success' ? 'bg-emerald-600/95' : feedbackType === 'already' ? 'bg-amber-600/95' : 'bg-rose-600/95'
              } text-white ${showFeedback ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                <span className="material-symbols-outlined text-[32px] shrink-0">
                  {feedbackType === 'success' ? 'check_circle' : feedbackType === 'already' ? 'warning' : 'cancel'}
                </span>
                <div className="overflow-hidden">
                  <p className="text-[10px] uppercase tracking-wider font-extrabold opacity-85">{feedbackMsg}</p>
                  <p className="text-body-md font-extrabold truncate">{scannedName}</p>
                </div>
              </div>

            </div>

            {/* Bottom Input & Action Controls */}
            <div className="p-3.5 sm:p-5 bg-black/40 border-t border-white/10 flex flex-col gap-3">
              {/* Input Scan Manual Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="sim-nim-input"
                    type="text"
                    placeholder="Input / Paste NIM Manual…"
                    onKeyDown={e => e.key === 'Enter' && handleManualScan()}
                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 text-body-sm font-semibold pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-sky-400 transition-all"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50 text-[16px]">badge</span>
                </div>
                <button 
                  onClick={handleManualScan}
                  className="bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-body-sm transition-all shadow-xs cursor-pointer shrink-0"
                >
                  Scan
                </button>
              </div>

              {/* Camera Switch & Manual Absensi Link */}
              <div className="flex gap-2">
                <button 
                  onClick={handleSwitchCamera}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white py-2 rounded-xl text-body-sm font-bold border border-white/15 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">cameraswitch</span>
                  <span>Putar Kamera</span>
                </button>

                <button 
                  onClick={() => navigate('/mentor/absensi-manual')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 text-emerald-300 py-2 rounded-xl text-body-sm font-bold border border-emerald-400/30 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">edit_square</span>
                  <span>Absensi Manual</span>
                </button>
              </div>
            </div>

          </div>

          {/* Recent Scans List Sidebar */}
          <div className="w-full lg:w-1/3 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center justify-between bg-[#f8fafc]">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#012060]/5 text-[#012060] flex items-center justify-center border border-[#012060]/10">
                  <span className="material-symbols-outlined text-[14px]">history</span>
                </div>
                <h3 className="text-body-xs font-bold text-[#012060]">Scan Terbaru</h3>
              </div>
              <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                Hari Ini
              </span>
            </div>

            {/* List */}
            <div className="p-2 sm:p-2.5 space-y-1.5 max-h-[280px] lg:max-h-[400px] overflow-y-auto bg-slate-50/40">
              {gugusLogs.length > 0 ? (
                gugusLogs.map(log => (
                  <div 
                    key={log.id} 
                    className="p-2 bg-white rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-xs font-bold text-slate-800 truncate leading-snug group-hover:text-[#012060] transition-colors">{log.name}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[7.5px] font-extrabold uppercase text-slate-400">NIM</span>
                          <span className="text-[9px] font-mono font-bold text-slate-500">{log.nim}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] font-bold text-[#012060] bg-[#012060]/5 border border-[#012060]/10 px-1.5 py-0.5 rounded-md shrink-0 font-mono">
                      {log.timestamp}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-body-xs font-medium">
                  Belum ada riwayat scan hari ini.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 sm:p-3 border-t border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <span className="text-[10px] font-medium text-slate-500">
                Total Scan: <strong className="text-[#012060] font-bold">{gugusLogs.length}</strong>
              </span>
              <button 
                onClick={() => navigate('/mentor/riwayat')} 
                className="bg-[#012060] hover:bg-[#022b80] active:scale-95 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </button>
            </div>
          </div>

        </div>

        <style>{`
          @keyframes scan {
            0%   { top: 0;    opacity: 0; }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        `}</style>
      </main>
    </div>
  );
}
