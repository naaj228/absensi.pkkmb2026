import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getLogDisplayStatus, isAttendanceLog } from '../utils/statusHelper';
import { formatDDMMYYYY, formatIndonesianDate } from '../utils/dateHelper';

export default function ExportModal({
  isOpen,
  onClose,
  gugusList = [],
  logs = [],
  peserta = [],
  initialGugusId = 'all',
  isMentorView = false,
  currentMentorGugusName = ''
}) {
  if (!isOpen) return null;

  // Export options state
  const [exportFormat, setExportFormat] = useState('Excel'); // 'Excel' | 'PDF'
  const [gugusMode, setGugusMode] = useState(() => {
    if (isMentorView) return 'single';
    if (initialGugusId && initialGugusId !== 'all') return 'custom';
    return 'all';
  }); // 'all' | 'custom'
  const [selectedGugusIds, setSelectedGugusIds] = useState(() => {
    if (initialGugusId && initialGugusId !== 'all') {
      return [initialGugusId];
    }
    return gugusList.map(g => g.id);
  });

  const [dateMode, setDateMode] = useState('all'); // 'all' | 'specific'
  const [selectedDate, setSelectedDate] = useState('');

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Hadir Penuh' | etc.

  // Available unique dates from attendance logs
  const availableDates = useMemo(() => {
    const datesSet = new Set(logs.filter(isAttendanceLog).map(l => l.date).filter(Boolean));
    return Array.from(datesSet).sort().reverse();
  }, [logs]);

  // Toggle single gugus selection in custom checkbox mode
  const handleToggleGugusId = (gId) => {
    setSelectedGugusIds(prev => {
      if (prev.includes(gId)) {
        return prev.filter(id => id !== gId);
      } else {
        return [...prev, gId];
      }
    });
  };

  const handleSelectAllGugus = () => {
    setSelectedGugusIds(gugusList.map(g => g.id));
  };

  const handleDeselectAllGugus = () => {
    setSelectedGugusIds([]);
  };

  // Determine active target gugus list based on gugusMode
  const activeGugusObjects = useMemo(() => {
    if (isMentorView) {
      const mentorG = gugusList.find(g => g.id === initialGugusId || g.name === currentMentorGugusName);
      return mentorG ? [mentorG] : (gugusList.length > 0 ? [gugusList[0]] : []);
    }

    if (gugusMode === 'all') {
      return gugusList;
    }
    if (gugusMode === 'custom') {
      return gugusList.filter(g => selectedGugusIds.includes(g.id));
    }
    return gugusList;
  }, [gugusMode, gugusList, selectedGugusIds, isMentorView, initialGugusId, currentMentorGugusName]);

  // Filter logs according to active selections
  const filteredLogsToExport = useMemo(() => {
    const attendanceLogs = logs.filter(isAttendanceLog);
    const activeGugusNamesSet = new Set(activeGugusObjects.map(g => g.name.toLowerCase()));

    return attendanceLogs.filter(log => {
      const matchesGugus = activeGugusNamesSet.has((log.gugusName || '').toLowerCase());
      const matchesDate = dateMode === 'all' || !selectedDate || log.date === selectedDate;

      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const displayStatus = getLogDisplayStatus(log);
        matchesStatus = displayStatus.label === statusFilter;
      }

      return matchesGugus && matchesDate && matchesStatus;
    });
  }, [logs, activeGugusObjects, dateMode, selectedDate, statusFilter]);

  // Generate Export File
  const handleGenerateExport = () => {
    if (activeGugusObjects.length === 0) {
      alert("Pilih setidaknya 1 Gugus untuk diekspor!");
      return;
    }

    if (filteredLogsToExport.length === 0) {
      alert("Tidak ada log absensi yang cocok dengan kriteria filter untuk diekspor.");
      return;
    }

    if (exportFormat === 'Excel') {
      generateExcelExport();
    } else {
      generatePdfExport();
    }
    onClose();
  };

  const generateExcelExport = () => {
    const workbook = XLSX.utils.book_new();

    // 1. REKAPITULASI SUMMARY SHEET (if exporting all or multiple gugus)
    if (activeGugusObjects.length > 1) {
      const summaryRows = activeGugusObjects.map((gugusObj, idx) => {
        const gugusLogs = filteredLogsToExport.filter(l => l.gugusName.toLowerCase() === gugusObj.name.toLowerCase());
        const totalPesertaGugus = peserta.filter(p => p.gugusId === gugusObj.id).length;
        
        let totalHadirPenuh = 0;
        let totalHadirSebagian = 0;
        let totalIzin = 0;
        let totalAlpha = 0;

        gugusLogs.forEach(l => {
          const st = getLogDisplayStatus(l).label;
          if (st === 'Hadir Penuh') totalHadirPenuh++;
          else if (st === 'Hadir Sebagian') totalHadirSebagian++;
          else if (st === 'Izin') totalIzin++;
          else if (st === 'Alpha') totalAlpha++;
        });

        const totalHadir = totalHadirPenuh + totalHadirSebagian;

        return {
          'No': idx + 1,
          'Gugus': gugusObj.name,
          'Total Peserta': totalPesertaGugus,
          'Total Hadir Penuh': totalHadirPenuh,
          'Total Hadir Sebagian': totalHadirSebagian,
          'Total Izin': totalIzin,
          'Total Alpha / Belum': totalPesertaGugus > totalHadir ? (totalPesertaGugus - totalHadir) : 0,
          'Persentase Kehadiran': totalPesertaGugus > 0 ? `${Math.round((totalHadir / totalPesertaGugus) * 100)}%` : '0%'
        };
      });

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      summarySheet['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 15 },
        { wch: 18 },
        { wch: 20 },
        { wch: 12 },
        { wch: 20 },
        { wch: 22 }
      ];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Rekapitulasi All");
    }

    // 2. ONE SHEET PER GUGUS
    activeGugusObjects.forEach(gugusObj => {
      const gugusLogs = filteredLogsToExport.filter(l => l.gugusName.toLowerCase() === gugusObj.name.toLowerCase());

      const sheetData = gugusLogs.map((log, idx) => {
        const studentInfo = peserta.find(p => p.id === log.nim);
        const jurusan = studentInfo ? studentInfo.fakultas : '-';
        const displayStatus = getLogDisplayStatus(log);

        return {
          'No': idx + 1,
          'Tanggal': formatDDMMYYYY(log.date),
          'Waktu': log.timestamp,
          'NIM': log.nim,
          'Nama Peserta': log.name,
          'Jurusan / Prodi': jurusan,
          'Gugus': log.gugusName,
          'Pemindai': log.scanner,
          'Status': displayStatus.label,
          'Lokasi Scan': log.locationStatus || (log.scanner?.startsWith('Admin') ? 'Manual' : 'Tanpa Lokasi')
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetData.length > 0 ? sheetData : [{
        'No': '-',
        'Tanggal': '-',
        'Waktu': '-',
        'NIM': '-',
        'Nama Peserta': 'Belum Ada Data Scan',
        'Jurusan / Prodi': '-',
        'Gugus': gugusObj.name,
        'Pemindai': '-',
        'Status': '-',
        'Lokasi Scan': '-'
      }]);

      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 12 },
        { wch: 15 },
        { wch: 28 },
        { wch: 25 },
        { wch: 15 },
        { wch: 22 },
        { wch: 16 },
        { wch: 20 }
      ];

      let sheetName = gugusObj.name.replace(/[:\\/?*\[\]]/g, '');
      if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Gugus");
    });

    const fileNameSuffix = activeGugusObjects.length === 1 
      ? activeGugusObjects[0].name.replace(/\s+/g, '_')
      : `Selected_${activeGugusObjects.length}_Gugus`;

    XLSX.writeFile(workbook, `Laporan_Absensi_PKKMB_${fileNameSuffix}_${selectedDate || 'Semua_Hari'}.xlsx`);
  };

  const generatePdfExport = () => {
    let sectionsHtml = '';

    activeGugusObjects.forEach(gugusObj => {
      const gugusLogs = filteredLogsToExport.filter(l => l.gugusName.toLowerCase() === gugusObj.name.toLowerCase());
      
      const rowsHtml = gugusLogs.map((log, idx) => {
        const studentInfo = peserta.find(p => p.id === log.nim);
        const jurusan = studentInfo ? studentInfo.fakultas : '-';
        const displayStatus = getLogDisplayStatus(log);
        const location = log.latitude && log.longitude
          ? (log.locationStatus || 'Dalam Area')
          : (log.scanner?.startsWith('Admin') ? 'Manual' : 'Tanpa Lokasi');

        return `
          <tr>
            <td style="text-align: center; width: 28px;">${idx + 1}</td>
            <td style="width: 70px; font-family: monospace;">${formatDDMMYYYY(log.date)}</td>
            <td style="width: 60px; font-family: monospace;">${log.timestamp}</td>
            <td style="width: 85px; font-family: monospace;">${log.nim}</td>
            <td><strong>${log.name}</strong></td>
            <td style="width: 110px;">${jurusan}</td>
            <td style="width: 85px;">${log.scanner}</td>
            <td style="text-align: center; width: 90px;">
              <span class="badge" style="${displayStatus.pdfBadge}">
                ${displayStatus.label}
              </span>
            </td>
            <td style="width: 80px; font-size: 9.5px;">${location}</td>
          </tr>
        `;
      }).join('');

      sectionsHtml += `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 14px; font-weight: 700; color: #012060; border-bottom: 2px solid #012060; padding-bottom: 4px; margin-bottom: 8px;">
            ${gugusObj.name} (${gugusLogs.length} Log Scan)
          </h2>
          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 28px;">No</th>
                <th style="width: 70px;">Tanggal</th>
                <th style="width: 60px;">Waktu</th>
                <th style="width: 85px;">NIM</th>
                <th>Nama Mahasiswa</th>
                <th style="width: 110px;">Jurusan / Prodi</th>
                <th style="width: 85px;">Pemindai</th>
                <th style="text-align: center; width: 90px;">Status</th>
                <th style="width: 80px;">Lokasi Scan</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="9" style="text-align:center; padding:12px; color:#94a3b8;">Belum ada log absensi pada gugus ini.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    });

    const dateScopeText = dateMode === 'specific' && selectedDate 
      ? `Tanggal: ${formatIndonesianDate(selectedDate)}`
      : 'Semua Hari Kegiatan';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Absensi PKKMB 2026</title>
          <style>
            @page { margin: 12mm; size: auto; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #1f2937; line-height: 1.4; }
            h1 { font-size: 18px; font-weight: 800; color: #012060; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
            .subtitle { font-size: 11px; font-weight: 600; color: #64748b; text-align: center; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; }
            th { background-color: #012060; color: #ffffff; font-weight: 700; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.5px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Laporan Riwayat Kehadiran PKKMB 2026</h1>
          <div class="subtitle">Cakupan: ${activeGugusObjects.length} Gugus Terpilih • ${dateScopeText}</div>
          ${sectionsHtml}
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#012060]/10 text-[#012060] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">download</span>
            </div>
            <div>
              <h3 className="text-body-md font-bold text-[#012060]">Ekspor Laporan Absensi</h3>
              <p className="text-[11px] text-slate-400">Atur format, gugus, dan filter tanggal sebelum mengunduh.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <div className="space-y-4 py-4 overflow-y-auto scrollbar-thin">

          {/* 1. Format File Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pilih Format File</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setExportFormat('Excel')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-body-sm font-bold transition-all cursor-pointer ${
                  exportFormat === 'Excel'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">table_chart</span>
                <span>Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('PDF')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-body-sm font-bold transition-all cursor-pointer ${
                  exportFormat === 'PDF'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-rose-600 text-[20px]">picture_as_pdf</span>
                <span>PDF Document</span>
              </button>
            </div>
          </div>

          {/* 2. Gugus Selection Scope (Multi-Select Supported) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Cakupan Gugus</label>

            {!isMentorView ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setGugusMode('all')}
                    className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
                      gugusMode === 'all' ? 'bg-white text-[#012060] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Semua ({gugusList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGugusMode('custom')}
                    className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
                      gugusMode === 'custom' ? 'bg-white text-[#012060] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Pilih Gugus
                  </button>
                </div>

                {/* Custom Multi-Select Checkboxes */}
                {gugusMode === 'custom' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <span className="text-[11px] font-bold text-slate-600">
                        {selectedGugusIds.length} dari {gugusList.length} Gugus Terpilih
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllGugus}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllGugus}
                          className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {gugusList.map(g => {
                        const isChecked = selectedGugusIds.includes(g.id);
                        return (
                          <label
                            key={g.id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-body-xs font-semibold cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-primary/5 border-primary/30 text-[#012060]'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleGugusId(g.id)}
                              className="w-3.5 h-3.5 rounded border-slate-300 accent-[#012060] cursor-pointer"
                            />
                            <span className="truncate">{g.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-100 p-2.5 rounded-2xl border border-slate-200/80 text-body-xs font-bold text-[#012060]">
                Gugus Saya: {currentMentorGugusName || 'Gugus Mentor'}
              </div>
            )}
          </div>

          {/* 3. Date Selection Mode */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Rentang Tanggal</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDateMode('all')}
                className={`py-2 px-3 rounded-2xl border text-body-xs font-bold transition-all cursor-pointer ${
                  dateMode === 'all'
                    ? 'bg-[#012060] text-white border-[#012060] shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Semua Hari Activity
              </button>
              <button
                type="button"
                onClick={() => setDateMode('specific')}
                className={`py-2 px-3 rounded-2xl border text-body-xs font-bold transition-all cursor-pointer ${
                  dateMode === 'specific'
                    ? 'bg-[#012060] text-white border-[#012060] shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tanggal Spesifik
              </button>
            </div>

            {dateMode === 'specific' && (
              <div className="pt-1 animate-fade-in">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-body-sm font-semibold py-2 px-3 rounded-xl focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="">-- Pilih Tanggal --</option>
                  {availableDates.map(dIso => (
                    <option key={dIso} value={dIso}>{formatIndonesianDate(dIso)} ({formatDDMMYYYY(dIso)})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 4. Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Filter Status Absensi</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-body-sm font-semibold py-2 px-3 rounded-xl focus:outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="Hadir Penuh">✅ Hadir Penuh</option>
              <option value="Hadir Sebagian">🟡 Hadir Sebagian</option>
              <option value="Izin">📄 Izin</option>
              <option value="Alpha">❌ Alpha</option>
              <option value="Belum Hadir">⚪ Belum Hadir</option>
              <option value="Scan Gagal">⚠️ Scan Gagal</option>
            </select>
          </div>

          {/* Summary Preview Box */}
          <div className="bg-[#012060]/5 border border-[#012060]/10 rounded-2xl p-3 flex items-center justify-between text-body-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-[#012060]">
                {activeGugusObjects.length} Gugus • Format {exportFormat}
              </div>
              <div className="text-[10.5px] text-slate-500 font-medium">
                Ditemukan <strong className="text-slate-800">{filteredLogsToExport.length}</strong> log absensi yang akan diekspor.
              </div>
            </div>
            <span className="material-symbols-outlined text-primary text-[22px]">analytics</span>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-body-sm font-bold transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleGenerateExport}
            className="px-5 py-2 bg-[#012060] hover:bg-[#022b80] active:scale-95 text-white rounded-xl text-body-sm font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Unduh Laporan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
