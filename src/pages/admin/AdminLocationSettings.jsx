import { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabase';

// Fix Leaflet marker icon asset paths in Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function AdminLocationSettings() {
  const { locationSettings, updateLocationSettings, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    async function debugAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("DEBUG AUTH USER ID:", user?.id, "EMAIL:", user?.email);
      if (user) {
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        console.log("DEBUG PROFILE DATA:", profile, "QUERY ERROR:", error);
      }
    }
    debugAuth();
  }, []);

  // Temporary local states for editing
  const [locationName, setLocationName] = useState('');
  const [tempLat, setTempLat] = useState(-6.2088);
  const [tempLng, setTempLng] = useState(106.8456);
  const [radius, setRadius] = useState(150);
  
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Map refs
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Init local states when global locationSettings is fetched
  useEffect(() => {
    if (locationSettings) {
      setLocationName(locationSettings.locationName || 'Gedung Utama');
      setTempLat(locationSettings.latitude || -6.2088);
      setTempLng(locationSettings.longitude || 106.8456);
      setRadius(locationSettings.radiusMeters || 150);
    }
  }, [locationSettings]);

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use current settings or fallback
    const initLat = locationSettings?.latitude || -6.2088;
    const initLng = locationSettings?.longitude || 106.8456;
    const initRadius = locationSettings?.radiusMeters || 150;

    const map = L.map(mapContainerRef.current).setView([initLat, initLng], 16);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([initLat, initLng], {
      color: '#4256b7',
      fillColor: '#4256b7',
      fillOpacity: 0.15,
      radius: initRadius
    }).addTo(map);
    circleRef.current = circle;

    // Map click handler to set marker position
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setTempLat(parseFloat(lat.toFixed(6)));
      setTempLng(parseFloat(lng.toFixed(6)));
    });

    // Marker drag handler
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      setTempLat(parseFloat(position.lat.toFixed(6)));
      setTempLng(parseFloat(position.lng.toFixed(6)));
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locationSettings]);

  // Dynamically update marker and circle positions/radius
  useEffect(() => {
    if (mapRef.current && markerRef.current && circleRef.current) {
      const latlng = [tempLat, tempLng];
      markerRef.current.setLatLng(latlng);
      circleRef.current.setLatLng(latlng);
      circleRef.current.setRadius(radius);
    }
  }, [tempLat, tempLng, radius]);

  // Reset map view to center marker
  const centerMap = () => {
    if (mapRef.current) {
      mapRef.current.setView([tempLat, tempLng], 16);
    }
  };

  // Get current browser/device GPS location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung Geolocation API.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setTempLat(parseFloat(latitude.toFixed(6)));
        setTempLng(parseFloat(longitude.toFixed(6)));
        setGpsLoading(false);
        // smooth pan map
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 17);
        }
      },
      (error) => {
        setGpsLoading(false);
        let msg = "Gagal mengambil koordinat GPS.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Akses lokasi ditolak oleh pengguna/browser.";
        }
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Save changes to Supabase
  const handleSave = async (e) => {
    e.preventDefault();
    if (!locationName.trim()) {
      alert("Nama lokasi wajib diisi.");
      return;
    }
    
    setSaving(true);
    try {
      await updateLocationSettings({
        latitude: tempLat,
        longitude: tempLng,
        radiusMeters: parseInt(radius, 10),
        locationName: locationName.trim()
      });
      alert("Pengaturan geofencing berhasil disimpan!");
    } catch (err) {
      alert("Gagal menyimpan lokasi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-sm font-headline-md text-on-surface">Pengaturan Lokasi & Geofencing</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>
            {hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel: Form Settings */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
              <div>
                <h3 className="text-headline-sm font-headline-md text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">pin_drop</span>
                  Titik Absensi Aktif
                </h3>
                <p className="text-body-sm text-on-surface-variant mt-1">Konfigurasi pusat lokasi acara PKKMB dan radius absensi untuk membatasi scan mentor.</p>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Nama Lokasi Acara</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-surface-container rounded-lg text-body-sm text-on-surface border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="Contoh: Lapangan Utama Univ, Aula Rektorat..."
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-4 py-2.5 bg-surface-container rounded-lg text-body-sm font-mono text-on-surface border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                      value={tempLat}
                      onChange={(e) => setTempLat(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-4 py-2.5 bg-surface-container rounded-lg text-body-sm font-mono text-on-surface border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                      value={tempLng}
                      onChange={(e) => setTempLng(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Radius Batas Scan</label>
                    <span className="text-label-md font-bold text-primary bg-primary-container px-2 py-0.5 rounded-full">{radius} Meter</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="25"
                    className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                  />
                  <div className="flex justify-between text-[10px] text-on-surface-variant px-0.5">
                    <span>50m (Ketat)</span>
                    <span>500m</span>
                    <span>1000m (Longgar)</span>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={gpsLoading}
                    className="flex-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">my_location</span>
                    {gpsLoading ? "Mencari..." : "GPS Saya"}
                  </button>
                  <button
                    type="button"
                    onClick={centerMap}
                    className="flex-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface py-2.5 rounded-xl text-label-md font-label-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">center_focus_weak</span>
                    Fokus Pin
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full mt-4 bg-primary text-on-primary py-3 rounded-xl text-label-md font-label-md shadow-md hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {saving ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </form>
            </div>
            
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-5 flex gap-3 text-[#92400e]">
              <span className="material-symbols-outlined text-[24px] shrink-0">info</span>
              <div className="text-body-sm space-y-1">
                <p className="font-semibold">Tips Menentukan Lokasi:</p>
                <p className="opacity-90">1. Tarik pin biru atau klik di peta untuk menentukan pusat lokasi secara langsung.</p>
                <p className="opacity-90">2. Gunakan radius minimal 150m untuk mengantisipasi ketidakakuratan GPS pada perangkat seluler mentor di dalam ruangan.</p>
              </div>
            </div>
          </div>

          {/* Right Panel: Leaflet Map */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">map</span>
                  <h3 className="text-headline-sm font-headline-md text-on-surface">Peta Interaktif Geofencing</h3>
                </div>
                {locationSettings?.updatedAt && (
                  <span className="text-[10px] text-on-surface-variant font-mono">
                    Update Terakhir: {new Date(locationSettings.updatedAt).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
              
              {/* Leaflet container */}
              <div ref={mapContainerRef} className="w-full h-[500px] rounded-xl shadow-inner border border-outline-variant/30 relative z-10" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
