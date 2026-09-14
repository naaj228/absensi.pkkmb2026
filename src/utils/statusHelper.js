// Status kehadiran peserta PKKMB
export const STATUS = {
  BELUM_HADIR:    'Belum Hadir',
  HADIR_PENUH:    'Hadir Penuh',
  HADIR_SEBAGIAN: 'Hadir Sebagian',
  IZIN:           'Izin',
  ALPHA:          'Alpha',
  PENDING:        'Manual (Pending)',
  DITOLAK:        'Manual (Ditolak)',
};

// Badge config: { label, bg, text, dot }
export function getStatusBadge(status) {
  switch (status) {
    case STATUS.BELUM_HADIR:
      return { label: 'Belum Hadir',    bg: 'bg-slate-500/15',  text: 'text-slate-700',  dot: 'bg-slate-500'  };
    case STATUS.HADIR_PENUH:
      return { label: 'Hadir Penuh',    bg: 'bg-green-500/15',  text: 'text-green-700',  dot: 'bg-green-500'  };
    case STATUS.HADIR_SEBAGIAN:
      return { label: 'Hadir Sebagian', bg: 'bg-amber-500/15',  text: 'text-amber-700',  dot: 'bg-amber-500'  };
    case STATUS.IZIN:
      return { label: 'Izin',           bg: 'bg-blue-500/15',   text: 'text-blue-700',   dot: 'bg-blue-500'   };
    case STATUS.ALPHA:
      return { label: 'Alpha',          bg: 'bg-red-500/15',    text: 'text-red-700',    dot: 'bg-red-500'    };
    case STATUS.PENDING:
      return { label: 'Pending',        bg: 'bg-yellow-500/15', text: 'text-yellow-700', dot: 'bg-yellow-400' };
    case STATUS.DITOLAK:
      return { label: 'Ditolak',        bg: 'bg-red-500/10',    text: 'text-red-500',    dot: 'bg-red-400'    };
    default:
      return { label: status || 'Belum Hadir', bg: 'bg-slate-500/15',  text: 'text-slate-600',   dot: 'bg-slate-400'   };
  }
}

// Returns true if the student is considered "present" (full or partial)
export function isHadir(status) {
  return status === STATUS.HADIR_PENUH || status === STATUS.HADIR_SEBAGIAN || status === STATUS.IZIN;
}

// Returns true if the student is considered "not attended"
export function isAlpha(status) {
  return status === STATUS.ALPHA || status === STATUS.BELUM_HADIR || !status;
}

// All selectable statuses for dropdowns (excludes internal pending/ditolak)
export const STATUS_OPTIONS = [
  { value: STATUS.BELUM_HADIR,    label: '⚪ Belum Hadir' },
  { value: STATUS.HADIR_PENUH,    label: '✅ Hadir Penuh' },
  { value: STATUS.HADIR_SEBAGIAN, label: '🟡 Hadir Sebagian' },
  { value: STATUS.IZIN,           label: '📄 Izin' },
  { value: STATUS.ALPHA,          label: '❌ Alpha' },
];

// Statuses available for manual claim submission (mentor)
export const CLAIM_STATUS_OPTIONS = [
  { value: STATUS.HADIR_PENUH,    label: '✅ Hadir Penuh — Hadir keseluruhan acara' },
  { value: STATUS.HADIR_SEBAGIAN, label: '🟡 Hadir Sebagian — Pulang lebih awal / terlambat' },
  { value: STATUS.IZIN,           label: '📄 Izin — Ada keperluan resmi / sakit' },
];

// Map a scan log item to display status & badge styling
export function getLogDisplayStatus(log) {
  if (!log) return { label: 'Scan Gagal', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', pdfBadge: 'background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;' };
  
  if (log.status === 'Alpha' || log.isAlpha) {
    return {
      label: 'Alpha',
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      pdfBadge: 'background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;'
    };
  }

  if (log.status === 'Belum Hadir' || log.isBelumHadir) {
    return {
      label: 'Belum Hadir',
      bg: 'bg-slate-100 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
      pdfBadge: 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;'
    };
  }

  if (log.status === 'Valid') {
    if (log.note && (log.note.includes('Hadir Sebagian') || log.note.includes('Sebagian'))) {
      return { 
        label: 'Hadir Sebagian', 
        bg: 'bg-amber-50 text-amber-700 border-amber-200', 
        dot: 'bg-amber-500', 
        pdfBadge: 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;' 
      };
    }
    if (log.note && log.note.includes('Izin')) {
      return { 
        label: 'Izin', 
        bg: 'bg-blue-50 text-blue-700 border-blue-200', 
        dot: 'bg-blue-500', 
        pdfBadge: 'background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;' 
      };
    }
    return { 
      label: 'Hadir Penuh', 
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
      dot: 'bg-emerald-500', 
      pdfBadge: 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;' 
    };
  }
  return { 
    label: 'Scan Gagal', 
    bg: 'bg-rose-50 text-rose-700 border-rose-200', 
    dot: 'bg-rose-500', 
    pdfBadge: 'background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;' 
  };
}
