import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function MentorRiwayat() {
  const { logs, gugus, currentUser, hasMentorNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Get gugus ID and name of current mentor
  const mentorGugusId = currentUser?.gugusId || '';
  const mentorGugusObj = gugus.find(g => g.id === mentorGugusId);
  const mentorGugusName = mentorGugusObj ? mentorGugusObj.name : 'Gugus Saya';

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('Semua');
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filtering logic: Only show logs from mentor's own gugus
  const mentorLogs = logs.filter(log => log.gugusName.toLowerCase() === mentorGugusName.toLowerCase());

  const filteredLogs = mentorLogs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = log.name.toLowerCase().includes(term) || 
                          log.nim.includes(term) || 
                          log.scanner.toLowerCase().includes(term);

    const matchesDate = !selectedDate || log.date === selectedDate;

    let matchesTab = true;
    if (activeTab === 'Valid') {
      matchesTab = log.status === 'Valid';
    } else if (activeTab === 'Invalid') {
      matchesTab = log.status !== 'Valid';
    }

    return matchesSearch && matchesDate && matchesTab;
  });

  const formatDDMMYYYY = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handleExport = (type) => {
    if (filteredLogs.length === 0) {
      alert("Tidak ada data absensi untuk diekspor!");
      return;
    }

    if (type === 'Excel') {
      const data = filteredLogs.map(log => ({
        'Tanggal': formatDDMMYYYY(log.date),
        'Waktu': log.timestamp,
        'NIM': log.nim,
        'Nama Peserta': log.name,
        'Gugus': log.gugusName,
        'Pemindai': log.scanner,
        'Status': log.status
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);

      worksheet['!cols'] = [
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 30 },
        { wch: 15 },
        { wch: 25 },
        { wch: 15 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Absensi");
      XLSX.writeFile(workbook, `Laporan_Absensi_${mentorGugusName.replace(/\s+/g, '_')}_${selectedDate || 'Semua_Hari'}.xlsx`);
    } else if (type === 'PDF') {
      const rowsHtml = filteredLogs.map((log, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${formatDDMMYYYY(log.date)} ${log.timestamp}</td>
          <td>${log.nim}</td>
          <td>${log.name}</td>
          <td>${log.gugusName}</td>
          <td>${log.scanner}</td>
          <td>
            <span class="badge ${log.status === 'Valid' ? 'valid' : 'invalid'}">
              ${log.status}
            </span>
          </td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <title>Laporan Absensi ${mentorGugusName}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1f2937; }
              h1 { font-size: 20px; color: #012060; margin: 0 0 5px 0; }
              .meta { font-size: 13px; color: #4b5563; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 12px; }
              th { background-color: #f3f4f6; color: #374151; font-weight: 600; }
              tr:nth-child(even) { background-color: #f9fafb; }
              .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
              .valid { background: #d1fae5; color: #065f46; }
              .invalid { background: #fee2e2; color: #991b1b; }
              .footer { margin-top: 30px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            </style>
          </head>
          <body>
            <h1>Laporan Riwayat Kehadiran PKKMB 2026</h1>
            <div class="meta">
              Gugus: ${mentorGugusName} | 
              Tanggal Laporan: ${new Date().toLocaleDateString('id-ID')} | 
              Jumlah Data: ${filteredLogs.length}
            </div>
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Waktu Scan</th>
                  <th>NIM</th>
                  <th>Nama Mahasiswa</th>
                  <th>Gugus</th>
                  <th>Pemindai</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <div class="footer">
              Dicetak otomatis oleh Sistem Absensi PKKMB 2026
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

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header - Fixed to top, padded for mobile hamburger menu */}
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-[#012060] text-[22px] sm:text-[24px] shrink-0">history</span>
          <h1 className="text-body-md sm:text-title-md font-bold text-[#012060] font-sans truncate">
            Riwayat Absensi
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
        
        {/* Banner & Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-[#012060]/5 text-[#012060] px-2.5 py-0.5 rounded-full border border-[#012060]/10">
                Rekaman Log {mentorGugusName}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {mentorLogs.length} Total Scan
              </span>
            </div>
            <h2 className="text-body-md sm:text-headline-md font-bold text-[#012060]">Riwayat Absensi</h2>
            <p className="text-[10.5px] sm:text-body-sm text-slate-500 mt-0.5">
              Pantau seluruh catatan log pemindaian QR peserta gugus Anda.
            </p>
          </div>

          <div className="relative w-full sm:w-auto shrink-0">
            <button 
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#012060] hover:bg-[#022b80] active:scale-95 text-white px-3.5 py-2 rounded-xl text-body-sm font-bold transition-all shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Unduh Laporan</span>
            </button>
            
            {showExportDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)}></div>
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white shadow-2xl border border-slate-100 py-1.5 z-50 animate-fade-in">
                  <button 
                    onClick={() => { handleExport('Excel'); setShowExportDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-body-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">table_view</span>
                    <span>Ekspor Excel</span>
                  </button>
                  <button 
                    onClick={() => { handleExport('PDF'); setShowExportDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-body-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-rose-600 text-[18px]">picture_as_pdf</span>
                    <span>Cetak PDF</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Table & Filter Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col w-full relative z-10">
          
          {/* Compact Toolbar (Search, Date Filter, Status Tabs) */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 bg-[#f8fafc]/50">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input 
                className="w-full bg-white border border-slate-200 text-slate-800 text-body-sm font-semibold py-2 pl-8 pr-8 rounded-xl shadow-2xs focus:outline-none focus:border-primary transition-all placeholder:text-slate-400" 
                placeholder="Cari NIM atau Nama..." 
                type="text" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Date Filter & Status Tabs */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white text-slate-800 border border-slate-200 text-body-sm font-semibold py-2 px-3 rounded-xl shadow-2xs focus:outline-none focus:border-primary transition-all"
                />
                {selectedDate && (
                  <button onClick={() => setSelectedDate('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer" title="Bersihkan tanggal">
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                {['Semua', 'Valid', 'Invalid'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === tab 
                        ? 'bg-white text-[#012060] shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MOBILE VIEW GRID (2 Kolom pada Layar Mobile < md) */}
          <div className="block md:hidden p-2.5 bg-slate-50/50 border-b border-slate-100">
            {currentItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {currentItems.map((log) => {
                  const isValid = log.status === 'Valid';
                  return (
                    <div 
                      key={log.id} 
                      className={`bg-white rounded-2xl p-2.5 shadow-xs border flex flex-col justify-between gap-2 transition-all relative overflow-hidden ${
                        isValid ? 'border-l-4 border-l-emerald-500 border-slate-200/80' : 'border-l-4 border-l-rose-500 border-slate-200/80'
                      }`}
                    >
                      {/* Top Bar: Status Badge */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold text-slate-400 font-mono">{log.timestamp}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold shrink-0 border flex items-center gap-1 ${
                          isValid 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                          <span>{log.status}</span>
                        </span>
                      </div>

                      {/* Name & NIM */}
                      <div className="overflow-hidden">
                        <h4 className="text-body-xs font-bold text-slate-800 line-clamp-1 leading-snug" title={log.name}>
                          {log.name}
                        </h4>
                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[#012060]/5 border border-[#012060]/10">
                          <span className="text-[7.5px] font-extrabold uppercase text-slate-400">NIM</span>
                          <span className="text-[9.5px] font-bold text-[#012060] font-mono tracking-tight">{log.nim}</span>
                        </div>
                      </div>

                      {/* Details: Date & Scanner */}
                      <div className="text-[9.5px] space-y-0.5 text-slate-500 border-t border-slate-100 pt-1.5 font-medium">
                        <div className="truncate text-slate-600 font-semibold">
                          📅 {log.date}
                        </div>
                        <div className="truncate text-slate-400 text-[9px]">
                          📷 {log.scanner || 'Pemindai QR'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-body-xs">
                Tidak ada log pemindaian ditemukan.
              </div>
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on screen >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100">
                  <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal & Waktu</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mahasiswa</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIM</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pemindai</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {currentItems.length > 0 ? (
                  currentItems.map((log) => {
                    const isValid = log.status === 'Valid';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-5 text-body-sm font-semibold text-slate-700">
                          {log.date} <span className="text-slate-400 text-[11px] font-mono ml-1">{log.timestamp}</span>
                        </td>
                        <td className="py-3.5 px-5 font-bold text-slate-800 text-body-sm">
                          {log.name}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="text-body-sm font-bold text-[#012060] font-mono bg-[#012060]/5 px-2 py-0.5 rounded-md border border-[#012060]/10">{log.nim}</span>
                        </td>
                        <td className="py-3.5 px-5 text-body-sm text-slate-500 font-medium">
                          {log.scanner}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-bold ${
                            isValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400 text-body-sm">Tidak ada data log absensi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar / Pagination */}
          <div className="p-3 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#f8fafc]/50">
            <span className="text-[11px] sm:text-body-sm font-medium text-slate-500">
              Menampilkan {currentItems.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, filteredLogs.length)} dari {filteredLogs.length} data absensi
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>

                <span className="text-[11px] font-bold text-[#012060] bg-[#012060]/5 border border-[#012060]/10 px-3 py-1 rounded-lg">
                  {currentPage} / {totalPages}
                </span>

                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
