import { useContext, useState, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { isHadir, getStatusBadge, STATUS_OPTIONS, getLogDisplayStatus, JURUSAN_LIST, ALL_JURUSAN_OPTIONS, normalizeJurusan } from '../../utils/statusHelper';
import { toISOKey, getTodayISOKey, formatIndonesianDate } from '../../utils/dateHelper';

export default function AdminPeserta() {
  const { peserta, gugus, logs, addPeserta, updatePeserta, deletePeserta, hasAdminNotifications } = useContext(AppContext);
  const navigate = useNavigate();

  // Filter & Search & Date states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGugus, setSelectedGugus] = useState('');
  const [selectedJurusan, setSelectedJurusan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayISOKey());

  // Selection states
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudentId, setEditStudentId] = useState(null);
  const [importResult, setImportResult] = useState(null); // { added, skipped, skippedRows }



  // Form states
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    gugusId: '',
    fakultas: '',
    status: 'Alpha'
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const targetDateKey = toISOKey(selectedDate);

  const getStudentDailyStatus = useCallback((student) => {
    const studentLogOnDate = logs.find(l => 
      String(l.nim) === String(student.id) && 
      toISOKey(l.date) === targetDateKey &&
      l.status !== 'Info' &&
      l.scanner !== 'Admin (Tolak)' &&
      !l.note?.startsWith('Persetujuan')
    );

    if (studentLogOnDate) {
      const display = getLogDisplayStatus(studentLogOnDate);
      return {
        label: display.label,
        bg: display.bg,
        dot: display.dot,
        isPresent: display.label === 'Hadir Penuh' || display.label === 'Hadir Sebagian',
        isPending: false
      };
    }

    if (student.status === 'Izin') {
      return { label: 'Izin', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', isPresent: false, isPending: false };
    }

    if (student.status === 'Alpha') {
      return { label: 'Alpha', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', isPresent: false, isPending: false };
    }

    if (student.status === 'Manual (Pending)') {
      return { label: 'Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', isPresent: false, isPending: true };
    }

    if (student.status === 'Manual (Ditolak)') {
      return { label: 'Ditolak', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', isPresent: false, isPending: false };
    }

    return { label: 'Belum Hadir', bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', isPresent: false, isPending: false };
  }, [logs, targetDateKey]);

  // Filtered participants
  const filteredPeserta = peserta.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.includes(searchTerm);
    const matchesGugus = selectedGugus === '' || 
      (selectedGugus === 'unassigned' ? (!student.gugusId || student.gugusId === 'Unassigned') : student.gugusId === selectedGugus);
    
    const dailyStatus = getStudentDailyStatus(student);
    let matchesStatus = true;
    if (selectedStatus === 'Hadir' || selectedStatus === 'Hadir Penuh') {
      matchesStatus = dailyStatus.isPresent;
    } else if (selectedStatus === 'Belum Hadir') {
      matchesStatus = !dailyStatus.isPresent && !dailyStatus.isPending;
    } else if (selectedStatus === 'Pending' || selectedStatus === 'Manual (Pending)') {
      matchesStatus = dailyStatus.isPending;
    } else if (selectedStatus === 'Izin') {
      matchesStatus = student.status === 'Izin';
    } else if (selectedStatus === 'Alpha') {
      matchesStatus = !dailyStatus.isPresent && !dailyStatus.isPending && student.status !== 'Izin';
    } else if (selectedStatus) {
      matchesStatus = dailyStatus.label.toLowerCase() === selectedStatus.toLowerCase();
    }

    const matchesJurusan = selectedJurusan === '' || student.fakultas === selectedJurusan || normalizeJurusan(student.fakultas) === selectedJurusan;

    return matchesSearch && matchesGugus && matchesJurusan && matchesStatus;
  });

  // Pagination calculation
  const totalItems = filteredPeserta.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPeserta.slice(indexOfFirstItem, indexOfLastItem);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentItems.map(p => p.id));
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
    window.confirmAction(`Hapus ${selectedIds.length} peserta terpilih?`, () => {
      selectedIds.forEach(id => deletePeserta(id));
      setSelectedIds([]);
      alert("Peserta berhasil dihapus.");
    });
  };

  const handleDeleteOne = (id) => {
    window.confirmAction("Hapus peserta ini?", () => {
      deletePeserta(id);
      setSelectedIds(prev => prev.filter(item => item !== id));
      alert("Peserta berhasil dihapus.");
    });
  };

  const handleOpenAddModal = () => {
    setFormData({
      id: '',
      name: '',
      email: '',
      gugusId: gugus[0]?.id || '',
      fakultas: 'S1 Informatika',
      status: 'Belum Hadir'
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (student) => {
    setEditStudentId(student.id);
    setFormData({
      id: student.id,
      name: student.name,
      email: student.email,
      gugusId: student.gugusId,
      fakultas: student.fakultas,
      status: student.status
    });
    setShowEditModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (showAddModal) {
        if (peserta.some(p => p.id === formData.id)) {
          alert("NIM sudah digunakan!");
          return;
        }
        await addPeserta(formData);
        setShowAddModal(false);
        alert("Peserta berhasil ditambahkan.");
      } else if (showEditModal) {
        if (formData.id !== editStudentId && peserta.some(p => p.id === formData.id)) {
          alert("NIM sudah digunakan oleh peserta lain!");
          return;
        }
        await updatePeserta(editStudentId, formData);
        setShowEditModal(false);
        alert("Peserta berhasil diperbarui.");
      }
    } catch {
      // Error is already alerted by AppContext
    }
  };

  const handleImportSimulate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv, .xlsx, .xls';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rows.length < 2) {
            alert('File kosong atau tidak memiliki data.');
            return;
          }

          const headers = rows[0].map(h => String(h || '').trim().toLowerCase());

          const findColIdx = (targetNames, excludeKeywords = []) => {
            for (const name of targetNames) {
              const idx = headers.findIndex(h => h === name.toLowerCase());
              if (idx !== -1) return idx;
            }
            for (const name of targetNames) {
              const idx = headers.findIndex(h => {
                const normalized = h.toLowerCase();
                const matches = normalized.includes(name.toLowerCase());
                const excluded = excludeKeywords.some(ex => normalized.includes(ex.toLowerCase()));
                return matches && !excluded;
              });
              if (idx !== -1) return idx;
            }
            return -1;
          };

          const iNama = findColIdx(['nama peserta', 'nama lengkap', 'nama maba', 'nama'], ['gugus']);
          const iNIM = findColIdx(['nim', 'no. induk', 'nomor induk', 'nomorinduk', 'id']);
          const iEmail = findColIdx(['email']);
          const iGugus = findColIdx(['nama gugus', 'gugus']);
          const iFakultas = findColIdx(['program studi', 'prodi', 'jurusan', 'fakultas']);

          if (iNama === -1 || iNIM === -1) {
            alert('Format kolom tidak dikenali. Pastikan file memiliki kolom "Nama" dan "NIM".');
            return;
          }

          const resolveGugusId = (gugusName) => {
            if (!gugusName) return '';
            const normalised = String(gugusName).trim();
            const found = gugus.find(g =>
              g.name.toLowerCase() === normalised.toLowerCase() ||
              g.id.toLowerCase() === normalised.toLowerCase()
            );
            if (found) return found.id;
            const partial = gugus.find(g =>
              g.name.toLowerCase().includes(normalised.toLowerCase()) ||
              normalised.toLowerCase().includes(g.name.toLowerCase())
            );
            return partial ? partial.id : '';
          };

          let added = 0;
          let skipped = 0;
          const skippedRows = [];
          const currentNIMs = new Set(peserta.map(p => p.id));

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const nama = iNama !== -1 ? String(row[iNama] || '').trim() : '';
            const nim = iNIM !== -1 ? String(row[iNIM] || '').trim() : '';
            const email = iEmail !== -1 ? String(row[iEmail] || '').trim() : '';
            const gugusRaw = iGugus !== -1 ? row[iGugus] : '';
            const jurusan = iFakultas !== -1 ? String(row[iFakultas] || '').trim() : '';

            if (!nama) {
              skipped++;
              skippedRows.push(`Baris ${i + 1}: Nama peserta kosong`);
              continue;
            }

            let finalNim = nim;
            let isAutoNim = false;
            if (!finalNim || finalNim === '-' || finalNim === '0') {
              finalNim = `AUTO-${Date.now().toString().slice(-4)}-${i}`;
              isAutoNim = true;
            }

            if (!isAutoNim && currentNIMs.has(finalNim)) {
              skipped++;
              skippedRows.push(`Baris ${i + 1}: NIM ${finalNim} (${nama}) sudah terdaftar`);
              continue;
            }

            while (currentNIMs.has(finalNim)) {
              finalNim = `AUTO-${Date.now().toString().slice(-4)}-${i}-${Math.floor(Math.random() * 1000)}`;
            }

            const gugusId = resolveGugusId(gugusRaw);

            addPeserta({
              id: finalNim,
              name: nama,
              email: email || `${finalNim}@student.ac.id`,
              gugusId,
              fakultas: normalizeJurusan(jurusan || 'S1 Informatika'),
              status: 'Belum Hadir'
            });

            currentNIMs.add(finalNim);
            added++;
          }

          setImportResult({ fileName: file.name, added, skipped, skippedRows });
          setCurrentPage(1);
        } catch (err) {
          console.error(err);
          alert('Gagal membaca file. Pastikan format file adalah .xlsx atau .csv yang valid.');
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  const getGugusName = (gugusId) => {
    const g = gugus.find(item => item.id === gugusId);
    return g ? g.name : '-';
  };

  let totalHadir = 0;
  peserta.forEach(student => {
    if (getStudentDailyStatus(student).isPresent) totalHadir++;
  });
  const persentaseKehadiran = peserta.length > 0 ? ((totalHadir / peserta.length) * 100).toFixed(1) : '0';

  return (
    <div className="w-full">
      <header className="fixed top-0 left-0 lg:left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-sm font-headline-md text-on-surface">Data Peserta</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>
            {hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}
          </div>
        </div>
      </header>

      <main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto">
        <div className="flex flex-col w-full space-y-gutter relative">
          
          {/* Date Selector Bar */}
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
              <span className="text-body-sm font-bold text-slate-600">Presensi Tanggal:</span>
              <strong className="text-body-sm text-primary font-extrabold">{formatIndonesianDate(selectedDate)}</strong>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Pilih Tanggal:</label>
              <div className="relative flex-1 sm:flex-initial min-w-[160px]">
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                  className="bg-[#f8fafc] border border-slate-200 text-slate-800 text-body-sm font-semibold rounded-xl pl-3.5 pr-9 py-1.5 focus:outline-none focus:border-primary cursor-pointer w-full"
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => { setSelectedDate(''); setCurrentPage(1); }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer bg-[#f8fafc] rounded-full z-10 transition-colors flex items-center justify-center"
                    title="Bersihkan tanggal"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="bg-surface-container rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Total Peserta</span>
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary text-[20px]">groups</span>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-end gap-3">
                  <span className="text-display-lg font-display-lg text-primary">{peserta.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Hadir</span>
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container text-[20px]">how_to_reg</span>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-end gap-3">
                  <span className="text-display-lg font-display-lg text-secondary">{totalHadir}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-tertiary/5 rounded-full blur-2xl group-hover:bg-tertiary/10 transition-colors"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Persentase Kehadiran</span>
                <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-tertiary-container text-[20px]">analytics</span>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-end gap-3">
                  <span className="text-display-lg font-display-lg text-tertiary">{persentaseKehadiran}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl shadow-sm overflow-hidden flex flex-col w-full relative z-10">
            {/* Header & Filter Toolbar */}
            <div className="p-4 sm:p-6 border-b border-surface-variant flex flex-col gap-4 bg-white">
              {/* Top Row: Title + Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">groups</span>
                  <h2 className="text-headline-sm font-bold text-on-surface">Data Peserta</h2>
                  {selectedIds.length > 0 && (
                    <button onClick={handleDeleteSelected} className="bg-error/10 hover:bg-error/20 text-error text-label-sm font-label-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-error/20">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Hapus Terpilih ({selectedIds.length})
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2.5">
                  <button onClick={handleImportSimulate} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-body-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98">
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    <span>Import Excel</span>
                  </button>

                  <button onClick={handleOpenAddModal} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-xl text-body-sm font-bold transition-all shadow-md active:scale-98 cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Tambah Peserta</span>
                  </button>
                </div>
              </div>

              {/* Bottom Row: Search & Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                {/* Search Input */}
                <div className="sm:col-span-3 relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                  <input 
                    className="w-full pl-9 pr-8 py-2 bg-[#f8fafc] rounded-xl text-body-sm font-medium text-on-surface placeholder:text-on-surface-variant/60 border border-outline-variant focus:border-primary focus:outline-none transition-colors" 
                    placeholder="Cari Nama atau NIM..." 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5 cursor-pointer">
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  )}
                </div>

                {/* Gugus Filter */}
                <div className="sm:col-span-3 relative">
                  <select 
                    className="w-full appearance-none pl-3.5 pr-8 py-2 bg-[#f8fafc] rounded-xl text-body-sm font-medium text-on-surface border border-outline-variant focus:border-primary focus:outline-none transition-colors cursor-pointer" 
                    value={selectedGugus} 
                    onChange={(e) => { setSelectedGugus(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="">Semua Gugus</option>
                    <option value="unassigned">Belum Masuk Gugus</option>
                    {gugus.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
                </div>

                {/* Jurusan Filter */}
                <div className="sm:col-span-3 relative">
                  <select 
                    className="w-full appearance-none pl-3.5 pr-8 py-2 bg-[#f8fafc] rounded-xl text-body-sm font-medium text-on-surface border border-outline-variant focus:border-primary focus:outline-none transition-colors cursor-pointer" 
                    value={selectedJurusan} 
                    onChange={(e) => { setSelectedJurusan(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="">Semua Jurusan</option>
                    {JURUSAN_LIST.map(group => (
                      <optgroup key={group.group} label={group.group}>
                        {group.options.map(j => (
                          <option key={j} value={j}>{j}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
                </div>

                {/* Status Filter */}
                <div className="sm:col-span-3 relative">
                  <select 
                    className="w-full appearance-none pl-3.5 pr-8 py-2 bg-[#f8fafc] rounded-xl text-body-sm font-medium text-on-surface border border-outline-variant focus:border-primary focus:outline-none transition-colors cursor-pointer" 
                    value={selectedStatus} 
                    onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="">Semua Status</option>
                    <option value="Belum Hadir">⚪ Belum Hadir</option>
                    <option value="Hadir Penuh">✅ Hadir Penuh</option>
                    <option value="Hadir Sebagian">🟡 Hadir Sebagian</option>
                    <option value="Izin">📄 Izin</option>
                    <option value="Manual (Pending)">⏳ Pending</option>
                    <option value="Manual (Ditolak)">❌ Ditolak</option>
                    <option value="Alpha">🚫 Alpha</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
                </div>

                {/* Reset Filter Button */}
                {(searchTerm || selectedGugus || selectedJurusan || selectedStatus) && (
                  <div className="sm:col-span-12 flex justify-end">
                    <button 
                      className="bg-error/10 border border-error/20 text-error px-3 py-1.5 rounded-xl hover:bg-error/20 transition-colors flex items-center gap-1.5 text-body-sm font-bold cursor-pointer" 
                      title="Reset Semua Filter" 
                      onClick={() => { setSearchTerm(''); setSelectedGugus(''); setSelectedJurusan(''); setSelectedStatus(''); setCurrentPage(1); }}
                    >
                      <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                      <span>Reset Filter</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop View: Table (Strict 100% width, table-fixed, zero horizontal scrollbar) */}
            <div className="hidden md:block w-full overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[26%]" />
                  <col className="w-[12%]" />
                  <col className="w-[26%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="bg-surface/50 border-b border-surface-variant">
                    <th className="py-3.5 px-3 text-center">
                      <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary accent-primary cursor-pointer" type="checkbox" checked={currentItems.length > 0 && currentItems.every(p => selectedIds.includes(p.id))} onChange={handleSelectAll} />
                    </th>
                    <th className="py-3.5 px-3 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold truncate">Nama</th>
                    <th className="py-3.5 px-3 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold truncate">NIM</th>
                    <th className="py-3.5 px-3 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold truncate">Gugus</th>
                    <th className="py-3.5 px-3 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold truncate">Status</th>
                    <th className="py-3.5 px-4 text-label-sm font-label-md text-on-surface-variant uppercase tracking-wider font-semibold text-right pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant bg-white">
                  {currentItems.length > 0 ? (
                    currentItems.map((student) => (
                      <tr key={student.id} className="hover:bg-surface-variant/30 transition-colors group cursor-pointer" onClick={() => navigate(`/admin/peserta/${student.id}`)}>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary accent-primary cursor-pointer" type="checkbox" checked={selectedIds.includes(student.id)} onChange={(e) => handleSelectOne(student.id, e.target.checked)} />
                        </td>
                        <td className="py-3 px-3 truncate">
                          <div className="flex items-center gap-2.5 min-w-0 truncate">
                            <div className="w-9 h-9 rounded-full bg-secondary-container/50 text-secondary font-headline-sm flex items-center justify-center border border-secondary/10 shrink-0 font-bold text-body-sm">
                              {student.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 truncate">
                              <p className="text-body-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors" title={student.name}>{student.name}</p>
                              <p className="text-[11px] text-on-surface-variant truncate">{student.fakultas}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 truncate">
                          <span className="text-body-sm font-bold text-on-surface font-mono bg-surface px-2 py-0.5 rounded-md border border-outline-variant/30">{student.id}</span>
                        </td>
                        <td className="py-3 px-3 truncate">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface text-on-surface font-medium text-body-sm border border-outline-variant/30 max-w-full truncate" title={getGugusName(student.gugusId)}>
                            <span className="w-2 h-2 rounded-full bg-secondary shrink-0"></span>
                            <span className="truncate">{getGugusName(student.gugusId)}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 truncate">
                          {(() => { const b = getStudentDailyStatus(student); return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-bold max-w-full truncate ${b.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.dot} ${b.isPresent ? 'animate-pulse' : ''}`}></span>
                              <span className="truncate">{b.label}</span>
                            </span>
                          ); })()}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => navigate(`/admin/peserta/${student.id}`)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer" title="Lihat Detail">
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            <button onClick={() => handleOpenEditModal(student)} className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg transition-colors cursor-pointer" title="Edit">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={() => handleDeleteOne(student.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors cursor-pointer" title="Hapus">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-on-surface-variant text-body-md">Tidak ada data peserta ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Card List */}
            <div className="block md:hidden space-y-4 p-4">
              {currentItems.length > 0 ? (
                currentItems.map((student) => (
                  <div key={student.id} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/40 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary accent-primary cursor-pointer shrink-0" type="checkbox" checked={selectedIds.includes(student.id)} onChange={(e) => handleSelectOne(student.id, e.target.checked)} />
                        <div className="w-10 h-10 rounded-full bg-secondary-container/50 text-secondary font-headline-sm flex items-center justify-center border border-secondary/10 shrink-0 font-bold">
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-md font-semibold text-on-surface truncate">{student.name}</p>
                          <p className="text-label-sm text-on-surface-variant truncate">{student.fakultas}</p>
                        </div>
                      </div>
                      {(() => { const b = getStudentDailyStatus(student); return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-bold shrink-0 ${b.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${b.dot} ${b.isPresent ? 'animate-pulse' : ''}`}></span>
                          {b.label}
                        </span>
                      ); })()}
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-b border-outline-variant/20 py-2.5 my-1 text-body-sm text-on-surface-variant">
                      <div>
                        <span className="text-label-sm text-on-surface-variant/60 block mb-0.5">NIM</span>
                        <span className="font-mono text-on-surface font-medium bg-surface px-1.5 py-0.5 rounded border border-outline-variant/20">{student.id}</span>
                      </div>
                      <div>
                        <span className="text-label-sm text-on-surface-variant/60 block mb-0.5">Gugus</span>
                        <span className="text-on-surface font-medium">{getGugusName(student.gugusId)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button onClick={() => navigate(`/admin/peserta/${student.id}`)} className="flex items-center gap-1.5 px-3 py-1.5 text-label-sm text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg border border-outline-variant/30 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        Detail
                      </button>
                      <button onClick={() => handleOpenEditModal(student)} className="flex items-center gap-1.5 px-3 py-1.5 text-label-sm text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg border border-outline-variant/30 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteOne(student.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-label-sm text-error hover:bg-error/5 rounded-lg border border-error/10 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-on-surface-variant text-body-md bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/60">Tidak ada data peserta ditemukan.</div>
              )}
            </div>

            <div className="p-4 border-t border-surface-variant flex items-center justify-between bg-surface/30">
              <span className="text-body-sm font-body-sm text-on-surface-variant">Menampilkan {indexOfFirstItem + 1} sampai {Math.min(indexOfLastItem, totalItems)} dari {totalItems} entri</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-md transition-colors disabled:opacity-50" disabled={currentPage === 1}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-label-sm font-label-md transition-colors ${currentPage === i + 1 ? 'bg-primary text-on-primary' : 'hover:bg-surface-variant text-on-surface'
                    }`}>{i + 1}</button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-md transition-colors disabled:opacity-50" disabled={currentPage === totalPages}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/25 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-md bg-surface-container-lowest shadow-2xl rounded-2xl overflow-hidden flex flex-col z-10 border border-outline-variant/30">
            <div className="bg-primary p-4 sm:p-5 text-on-primary">
              <h3 className="text-base sm:text-lg font-bold">Tambah Peserta</h3>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-4 sm:p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">NIM</label>
                  <input className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-xs sm:text-sm font-medium" required type="text" placeholder="Masukkan NIM..." value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Nama Lengkap</label>
                  <input className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-xs sm:text-sm font-medium" required type="text" placeholder="Nama..." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Email</label>
                  <input className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-xs sm:text-sm font-medium" required type="email" placeholder="mahasiswa@student.univ.ac.id" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Gugus</label>
                    <select className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary cursor-pointer text-xs sm:text-sm font-medium" value={formData.gugusId} onChange={(e) => setFormData({ ...formData, gugusId: e.target.value })}>
                      <option value="">-- Belum Ditentukan --</option>
                      {gugus.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Jurusan</label>
                    <select className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary cursor-pointer text-xs sm:text-sm font-medium" value={formData.fakultas} onChange={(e) => setFormData({ ...formData, fakultas: e.target.value })}>
                      <option value="">-- Pilih Jurusan --</option>
                      {JURUSAN_LIST.map(group => (
                        <optgroup key={group.group} label={group.group}>
                          {group.options.map(j => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-surface-container-low flex justify-end gap-2.5 border-t border-outline-variant/30">
                <button type="button" className="px-4 py-2 text-xs sm:text-label-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer" onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className="px-4 py-2 text-xs sm:text-label-sm font-bold bg-primary text-on-primary shadow-md hover:bg-primary-fixed rounded-lg transition-all cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/25 backdrop-blur-md" onClick={() => setShowEditModal(false)}></div>
          <div className="relative w-full max-w-md bg-surface-container-lowest shadow-2xl rounded-2xl overflow-hidden flex flex-col z-10 border border-outline-variant/30">
            <div className="bg-primary p-4 sm:p-5 text-on-primary">
              <h3 className="text-base sm:text-lg font-bold">Edit Peserta</h3>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-4 sm:p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">NIM</label>
                  <input className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-xs sm:text-sm font-medium" required type="text" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Nama Lengkap</label>
                  <input className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-xs sm:text-sm font-medium" required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Email</label>
                  <input className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary text-xs sm:text-sm font-medium" required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Gugus</label>
                    <select className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary cursor-pointer text-xs sm:text-sm font-medium" value={formData.gugusId} onChange={(e) => setFormData({ ...formData, gugusId: e.target.value })}>
                      <option value="">-- Belum Ditentukan --</option>
                      {gugus.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Jurusan</label>
                    <select className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-lg border border-outline-variant focus:outline-none focus:border-primary cursor-pointer text-xs sm:text-sm font-medium" value={formData.fakultas} onChange={(e) => setFormData({ ...formData, fakultas: e.target.value })}>
                      <option value="">-- Pilih Jurusan --</option>
                      {JURUSAN_LIST.map(group => (
                        <optgroup key={group.group} label={group.group}>
                          {group.options.map(j => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Status Kehadiran</label>
                  {(() => {
                    const editedStudentHasLogs = logs.some(l => String(l.nim) === String(editStudentId));
                    return (
                      <>
                        <select 
                          disabled={!editedStudentHasLogs}
                          className={`w-full py-2 px-3 rounded-lg border text-xs sm:text-sm font-medium ${
                            editedStudentHasLogs 
                              ? 'bg-surface-container text-on-surface border-outline-variant focus:outline-none focus:border-primary cursor-pointer' 
                              : 'bg-surface-container-low text-on-surface-variant/40 border-outline-variant/30 cursor-not-allowed'
                          }`}
                          value={formData.status} 
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                          <option value="Manual (Pending)">⏳ Manual (Pending)</option>
                        </select>
                        {!editedStudentHasLogs && (
                          <p className="text-[10px] sm:text-xs text-error/85 mt-1 font-sans font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] sm:text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                            Status tidak dapat diubah karena belum ada riwayat log.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-surface-container-low flex justify-end gap-2.5 border-t border-outline-variant/30">
                <button type="button" className="px-4 py-2 text-xs sm:text-label-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer" onClick={() => setShowEditModal(false)}>Batal</button>
                <button type="submit" className="px-4 py-2 text-xs sm:text-label-sm font-bold bg-primary text-on-primary shadow-md hover:bg-primary-fixed rounded-lg transition-all cursor-pointer">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT RESULT MODAL */}
      {importResult && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/25 backdrop-blur-md" onClick={() => setImportResult(null)}></div>
          <div className="relative w-full max-w-md bg-surface-container-lowest shadow-2xl rounded-2xl overflow-hidden flex flex-col z-10 border border-outline-variant/30">
            <div className={`p-4 sm:p-5 text-white ${importResult.added > 0 ? 'bg-[#059669]' : 'bg-error'}`}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[28px]">{importResult.added > 0 ? 'task_alt' : 'error'}</span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Hasil Import</h3>
                  <p className="text-[10px] sm:text-label-sm opacity-85">{importResult.fileName}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#ecfdf5] rounded-xl p-3 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-[#059669]">{importResult.added}</p>
                  <p className="text-[9px] sm:text-label-sm text-[#059669] font-medium">Berhasil Ditambahkan</p>
                </div>
                <div className="bg-[#fef2f2] rounded-xl p-3 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-[#dc2626]">{importResult.skipped}</p>
                  <p className="text-[9px] sm:text-label-sm text-[#dc2626] font-medium">Dilewati</p>
                </div>
              </div>
              {importResult.skippedRows.length > 0 && (
                <div className="bg-surface-container rounded-xl p-3 max-h-32 overflow-y-auto">
                  <p className="text-[10px] sm:text-xs font-semibold text-on-surface-variant mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-error">info</span>
                    Detail baris yang dilewati:
                  </p>
                  <ul className="space-y-1">
                    {importResult.skippedRows.map((msg, i) => (
                      <li key={i} className="text-[10px] sm:text-body-sm text-on-surface-variant font-mono">• {msg}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importResult.added === 0 && importResult.skipped === 0 && (
                <p className="text-xs text-on-surface-variant text-center">Tidak ada data yang dapat diproses.</p>
              )}
            </div>
            <div className="p-3 border-t border-outline-variant/30 flex justify-end">
              <button className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs sm:text-label-sm font-bold hover:bg-primary-fixed transition-all cursor-pointer" onClick={() => setImportResult(null)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
