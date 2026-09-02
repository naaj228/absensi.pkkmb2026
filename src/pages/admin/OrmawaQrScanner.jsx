import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { ormawaDb } from '../../lib/db';

export default function OrmawaQrScanner() {
  const navigate = useNavigate();
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Recent scans
  const [recentScans, setRecentScans] = useState([]);

  // Result Banner State
  const [feedback, setFeedback] = useState({
    show: false,
    type: 'success', // 'success', 'already', 'error'
    title: '',
    message: '',
    data: null
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const isReadyRef = useRef(true);

  // Audio tone feedback
  const playBeep = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';

      const freq = type === 'success' ? 1400 : type === 'already' ? 800 : 400;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);

      osc.start();
      osc.stop(ctx.currentTime + (type === 'success' ? 0.15 : 0.3));
    } catch {
      /* silent fallback */
    }
  };

  // Process QR string
  const processScanCode = async (rawCode) => {
    if (!rawCode || !isReadyRef.current) return;

    const cleanCode = rawCode.trim();
    isReadyRef.current = false;
    setIsProcessing(true);

    try {
      // Check if it looks like a participant NIM / PKKMB code instead of Ormawa QR
      if (cleanCode.startsWith('PKKMB2026-') || /^\d{7,12}$/.test(cleanCode)) {
        playBeep('error');
        setFeedback({
          show: true,
          type: 'error',
          title: 'QR Peserta Terdeteksi!',
          message: 'Ini adalah QR peserta biasa. Gunakan Scanner Peserta untuk absensi ini.',
          data: null
        });
        setTimeout(() => {
          isReadyRef.current = true;
        }, 3000);
        return;
      }

      const result = await ormawaDb.recordScan(cleanCode, 'Scanner Ormawa');

      if (!result.success) {
        playBeep('error');
        setFeedback({
          show: true,
          type: 'error',
          title: 'Presensi Ditolak',
          message: result.message || 'Kode QR Ormawa ini tidak terdaftar di database.',
          data: null
        });
      } else if (result.alreadyHadir) {
        playBeep('already');
        setFeedback({
          show: true,
          type: 'already',
          title: 'Sudah Absen Sebelumnya',
          message: `Ormawa "${result.item.nama_ormawa}" telah tercatat hadir sebelumnya.`,
          data: result.item
        });
      } else {
        playBeep('success');
        setFeedback({
          show: true,
          type: 'success',
          title: 'Absensi Ormawa Berhasil!',
          message: `Selamat Datang, ${result.item.nama_ormawa}!`,
          data: result.item
        });
        // Add to local recent scans
        setRecentScans((prev) => [result.item, ...prev]);
      }
    } catch (err) {
      console.error('Scan processing error:', err);
      playBeep('error');
      setFeedback({
        show: true,
        type: 'error',
        title: 'Gagal Memproses',
        message: 'Terjadi kesalahan sistem saat mencatat absensi.',
        data: null
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        isReadyRef.current = true;
      }, 2500);
    }
  };

  // Camera scan loop
  const tick = () => {
    if (
      videoRef.current &&
      videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
      canvasRef.current
    ) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data && isReadyRef.current) {
        processScanCode(code.data);
      }
    }

    if (cameraActive) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  // Start Camera
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (cameraActive) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cameraActive]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processScanCode(manualCode);
    setManualCode('');
  };

  return (
    <div className="pt-16 p-3 sm:pt-6 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Absensi Ormawa
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">Scanner QR Ormawa</h1>
          <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">Pindai QR Code milik delegasi Ormawa / Tamu Undangan.</p>
        </div>

        <div>
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_back</span>
            <span>Kembali</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Scanner Column */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <div className="bg-[#000423] text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl relative overflow-hidden border border-white/10">
            {/* Camera Frame Container */}
            <div className="relative aspect-video max-h-[280px] sm:max-h-none bg-black/60 rounded-xl sm:rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center mx-auto">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive ? (
                <div className="text-center p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-blue-400">
                    <span className="material-symbols-outlined text-2xl sm:text-3xl">videocam</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-base text-white">Kamera Belum Aktif</h3>
                    <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 max-w-xs mx-auto">
                      Klik tombol di bawah untuk mengaktifkan scanner kamera HP / Laptop.
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2.5 sm:px-6 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                    <span>Aktifkan Kamera</span>
                  </button>
                </div>
              ) : (
                /* Scanner Overlay Reticle */
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-40 h-40 sm:w-56 sm:h-56 border-2 border-emerald-400 rounded-2xl sm:rounded-3xl relative animate-pulse shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                    <div className="absolute top-0 left-0 w-4 h-4 sm:w-6 sm:h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 sm:w-6 sm:h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 sm:w-6 sm:h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-6 sm:h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br-lg"></div>
                  </div>
                  <p className="text-[10px] sm:text-xs font-semibold text-emerald-300 bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur-md border border-white/10">
                    Arahkan QR Code ke Dalam Kotak
                  </p>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            {cameraActive && (
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => {
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                    startCamera();
                  }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 text-[11px] sm:text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">flip_camera_ios</span>
                  <span>Ganti Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})</span>
                </button>

                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[11px] sm:text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">stop</span>
                  <span>Matikan</span>
                </button>
              </div>
            )}
          </div>

          {/* Feedback Result Banner */}
          {feedback.show && (
            <div
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-lg flex items-start gap-3 sm:gap-4 animate-fadeIn transition-all ${
                feedback.type === 'success'
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : feedback.type === 'already'
                  ? 'bg-amber-500 text-white border-amber-400'
                  : 'bg-red-500 text-white border-red-400'
              }`}
            >
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl sm:text-3xl">
                  {feedback.type === 'success'
                    ? 'verified'
                    : feedback.type === 'already'
                    ? 'info'
                    : 'warning'}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="text-sm sm:text-lg font-bold leading-tight">{feedback.title}</h4>
                <p className="text-xs sm:text-sm text-white/90 mt-0.5 leading-snug">{feedback.message}</p>
                {feedback.data && (
                  <div className="mt-2 pt-1.5 border-t border-white/20 text-[11px] sm:text-xs flex flex-wrap gap-x-3 gap-y-0.5 text-white/90">
                    <span>
                      Ormawa: <strong>{feedback.data.nama_ormawa}</strong>
                    </span>
                    <span>
                      Delegasi: <strong>{feedback.data.nama_perwakilan || '-'}</strong>
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setFeedback({ ...feedback, show: false })}
                className="text-white/70 hover:text-white cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm space-y-2.5">
            <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">
              Input Kode QR Manual (Barcode / Keyboard)
            </label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Contoh: ORM-1725283912-123"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0d1b4d] hover:bg-blue-900 text-white font-medium rounded-xl text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
              >
                {isProcessing ? 'Proses...' : 'Proses'}
              </button>
            </form>
          </div>
        </div>

        {/* Live Recent Scans Sidebar */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-3.5 sm:p-5 space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <h3 className="font-bold text-gray-900 text-xs sm:text-base">Scan Terakhir (Sesi Ini)</h3>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-bold rounded-lg">
              {recentScans.length}
            </span>
          </div>

          {recentScans.length === 0 ? (
            <div className="py-6 sm:py-12 text-center text-gray-400">
              <span className="material-symbols-outlined text-3xl sm:text-4xl mb-1">qr_code_scanner</span>
              <p className="text-[11px] sm:text-xs">Belum ada QR Ormawa yang di-scan.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-40 sm:max-h-[450px] overflow-y-auto pr-0.5">
              {recentScans.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 sm:p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl sm:rounded-2xl flex items-center justify-between"
                >
                  <div className="overflow-hidden mr-2">
                    <h5 className="font-bold text-gray-900 text-xs sm:text-sm truncate">{item.nama_ormawa}</h5>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                      {item.nama_perwakilan ? `${item.nama_perwakilan} (${item.jabatan || 'Utusan'})` : 'Delegasi'}
                    </p>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono bg-emerald-200 text-emerald-900 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg font-bold shrink-0">
                    {item.waktu_hadir ? new Date(item.waktu_hadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru Saja'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
