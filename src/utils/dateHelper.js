// Utility helpers for date formatting and grouping across absensi PKKMB 2026
import { getLogDisplayStatus } from './statusHelper';

export function toISOKey(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
      // DD-MM-YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return dateStr;
}

export function getTodayISOKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTodayDate(dateStr) {
  if (!dateStr) return false;
  return toISOKey(dateStr) === getTodayISOKey();
}

export function formatDDMMYYYY(dateStr) {
  if (!dateStr) return '-';
  const isoKey = toISOKey(dateStr);
  const parts = isoKey.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

export function formatIndonesianDate(dateStr) {
  if (!dateStr) return '-';
  const isoKey = toISOKey(dateStr);
  const parts = isoKey.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
  }
  return dateStr;
}

const INDO_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatFriendlyDateTime(dateStr, timeStr = '') {
  if (!dateStr) return timeStr || 'Baru saja';
  
  const todayKey = getTodayISOKey();
  const dateKey = toISOKey(dateStr);
  
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yYear = d.getFullYear();
  const yMonth = String(d.getMonth() + 1).padStart(2, '0');
  const yDay = String(d.getDate()).padStart(2, '0');
  const yesterdayKey = `${yYear}-${yMonth}-${yDay}`;

  const cleanTime = timeStr ? String(timeStr).trim().replace(/:\d{2}$/, '') : '';
  const timeSuffix = cleanTime ? ` pukul ${cleanTime} WIB` : '';

  if (dateKey === todayKey) {
    return `Hari ini${timeSuffix}`;
  }
  if (dateKey === yesterdayKey) {
    return `Kemarin${timeSuffix}`;
  }

  const parts = dateKey.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    const monthName = INDO_MONTHS_SHORT[monthIdx] || parts[1];
    return `${day} ${monthName} ${year}${timeSuffix}`;
  }

  return `${dateStr}${timeSuffix}`;
}

/**
 * Group logs by date (ISO YYYY-MM-DD key)
 * returns an array of objects:
 * [
 *   {
 *     isoDate: '2026-09-07',
 *     displayDateFormatted: '07-09-2026',
 *     indonesianDate: 'Senin, 07 September 2026',
 *     logs: [ ... ],
 *     totalValid: 65,
 *     totalInvalid: 2
 *   },
 *   ...
 * ]
 * @param {Array} logsList 
 * @param {boolean} newestFirst - if true, latest date is first (for web display); if false, oldest date is first (for export)
 */
export function groupLogsByDate(logsList, newestFirst = true) {
  if (!logsList || logsList.length === 0) return [];

  const map = {};
  logsList.forEach(log => {
    const key = toISOKey(log.date) || 'Lainnya';
    if (!map[key]) {
      map[key] = {
        isoDate: key,
        rawDate: log.date,
        displayDateFormatted: formatDDMMYYYY(log.date),
        indonesianDate: formatIndonesianDate(log.date),
        logs: [],
        totalValid: 0,
        totalInvalid: 0,
        totalHadir: 0,
        totalBelumHadir: 0
      };
    }
    map[key].logs.push(log);
    const displayStatus = getLogDisplayStatus(log);
    if (displayStatus.label === 'Hadir Penuh' || displayStatus.label === 'Hadir Sebagian') {
      map[key].totalHadir += 1;
      map[key].totalValid += 1;
    } else if (displayStatus.label === 'Belum Hadir') {
      map[key].totalBelumHadir += 1;
      map[key].totalInvalid += 1;
    } else {
      map[key].totalInvalid += 1;
    }
  });

  const sortedKeys = Object.keys(map).sort((a, b) => {
    if (a === 'Lainnya') return 1;
    if (b === 'Lainnya') return -1;
    return newestFirst ? b.localeCompare(a) : a.localeCompare(b);
  });

  return sortedKeys.map(key => map[key]);
}

export function checkScannerOperationalStatus(settings) {
  if (!settings) return { isOpen: true, message: '' };

  const mode = settings.scannerStatus || 'auto';
  if (mode === 'open') {
    return { isOpen: true, message: 'Scanner dibuka secara manual oleh Admin.' };
  }
  if (mode === 'closed') {
    return { isOpen: false, message: 'Scanner telah ditutup secara manual oleh Admin.' };
  }

  const startTime = settings.startTime || '07:00';
  const endTime = settings.endTime || '12:00';

  const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const currentMinutes = nowWib.getHours() * 60 + nowWib.getMinutes();

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  if (currentMinutes < startMinutes) {
    return {
      isOpen: false,
      message: `Presensi belum dibuka. Jam operasional scanner hari ini: ${startTime} - ${endTime} WIB.`
    };
  }

  if (currentMinutes > endMinutes) {
    return {
      isOpen: false,
      message: `Presensi sudah ditutup. Jam operasional scanner hari ini: ${startTime} - ${endTime} WIB.`
    };
  }

  return {
    isOpen: true,
    message: `Scanner aktif (Jam Operasional: ${startTime} - ${endTime} WIB)`
  };
}

export function checkIsLate(onTimeLimit = '07:30') {
  if (!onTimeLimit) return { isLate: false, currentTimeStr: '', diffMinutes: 0 };
  
  const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const hours = String(nowWib.getHours()).padStart(2, '0');
  const minutes = String(nowWib.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  const currentMinutes = nowWib.getHours() * 60 + nowWib.getMinutes();
  const [limitH, limitM] = onTimeLimit.split(':').map(Number);
  const limitMinutes = (limitH || 0) * 60 + (limitM || 0);

  const isLate = currentMinutes > limitMinutes;
  const diffMinutes = Math.max(0, currentMinutes - limitMinutes);

  return {
    isLate,
    currentTimeStr,
    diffMinutes,
    limitTimeStr: onTimeLimit
  };
}
