import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { isHadir, getLogDisplayStatus } from '../../utils/statusHelper';
import { groupLogsByDate, formatDDMMYYYY } from '../../utils/dateHelper';

export default function MentorRiwayat() {
  const { logs, gugus, peserta, currentUser, hasMentorNotifications } = useContext(AppContext);
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

  // Filtering logic: Only show logs from mentor's own gugus
  const mentorLogs = logs.filter(log => log.gugusName.toLowerCase() === mentorGugusName.toLowerCase());
  const mentorPeserta = peserta.filter(p => {
    const pGugus = gugus.find(g => g.id === p.gugusId);
    return pGugus && pGugus.name.toLowerCase() === mentorGugusName.toLowerCase();
  });

  // Generate synthetic "Belum Hadir" / "Alpha" logs for active dates in mentor's gugus
  const activeDates = Array.from(new Set(mentorLogs.map(l => l.date).filter(Boolean)));
  const belumHadirLogs = [];

  activeDates.forEach(dateStr => {
    const logsOnDate = mentorLogs.filter(l => l.date === dateStr);
    const scannedNimsOnDate = new Set(logsOnDate.map(l => String(l.nim)));

    mentorPeserta.forEach(p => {
      if (!scannedNimsOnDate.has(String(p.id))) {
        const isAlphaStatus = p.status === 'Alpha';
        belumHadirLogs.push({
          id: `belum_hadir_${p.id}_${dateStr}`,
          nim: p.id,
          name: p.name,
          gugusId: p.gugusId,
          gugusName: mentorGugusName,
          date: dateStr,
          timestamp: '--:--',
          scanner: '-',
          status: isAlphaStatus ? 'Alpha' : 'Belum Hadir',
          note: isAlphaStatus ? 'Tanpa Keterangan (Alpha)' : 'Belum Melakukan Absensi',
          isBelumHadir: !isAlphaStatus,
          isAlpha: isAlphaStatus
        });
      }
    });
  });

  const combinedLogs = [...mentorLogs, ...belumHadirLogs];

  const filteredLogs = combinedLogs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = log.name.toLowerCase().includes(term) ||
      log.nim.includes(term) ||
      (log.scanner && log.scanner.toLowerCase().includes(term));

    const matchesDate = !selectedDate || log.date === selectedDate;

    let matchesTab = true;
    const displayStatus = getLogDisplayStatus(log);
    if (activeTab === 'Hadir Penuh') {
      matchesTab = displayStatus.label === 'Hadir Penuh';
    } else if (activeTab === 'Hadir Sebagian') {
      matchesTab = displayStatus.label === 'Hadir Sebagian';
    } else if (activeTab === 'Izin') {
      matchesTab = displayStatus.label === 'Izin';
    } else if (activeTab === 'Alpha') {
      matchesTab = displayStatus.label === 'Alpha';
    } else if (activeTab === 'Scan Gagal' || activeTab === 'Invalid') {
      matchesTab = displayStatus.label === 'Scan Gagal';
    } else if (activeTab === 'Belum Hadir') {
      matchesTab = displayStatus.label === 'Belum Hadir';
    }

    return matchesSearch && matchesDate && matchesTab;
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
      // Option A for Mentor: Single sheet flat list, chronological order
      const data = flatLogsChronological.map(log => {
        const displayStatus = getLogDisplayStatus(log);
        return {
          'Tanggal': formatDDMMYYYY(log.date),
          'Waktu': log.timestamp,
          'NIM': log.nim,
          'Nama Peserta': log.name,
          'Gugus': log.gugusName,
          'Pemindai': log.scanner,
          'Status': displayStatus.label
        };
      });

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
    }
    else if (type === 'PDF') {
      // Clean single table PDF format sorted chronologically
      const rowsHtml = flatLogsChronological.map((log, idx) => {
        const displayStatus = getLogDisplayStatus(log);
        return `
          <tr>
            <td style="text-align: center; width: 30px;">${idx + 1}</td>
            <td style="width: 75px; font-family: monospace;">${formatDDMMYYYY(log.date)}</td>
            <td style="width: 65px; font-family: monospace;">${log.timestamp}</td>
            <td style="width: 90px; font-family: monospace;">${log.nim}</td>
            <td><strong>${log.name}</strong></td>
            <td style="width: 95px;">${log.scanner}</td>
            <td style="text-align: center; width: 95px;">
              <span class="badge" style="${displayStatus.pdfBadge}">
                ${displayStatus.label}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Laporan Absensi ${mentorGugusName}</title>
            <style>
              @page { margin: 0; size: auto; }
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 15mm 12mm; color: #1f2937; line-height: 1.4; }
              h1 { font-size: 18px; font-weight: 800; color: #012060; margin: 0 0 14px 0; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 6px; }
              th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; font-size: 10.5px; }
              th { background-color: #012060; color: #ffffff; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; font-weight: 700; text-align: center; }
            </style>
          </head>
          <body>
            <h1>Laporan Riwayat Kehadiran PKKMB 2026 — ${mentorGugusName}</h1>
            <table>
              <thead>
                <tr>
                  <th style="text-align: center; width: 30px;">No</th>
                  <th style="width: 75px;">Tanggal</th>
                  <th style="width: 65px;">Waktu</th>
                  <th style="width: 90px;">NIM</th>
                  <th>Nama Mahasiswa</th>
                  <th style="width: 95px;">Pemindai</th>
                  <th style="text-align: center; width: 95px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
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

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen pb-16">
      {/* Header */}
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

        {/* Toolbar (Search, Date Filter, Status Tabs) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
            <input
              className="w-full bg-[#f8fafc] border border-slate-200 text-slate-800 text-body-sm font-semibold py-2 pl-8 pr-8 rounded-xl focus:outline-none focus:border-primary transition-all placeholder:text-slate-400"
              placeholder="Cari NIM atau Nama..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>

          {/* Date Filter & Status Tabs */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial min-w-[160px]">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[#f8fafc] text-slate-800 border border-slate-200 text-body-sm font-semibold py-2 pl-3.5 pr-9 rounded-xl focus:outline-none focus:border-primary transition-all cursor-pointer"
              />
              {!selectedDate && (
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-body-sm font-medium pointer-events-none">
                  dd/mm/yyyy
                </span>
              )}
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer bg-[#f8fafc] rounded-full z-10 transition-colors flex items-center justify-center"
                  title="Bersihkan tanggal"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Status Filter Dropdown Box */}
            <div className="relative group shrink-0 w-full sm:w-auto">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-[#f8fafc] border border-slate-200 rounded-xl py-2 px-3.5 pr-8 text-body-sm font-bold text-[#012060] focus:outline-none focus:border-primary transition-all cursor-pointer shadow-xs"
              >
                <option value="Semua">Status: Semua</option>
                <option value="Hadir Penuh">✅ Hadir Penuh</option>
                <option value="Hadir Sebagian">🟡 Hadir Sebagian</option>
                <option value="Izin">📄 Izin</option>
                <option value="Alpha">❌ Alpha</option>
                <option value="Belum Hadir">⚪ Belum Hadir</option>
                <option value="Scan Gagal">⚠️ Scan Gagal</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
            </div>
          </div>
        </div>

        {/* Grouped Day Accordions */}
        <div className="space-y-4">
          {dateGroupsWeb.length > 0 ? (
            dateGroupsWeb.map((group, groupIdx) => {
              const isOpen = isDateOpen(group.isoDate, groupIdx);

              return (
                <div key={group.isoDate} className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200">
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleDateOpen(group.isoDate)}
                    className="w-full px-4 sm:px-6 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between transition-colors border-b border-slate-100 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
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
                      {group.totalHadir > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#012060]/5 text-[#012060] border border-[#012060]/10">
                          {group.totalHadir} Hadir
                        </span>
                      )}
                      {(group.totalBelumHadir || group.totalInvalid) > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                          {group.totalBelumHadir || group.totalInvalid} Belum Hadir
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div>
                      {/* MOBILE VIEW GRID */}
                      <div className="block md:hidden p-3 bg-slate-50/30">
                        <div className="grid grid-cols-2 gap-2.5">
                          {group.logs.map((log) => {
                            const isValid = log.status === 'Valid';
                            return (
                              <div
                                key={log.id}
                                className={`bg-white rounded-2xl p-2.5 shadow-xs border flex flex-col justify-between gap-2 relative overflow-hidden ${isValid ? 'border-l-4 border-l-emerald-500 border-slate-200/80' : 'border-l-4 border-l-rose-500 border-slate-200/80'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[9.5px] font-bold text-slate-700 font-mono">{log.timestamp}</span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold shrink-0 border flex items-center gap-1 ${getLogDisplayStatus(log).bg
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${getLogDisplayStatus(log).dot}`}></span>
                                    <span>{getLogDisplayStatus(log).label}</span>
                                  </span>
                                </div>

                                <div className="overflow-hidden">
                                  <h4 className="text-body-xs font-bold text-slate-800 line-clamp-1 leading-snug" title={log.name}>
                                    {log.name}
                                  </h4>
                                  <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[#012060]/5 border border-[#012060]/10">
                                    <span className="text-[7.5px] font-extrabold uppercase text-slate-400">NIM</span>
                                    <span className="text-[9.5px] font-bold text-[#012060] font-mono tracking-tight">{log.nim}</span>
                                  </div>
                                </div>

                                <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-1.5 truncate">
                                  📷 {log.scanner || 'Pemindai QR'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* DESKTOP TABLE VIEW */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                              <th className="py-2.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 text-center">No</th>
                              <th className="py-2.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waktu</th>
                              <th className="py-2.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mahasiswa</th>
                              <th className="py-2.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIM</th>
                              <th className="py-2.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pemindai</th>
                              <th className="py-2.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {group.logs.map((log, idx) => {
                              const isValid = log.status === 'Valid';
                              return (
                                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-5 text-body-xs font-semibold text-slate-400 text-center">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-5 text-body-sm font-bold text-slate-700 font-mono">
                                    {log.timestamp}
                                  </td>
                                  <td className="py-3 px-5 font-bold text-slate-800 text-body-sm">
                                    {log.name}
                                  </td>
                                  <td className="py-3 px-5">
                                    <span className="text-body-sm font-bold text-[#012060] font-mono bg-[#012060]/5 px-2 py-0.5 rounded-md border border-[#012060]/10">{log.nim}</span>
                                  </td>
                                  <td className="py-3 px-5 text-body-sm text-slate-500 font-medium">
                                    {log.scanner}
                                  </td>
                                  <td className="py-3 px-5 text-right">
                                    {(() => {
                                      const b = getLogDisplayStatus(log);
                                      return (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${b.bg}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.dot}`}></span>
                                          <span>{b.label}</span>
                                        </span>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              );
                            })}
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
