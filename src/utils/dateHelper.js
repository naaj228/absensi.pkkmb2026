// Utility helpers for date formatting and grouping across absensi PKKMB 2026

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
        totalInvalid: 0
      };
    }
    map[key].logs.push(log);
    if (log.status === 'Valid') {
      map[key].totalValid += 1;
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
