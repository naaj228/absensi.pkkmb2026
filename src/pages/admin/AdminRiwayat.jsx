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

      // Set column widths to prevent truncation (similar to Google Sheets)
      worksheet['!cols'] = [
        { wch: 22 }, // Timestamp (YYYY-MM-DD HH:MM:SS)
        { wch: 15 }, // NIM
        { wch: 30 }, // Nama Lengkap
        { wch: 15 }, // Gugus
        { wch: 25 }, // Fakultas / Jurusan
        { wch: 20 }, // Pemindai (Mentor)
        { wch: 12 }  // Status
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
              h1 { font-size: 20px; color: #4f46e5; margin: 0 0 5px 0; }
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
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Riwayat</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>{hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div></div></header><main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full relative">
{/* Header Section */}
<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 relative z-10">
<div className="flex flex-col">
<h2 className="font-headline-lg text-headline-lg text-on-background mb-2">Riwayat Absensi</h2>
</div>
{/* Action Buttons */}
<div className="flex gap-4 shrink-0">
<button onClick={() => handleExport('PDF')} className="group flex items-center gap-2 bg-surface text-primary border border-outline-variant px-5 py-2.5 rounded-xl hover:bg-primary/5 transition-all shadow-sm cursor-pointer">
<span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-y-1">picture_as_pdf</span>
<span className="font-label-md text-label-md">Ekspor PDF</span>
</button>
<button onClick={() => handleExport('Excel')} className="group flex items-center gap-2 bg-[#1A73E8] text-white px-5 py-2.5 rounded-xl hover:bg-[#1A73E8]/90 transition-all shadow-md shadow-[#1A73E8]/20 cursor-pointer">
<span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-y-1">table</span>
<span className="font-label-md text-label-md">Ekspor Excel</span>
</button>
</div>
</div>
{/* Filters & Metrics Grid */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 relative z-10">
{/* Filter Panel (Spans 8 cols) */}
<div className="lg:col-span-8 bg-surface-container rounded-2xl p-6 shadow-sm">
<div className="flex flex-col md:flex-row gap-6">
{/* Search */}
<div className="flex-1">
<label className="font-label-md text-label-md text-on-surface block mb-3">Pencarian</label>
<div className="relative group">
<span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">search</span>
<input className="w-full bg-surface border border-outline-variant rounded-xl py-3 pl-12 pr-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="Nama atau NIM..." type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
</div>
</div>
{/* Filters Grid */}
<div className="flex-1 grid grid-cols-2 gap-4">
{/* Gugus Filter */}
<div>
<label className="font-label-md text-label-md text-on-surface block mb-3">Gugus</label>
<div className="relative group">
<select className="w-full appearance-none bg-surface border border-outline-variant rounded-xl py-3 pl-4 pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer" value={selectedGugus} onChange={(e) => { setSelectedGugus(e.target.value); setCurrentPage(1); }}>
<option value="all">Semua Gugus</option>
{gugus.map(g => (
  <option key={g.id} value={g.id}>{g.name}</option>
))}
</select>
<span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none group-focus-within:text-primary transition-colors">expand_more</span>
</div>
</div>
{/* Date Filter */}
<div>
<label className="font-label-md text-label-md text-on-surface block mb-3">Tanggal</label>
<div className="relative group">
<input className="w-full appearance-none bg-surface border border-outline-variant rounded-xl py-3 pl-4 pr-4 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer" type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }} />
</div>
</div>
</div>
</div>
</div>
{/* Quick Stats (Spans 4 cols) */}
<div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
<div className="bg-surface-container rounded-2xl p-5 shadow-sm flex flex-col justify-between">
<div className="flex justify-between items-start mb-4">
<span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Hadir</span>
<div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
<span className="material-symbols-outlined text-on-secondary-container text-[16px]">how_to_reg</span>
</div>
</div>
<div className="flex items-end gap-2">
<span className="font-headline-lg text-headline-lg text-on-surface leading-none">{totalHadir}</span>
</div>
</div>
<div className="bg-surface-container rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
<svg className="absolute bottom-0 left-0 w-full h-1/2 opacity-20" preserveAspectRatio="none" viewBox="0 0 100 40">
<path className="text-error" d="M0 40 L0 30 Q 10 20 20 25 T 40 15 T 60 20 T 80 5 T 100 10 L100 40 Z" fill="currentColor"></path>
</svg>
<div className="flex justify-between items-start mb-4 relative z-10">
<span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Scan Tidak Valid</span>
<div className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center">
<span className="material-symbols-outlined text-on-error-container text-[16px]">warning</span>
</div>
</div>
<div className="flex items-end gap-2 relative z-10">
<span className="font-headline-lg text-headline-lg text-error leading-none">{totalInvalid}</span>
</div>
</div>
</div>
</div>
{/* Main Table Section */}
<div className="bg-surface rounded-3xl shadow-lg shadow-primary/5 overflow-hidden flex flex-col relative z-10">
{/* Table Header Toolbar */}
<div className="px-6 py-5 border-b border-surface-variant flex justify-between items-center bg-surface-container-lowest">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary">list_alt</span>
<h3 className="font-headline-sm text-headline-sm text-on-surface">Data Kehadiran</h3>
</div>
{/* Status Tabs */}
<div className="hidden sm:flex bg-surface-container-low rounded-lg p-1">
<button onClick={() => { setActiveTab('Semua'); setCurrentPage(1); }} className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-all ${
  activeTab === 'Semua' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
}`}>Semua</button>
<button onClick={() => { setActiveTab('Valid'); setCurrentPage(1); }} className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-all ${
  activeTab === 'Valid' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
}`}>Valid</button>
<button onClick={() => { setActiveTab('Invalid'); setCurrentPage(1); }} className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-all ${
  activeTab === 'Invalid' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
}`}>Invalid</button>
</div>
</div>
{/* Desktop View: Table */}
<div className="hidden md:block overflow-x-auto">
<table className="w-full text-left border-collapse min-w-[900px]">
<thead>
<tr className="bg-surface-container-low">
<th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Waktu</th>
<th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Peserta</th>
<th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Gugus</th>
<th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Pemindai</th>
<th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
<th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Lokasi Scan</th>
<th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
</tr>
</thead>
<tbody className="bg-surface divide-y divide-surface-variant">
  {currentItems.length > 0 ? (
    currentItems.map((log) => (
      <tr key={log.id} className="hover:bg-surface-container-lowest transition-colors group cursor-pointer">
      <td className="py-4 px-6">
      <div className="flex flex-col">
      <span className="font-body-md text-body-md text-on-surface font-medium">{log.timestamp}</span>
      <span className="font-body-sm text-body-sm text-on-surface-variant">{log.date}</span>
      </div>
      </td>
      <td className="py-4 px-6">
      <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        log.status === 'Valid' ? 'bg-primary-fixed-dim/20 text-primary font-bold' : 'bg-error-container text-error'
      }`}>
        {log.status === 'Valid' ? log.name.substring(0, 2).toUpperCase() : <span className="material-symbols-outlined text-[20px]">qr_code</span>}
      </div>
      <div className="flex flex-col min-w-0">
      <span className={`font-body-md text-body-md text-on-surface font-medium truncate ${log.status === 'Valid' ? '' : 'text-on-surface-variant italic'}`}>{log.name}</span>
      <span className="font-body-sm text-body-sm text-on-surface-variant font-mono text-[13px]">NIM: {log.nim}</span>
      </div>
      </div>
      </td>
      <td className="py-4 px-6">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-container/20 text-on-secondary-container font-label-sm text-label-sm">
                      {log.gugusName}
                    </span>
      </td>
      <td className="py-4 px-6">
      <div className="flex flex-col">
      <span className="font-body-sm text-body-sm text-on-surface">{log.scanner}</span>
      </div>
      </td>
      <td className="py-4 px-6">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md ${
        log.status === 'Valid' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-error-container text-on-error-container'
      }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {log.status}
                    </span>
      </td>
      <td className="py-4 px-6">
        {log.latitude && log.longitude ? (
          <a
            href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-label-sm font-medium transition-all bg-green-500/10 text-green-700 hover:bg-green-500/20"
            title={`Latitude: ${log.latitude}, Longitude: ${log.longitude}`}
          >
            <span className="material-symbols-outlined text-[16px]">pin_drop</span>
            {log.locationStatus || 'Dalam Area'} {log.distanceMeters ? `(${log.distanceMeters}m)` : ''}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-label-sm font-medium bg-slate-500/10 text-slate-600">
            <span className="material-symbols-outlined text-[16px]">location_off</span>
            {log.scanner.startsWith('Admin') ? 'Manual (Admin)' : 'Tanpa Lokasi'}
          </span>
        )}
      </td>
      <td className="py-4 px-6 text-right relative">
        <div className="flex items-center justify-end gap-1">
          <button 
            onClick={() => navigate(`/admin/peserta/${log.nim}`)}
            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
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
            className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
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
      <td colSpan="6" className="text-center py-10 text-on-surface-variant">Tidak ada log.</td>
    </tr>
  )}
