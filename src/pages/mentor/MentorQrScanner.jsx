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
  const { peserta, logs, gugus, currentUser, recordScan, hasMentorNotifications, locationSettings } = useContext(AppContext);
  const navigate = useNavigate();

  const mentorGugusId = currentUser?.gugusId || '';
  const mentorGugus   = gugus.find(g => g.id === mentorGugusId);
  const mentorGugusName = mentorGugus?.name || '';

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

  // ── Keep latest context values accessible inside the rAF loop via refs ──────
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

  const gugusLogs = logs.filter(log => log.gugusName === mentorGugusName);

  // ── Audio beep ───────────────────────────────────────────────────────────────
  const playBeep = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      
      // High pitch for success, medium warning pitch for already, low flat pitch for error/invalid
      const freq = type === 'success' ? 1200 : type === 'already' ? 700 : 400;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      
      osc.start(); 
      osc.stop(ctx.currentTime + (type === 'success' ? 0.12 : 0.25));
    } catch (_) { /* silent */ }
  };

  // ── Show result banner ───────────────────────────────────────────────────────
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

  // ── Process a scanned / typed NIM — always reads from refs ──────────────────
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

    // 3. Check if student has already scanned today (1 scan per day)
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const alreadyScannedToday = logsRef.current.some(log => 
      String(log.nim) === String(student.id) && 
      log.date === todayStr &&
      log.status === 'Valid'
    );

    if (alreadyScannedToday) {
      showResult('already', student.name, '⚠️ Sudah melakukan absensi');
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
    showResult('success', student.name, '✅ Berhasil');
  };

  // ── rAF scan loop — uses refs so it never goes stale ────────────────────────
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
          inversionAttempts: 'attemptBoth',   // covers dark-on-light AND light-on-dark
        });
        if (code?.data) {
          processNim(code.data);
        }
      }
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  };

  // ── Start / restart camera ───────────────────────────────────────────────────
  const startCamera = async (mode) => {
    // Stop old stream & rAF
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
        // Wait until frames are actually available
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
            // If location settings are not fetched yet, wait in active state
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

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Header */}
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <h1 className="text-headline-sm font-headline-md text-on-surface">Scanner QR</h1>
        <div className="flex items-center gap-6">
          <div className="relative">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/mentor/notifikasi')}>notifications</span>
            {hasMentorNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white" />}
          </div>
          
        </div>
      </header>

      <main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row gap-gutter">

          {/* ── Scanner panel ── */}
          <div className="w-full md:w-2/3 flex flex-col rounded-2xl bg-surface/5 backdrop-blur-2xl shadow-xl overflow-hidden border border-white/5">

            {/* Top bar */}
            <div className="p-6 flex items-center justify-between z-10 bg-gradient-to-b from-primary/80 to-transparent">
              <div>
                <h2 className="text-headline-md font-headline-md text-on-primary">Scanner</h2>
                <p className="text-body-sm text-on-primary/70">
                  {cameraActive ? 'Arahkan kamera ke QR Code' : 'Menginisialisasi kamera…'}
                </p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full bg-current ${isReady ? 'animate-pulse' : ''}`} />
                <span className="text-label-md">{isReady ? 'Siap' : 'Memproses…'}</span>
              </div>
            </div>

            {/* Video area */}
            <div className="flex-1 relative flex items-center justify-center min-h-[350px]">
              <video ref={videoRef} autoPlay playsInline muted
                className="absolute inset-0 w-full h-full object-cover z-0" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 bg-primary/10 z-10" />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3 bg-black/40">
                  <span className="material-symbols-outlined text-white/50 text-[64px]">no_photography</span>
                  <p className="text-white/60 text-body-md">Izinkan akses kamera di browser</p>
                </div>
              )}

              {/* GPS / Geofencing Block Overlays (Pilihan A) */}
              {gpsStatus === 'checking' && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-40 gap-4 text-white p-6 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-primary animate-spin"></div>
                  <div>
                    <p className="font-semibold text-body-lg">Menghubungkan GPS...</p>
                    <p className="text-white/60 text-body-sm mt-1">Sistem sedang memverifikasi lokasi absensi Anda.</p>
                  </div>
                </div>
              )}

              {gpsStatus === 'denied' && (
                <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center z-40 gap-4 text-white p-6 text-center">
                  <span className="material-symbols-outlined text-error text-[54px] animate-pulse">location_off</span>
                  <div>
                    <p className="font-semibold text-body-lg text-red-300">Akses GPS Diperlukan!</p>
                    <p className="text-white/80 text-body-sm mt-2 max-w-sm mx-auto leading-relaxed">
                      Sesuai peraturan, absensi wajib memverifikasi lokasi. Silakan aktifkan GPS perangkat Anda dan berikan izin lokasi pada browser untuk melanjutkan.
                    </p>
                  </div>
                </div>
              )}

              {gpsStatus === 'out-of-range' && (
                <div className="absolute inset-0 bg-amber-950/95 flex flex-col items-center justify-center z-40 gap-4 text-white p-6 text-center">
                  <span className="material-symbols-outlined text-amber-400 text-[54px]">explore_off</span>
                  <div>
                    <p className="font-semibold text-body-lg text-amber-300">Di Luar Area Absensi!</p>
                    <p className="text-white/85 text-body-sm mt-2 max-w-sm mx-auto leading-relaxed">
                      Anda terdeteksi berada <strong className="text-amber-400 font-bold">{distanceToCenter} meter</strong> dari pusat acara <strong>{locationSettings?.locationName || 'Gedung Utama'}</strong>.
                    </p>
                    <p className="text-white/60 text-body-xs mt-1">
                      (Batas radius absensi: {locationSettings?.radiusMeters || 150} meter)
                    </p>
                  </div>
                </div>
              )}

              {/* Viewfinder */}
              <div className="relative w-64 h-64 md:w-80 md:h-80 z-20">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,20 L0,0 L20,0"  fill="none" stroke="#BE112D" strokeWidth="4" strokeLinecap="round" />
                  <path d="M80,0 L100,0 L100,20" fill="none" stroke="#BE112D" strokeWidth="4" strokeLinecap="round" />
                  <path d="M100,80 L100,100 L80,100" fill="none" stroke="#BE112D" strokeWidth="4" strokeLinecap="round" />
                  <path d="M20,100 L0,100 L0,80" fill="none" stroke="#BE112D" strokeWidth="4" strokeLinecap="round" />
                </svg>
                {cameraActive && (
                  <div className="absolute left-0 w-full h-1 bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite_alternate]" />
                )}
              </div>

              {/* Feedback overlay */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-30 transition-all duration-300 border border-white/10
                ${feedbackType === 'success' ? 'bg-green-600/95' : feedbackType === 'already' ? 'bg-amber-500/95' : 'bg-red-600/95'} text-white
                ${showFeedback ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                <span className="material-symbols-outlined text-[36px]" style={{fontVariationSettings:"'FILL' 1"}}>
                  {feedbackType === 'success' ? 'check_circle' : feedbackType === 'already' ? 'warning' : 'cancel'}
                </span>
                <div>
                  <p className="text-label-sm opacity-90 font-medium">{feedbackMsg}</p>
                  <p className="text-headline-sm font-bold">{scannedName}</p>
                </div>
              </div>
            </div>

            {/* Bottom controls */}
            <div className="p-4 z-10 bg-gradient-to-t from-primary/95 via-primary/80 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  id="sim-nim-input"
                  type="text"
                  placeholder="Ketik / Paste NIM…"
                  onKeyDown={e => e.key === 'Enter' && handleManualScan()}
                  className="bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-body-sm px-4 py-2.5 rounded-xl focus:outline-none w-full sm:w-44"
                />
                <button onClick={handleManualScan}
                  className="bg-primary-container text-on-primary-container px-4 py-2.5 rounded-xl text-label-md hover:scale-105 transition-transform">
                  Scan
                </button>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={handleSwitchCamera}
                  className="flex-1 sm:flex-initial flex items-center gap-2 bg-[#BE112D] text-white px-6 py-3 rounded-xl hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">cameraswitch</span>
                  <span className="text-label-md">Kamera</span>
                </button>
                <button onClick={() => navigate('/mentor/absensi-manual')}
                  className="flex-1 sm:flex-initial flex items-center gap-2 border border-[#142C8E] text-white bg-[#142C8E]/20 px-6 py-3 rounded-xl hover:bg-[#142C8E]/40 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">keyboard</span>
                  <span className="text-label-md">Manual</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Recent scans sidebar ── */}
          <div className="w-full md:w-1/3 flex flex-col rounded-2xl bg-surface-container/90 backdrop-blur-md shadow-lg overflow-hidden border border-white/10">
            <div className="p-6 border-b border-outline-variant/30 bg-surface-container">
              <h3 className="text-headline-sm text-on-surface">Scan Terbaru</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {gugusLogs.length > 0 ? gugusLogs.map(log => (
                <div key={log.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface hover:bg-surface-container-high transition-colors shadow-sm border border-outline-variant/20">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                    <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md text-on-surface truncate">{log.name}</p>
                    <p className="text-body-sm text-on-surface-variant">NIM: {log.nim}</p>
                  </div>
                  <span className="text-label-sm text-on-surface-variant">{log.timestamp}</span>
                </div>
              )) : (
                <div className="text-center py-8 text-on-surface-variant">Belum ada scan.</div>
              )}
            </div>
            <div className="p-4 bg-surface border-t border-outline-variant/30 flex justify-between items-center">
              <span className="text-body-sm text-on-surface-variant">Total Scan: <strong className="text-on-surface">{gugusLogs.length}</strong></span>
              <button onClick={() => navigate('/mentor/riwayat')} className="text-[#142C8E] text-label-sm hover:underline">Lihat Semua</button>
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
