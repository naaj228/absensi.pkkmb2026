import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ormawaDb } from '../../lib/db';
import { supabase } from '../../lib/supabase';

export default function AdminOrmawaRiwayat() {
  const [logs, setLogs] = useState([]);
  const [ormawaList, setOrmawaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Form State: Add Manual Log
  const [selectedOrmawaId, setSelectedOrmawaId] = useState('');
  const [manualDicatatOleh, setManualDicatatOleh] = useState('Admin (Manual)');
  const [manualStatusLog, setManualStatusLog] = useState('Valid');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Edit Log
  const [editFields, setEditFields] = useState({
    statusLog: 'Valid',
    dicatatOleh: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, ormawaData] = await Promise.all([
        ormawaDb.fetchLogs(),
        ormawaDb.fetchAll()
      ]);
      setLogs(logsData);
      setOrmawaList(ormawaData);
    } catch (err) {
      console.error('Error fetching ORMAWA logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const subscription = supabase
      .channel('absensi-ormawa-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi_ormawa' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // CREATE: Tambah Presensi Manual
  const handleAddManualSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrmawaId) {
      alert('Pilih Ormawa / Tamu terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ormawaDb.addManualLog({
        ormawaId: selectedOrmawaId,
        dicatatOleh: manualDicatatOleh || 'Admin (Manual)',
        statusLog: manualStatusLog || 'Valid'
      });
      showToast('✅ Presensi manual berhasil ditambahkan!');
      setShowAddModal(false);
      setSelectedOrmawaId('');
      loadData();
    } catch (err) {
      console.error('Failed to add manual log:', err);
      alert('Gagal menambahkan presensi manual: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // UPDATE: Open Edit Modal
  const handleOpenEdit = (log) => {
    setSelectedLog(log);
    setEditFields({
      statusLog: log.status_log || 'Valid',
      dicatatOleh: log.dicatat_oleh || 'Scanner Ormawa'
    });
    setShowEditModal(true);
  };

  // UPDATE: Save Edit Log
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLog) return;

    setIsSubmitting(true);
    try {
      await ormawaDb.updateLog(selectedLog.id, editFields);
      showToast('✏️ Log presensi berhasil diperbarui!');
      setShowEditModal(false);
      setSelectedLog(null);
      loadData();
    } catch (err) {
      console.error('Failed to update log:', err);
      alert('Gagal memperbarui log: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE: Hapus Log Presensi
  const handleDeleteLog = async (log) => {
    if (!window.confirm(`Yakin ingin menghapus log presensi "${log.nama_ormawa}" pada ${log.waktu_scan ? new Date(log.waktu_scan).toLocaleString('id-ID') : ''}?`)) return;

    try {
      await ormawaDb.deleteLog(log.id, log.ormawa_id);
      showToast('🗑️ Log presensi berhasil dihapus.');
      loadData();
    } catch (err) {
      console.error('Failed to delete log:', err);
      alert('Gagal menghapus log presensi: ' + err.message);
    }
  };

  const exportToExcel = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data riwayat untuk di-export.');
      return;
    }

    const dataToExport = filteredLogs.map((item, index) => ({
      No: index + 1,
      'Waktu Presensi': item.waktu_scan ? new Date(item.waktu_scan).toLocaleString('id-ID') : '-',
      'Nama Ormawa / Tamu': item.nama_ormawa,
      'Nama Perwakilan': item.nama_perwakilan || '-',
      'Jabatan / Peran': item.jabatan || '-',
      'Kode QR': item.qr_code,
      'Dicatat Oleh': item.dicatat_oleh || 'Scanner Ormawa',
      Status: item.status_log || 'Valid'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Absensi Ormawa');
    XLSX.writeFile(workbook, `Riwayat_Absensi_Ormawa_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const matchesTerm =
      log.nama_ormawa?.toLowerCase().includes(term) ||
      log.nama_perwakilan?.toLowerCase().includes(term) ||
      log.qr_code?.toLowerCase().includes(term) ||
      log.dicatat_oleh?.toLowerCase().includes(term);

    if (!selectedDate) return matchesTerm;
    const logDate = log.waktu_scan ? new Date(log.waktu_scan).toISOString().split('T')[0] : '';
    return matchesTerm && logDate === selectedDate;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogsCount = logs.filter((l) => l.waktu_scan && new Date(l.waktu_scan).toISOString().split('T')[0] === todayStr).length;

  return (
    <div className="pt-16 p-3 sm:pt-6 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] bg-[#0d1b4d] text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl border border-white/10 flex items-center gap-2.5 animate-bounce text-xs sm:text-sm">
          <span className="material-symbols-outlined text-emerald-400 text-lg sm:text-xl">check_circle</span>
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1b4d] to-[#1e3a8a] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/10 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider text-blue-200 uppercase">
              Riwayat Presensi Realtime
            </span>
          </div>
          <h1 className="text-lg sm:text-3xl font-bold tracking-tight">Riwayat Absensi Ormawa</h1>
          <p className="text-white/70 text-xs sm:text-base mt-0.5 sm:mt-1 max-w-xl">
            Kelola log presensi, edit status, atau ekspor laporan kehadiran Ormawa.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">person_add</span>
            <span>+ Presensi</span>
          </button>
          <button
            onClick={exportToExcel}
            className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white text-[#0d1b4d] hover:bg-blue-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">download</span>
            <span>Export</span>
          </button>
          <Link
            to="/admin/ormawa"
            className="col-span-2 sm:col-span-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">badge</span>
            <span>Master Data</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg sm:text-2xl">history</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Total Log</p>
            <p className="text-base sm:text-2xl font-bold text-gray-900 leading-tight">{logs.length}</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg sm:text-2xl">today</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Hari Ini</p>
            <p className="text-base sm:text-2xl font-bold text-emerald-600 leading-tight">{todayLogsCount}</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg sm:text-2xl">filter_alt</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Filter Result</p>
            <p className="text-base sm:text-2xl font-bold text-purple-600 leading-tight">{filteredLogs.length}</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-3.5 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Cari nama Ormawa, perwakilan, QR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer self-start sm:self-auto"
              >
                Reset Tanggal
              </button>
            )}
          </div>

          <div className="text-[10px] sm:text-xs text-gray-500 font-medium flex items-center gap-1.5 self-end sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Realtime Supabase</span>
          </div>
        </div>

        {/* Mobile View: 1 Card Box Per Item (sm:hidden) */}
        <div className="sm:hidden space-y-3 p-3 bg-gray-50/50">
          {loading ? (
            <div className="py-8 text-center text-gray-400">
              <span className="material-symbols-outlined animate-spin text-2xl mb-1 text-blue-500">sync</span>
              <p className="text-xs">Memuat log presensi...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <span className="material-symbols-outlined text-3xl mb-1">history_toggle_off</span>
              <p className="text-xs">Belum ada riwayat presensi yang cocok.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const initials = (log.nama_ormawa || 'OR').slice(0, 2).toUpperCase();
              return (
                <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                  {/* Header Row: Initials Avatar + Name & Subtitle + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-snug">{log.nama_ormawa}</h4>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {log.nama_perwakilan ? `${log.nama_perwakilan}${log.jabatan ? ` (${log.jabatan})` : ''}` : 'Delegasi'}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 shrink-0 ${
                      log.status_log === 'Valid'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${log.status_log === 'Valid' ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
                      {log.status_log || 'Valid'}
                    </span>
                  </div>

                  {/* Metadata Row: Waktu Scan & QR Code */}
                  <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Waktu Presensi</p>
                      <p className="font-mono text-gray-900 font-bold text-[11px]">
                        {log.waktu_scan ? new Date(log.waktu_scan).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Kode QR</p>
                      <p className="font-mono text-blue-900 font-bold text-[11px] truncate">{log.qr_code}</p>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2 flex items-center gap-2 border-t border-gray-50">
                    <button
                      onClick={() => handleOpenEdit(log)}
                      className="flex-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-blue-200/60 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Edit Log</span>
                    </button>

                    <button
                      onClick={() => handleDeleteLog(log)}
                      className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center gap-1.5 border border-red-200/60 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Hapus Log</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Waktu Presensi</th>
                <th className="px-6 py-3.5">Nama Ormawa</th>
                <th className="px-6 py-3.5">Perwakilan & Jabatan</th>
                <th className="px-6 py-3.5">Kode QR</th>
                <th className="px-6 py-3.5">Dicatat Oleh</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    <span className="material-symbols-outlined animate-spin text-2xl mb-1 text-blue-500">sync</span>
                    <p className="text-xs">Memuat log presensi...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    <span className="material-symbols-outlined text-3xl mb-1">history_toggle_off</span>
                    <p className="text-xs">Belum ada riwayat absensi Ormawa yang cocok.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs text-gray-700">
                      {log.waktu_scan ? new Date(log.waktu_scan).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-gray-900 text-sm">
                      {log.nama_ormawa}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-gray-800 text-sm">{log.nama_perwakilan || '-'}</div>
                      <div className="text-xs text-gray-400">{log.jabatan || '-'}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-blue-800 font-semibold">
                      {log.qr_code}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-medium text-gray-600">
                      {log.dicatat_oleh || 'Scanner Ormawa'}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        log.status_log === 'Valid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.status_log === 'Valid' ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
                        {log.status_log || 'Valid'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(log)}
                          className="p-1.5 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Log Presensi"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log)}
                          className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Hapus Log Presensi"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Tambah Presensi Manual (CREATE) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Tambah Presensi Manual Ormawa</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg sm:text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleAddManualSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Pilih Ormawa / Tamu *
                </label>
                <select
                  required
                  value={selectedOrmawaId}
                  onChange={(e) => setSelectedOrmawaId(e.target.value)}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- Pilih Ormawa --</option>
                  {ormawaList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nama_ormawa} {o.nama_perwakilan ? `(${o.nama_perwakilan})` : ''} - [{o.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Dicatat Oleh
                </label>
                <input
                  type="text"
                  value={manualDicatatOleh}
                  onChange={(e) => setManualDicatatOleh(e.target.value)}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Status Log
                </label>
                <select
                  value={manualStatusLog}
                  onChange={(e) => setManualStatusLog(e.target.value)}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Valid">Valid</option>
                  <option value="Manual">Manual</option>
                  <option value="Izin Khusus">Izin Khusus</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 sm:gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0d1b4d] hover:bg-blue-900 text-white font-medium rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Presensi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Log Presensi (UPDATE) */}
      {showEditModal && selectedLog && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Edit Log Presensi</h3>
                <p className="text-xs text-gray-500">{selectedLog.nama_ormawa}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg sm:text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Dicatat Oleh
                </label>
                <input
                  type="text"
                  value={editFields.dicatatOleh}
                  onChange={(e) => setEditFields({ ...editFields, dicatatOleh: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Status Log Presensi
                </label>
                <select
                  value={editFields.statusLog}
                  onChange={(e) => setEditFields({ ...editFields, statusLog: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Valid">Valid</option>
                  <option value="Diubah Admin">Diubah Admin</option>
                  <option value="Manual">Manual</option>
                  <option value="Izin Khusus">Izin Khusus</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 sm:gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0d1b4d] hover:bg-blue-900 text-white font-medium rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