</tbody>
</table>
</div>

{/* Mobile View: Card List */}
<div className="block md:hidden space-y-4 p-4">
  {currentItems.length > 0 ? (
    currentItems.map((log) => (
      <div key={log.id} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/40 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
              log.status === 'Valid' ? 'bg-primary-fixed-dim/20 text-primary' : 'bg-error-container text-error'
            }`}>
              {log.status === 'Valid' ? log.name.substring(0, 2).toUpperCase() : <span className="material-symbols-outlined text-[20px]">qr_code</span>}
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-on-surface truncate ${log.status === 'Valid' ? '' : 'text-on-surface-variant italic'}`}>{log.name}</p>
              <p className="text-label-sm text-on-surface-variant font-mono">NIM: {log.nim}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-semibold shrink-0 ${
            log.status === 'Valid' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-error-container text-on-error-container'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            {log.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-b border-outline-variant/20 py-2.5 my-1 text-body-sm text-on-surface-variant">
          <div>
            <span className="text-label-sm text-on-surface-variant/60 block mb-0.5">Waktu Scan</span>
            <span className="text-on-surface font-medium block leading-tight">{log.date}</span>
            <span className="text-label-sm text-on-surface-variant/60 font-medium block mt-0.5">{log.timestamp}</span>
          </div>
          <div>
            <span className="text-label-sm text-on-surface-variant/60 block mb-0.5">Gugus & Pemindai</span>
            <span className="text-on-surface font-medium block truncate">{log.gugusName}</span>
            <span className="text-label-sm text-on-surface-variant/60 font-medium block mt-0.5 truncate">Oleh: {log.scanner}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-body-sm">
          <div>
            {log.latitude && log.longitude ? (
              <a
                href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-label-sm font-medium transition-all bg-green-500/10 text-green-700 hover:bg-green-500/20"
                title={`Latitude: ${log.latitude}, Longitude: ${log.longitude}`}
              >
                <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                {log.locationStatus || 'Dalam Area'} {log.distanceMeters ? `(${log.distanceMeters}m)` : ''}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-label-sm font-medium bg-slate-500/10 text-slate-600">
                <span className="material-symbols-outlined text-[14px]">location_off</span>
                {log.scanner.startsWith('Admin') ? 'Manual' : 'Tanpa Lokasi'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => navigate(`/admin/peserta/${log.nim}`)}
              className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
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
              className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
              title="Hapus Log Absensi"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      </div>
    ))
  ) : (
    <div className="text-center py-10 text-on-surface-variant text-body-md bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/60">Tidak ada log.</div>
  )}
</div>
{/* Pagination Footer */}
<div className="px-6 py-4 border-t border-surface-variant bg-surface-container-lowest flex items-center justify-between">
<span className="font-body-sm text-body-sm text-on-surface-variant">Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} dari {totalItems} log</span>
<div className="flex items-center gap-2">
<button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="w-8 h-8 rounded-lg border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-variant hover:text-on-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled={currentPage === 1}>
<span className="material-symbols-outlined text-[20px]">chevron_left</span>
</button>
{Array.from({ length: totalPages }).map((_, i) => (
  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg font-label-md text-label-md flex items-center justify-center transition-colors ${
    currentPage === i + 1 ? 'bg-primary text-on-primary font-bold' : 'border border-outline-variant text-on-surface hover:bg-surface-variant'
  }`}>{i + 1}</button>
))}
<button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="w-8 h-8 rounded-lg border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-variant hover:text-on-surface disabled:opacity-50 transition-colors" disabled={currentPage === totalPages}>
<span className="material-symbols-outlined text-[20px]">chevron_right</span>
</button>
</div>
</div>
</div>
</div></main></div>
  );
}
