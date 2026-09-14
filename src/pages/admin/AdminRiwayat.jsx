import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { isHadir } from '../../utils/statusHelper';
import { groupLogsByDate, formatDDMMYYYY } from '../../utils/dateHelper';

export default function AdminRiwayat() {
  const { logs, gugus, peserta, deleteLog, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGugus, setSelectedGugus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(''); // Default empty to show all history
  const [activeTab, setActiveTab] = useState('Semua');

  // Accordion collapse state for date groups
  const [openDates, setOpenDates] = useState({});

  const toggleDateOpen = (isoDate) => {
    setOpenDates(prev => ({
      ...prev,
      [isoDate]: prev[isoDate] !== undefined ? !prev[isoDate] : false
    }));
  };

  const isDateOpen = (isoDate, index) => {
    if (openDates[isoDate] !== undefined) {
      return openDates[isoDate];
    }
    return index === 0; // Default: only latest date is open
  };

  // Selection states
  const [selectedIds, setSelectedIds] = useState([]);

  const handleSelectGroupLogs = (groupLogs, checked) => {
    const groupIds = groupLogs.map(log => log.id);
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...groupIds])));
    } else {
      setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
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
                          (log.scanner && log.scanner.toLowerCase().includes(term));
    
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

  // Grouped logs for web view (newest day first)
  const dateGroupsWeb = groupLogsByDate(filteredLogs, true);

  const handleExport = (type) => {
    if (filteredLogs.length === 0) {
      alert("Tidak ada data absensi untuk diekspor!");
      return;
    }

    // Export chronological: oldest day first (Hari 1 -> Hari 2 -> Hari 3)
    const dateGroupsAsc = groupLogsByDate(filteredLogs, false);
    const flatLogsChronological = dateGroupsAsc.flatMap(group => group.logs);

    if (type === 'Excel') {
      // Option B for Admin: Multi-sheet Excel export (1 sheet per date) with Tanggal & Waktu columns
      const workbook = XLSX.utils.book_new();

      dateGroupsAsc.forEach(group => {
        const sheetData = group.logs.map(log => {
          const studentInfo = peserta.find(p => p.id === log.nim);
          const jurusan = studentInfo ? studentInfo.fakultas : '-';
          return {
            'Tanggal': formatDDMMYYYY(log.date),
            'Waktu': log.timestamp,
            'NIM': log.nim,
            'Nama Lengkap': log.name,
            'Gugus': log.gugusName,
            'Fakultas / Jurusan': jurusan,
            'Pemindai (Mentor)': log.scanner,
            'Status': log.status,
            'Lokasi Scan': log.locationStatus || (log.scanner?.startsWith('Admin') ? 'Manual' : 'Tanpa Lokasi')
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(sheetData);

        worksheet['!cols'] = [
          { wch: 14 },
          { wch: 12 },
          { wch: 15 },
          { wch: 30 },
          { wch: 15 },
          { wch: 25 },
          { wch: 20 },
          { wch: 12 },
          { wch: 20 }
        ];

        let sheetName = group.displayDateFormatted.replace(/[:\\/?*\[\]]/g, '');
        if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Absensi");
      });

      XLSX.writeFile(workbook, `Laporan_Absensi_PKKMB_2026_${selectedDate || 'Semua_Hari'}.xlsx`);
    } 
    else if (type === 'PDF') {
      // Single continuous table format sorted chronologically with Tanggal & Waktu columns
      const rowsHtml = flatLogsChronological.map((log, idx) => {
        const location = log.latitude && log.longitude 
          ? (log.locationStatus || 'Dalam Area')
          : (log.scanner?.startsWith('Admin') ? 'Manual' : 'Tanpa Lokasi');

        return `
          <tr>
            <td style="text-align: center; width: 35px;">${idx + 1}</td>
            <td style="width: 80px; font-family: monospace;">${formatDDMMYYYY(log.date)}</td>
            <td style="width: 70px; font-family: monospace;">${log.timestamp}</td>
            <td style="width: 95px; font-family: monospace;">${log.nim}</td>
            <td><strong>${log.name}</strong></td>
            <td style="width: 90px;">${log.gugusName}</td>
            <td style="width: 100px;">${log.scanner}</td>
            <td style="text-align: center; width: 70px;">
              <span class="badge ${log.status === 'Valid' ? 'valid' : 'invalid'}">
                ${log.status}
              </span>
            </td>
            <td style="width: 95px; font-size: 10px;">${location}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <html>
          <head>
            <title>Laporan Absensi PKKMB 2026</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1f2937; line-height: 1.4; }
              h1 { font-size: 20px; color: #012060; margin: 0 0 4px 0; }
              .meta { font-size: 12px; color: #4b5563; margin-bottom: 20px; border-bottom: 2px solid #012060; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 11px; }
              th { background-color: #f8fafc; color: #1e293b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-align: center; }
              .valid { background: #d1fae5; color: #065f46; }
              .invalid { background: #fee2e2; color: #991b1b; }
              .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            </style>
          </head>
          <body>
            <h1>Laporan Riwayat Kehadiran PKKMB 2026</h1>
            <div class="meta">
              Gugus: <strong>${selectedGugus === 'all' ? 'Semua Gugus' : selectedGugusName}</strong> &nbsp;|&nbsp; 
              Filter Tanggal: <strong>${selectedDate ? formatDDMMYYYY(selectedDate) : 'Semua Hari'}</strong> &nbsp;|&nbsp;
              Kategori: <strong>${activeTab}</strong> &nbsp;|&nbsp;
              Dicetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} &nbsp;|&nbsp; 
              Total Absensi: <strong>${flatLogsChronological.length} Data</strong>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: center;">No</th>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>NIM</th>
                  <th>Nama Mahasiswa</th>
                  <th>Gugus</th>
                  <th>Pemindai</th>
                  <th style="text-align: center;">Status</th>
                  <th>Lokasi Scan</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <div class="footer">
              Dicetak otomatis oleh Sistem Absensi PKKMB 2026 (Admin Panel)
            </div>
          </body>
        </html>
      `;

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 1000);
      }, 300);
    }
  };

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
      {/* Header */}
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
      <main className="relative pt-20 px-3 sm:px-4 lg:px-6 max-w-container-max mx-auto space-y-4 sm:space-y-6">
        
        {/* Banner & Action Buttons */}
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
          
          {/* Filter Panel */}
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
                    onChange={(e) => setSearchTerm(e.target.value)} 
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
                    onChange={(e) => setSelectedGugus(e.target.value)}
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
                  onChange={(e) => setSelectedDate(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
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

        {/* Global Toolbar Bar: Bulk Selection & Status Tabs */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#012060] text-[20px]">list_alt</span>
              <h3 className="text-body-md sm:text-headline-sm font-bold text-[#012060]">Total Absensi ({filteredLogs.length})</h3>
            </div>
            
            {selectedIds.length > 0 && (
              <button 
                onClick={handleDeleteSelected} 
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200/60 animate-fade-in"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
                <span>Hapus Terpilih ({selectedIds.length})</span>
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            {['Semua', 'Valid', 'Invalid'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
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

        {/* Grouped Day Accordions */}
        <div className="space-y-4">
          {dateGroupsWeb.length > 0 ? (
            dateGroupsWeb.map((group, groupIdx) => {
              const isOpen = isDateOpen(group.isoDate, groupIdx);
              const isGroupAllSelected = group.logs.length > 0 && group.logs.every(log => selectedIds.includes(log.id));

              return (
                <div key={group.isoDate} className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200">
                  {/* Accordion Header */}
                  <div 
                    onClick={() => toggleDateOpen(group.isoDate)}
                    className="w-full px-4 sm:px-6 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between transition-colors border-b border-slate-100 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className={`material-symbols-outlined text-[#012060] text-[20px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        keyboard_arrow_down
                      </span>
                      
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-primary text-[18px]">calendar_today</span>
                        <h3 className="text-body-sm sm:text-body-md font-bold text-[#012060] truncate">
                          {group.indonesianDate}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#012060]/5 text-[#012060] border border-[#012060]/10">
                        {group.totalValid} Hadir
                      </span>
                      {group.totalInvalid > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                          {group.totalInvalid} Kendala
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div>
                      {/* MOBILE VIEW GRID */}
                      <div className="block md:hidden p-3 bg-slate-50/30 border-b border-slate-100">
                        <div className="grid grid-cols-2 gap-2.5">
                          {group.logs.map((log) => {
                            const isValid = log.status === 'Valid';

                            return (
                              <div 
                                key={log.id} 
                                onClick={() => navigate(`/admin/peserta/${log.nim}`)}
                                className={`bg-white rounded-2xl p-2.5 shadow-xs border flex flex-col justify-between gap-2 hover:shadow-md transition-all relative overflow-hidden group cursor-pointer ${
                                  isValid 
                                    ? 'border-slate-200/80 border-l-4 border-l-emerald-500' 
                                    : 'border-slate-200/80 border-l-4 border-l-rose-500'
                                }`}
                              >
                                {/* Top Bar: Checkbox + Status Badge */}
                                <div className="flex items-center justify-between gap-1">
                                  <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                    <input 
                                      type="checkbox" 
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#012060] focus:ring-[#012060] accent-[#012060] cursor-pointer"
                                      checked={selectedIds.includes(log.id)}
                                      onChange={(e) => handleSelectOne(log.id, e.target.checked)} 
                                    />
                                  </div>

                                  <span className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold shrink-0 border flex items-center gap-1 ${
                                    isValid 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                    <span>{isValid ? 'Valid' : 'Kendala'}</span>
                                  </span>
                                </div>

                                {/* Name & NIM */}
                                <div className="overflow-hidden">
                                  <h4 className="text-body-xs font-bold text-slate-800 line-clamp-1 leading-snug group-hover:text-[#012060] transition-colors" title={log.name}>
                                    {log.name}
                                  </h4>
                                  <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[#012060]/5 border border-[#012060]/10">
                                    <span className="text-[7.5px] font-extrabold uppercase text-slate-400">NIM</span>
                                    <span className="text-[9.5px] font-bold text-[#012060] font-mono tracking-tight">{log.nim}</span>
                                  </div>
                                </div>

                                {/* Details: Time & Gugus */}
                                <div className="text-[9.5px] space-y-0.5 text-slate-500 border-t border-slate-100 pt-1.5 font-medium">
                                  <div className="flex items-center gap-1 text-slate-700 font-semibold truncate">
                                    <span className="material-symbols-outlined text-[13px] shrink-0 text-[#012060]">schedule</span>
                                    <span>{log.timestamp}</span>
                                  </div>
                                  <div className="truncate text-slate-400 text-[9px]">
                                    Gugus: <strong className="text-slate-600">{log.gugusName}</strong>
                                  </div>
                                  <div className="truncate text-slate-400 text-[9px]">
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
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/70 truncate w-full transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[12px] shrink-0">pin_drop</span>
                                      <span className="truncate">{log.locationStatus || 'Dalam Area'}</span>
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60 truncate w-full">
                                      <span className="material-symbols-outlined text-[12px] shrink-0">location_off</span>
                                      <span className="truncate">{log.scanner?.startsWith('Admin') ? 'Manual' : 'Tanpa Lokasi'}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => navigate(`/admin/peserta/${log.nim}`)}
                                    className="py-1 bg-[#012060] text-white rounded-lg text-[9px] font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                                    title="Lihat Detail"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      window.confirmAction(`Hapus log absensi untuk ${log.name}?`, () => {
                                        deleteLog(log.id);
                                        alert("Log absensi berhasil dihapus.");
                                      });
                                    }}
                                    className="py-1 bg-rose-50 text-rose-700 rounded-lg text-[9px] font-bold flex items-center justify-center gap-0.5 cursor-pointer border border-rose-200/60"
                                    title="Hapus Log"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">delete</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* DESKTOP TABLE VIEW */}
                      <div className="hidden md:block w-full overflow-hidden">
                        <table className="w-full text-left border-collapse table-fixed">
                          <colgroup>
                            <col className="w-[3.5%]" />
                            <col className="w-[10%]" />
                            <col className="w-[26%]" />
                            <col className="w-[15%]" />
                            <col className="w-[11%]" />
                            <col className="w-[9.5%]" />
                            <col className="w-[16%]" />
                            <col className="w-[9%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                              <th className="py-2.5 px-1.5 text-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-slate-300 text-[#012060] focus:ring-[#012060] accent-[#012060] cursor-pointer"
                                  checked={isGroupAllSelected}
                                  onChange={(e) => handleSelectGroupLogs(group.logs, e.target.checked)} 
                                  title="Pilih semua log pada tanggal ini"
                                />
                              </th>
                              <th className="py-2.5 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Waktu</th>
                              <th className="py-2.5 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Peserta</th>
                              <th className="py-2.5 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Gugus</th>
                              <th className="py-2.5 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Pemindai</th>
                              <th className="py-2.5 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Status</th>
                              <th className="py-2.5 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Lokasi Scan</th>
                              <th className="py-2.5 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {group.logs.map((log) => (
                              <tr 
                                key={log.id} 
                                onClick={() => navigate(`/admin/peserta/${log.nim}`)}
                                className="hover:bg-[#012060]/[0.03] transition-all group cursor-pointer"
                              >
                                <td className="py-2.5 px-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-300 text-[#012060] focus:ring-[#012060] accent-[#012060] cursor-pointer"
                                    checked={selectedIds.includes(log.id)}
                                    onChange={(e) => handleSelectOne(log.id, e.target.checked)} 
                                  />
                                </td>
                                <td className="py-2.5 px-1.5 truncate">
                                  <span className="text-[11.5px] font-bold text-slate-700 font-mono block truncate">{log.timestamp}</span>
                                </td>
                                <td className="py-2.5 px-1.5 truncate">
                                  <div className="flex flex-col min-w-0 truncate">
                                    <span className={`text-[11.5px] font-bold text-slate-800 truncate group-hover:text-[#012060] transition-colors ${log.status === 'Valid' ? '' : 'text-slate-500 italic'}`} title={log.name}>{log.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono truncate">NIM: {log.nim}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-1.5 truncate">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200/60 max-w-full truncate" title={log.gugusName}>
                                    <span className="truncate">{log.gugusName}</span>
                                  </span>
                                </td>
                                <td className="py-2.5 px-1.5 truncate">
                                  <span className="text-[11px] text-slate-700 font-medium truncate block" title={log.scanner}>{log.scanner}</span>
                                </td>
                                <td className="py-2.5 px-1.5 truncate">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border max-w-full truncate ${
                                    log.status === 'Valid' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'Valid' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                    <span className="truncate">{log.status}</span>
                                  </span>
                                </td>
                                <td className="py-2.5 px-1.5 truncate" onClick={(e) => e.stopPropagation()}>
                                  {log.latitude && log.longitude ? (
                                    <a
                                      href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100 max-w-full truncate"
                                      title={`Latitude: ${log.latitude}, Longitude: ${log.longitude}`}
                                    >
                                      <span className="material-symbols-outlined text-[13px] shrink-0">pin_drop</span>
                                      <span className="truncate">{log.locationStatus || 'Dalam Area'} {log.distanceMeters ? `(${log.distanceMeters}m)` : ''}</span>
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60 max-w-full truncate">
                                      <span className="material-symbols-outlined text-[13px] shrink-0">location_off</span>
                                      <span className="truncate">{log.scanner?.startsWith('Admin') ? 'Manual' : 'Tanpa Lokasi'}</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-1.5 text-right truncate" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-0.5">
                                    <button 
                                      onClick={() => navigate(`/admin/peserta/${log.nim}`)}
                                      className="p-1 text-[#012060] hover:bg-[#012060]/10 rounded-lg transition-colors cursor-pointer"
                                      title="Lihat Detail Peserta"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                                    </button>
                                    <button 
                                      onClick={() => {
                                        window.confirmAction(`Hapus log absensi untuk ${log.name} (${log.nim})?`, () => {
                                          deleteLog(log.id);
                                          alert("Log absensi berhasil dihapus.");
                                        });
                                      }}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Hapus Log Absensi"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-12 text-center text-slate-400 text-body-md border border-slate-100 shadow-sm">
              Tidak ada log absensi ditemukan.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
