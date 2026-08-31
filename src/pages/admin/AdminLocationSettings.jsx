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

// Helper: Geocoding Search (Address to Coordinates)
async function performGeocodeSearch(queryText) {
  const lowerQuery = queryText.toLowerCase().trim();
  const triggerKeywords = [
    'universitas teknologi digital',
    'digitech',
    'digitech university',
    'kampus digitech',
    'utd bandung',
    'rektorat',
    'pkkmb'
  ];

  const matchesDigitech = triggerKeywords.some(keyword => lowerQuery.includes(keyword) || keyword.includes(lowerQuery));
  
  let customResults = [];
  if (matchesDigitech && lowerQuery.length >= 3) {
    customResults.push({
      lat: -6.966748,
      lon: 107.672466,
      display_name: 'Digitech University (Universitas Teknologi Digital), Jl. Cibogo No. Indah 3, Mekarjaya, Kec. Rancasari, Kota Bandung',
      title: 'Digitech University (Universitas Teknologi Digital)',
      sub: 'Jl. Cibogo No. Indah 3, Mekarjaya, Kec. Rancasari, Kota Bandung, Jawa Barat 40000'
    });
  }

  try {
    const res = await fetch(`https://photon.komoot.io/api?q=${encodeURIComponent(queryText)}&limit=10&bbox=107.50,-7.05,107.78,-6.80`);
    if (!res.ok) throw new Error("Photon geocoder error");
    const data = await res.json();
    
    let apiResults = [];
    if (data && data.features) {
      // Keep only results located inside Bandung bounds
      const idFeatures = data.features.filter(f => {
        const coords = f.geometry.coordinates;
        return coords[1] >= -7.05 && coords[1] <= -6.80 && coords[0] >= 107.50 && coords[0] <= 107.78;
      });

      apiResults = idFeatures.map(f => {
        const props = f.properties;
        const name = props.name || "";
        const street = props.street || "";
        const city = props.city || "";
        const state = props.state || "";
        
        const title = name || street || city;
        const sub = [street, city, state].filter(Boolean).join(', ');
        const display_name = [title, sub].filter(Boolean).join(', ');
        
        return {
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          display_name: display_name,
          title: title,
          sub: sub
        };
      });
    }

    // Combine custom injected results with API results, preventing duplicates
    const combined = [...customResults];
    for (const apiRes of apiResults) {
      const isDuplicate = combined.some(r => Math.abs(r.lat - apiRes.lat) < 0.0001 && Math.abs(r.lon - apiRes.lon) < 0.0001);
      if (!isDuplicate) {
        combined.push(apiRes);
      }
    }
    
    return combined.slice(0, 5);
  } catch (err) {
    console.error("Photon geocoding search failed:", err);
    if (customResults.length > 0) {
      return customResults;
    }
    throw err;
  }
}

// Helper: Reverse Geocoding (Coordinates to Address)
async function performReverseGeocode(lat, lng) {
  // If coordinates are close to the Bandung campus coordinates, return it directly
  const distLat = Math.abs(lat - (-6.966748));
  const distLng = Math.abs(lng - (107.672466));
  if (distLat < 0.0015 && distLng < 0.0015) {
    return {
      display_name: 'Digitech University (Universitas Teknologi Digital), Jl. Cibogo No. Indah 3, Mekarjaya, Kec. Rancasari, Kota Bandung'
    };
  }

  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
    if (!res.ok) throw new Error("Photon reverse geocoder error");
    const data = await res.json();
    
    if (data && data.features && data.features.length > 0) {
      const props = data.features[0].properties;
      const name = props.name || "";
      const street = props.street || "";
      const city = props.city || "";
      const state = props.state || "";
      
      const title = name || street || city;
      const sub = [street, city, state].filter(Boolean).join(', ');
      const display_name = [title, sub].filter(Boolean).join(', ');
      
      return {
        display_name: display_name
      };
    }
    return null;
  } catch (err) {
    console.error("Photon reverse geocoding failed:", err);
    return null;
  }
}

// Bandung Boundaries for locking maps & autocomplete
const BANDUNG_BOUNDS = {
  minLat: -7.05,
  maxLat: -6.80,
  minLng: 107.50,
  maxLng: 107.78
};

