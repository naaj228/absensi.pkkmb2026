// Status kehadiran peserta PKKMB
export const STATUS = {
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
      return { label: status || 'Alpha', bg: 'bg-gray-500/15',  text: 'text-gray-600',   dot: 'bg-gray-400'   };
  }
}

// Returns true if the student is considered "present" (full or partial)
export function isHadir(status) {
  return status === STATUS.HADIR_PENUH || status === STATUS.HADIR_SEBAGIAN || status === STATUS.IZIN;
}

// Returns true if the student is considered "not attended"
export function isAlpha(status) {
  return status === STATUS.ALPHA || !status;
}

// All selectable statuses for dropdowns (excludes internal pending/ditolak)
export const STATUS_OPTIONS = [
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
