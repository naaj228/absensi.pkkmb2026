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
  const mentorGugusName = mentorGugusObj ? mentorGugusObj.name : '';

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('Semua');
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

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

  const handleExport = (type) => {
    if (filteredLogs.length === 0) {
      alert("Tidak ada data absensi untuk diekspor!");
      return;
    }

    if (type === 'Excel') {
      const data = filteredLogs.map(log => ({
        'Tanggal': log.date,
        'Waktu': log.timestamp,
        'NIM': log.nim,
        'Nama Peserta': log.name,
        'Gugus': log.gugusName,
        'Pemindai': log.scanner,
        'Status': log.status
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);

      // Set column widths for neat appearance
      worksheet['!cols'] = [
        { wch: 15 }, // Tanggal
        { wch: 12 }, // Waktu
        { wch: 15 }, // NIM
        { wch: 30 }, // Nama Peserta
        { wch: 15 }, // Gugus
        { wch: 25 }, // Pemindai
        { wch: 15 }  // Status
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Absensi");
      XLSX.writeFile(workbook, `Laporan_Absensi_${mentorGugusName.replace(/\s+/g, '_')}_${selectedDate || 'Semua_Hari'}.xlsx`);
    } else if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("Pop-up diblokir! Izinkan pop-up di browser Anda untuk mencetak PDF.");
        return;
      }

      const rowsHtml = filteredLogs.map((log, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${log.date} ${log.timestamp}</td>
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
              h1 { font-size: 20px; color: #0d1b4d; margin: 0 0 5px 0; }
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
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="w-full">
      {/* Header */}
      <header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <h1 className="text-headline-sm font-headline-md text-on-surface">Riwayat Kehadiran</h1>
        <div className="flex items-center gap-6">
          <div className="relative">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/mentor/notifikasi')}>notifications</span>
            {hasMentorNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white" />}
          </div>
        </div>
      </header>

      <main className="relative pt-24 min-h-screen px-margin-desktop py-gutter max-w-5xl mx-auto">
        <div className="flex flex-col w-full gap-gutter relative">
          <div className="flex items-center justify-between w-full relative z-20">
            <div className="flex flex-col gap-unit">
              <span className="font-label-md text-label-md text-primary tracking-[0.1em] uppercase bg-primary-fixed w-max px-3 py-1 rounded-full shadow-sm">
                Rekaman Log {mentorGugusName}
              </span>
              <h2 className="font-display-lg text-display-lg text-on-background relative">
                Riwayat Absensi
              </h2>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 bg-primary text-on-primary hover:bg-primary/95 transition-transform hover:scale-105 px-5 py-3 rounded-xl shadow-[0_8px_16px_-6px_rgba(0,4,35,0.4)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span className="text-label-md font-label-md">Unduh Laporan</span>
              </button>
              
              {showExportDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-surface-container-lowest shadow-2xl border border-outline-variant/30 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <button 
                      onClick={() => { handleExport('Excel'); setShowExportDropdown(false); }}
                      className="w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-3 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-green-600 text-[20px]">table_view</span>
                      Ekspor Excel
                    </button>
                    <button 
                      onClick={() => { handleExport('PDF'); setShowExportDropdown(false); }}
                      className="w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-3 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-red-600 text-[20px]">picture_as_pdf</span>
                      Cetak PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-surface-container shadow-xl rounded-2xl w-full flex flex-col relative overflow-hidden z-10">
            {/* Search & Filter Toolbar */}
            <div className="bg-surface-container-high px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative w-full md:w-[350px]">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input 
                  className="w-full bg-surface text-on-surface font-body-md text-body-md py-3 pl-12 pr-4 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50" 
                  placeholder="Cari berdasarkan NIM atau Nama..." 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                />
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                  className="bg-surface text-on-surface border border-outline-variant/30 font-body-md text-body-md py-2.5 px-4 rounded-xl shadow-sm focus:outline-none"
                />
                <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/20 shadow-inner">
                  {['Semua', 'Valid', 'Invalid'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                      className={`font-label-md text-label-md px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeTab === tab ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="w-full overflow-x-auto lg:overflow-visible">
              <table className="w-full text-left table-auto">
                <thead className="bg-surface-container-highest">
                  <tr>
                    <th className="px-4 py-3.5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tanggal & Waktu</th>
                    <th className="px-4 py-3.5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nama Peserta</th>
                    <th className="px-4 py-3.5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">NIM</th>
                    <th className="px-4 py-3.5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Pemindai</th>
                    <th className="px-4 py-3.5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-surface-container">
                  {currentItems.length > 0 ? (
                    currentItems.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container-high transition-colors">
                        <td className="px-4 py-4 font-body-sm text-body-sm text-on-surface">
                          {log.date} <span className="text-on-surface-variant ml-1">{log.timestamp}</span>
                        </td>
                        <td className="px-4 py-4 font-headline-sm text-body-md text-on-surface font-semibold">
                          {log.name}
                        </td>
                        <td className="px-4 py-4 font-body-md text-body-md text-on-surface font-mono">{log.nim}</td>
                        <td className="px-4 py-4 font-body-sm text-body-sm text-on-surface-variant">{log.scanner}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm font-semibold ${
                            log.status === 'Valid' ? 'bg-green-500/15 text-green-700' : 'bg-red-500/15 text-red-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'Valid' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-on-surface-variant">Tidak ada riwayat pemindaian.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Total Footer */}
            <div className="bg-surface-container-high px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/10">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Menampilkan {currentItems.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, filteredLogs.length)} dari {filteredLogs.length} data absensi
              </span>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 rounded-lg bg-surface border border-outline-variant/30 text-on-surface hover:bg-surface-container-high disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="font-label-md text-label-md px-4 py-2.5 bg-primary text-on-primary rounded-lg shadow-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-2 rounded-lg bg-surface border border-outline-variant/30 text-on-surface hover:bg-surface-container-high disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