const isInsideBandung = (lat, lng) => {
  return lat >= BANDUNG_BOUNDS.minLat && 
         lat <= BANDUNG_BOUNDS.maxLat && 
         lng >= BANDUNG_BOUNDS.minLng && 
         lng <= BANDUNG_BOUNDS.maxLng;
};

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
  const [tempLat, setTempLat] = useState(-6.966748);
  const [tempLng, setTempLng] = useState(107.672466);
  const [radius, setRadius] = useState(100);
  
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showCoords, setShowCoords] = useState(true);
  const [formattedDate, setFormattedDate] = useState('6/8/2026, 11.52.50');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Mobile active tab state: 'map', 'form', 'guide'
  const [mobileTab, setMobileTab] = useState('map');

  // Map refs
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const mapContainerRef = useRef(null);
  const coordsRef = useRef({ lat: tempLat, lng: tempLng });

  useEffect(() => {
    coordsRef.current = { lat: tempLat, lng: tempLng };
  }, [tempLat, tempLng]);

  // Trigger Leaflet invalidateSize when switching mobile tabs
  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [mobileTab]);

  // Init local states when global locationSettings is fetched
  useEffect(() => {
    if (locationSettings) {
      const isInside = isInsideBandung(locationSettings.latitude, locationSettings.longitude);
      const activeLat = isInside ? locationSettings.latitude : -6.966748;
      const activeLng = isInside ? locationSettings.longitude : 107.672466;
      const activeName = isInside ? (locationSettings.locationName || 'Gedung Utama PKKMB') : 'Gedung Utama PKKMB (Digitech University)';

      setLocationName(activeName);
      setSearchQuery(activeName);
      setTempLat(activeLat);
      setTempLng(activeLng);
      setRadius(locationSettings.radiusMeters || 100);
      
      if (locationSettings.updatedAt) {
        const date = new Date(locationSettings.updatedAt);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        setFormattedDate(`${day}/${month}/${year}, ${hours}.${minutes}.${seconds}`);
      }
    }
  }, [locationSettings]);

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let initLat = locationSettings?.latitude || -6.966748;
    let initLng = locationSettings?.longitude || 107.672466;
    if (!isInsideBandung(initLat, initLng)) {
      initLat = -6.966748;
      initLng = 107.672466;
    }
    const initRadius = locationSettings?.radiusMeters || 100;

    const bandungBounds = L.latLngBounds(
      L.latLng(BANDUNG_BOUNDS.minLat, BANDUNG_BOUNDS.minLng),
      L.latLng(BANDUNG_BOUNDS.maxLat, BANDUNG_BOUNDS.maxLng)
    );

    const map = L.map(mapContainerRef.current, {
      maxBounds: bandungBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 11
    }).setView([initLat, initLng], 16);
    mapRef.current = map;

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps'
    }).addTo(map);

    const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([initLat, initLng], {
      color: '#012060',
      fillColor: '#012060',
      fillOpacity: 0.15,
      radius: initRadius
    }).addTo(map);
    circleRef.current = circle;

    // Map click handler to set marker position
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      if (!isInsideBandung(lat, lng)) {
        alert("Lokasi di luar jangkauan Bandung! Silakan pilih lokasi di dalam area Bandung.");
        return;
      }
      const roundedLat = parseFloat(lat.toFixed(6));
      const roundedLng = parseFloat(lng.toFixed(6));
      setTempLat(roundedLat);
      setTempLng(roundedLng);

      const data = await performReverseGeocode(roundedLat, roundedLng);
      if (data && data.display_name) {
        const segments = data.display_name.split(',');
        const shortName = segments.slice(0, 2).join(',').trim();
        setLocationName(shortName);
        setSearchQuery(shortName);
      }
    });

    // Marker drag handler
    marker.on('dragend', async () => {
      const position = marker.getLatLng();
      const { lat, lng } = position;
      if (!isInsideBandung(lat, lng)) {
        alert("Lokasi di luar jangkauan Bandung! Pin dikembalikan ke posisi sebelumnya.");
        marker.setLatLng([coordsRef.current.lat, coordsRef.current.lng]);
        return;
      }
      const roundedLat = parseFloat(lat.toFixed(6));
      const roundedLng = parseFloat(lng.toFixed(6));
      setTempLat(roundedLat);
      setTempLng(roundedLng);

      const data = await performReverseGeocode(roundedLat, roundedLng);
      if (data && data.display_name) {
        const segments = data.display_name.split(',');
        const shortName = segments.slice(0, 2).join(',').trim();
        setLocationName(shortName);
        setSearchQuery(shortName);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locationSettings]);

  // Trigger real-time search on search input change (like Google Maps autocomplete)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    // Debounce API calls by 400ms to avoid spamming the server
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === locationName.trim()) {
        return;
      }
      
      try {
        const data = await performGeocodeSearch(searchQuery);
        setSearchResults(data);
      } catch (err) {
        console.error("Auto search failed:", err);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, locationName]);

  // Dynamically update marker and circle positions/radius
  useEffect(() => {
    if (mapRef.current && markerRef.current && circleRef.current) {
      const latlng = [tempLat, tempLng];
      markerRef.current.setLatLng(latlng);
      circleRef.current.setLatLng(latlng);
      circleRef.current.setRadius(radius);

      const popupHtml = `
        <div class="p-3 flex items-start gap-3 min-w-[180px] sm:min-w-[200px] font-sans">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#012060]/10 flex items-center justify-center text-[#012060] shrink-0">
            <span class="material-symbols-outlined text-[18px] sm:text-[20px]">location_city</span>
          </div>
          <div>
            <h4 class="font-bold text-slate-800 text-[12px] sm:text-[13px] leading-tight">${locationName || 'Gedung Utama PKKMB'}</h4>
            <p class="text-[9px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">Radius</p>
            <p class="font-bold text-[#012060] text-[14px] sm:text-[16px]">${radius} Meter</p>
            <span class="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Area Aktif
            </span>
          </div>
        </div>
      `;
      markerRef.current.bindPopup(popupHtml).openPopup();
    }
  }, [tempLat, tempLng, radius, locationName]);

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
      async (position) => {
        const { latitude, longitude } = position.coords;
        const roundedLat = parseFloat(latitude.toFixed(6));
        const roundedLng = parseFloat(longitude.toFixed(6));
        setTempLat(roundedLat);
        setTempLng(roundedLng);
        setGpsLoading(false);
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 17);
        }
        
        const data = await performReverseGeocode(roundedLat, roundedLng);
        if (data && data.display_name) {
          const segments = data.display_name.split(',');
          const shortName = segments.slice(0, 2).join(',').trim();
          setLocationName(shortName);
          setSearchQuery(shortName);
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

  // Copy values to clipboard
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text.toString());
    alert(`${label} berhasil disalin ke clipboard!`);
  };

  // Delete/Reset Pin coordinates
  const handleResetPin = () => {
    window.confirmAction("Apakah Anda yakin ingin menghapus/mereset pin koordinat ke lokasi default?", async () => {
      const defaultLat = locationSettings?.latitude || -6.966748;
      const defaultLng = locationSettings?.longitude || 107.672466;
      setTempLat(defaultLat);
      setTempLng(defaultLng);
      if (mapRef.current) {
        mapRef.current.setView([defaultLat, defaultLng], 16);
      }
      const data = await performReverseGeocode(defaultLat, defaultLng);
      if (data && data.display_name) {
        const segments = data.display_name.split(',');
        const shortName = segments.slice(0, 2).join(',').trim();
        setLocationName(shortName);
        setSearchQuery(shortName);
      }
    });
  };

  // Geolocation search using OpenStreetMap Nominatim
  const handleSearch = async (queryText) => {
    if (!queryText || !queryText.trim()) return;
    setSearchLoading(true);
    try {
      const data = await performGeocodeSearch(queryText);
      setSearchResults(data);
      if (data.length === 0) {
        alert("Lokasi tidak ditemukan. Coba masukkan kata kunci lain.");
      }
    } catch (err) {
      alert("Pencarian lokasi gagal karena keterbatasan akses server peta. Harap geser pin langsung pada peta.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchQuery);
    }
  };

  // Save changes to Supabase
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!locationName.trim()) {
      alert("Nama lokasi wajib diisi.");
      return;
    }

    const latVal = parseFloat(tempLat);
    const lngVal = parseFloat(tempLng);
    if (isNaN(latVal) || isNaN(lngVal)) {
      alert("Koordinat Latitude dan Longitude harus berupa angka yang valid.");
      return;
    }

    if (!isInsideBandung(latVal, lngVal)) {
      alert("Koordinat berada di luar wilayah Bandung! Harap atur lokasi hanya di dalam wilayah Bandung.");
      return;
    }
    
    setSaving(true);
    try {
      await updateLocationSettings({
        latitude: latVal,
        longitude: lngVal,
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
    <div className="w-full bg-[#f8fafc] min-h-screen pb-24 lg:pb-12">
      {/* Header - Fixed to top, properly padded for mobile hamburger menu */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">pin_drop</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Pengaturan Lokasi & Geofencing
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div 
            className="relative group cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors" 
            onClick={() => navigate('/admin/notifikasi')}
            title="Notifikasi Admin"
          >
            <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors text-[22px] sm:text-[24px]">notifications</span>
            {hasAdminNotifications && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-20 px-3 sm:px-6 lg:px-8 max-w-container-max mx-auto space-y-4 sm:space-y-6">
        
        {/* Mobile Quick Summary Card (visible on mobile only) */}
        <div className="lg:hidden bg-gradient-to-r from-[#012060] to-[#02318c] text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3">
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Aktif
              </span>
              <span className="text-[11px] font-semibold text-white/80 font-mono">Radius: {radius}m</span>
            </div>
            <h2 className="text-body-md font-bold truncate mt-1 text-white">{locationName || 'Gedung Utama PKKMB'}</h2>
            <p className="text-[10px] text-white/70 font-mono truncate">{tempLat}, {tempLng}</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-2.5 bg-white text-[#012060] rounded-xl text-label-sm font-bold shadow hover:bg-slate-50 active:scale-95 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">{saving ? 'sync' : 'save'}</span>
            <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
          </button>
        </div>

        {/* Mobile Segmented Tab Control (visible on mobile screens < lg) */}
        <div className="lg:hidden flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm gap-1">
          <button
            type="button"
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-2 px-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'map'
                ? 'bg-[#012060] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">map</span>
            <span>Peta</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('form')}
            className={`flex-1 py-2 px-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'form'
                ? 'bg-[#012060] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Form</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('guide')}
            className={`flex-1 py-2 px-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'guide'
                ? 'bg-[#012060] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">help</span>
            <span>Panduan</span>
          </button>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Form Settings & Guides */}
          <div className={`lg:col-span-5 flex flex-col gap-6 ${
            mobileTab === 'form' || mobileTab === 'guide' ? 'block' : 'hidden lg:flex'
          }`}>
            
            {/* Card 1: Form Titik Absensi Aktif */}
            <div className={`bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-5 ${
              mobileTab === 'guide' ? 'hidden lg:flex' : 'flex'
            }`}>
              
              {/* Card Header Section */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#012060]/5 flex items-center justify-center text-[#012060] shrink-0">
                    <span className="material-symbols-outlined text-[22px]">pin_drop</span>
                  </div>
                  <div>
                    <h3 className="text-body-md sm:text-body-lg font-bold text-[#012060]">Titik Absensi Aktif</h3>
                    <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5 leading-relaxed">
                      Konfigurasi pusat lokasi acara PKKMB dan radius absensi untuk membatasi scan mentor.
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold shrink-0 flex items-center gap-1 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Aktif
                </span>
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleSave} className="flex flex-col gap-4 sm:gap-5">
                
                {/* Location Search Field */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cari Lokasi Acara</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">
                      {searchLoading ? 'sync' : 'search'}
                    </span>
                    <input
                      type="text"
                      className={`w-full pl-11 pr-10 py-3 bg-[#f8fafc] rounded-2xl border border-slate-200 text-body-sm sm:text-body-md font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all ${searchLoading ? 'animate-pulse' : ''}`}
                      placeholder="Ketik alamat atau nama gedung..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        title="Bersihkan"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-[1010] max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {searchResults.map((item, idx) => {
                        const segments = item.display_name.split(',');
                        const title = segments.slice(0, 2).join(',').trim();
                        const sub = segments.slice(2).join(',').trim();
                        
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const latVal = parseFloat(item.lat);
                              const lonVal = parseFloat(item.lon);
                              setTempLat(parseFloat(latVal.toFixed(6)));
                              setTempLng(parseFloat(lonVal.toFixed(6)));
                              
                              setLocationName(title);
                              setSearchQuery(title);
                              setSearchResults([]);
                              if (mapRef.current) {
                                mapRef.current.setView([latVal, lonVal], 17);
                              }
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[#012060] text-[18px] mt-0.5 shrink-0">location_on</span>
                            <div className="overflow-hidden">
                              <p className="text-body-sm font-bold text-slate-800 leading-snug">{title}</p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{sub}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Location Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Lokasi Aktif</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-[#f8fafc] rounded-2xl border border-slate-200 text-body-sm sm:text-body-md font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                    placeholder="Nama lokasi (misal: Gedung Rektorat)"
                    value={locationName}
                    onChange={(e) => {
                      setLocationName(e.target.value);
                      setSearchQuery(e.target.value);
                    }}
                  />
                </div>

                {/* Radius Section */}
                <div className="flex flex-col gap-2.5 bg-[#f8fafc] border border-slate-100 rounded-2xl p-3.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#012060]">radar</span>
                      Radius Batas Scan
                    </label>
                    <span className="text-body-md font-extrabold text-[#012060] bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-xs">
                      {radius} Meter
                    </span>
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="25"
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#012060]"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                  />

                  {/* Quick Preset Buttons for easy mobile tapping */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {[50, 100, 150, 250, 500, 1000].map((rVal) => (
                      <button
                        key={rVal}
                        type="button"
                        onClick={() => setRadius(rVal)}
                        className={`flex-1 py-1.5 text-[10px] sm:text-[11px] font-bold rounded-xl transition-all cursor-pointer border ${
                          radius === rVal
                            ? 'bg-[#012060] text-white border-[#012060] shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {rVal}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alert Info */}
                <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-3 flex gap-2.5 text-emerald-800">
                  <span className="material-symbols-outlined text-[20px] shrink-0 text-emerald-600 mt-0.5">check_circle</span>
                  <p className="text-[11px] sm:text-[12px] font-medium leading-relaxed">
                    Mentor hanya dapat melakukan scan kehadiran jika berada di dalam area radius <strong>{radius}m</strong>.
                  </p>
                </div>

                {/* Collapsible Coordinates Section */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-[#f8fafc]/50">
                  <button
                    type="button"
                    onClick={() => setShowCoords(!showCoords)}
                    className="w-full px-4 py-3 flex justify-between items-center text-body-sm font-bold text-slate-700 hover:bg-slate-100/50 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#012060]">pin_drop</span>
                      Koordinat Latitude & Longitude
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-slate-400">{showCoords ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  
                  {showCoords && (
                    <div className="p-3.5 pt-0 grid grid-cols-2 gap-3 transition-all duration-300">
                      {/* Latitude Card */}
                      <div className="flex flex-col gap-1 relative bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Latitude</label>
                        <div className="flex justify-between items-center">
                          <input
                            type="number"
                            step="any"
                            required
                            className="w-full bg-transparent text-[12px] sm:text-body-sm font-semibold text-slate-800 font-mono focus:outline-none"
                            value={tempLat}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setTempLat(isNaN(val) ? '' : val);
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleCopy(tempLat, 'Latitude')}
                            className="text-slate-400 hover:text-primary transition-colors cursor-pointer shrink-0 ml-1 p-1"
                            title="Salin Latitude"
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Longitude Card */}
                      <div className="flex flex-col gap-1 relative bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Longitude</label>
                        <div className="flex justify-between items-center">
                          <input
                            type="number"
                            step="any"
                            required
                            className="w-full bg-transparent text-[12px] sm:text-body-sm font-semibold text-slate-800 font-mono focus:outline-none"
                            value={tempLng}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setTempLng(isNaN(val) ? '' : val);
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleCopy(tempLng, 'Longitude')}
                            className="text-slate-400 hover:text-primary transition-colors cursor-pointer shrink-0 ml-1 p-1"
                            title="Salin Longitude"
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* GPS and Center buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={gpsLoading}
                    className="flex items-center gap-2.5 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer text-left shadow-xs disabled:opacity-60"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#012060]/5 flex items-center justify-center text-[#012060] shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{gpsLoading ? 'sync' : 'my_location'}</span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-body-sm font-bold text-slate-800 leading-tight">GPS Saya</p>
                      <p className="text-[9px] text-slate-400 truncate">Lokasi saat ini</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={centerMap}
                    className="flex items-center gap-2.5 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer text-left shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#012060]/5 flex items-center justify-center text-[#012060] shrink-0">
                      <span className="material-symbols-outlined text-[18px]">center_focus_weak</span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-body-sm font-bold text-slate-800 leading-tight">Fokus Pin</p>
                      <p className="text-[9px] text-slate-400 truncate">Tengahkan peta</p>
                    </div>
                  </button>
                </div>

                {/* Desktop Save Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="hidden lg:flex w-full mt-2 bg-[#012060] hover:bg-[#022b80] text-white py-4 rounded-2xl transition-all flex-col items-center justify-center shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  <span className="flex items-center gap-2 text-label-md font-bold">
                    <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'save'}</span>
                    {saving ? 'Menyimpan Pengaturan...' : 'Simpan Pengaturan'}
                  </span>
                  <span className="text-[11px] opacity-75 font-normal mt-0.5">Terapkan ke seluruh akun mentor</span>
                </button>
              </form>
            </div>
            
            {/* Card 2: Panduan Geofencing */}
            <div className={`bg-[#fffbf4] border border-[#ffedd5] rounded-3xl p-5 flex flex-col gap-3.5 ${
              mobileTab === 'form' ? 'hidden lg:flex' : 'flex'
            }`}>
              <span className="flex items-center gap-2 text-[#92400e] text-body-md font-bold">
                <span className="material-symbols-outlined text-[20px]">info</span>
                Panduan Ringkas Geofencing
              </span>
              
              <div className="text-body-sm text-[#92400e]/90 space-y-2 font-medium leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#92400e]/10 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">1</span>
                  Tarik pin atau klik langsung di peta untuk menentukan posisi absensi.
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#92400e]/10 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">2</span>
                  Atur radius jangkauan dengan slider atau tombol pilihan meter.
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#92400e]/10 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">3</span>
                  Klik tombol <strong>"Simpan Pengaturan"</strong> untuk mengaktifkan lokasi.
                </p>
              </div>

              <button 
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="text-[#012060] hover:text-[#022b80] font-bold text-label-sm flex items-center gap-1.5 mt-1 cursor-pointer hover:underline self-start bg-white/60 px-3 py-1.5 rounded-xl border border-amber-200/60"
              >
                Lihat Panduan & Solusi Kendala
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

          </div>

          {/* Right Panel: Interactive Map */}
          <div className={`lg:col-span-7 flex flex-col gap-4 ${
            mobileTab === 'map' ? 'block' : 'hidden lg:block'
          }`}>
            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
              
              {/* Map Header & Widgets */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#012060]/5 flex items-center justify-center text-[#012060] shrink-0">
                    <span className="material-symbols-outlined text-[22px]">map</span>
                  </div>
                  <div>
                    <h3 className="text-body-md sm:text-body-lg font-bold text-[#012060]">Peta Interaktif Geofencing</h3>
                    <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5">Geser pin atau tap lokasi pada peta</p>
                  </div>
                </div>
                
                {/* Status Badges */}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <div className="bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center gap-2 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <div>
                      <p className="text-[9px] font-bold text-slate-700 leading-none">GPS Valid</p>
                      <p className="text-[8px] text-slate-400 mt-0.5 leading-none">Akurasi ± 5m</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center gap-2 shadow-xs">
                    <span className="material-symbols-outlined text-slate-400 text-[16px] shrink-0">schedule</span>
                    <div>
                      <p className="text-[9px] font-bold text-slate-700 leading-none">Update Terakhir</p>
                      <p className="text-[8px] text-slate-400 mt-0.5 leading-none font-mono">{formattedDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Quick Action Pills above Map */}
              <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={gpsLoading}
                  className="px-3 py-1.5 bg-[#012060]/5 hover:bg-[#012060]/10 text-[#012060] rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 border border-[#012060]/10 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">{gpsLoading ? 'sync' : 'my_location'}</span>
                  <span>GPS Saya</span>
                </button>
                
                <button
                  type="button"
                  onClick={centerMap}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">center_focus_weak</span>
                  <span>Fokus Pin</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetPin}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 border border-rose-200/60 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                  <span>Reset Pin</span>
                </button>
              </div>
              
              {/* Leaflet map container with responsive height */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-[380px] sm:h-[460px] lg:h-[530px] z-10">
                <div ref={mapContainerRef} className="w-full h-full" />
                
                {/* Floating Action Overlay on bottom of map */}
                <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-md flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 text-[11px] sm:text-body-sm font-bold text-slate-700 overflow-hidden">
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#012060] shrink-0">touch_app</span>
                    <span className="truncate">Klik/geser pin di peta</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleResetPin}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-error/10 hover:bg-error/20 text-[#a50022] rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    <span className="hidden sm:inline">Hapus pin</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Mobile Sticky Floating Save Bar (Visible on mobile screens < lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 px-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-between gap-3">
        <div className="overflow-hidden">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Pusat Absensi</p>
          <p className="text-body-sm font-bold text-[#012060] truncate">{locationName || 'Gedung Utama'}</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-[#012060] hover:bg-[#022b80] text-white px-5 py-3 rounded-2xl text-label-md font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'save'}</span>
          <span>{saving ? 'Menyimpan...' : 'Simpan Lokasi'}</span>
        </button>
      </div>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-fade-in relative z-50">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 text-[#012060]">
                <div className="w-10 h-10 rounded-2xl bg-[#012060]/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">info</span>
                </div>
                <div>
                  <h3 className="text-body-md sm:text-body-lg font-bold">Panduan Lengkap Geofencing</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tata cara pengaturan & pemecahan masalah lokasi</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="space-y-4 text-body-sm text-slate-600 leading-relaxed max-h-[380px] overflow-y-auto pr-2">
              <div className="space-y-1">
                <h4 className="font-bold text-[#012060]">1. Apa itu Geofencing?</h4>
                <p>Geofencing adalah pembatas geografis virtual menggunakan koordinat GPS (Latitude/Longitude). Fitur ini mewajibkan Mentor berada di lokasi yang ditentukan saat memindai QR Code kehadiran mahasiswa baru.</p>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-bold text-[#012060]">2. Menentukan Radius yang Tepat</h4>
                <p>GPS pada handphone memiliki toleransi akurasi. Untuk meminimalisir kendala mentor tidak dapat memindai:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Area Terbuka (Lapangan)</strong>: Radius 100m – 150m.</li>
                  <li><strong>Dalam Gedung / Aula</strong>: Radius 200m – 300m (direkomendasikan karena atap gedung dapat menurunkan akurasi GPS hingga 50 meter).</li>
                </ul>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[#012060]">3. Cara Mengatur Titik Koordinat</h4>
                <ul className="list-decimal pl-5 space-y-1">
                  <li>Gunakan tombol <strong>GPS Saya</strong> jika Anda saat ini berada di lokasi acara.</li>
                  <li>Atau, cari lokasi di peta, lalu <strong>klik lokasi pada peta</strong> atau <strong>tarik pin biru</strong> untuk memindahkannya.</li>
                  <li>Sesuaikan radius menggunakan slider atau preset radius.</li>
                  <li>Pastikan Anda menekan tombol <strong>Simpan Pengaturan</strong> di bagian bawah untuk menyimpan koordinat aktif ke server.</li>
                </ul>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[#012060]">4. Mengatasi Kendala Lokasi Mentor</h4>
                <p>Jika Mentor mendapatkan pesan error "Di luar jangkauan lokasi", sarankan untuk:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Mengaktifkan GPS dengan mode <strong>Akurasi Tinggi</strong> pada perangkat mereka.</li>
                  <li>Membuka Google Maps sejenak untuk memicu penyegaran koordinat GPS perangkat.</li>
                  <li>Menghindari pemindaian di ruang bawah tanah (basement) atau ruangan tertutup rapat.</li>
                </ul>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full bg-[#012060] hover:bg-[#022b80] text-white py-3 rounded-2xl text-label-md font-bold transition-all shadow-sm cursor-pointer text-center"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* Leaflet Controls customization to look sleek and modern */
        .leaflet-bar {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          border-bottom: 1px solid #f1f5f9 !important;
          background-color: #ffffff !important;
          color: #012060 !important;
          transition: background-color 0.2s;
        }
        .leaflet-bar a:hover {
          background-color: #f8fafc !important;
        }
        
        /* Leaflet Popup customization */
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid rgba(0, 0, 0, 0.04) !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip-container {
          display: block !important;
        }
        .leaflet-popup-close-button {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
