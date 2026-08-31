import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { isHadir } from '../../utils/statusHelper';

export default function AdminRiwayat() {
  const { logs, gugus, peserta, deleteLog, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGugus, setSelectedGugus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(''); // Default empty to show all history
  const [activeTab, setActiveTab] = useState('Semua');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Selection states
  const [selectedIds, setSelectedIds] = useState([]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentItems.map(log => log.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    window.confirmAction(`Hapus ${selectedIds.length} log absensi terpilih?`, async () => {
      try {
        await Promise.all(selectedIds.map(id => deleteLog(id)));
        setSelectedIds([]);
        alert("Log absensi terpilih berhasil dihapus.");
      } catch (err) {
        console.error("Gagal menghapus log absensi:", err);
        alert("Gagal menghapus beberapa log absensi.");
      }
    });
  };

  // Get active gugus name from selectedGugus ID
  const selectedGugusObj = gugus.find(g => g.id === selectedGugus);
  const selectedGugusName = selectedGugusObj ? selectedGugusObj.name : '';

  // Filtering logic
  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = log.name.toLowerCase().includes(term) || 
                          log.nim.includes(term) || 
                          log.scanner.toLowerCase().includes(term);
    
    let matchesGugus = true;
    if (selectedGugus !== 'all') {
      matchesGugus = log.gugusName.toLowerCase() === selectedGugusName.toLowerCase();
    }

    const matchesDate = !selectedDate || log.date === selectedDate;

    let matchesTab = true;
    if (activeTab === 'Valid') {
      matchesTab = log.status === 'Valid';
    } else if (activeTab === 'Invalid') {
      matchesTab = log.status !== 'Valid';
    }

    return matchesSearch && matchesGugus && matchesDate && matchesTab;
  });

  const handleExport = (type) => {
    if (filteredLogs.length === 0) {
      alert("Tidak ada data absensi untuk diekspor!");
      return;
    }

    if (type === 'Excel') {
      const data = filteredLogs.map(log => {
        const studentInfo = peserta.find(p => p.id === log.nim);
        const jurusan = studentInfo ? studentInfo.fakultas : '-';
        return {
          'Timestamp': `${log.date} ${log.timestamp}`,
          'NIM': log.nim,
          'Nama Lengkap': log.name,
          'Gugus': log.gugusName,
          'Fakultas / Jurusan': jurusan,
          'Pemindai (Mentor)': log.scanner,
          'Status': log.status
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);

      worksheet['!cols'] = [
        { wch: 22 },
        { wch: 15 },
        { wch: 30 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 12 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Absensi");
      XLSX.writeFile(workbook, `Laporan_Absensi_PKKMB_2026_${selectedDate || 'Semua_Hari'}.xlsx`);
    } 
    else if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("Pop-up diblokir! Izinkan pop-up di browser Anda untuk mencetak PDF.");
        return;
      }

      const html = `
        <html>
          <head>
            <title>Laporan Absensi PKKMB 2026</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1f2937; }
              h1 { font-size: 20px; color: #012060; margin: 0 0 5px 0; }
              .meta { font-size: 13px; color: #4b5563; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 12px; }
              th { background-color: #f3f4f6; color: #374151; font-weight: 600; }
              tr:nth-child(even) { background-color: #f9fafb; }
              .badge { display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
              .valid { background: #d1fae5; color: #065f46; }
              .invalid { background: #fee2e2; color: #991b1b; }
              .footer { margin-top: 30px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            </style>
          </head>
          <body>
            <h1>Laporan Riwayat Kehadiran PKKMB 2026</h1>
            <div class="meta">
              Gugus: ${selectedGugus === 'all' ? 'Semua Gugus' : selectedGugusName} | 
              Tanggal: ${selectedDate || 'Semua Tanggal'} | 
              Kategori: ${activeTab} |
              Total Log: ${filteredLogs.length}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>Nama Peserta</th>
                  <th>NIM</th>
                  <th>Gugus</th>
                  <th>Pemindai</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${filteredLogs.map(log => `
                  <tr>
                    <td>${log.date}</td>
                    <td>${log.timestamp}</td>
                    <td><strong>${log.name}</strong></td>
                    <td>${log.nim}</td>
                    <td>${log.gugusName}</td>
                    <td>${log.scanner}</td>
                    <td>
                      <span class="badge ${log.status === 'Valid' ? 'valid' : 'invalid'}">${log.status}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">
              Dicetak pada: ${new Date().toLocaleString('id-ID')}
            </div>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  // Pagination calculations
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  // Sync quick stats with selected filters
  const filteredPesertaForStats = peserta.filter(p => {
    if (selectedGugus !== 'all') {
      return p.gugusId === selectedGugus;
    }
    return true;
  });
  const totalHadir = filteredPesertaForStats.filter(p => isHadir(p.status)).length;

  const totalInvalid = logs.filter(l => {
    let matchesGugus = true;
    if (selectedGugus !== 'all') {
      matchesGugus = l.gugusName.toLowerCase() === selectedGugusName.toLowerCase();
    }
    const matchesDate = !selectedDate || l.date === selectedDate;
    return l.status !== 'Valid' && matchesGugus && matchesDate;
  }).length;

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header - Fixed to top, properly padded for mobile hamburger menu */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">history</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Riwayat Absensi & Log Scan
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
        
        {/* Top Header Banner & Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-body-lg sm:text-headline-md font-bold text-[#012060]">Laporan Riwayat Kehadiran</h2>
            <p className="text-[11px] sm:text-body-sm text-slate-500 mt-0.5">
              Pantau seluruh log pemindaian QR Code dan data kehadiran mahasiswa secara langsung.
            </p>
          </div>

          <div className="flex flex-row w-full sm:w-auto gap-2.5 shrink-0">
            <button 
              onClick={() => handleExport('PDF')} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-[#012060] px-4 py-2.5 rounded-xl text-label-md font-bold transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px] text-[#012060]">picture_as_pdf</span>
              <span>Ekspor PDF</span>
            </button>
            
            <button 
              onClick={() => handleExport('Excel')} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#012060] hover:bg-[#022b80] text-white px-4 py-2.5 rounded-xl text-label-md font-bold transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* Filters & Quick Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Filter Panel (8 cols on desktop) */}
          <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cari Peserta / NIM</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[18px]">search</span>
                  <input 
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl py-2.5 pl-9 pr-8 text-body-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" 
                    placeholder="Nama atau NIM..." 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Gugus Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gugus</label>
                <div className="relative group">
                  <select 
                    className="w-full appearance-none bg-[#f8fafc] border border-slate-200 rounded-xl py-2.5 pl-3.5 pr-8 text-body-sm font-semibold text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all cursor-pointer" 
                    value={selectedGugus} 
                    onChange={(e) => { setSelectedGugus(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">Semua Gugus</option>
                    {gugus.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                </div>
              </div>

              {/* Date Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal</label>
                <input 
                  className="w-full appearance-none bg-[#f8fafc] border border-slate-200 rounded-xl py-2.5 px-3.5 text-body-sm font-semibold text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all cursor-pointer" 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }} 
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards (4 cols on desktop) */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hadir</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                </div>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-headline-sm sm:text-headline-md font-extrabold text-[#012060] leading-none">{totalHadir}</span>
                <span className="text-[10px] text-slate-400 font-medium">Peserta</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Scan Kendala</span>
                <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                </div>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-headline-sm sm:text-headline-md font-extrabold text-rose-600 leading-none">{totalInvalid}</span>
                <span className="text-[10px] text-rose-400 font-medium">Log</span>
              </div>
            </div>
          </div>

        </div>

        {/* Main Log Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col w-full relative z-10">
          
          {/* Log Table Toolbar & Status Tabs */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#f8fafc]/40">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#012060] text-[20px]">list_alt</span>
                <h3 className="text-body-md sm:text-headline-sm font-bold text-[#012060]">Data Kehadiran ({filteredLogs.length})</h3>
              </div>
              
              {selectedIds.length > 0 && (
                <button 
                  onClick={handleDeleteSelected} 
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200/60"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  <span>Hapus Terpilih ({selectedIds.length})</span>
                </button>
              )}
            </div>

            {/* Status Filter Tabs (Visible on mobile & desktop) */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              {['Semua', 'Valid', 'Invalid'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => { setActiveTab(tab); setCurrentPage(1); }} 
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] sm:text-body-sm font-bold transition-all cursor-pointer ${
                    activeTab === tab 
                      ? 'bg-white shadow-xs text-[#012060]' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* MOBILE VIEW GRID (2 Kolom pada Layar Mobile < md) */}
          <div className="block md:hidden p-3 bg-slate-50/50 border-b border-slate-100">
            {currentItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {currentItems.map((log) => {
                  const isValid = log.status === 'Valid';

                  return (
                    <div 
                      key={log.id} 
                      onClick={() => navigate(`/admin/peserta/${log.nim}`)}
                      className={`bg-white rounded-2xl p-3 shadow-xs border flex flex-col justify-between gap-2.5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden group cursor-pointer active:scale-[0.98] ${
                        isValid 
                          ? 'border-slate-200/80 border-l-4 border-l-emerald-500 hover:border-[#012060]/30' 
                          : 'border-slate-200/80 border-l-4 border-l-rose-500 hover:border-rose-300'
                      }`}
                    >
                      {/* Top Bar: Checkbox + Status Badge */}
                      <div className="flex items-center justify-between gap-1">
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-[#012060] focus:ring-[#012060] accent-[#012060] cursor-pointer shrink-0"
                            checked={selectedIds.includes(log.id)}
                            onChange={(e) => handleSelectOne(log.id, e.target.checked)} 
                          />
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 border flex items-center gap-1 ${
                          isValid 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                            : 'bg-rose-50 text-rose-700 border-rose-200/80'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                          <span>{isValid ? 'Valid' : 'Kendala'}</span>
                        </span>
                      </div>

                      {/* Highlighted Info: Name & NIM Badge */}
                      <div className="overflow-hidden">
                        <h4 className={`text-body-sm font-bold text-slate-800 line-clamp-1 leading-snug group-hover:text-[#012060] transition-colors ${isValid ? '' : 'italic text-slate-600'}`} title={log.name}>
                          {log.name}
                        </h4>
                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[#012060]/5 border border-[#012060]/10">
                          <span className="text-[8px] font-extrabold uppercase text-slate-400">NIM</span>
                          <span className="text-[10px] font-bold text-[#012060] font-mono tracking-tight">{log.nim}</span>
                        </div>
                      </div>

                      {/* Log Timestamp & Scanner */}
                      <div className="text-[10px] space-y-1 text-slate-500 border-t border-slate-100 pt-2 font-medium">
                        <div className="flex items-center gap-1 text-slate-700 font-semibold truncate">
                          <span className="material-symbols-outlined text-[13px] shrink-0 text-[#012060]">schedule</span>
                          <span>{log.timestamp} ({log.date})</span>
                        </div>
                        <div className="truncate text-slate-400 text-[9.5px]">
                          Gugus: <strong className="text-slate-600">{log.gugusName}</strong>
                        </div>
                        <div className="truncate text-slate-400 text-[9.5px]">
                          Oleh: {log.scanner}
                        </div>
                      </div>

                      {/* Geolocation Tag */}
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        {log.latitude && log.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9.5px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/70 truncate w-full transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px] shrink-0">pin_drop</span>
                            <span className="truncate">{log.locationStatus || 'Dalam Area'}</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60 truncate w-full">
                            <span className="material-symbols-outlined text-[13px] shrink-0">location_off</span>
                            <span className="truncate">{log.scanner.startsWith('Admin') ? 'Manual' : 'Tanpa Lokasi'}</span>
                          </span>
                        )}
                      </div>

                      {/* Interactive Action Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => navigate(`/admin/peserta/${log.nim}`)}
                          className="py-1.5 bg-[#012060] hover:bg-[#022b80] active:scale-95 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                          title="Lihat Detail Peserta"
                        >
                          <span className="material-symbols-outlined text-[13px]">visibility</span>
                          <span>Detail</span>
                        </button>

                        <button 
                          onClick={() => {
                            window.confirmAction(`Hapus log absensi untuk ${log.name} (${log.nim})?`, () => {
                              deleteLog(log.id);
                              alert("Log absensi berhasil dihapus.");
                            });
                          }}
                          className="py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors border border-rose-200/60"
                          title="Hapus Log"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-body-sm">
                Tidak ada log absensi ditemukan.
              </div>
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on screen >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100">
                  <th className="py-3.5 px-6 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-[#012060] focus:ring-[#012060] accent-[#012060] cursor-pointer"
                      checked={currentItems.length > 0 && currentItems.every(log => selectedIds.includes(log.id))}
                      onChange={handleSelectAll} 
                    />
                  </th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waktu</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peserta</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gugus</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pemindai</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lokasi Scan</th>
                  <th className="py-3.5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {currentItems.length > 0 ? (
                  currentItems.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => navigate(`/admin/peserta/${log.nim}`)}
                      className="hover:bg-[#012060]/[0.03] transition-all group cursor-pointer"
                    >
                      <td className="py-4 px-6 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-[#012060] focus:ring-[#012060] accent-[#012060] cursor-pointer"
                          checked={selectedIds.includes(log.id)}
                          onChange={(e) => handleSelectOne(log.id, e.target.checked)} 
                        />
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-body-sm font-bold text-slate-800">{log.timestamp}</span>
                          <span className="text-[11px] text-slate-400">{log.date}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col min-w-0">
                          <span className={`text-body-sm font-bold text-slate-800 truncate group-hover:text-[#012060] transition-colors ${log.status === 'Valid' ? '' : 'text-slate-500 italic'}`}>{log.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">NIM: {log.nim}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-label-sm border border-slate-200/60">
                          {log.gugusName}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-body-sm text-slate-700 font-medium">{log.scanner}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold border ${
                          log.status === 'Valid' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'Valid' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        {log.latitude && log.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-label-sm font-bold transition-all bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100"
                            title={`Latitude: ${log.latitude}, Longitude: ${log.longitude}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                            {log.locationStatus || 'Dalam Area'} {log.distanceMeters ? `(${log.distanceMeters}m)` : ''}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-label-sm font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
                            <span className="material-symbols-outlined text-[16px]">location_off</span>
                            {log.scanner.startsWith('Admin') ? 'Manual (Admin)' : 'Tanpa Lokasi'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => navigate(`/admin/peserta/${log.nim}`)}
                            className="p-1.5 text-[#012060] hover:bg-[#012060]/10 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail Peserta"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button 
                            onClick={() => {
                              window.confirmAction(`Hapus log absensi untuk ${log.name} (${log.nim})?`, () => {
                                deleteLog(log.id);
                                alert("Log absensi berhasil dihapus.");
                              });
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Log Absensi"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-10 text-slate-400 text-body-md">Tidak ada log absensi ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#f8fafc]/50">
            <span className="text-[11px] sm:text-body-sm font-medium text-slate-500 text-center sm:text-left">
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} dari {totalItems} log
            </span>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors text-label-sm font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1 border border-slate-200" 
                disabled={currentPage === 1}
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              <span className="px-3 py-1 text-label-sm font-bold text-[#012060] bg-white border border-slate-200 rounded-xl">
                {currentPage} / {totalPages}
              </span>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors text-label-sm font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1 border border-slate-200" 
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
