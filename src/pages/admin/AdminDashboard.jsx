import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { isHadir } from '../../utils/statusHelper';

export default function AdminDashboard() {
  const { peserta, mentors, gugus, logs, hasAdminNotifications } = useContext(AppContext);
  const [chartFilter, setChartFilter] = useState('day');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const navigate = useNavigate();

  const totalPeserta = peserta.length;
  const totalMentor = mentors.length;
  const totalGugus = gugus.length;
  const hadirHariIni = peserta.filter(p => isHadir(p.status)).length;
  const alphaCount = peserta.filter(p => p.status === 'Alpha' || !p.status).length;
  const persentaseKehadiran = totalPeserta > 0 ? ((hadirHariIni / totalPeserta) * 100).toFixed(1) : '0';

  // Get top 5 recent scans
  const recentScans = logs.slice(0, 5);



  const get30MinIntervalData = () => {
    const now = new Date();
    const dataPoints = [];

    for (let i = 4; i >= 0; i--) {
      const endTime = new Date(now.getTime() - i * 30 * 60000);
      const startTime = new Date(endTime.getTime() - 30 * 60000);

      const hours = String(endTime.getHours()).padStart(2, '0');
      const minutes = String(endTime.getMinutes()).padStart(2, '0');
      const label = i === 0 ? 'Sekarang' : `${hours}:${minutes}`;

      const startHours = String(startTime.getHours()).padStart(2, '0');
      const startMinutes = String(startTime.getMinutes()).padStart(2, '0');
      const rangeLabel = i === 0 
        ? `${startHours}:${startMinutes} - Sekarang` 
        : `${startHours}:${startMinutes} - ${hours}:${minutes}`;

      const value = logs.filter(l => {
        if (!l.waktu) return false;
        if (l.status !== 'Valid') return false;
        const logTime = new Date(l.waktu).getTime();
        return logTime >= startTime.getTime() && logTime < endTime.getTime();
      }).length;

      dataPoints.push({ label, rangeLabel, value });
    }

    return dataPoints;
  };

  const intervalPointsData = get30MinIntervalData();

  const c1 = intervalPointsData[0].value;
  const c2 = intervalPointsData[1].value;
  const c3 = intervalPointsData[2].value;
  const c4 = intervalPointsData[3].value;
  const c5 = intervalPointsData[4].value;

  const l1 = intervalPointsData[0].label;
  const l2 = intervalPointsData[1].label;
  const l3 = intervalPointsData[2].label;
  const l4 = intervalPointsData[3].label;
  const l5 = intervalPointsData[4].label;

  const r1 = intervalPointsData[0].rangeLabel;
  const r2 = intervalPointsData[1].rangeLabel;
  const r3 = intervalPointsData[2].rangeLabel;
  const r4 = intervalPointsData[3].rangeLabel;
  const r5 = intervalPointsData[4].rangeLabel;

  const getLogsCountForDate = (dateOffset) => {
    const d = new Date();
    d.setDate(d.getDate() - dateOffset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return logs.filter(l => l.date === dateStr && l.status === 'Valid').length;
  };

  const w1 = getLogsCountForDate(1); // Hari 1 (Kemarin)
  const w2 = getLogsCountForDate(0); // Hari 2 (Hari Ini)

  const maxVal = chartFilter === 'day' 
    ? Math.max(c1, c2, c3, c4, c5, 5) 
    : Math.max(w1, w2, 5);

  const yVal = (count) => 275 - (count / maxVal) * 225;

  const y1 = yVal(c1);
  const y2 = yVal(c2);
  const y3 = yVal(c3);
  const y4 = yVal(c4);
  const y5 = yVal(c5);

  const wy1 = yVal(w1);
  const wy2 = yVal(w2);

  const points = chartFilter === 'day' ? [
    { cx: 0, cy: y1, label: l1, rangeLabel: r1, value: c1 },
    { cx: 200, cy: y2, label: l2, rangeLabel: r2, value: c2 },
    { cx: 400, cy: y3, label: l3, rangeLabel: r3, value: c3 },
    { cx: 600, cy: y4, label: l4, rangeLabel: r4, value: c4 },
    { cx: 800, cy: y5, label: l5, rangeLabel: r5, value: c5 },
  ] : [
    { cx: 0, cy: wy1, label: 'Hari 1 (Kemarin)', rangeLabel: 'Kemarin', value: w1 },
    { cx: 800, cy: wy2, label: 'Hari 2 (Hari Ini)', rangeLabel: 'Hari Ini', value: w2 },
  ];

  return (
<div className="w-full"><header className="fixed top-0 left-[280px] right-0 h-16 bg-surface/60 backdrop-blur-xl z-40 flex items-center justify-between px-margin-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="flex items-center gap-4"><h1 className="text-headline-sm font-headline-md text-on-surface">Ikhtisar Sistem</h1></div><div className="flex items-center gap-6"><div className="relative group"><span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/admin/notifikasi')}>notifications</span>{hasAdminNotifications && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>}</div></div></header><main className="relative pt-16 min-h-screen px-margin-desktop py-gutter max-w-container-max mx-auto"><div className="flex flex-col w-full gap-8 pb-12">
{/* Top Stats Row */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
{/* Card 1: Total Peserta */}
<div className="bg-surface-container-lowest rounded-[16px] p-6 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer" onClick={() => navigate('/admin/peserta')}>
<div className="flex items-center justify-between mb-4">
<p className="text-label-md text-on-surface-variant uppercase tracking-wider">Total Peserta</p>
<div className="w-8 h-8 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center">
<span className="material-symbols-outlined text-primary text-[18px]">group</span>
</div>
</div>
<h3 className="text-headline-lg font-headline-md text-on-surface">{totalPeserta}</h3>
</div>
{/* Card 2: Total Mentor */}
<div className="bg-surface-container-lowest rounded-[16px] p-6 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer" onClick={() => navigate('/admin/mentor')}>
<div className="flex items-center justify-between mb-4">
<p className="text-label-md text-on-surface-variant uppercase tracking-wider">Total Mentor</p>
<div className="w-8 h-8 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center">
<span className="material-symbols-outlined text-primary text-[18px]">school</span>
</div>
</div>
<h3 className="text-headline-lg font-headline-md text-on-surface">{totalMentor}</h3>
</div>
{/* Card 3: Total Gugus */}
<div className="bg-surface-container-lowest rounded-[16px] p-6 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer" onClick={() => navigate('/admin/gugus')}>
<div className="flex items-center justify-between mb-4">
<p className="text-label-md text-on-surface-variant uppercase tracking-wider">Total Gugus</p>
<div className="w-8 h-8 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center">
<span className="material-symbols-outlined text-primary text-[18px]">grid_view</span>
</div>
</div>
<h3 className="text-headline-lg font-headline-md text-on-surface">{totalGugus}</h3>
</div>
{/* Card 4: Hadir Hari Ini */}
<div className="bg-surface-container-lowest rounded-[16px] p-6 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer" onClick={() => navigate('/admin/riwayat')}>
<div className="flex items-center justify-between mb-4">
<p className="text-label-md text-on-surface-variant uppercase tracking-wider">Hadir Hari Ini</p>
<div className="w-8 h-8 rounded-full bg-[#ecfdf5] flex items-center justify-center">
<span className="material-symbols-outlined text-[#059669] text-[18px]">check_circle</span>
</div>
</div>
<h3 className="text-headline-lg font-headline-md text-on-surface">{hadirHariIni}</h3>
</div>
{/* Card 5: Belum Hadir */}
<div className="bg-surface-container-lowest rounded-[16px] p-6 shadow-[0_10px_30px_rgba(13,27,77,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-pointer" onClick={() => navigate('/admin/peserta')}>
<div className="flex items-center justify-between mb-4">
<p className="text-label-md text-on-surface-variant uppercase tracking-wider">Belum Hadir</p>
<div className="w-8 h-8 rounded-full bg-[#fef2f2] flex items-center justify-center">
<span className="material-symbols-outlined text-[#ef4444] text-[18px]">cancel</span>
</div>
</div>
<h3 className="text-headline-lg font-headline-md text-on-surface">{alphaCount}</h3>
</div>
{/* Card 6: Persentase Kehadiran */}
<div className="bg-primary rounded-[16px] p-6 shadow-[0_10px_30px_rgba(20,44,142,0.15)] text-on-primary">
<div className="flex items-center justify-between mb-4">
<p className="text-label-md text-primary-container uppercase tracking-wider">Kehadiran</p>
<div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
<span className="material-symbols-outlined text-on-primary text-[18px]">percent</span>
</div>
</div>
<h3 className="text-headline-lg font-headline-md text-on-primary">{persentaseKehadiran}%</h3>
<div className="mt-4 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
<div className="h-full bg-[#10b981] rounded-full transition-all duration-500" style={{ width: `${persentaseKehadiran}%` }}></div>
</div>
</div>
</div>
{/* Main Content Area: Chart and Recent Activity Grid */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
{/* Chart Section (Spans 2 columns) */}
<div className="lg:col-span-2 bg-surface-container-lowest rounded-[16px] p-6 shadow-[0_10px_30px_rgba(13,27,77,0.05)] flex flex-col">
<div className="flex items-center justify-between mb-6">
<div>
<h2 className="text-headline-sm font-headline-md text-on-surface">Tren Kehadiran</h2>
<p className="text-body-sm text-on-surface-variant mt-1">{chartFilter === 'day' ? 'Kecepatan Scan (Interval 30 Menit - 2.5 Jam Terakhir)' : 'Kehadiran Harian (2 Hari Terakhir)'}</p>
</div>
<div className="flex gap-2">
<button onClick={() => setChartFilter('week')} className={`px-3 py-1.5 text-label-sm rounded-lg transition-colors ${chartFilter === 'week' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface hover:bg-surface-variant'}`}>Hari</button>
<button onClick={() => setChartFilter('day')} className={`px-3 py-1.5 text-label-sm rounded-lg transition-colors ${chartFilter === 'day' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface hover:bg-surface-variant'}`}>Jam</button>
</div>
</div>
<div className="flex-1 relative min-h-[300px] w-full flex items-end">
  {/* Simple SVG Area Chart Representation */}
  <svg className="w-full h-full preserve-aspect-ratio-none" preserveAspectRatio="none" viewBox="0 0 800 300">
    <defs>
      <linearGradient id="chart-gradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#142c8e" stop-opacity="0.2"></stop>
        <stop offset="100%" stop-color="#142c8e" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    {/* Grid Lines */}
    <g className="text-outline-variant/30 stroke-current">
      <line strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="50" y2="50"></line>
      <line strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="125" y2="125"></line>
      <line strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="200" y2="200"></line>
      <line strokeWidth="1" x1="0" x2="800" y1="275" y2="275"></line>
    </g>
    {/* Area Path changes depending on chartFilter */}
    {chartFilter === 'day' ? (
      <>
        <path d={`M0,275 L0,${y1} C100,${y1} 150,${y2} 200,${y2} C250,${y2} 300,${y3} 400,${y3} C500,${y3} 550,${y4} 600,${y4} C650,${y4} 700,${y5} 800,${y5} L800,275 Z`} fill="url(#chart-gradient)"></path>
        <path d={`M0,${y1} C100,${y1} 150,${y2} 200,${y2} C250,${y2} 300,${y3} 400,${y3} C500,${y3} 550,${y4} 600,${y4} C650,${y4} 700,${y5} 800,${y5}`} fill="none" stroke="#142c8e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
        <g className="text-label-sm fill-on-surface-variant">
          <text x="0" y="295" textAnchor="start">{l1}</text>
          <text x="200" y="295" textAnchor="middle">{l2}</text>
          <text x="400" y="295" textAnchor="middle">{l3}</text>
          <text x="600" y="295" textAnchor="middle">{l4}</text>
          <text x="800" y="295" textAnchor="end">{l5}</text>
        </g>
      </>
    ) : (
      <>
        <path d={`M0,275 L0,${wy1} C200,${wy1} 600,${wy2} 800,${wy2} L800,275 Z`} fill="url(#chart-gradient)"></path>
        <path d={`M0,${wy1} C200,${wy1} 600,${wy2} 800,${wy2}`} fill="none" stroke="#142c8e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
        <g className="text-label-sm fill-on-surface-variant" text-anchor="middle">
          <text x="50" y="295">Hari 1 (Kemarin)</text>
          <text x="750" y="295">Hari 2 (Hari Ini)</text>
        </g>
      </>
    )}

    {/* Interactive Hover Dots */}
    <g fill="#ffffff" stroke="#142c8e" strokeWidth="2">
      {points.map((pt, idx) => (
        <circle 
          key={idx} 
          cx={pt.cx} 
          cy={pt.cy} 
          r={hoveredPoint?.label === pt.label ? "7" : "4.5"} 
          className="transition-all duration-150"
        ></circle>
      ))}
    </g>

    {/* Large invisible circle targets for easy hovering */}
    <g>
      {points.map((pt, idx) => (
        <circle 
          key={idx} 
          cx={pt.cx} 
          cy={pt.cy} 
          r="30" 
          fill="transparent" 
          className="cursor-pointer pointer-events-auto"
          onMouseEnter={() => setHoveredPoint(pt)}
          onMouseLeave={() => setHoveredPoint(null)}
        ></circle>
      ))}
    </g>
  </svg>

  {/* Absolute Tooltip Overlay */}
  {hoveredPoint && (
    <div 
      className="absolute bg-surface-container-high/95 backdrop-blur text-on-surface text-label-md px-3 py-2 rounded-xl shadow-lg border border-outline-variant pointer-events-none transition-all duration-150 z-20 flex flex-col gap-0.5 -translate-x-1/2 -translate-y-[calc(100%+14px)] min-w-[120px] text-center"
      style={{
        left: `${(hoveredPoint.cx / 800) * 100}%`,
        top: `${(hoveredPoint.cy / 300) * 100}%`,
      }}
    >
      <span className="font-semibold text-primary text-body-sm">{hoveredPoint.label}</span>
      <span className="text-label-lg font-bold text-on-surface">{hoveredPoint.value} <span className="text-body-sm font-normal text-on-surface-variant">Hadir</span></span>
    </div>
  )}
</div>
</div>
{/* Recent Activity Section (Spans 1 column) */}
<div className="bg-surface-container-lowest rounded-[16px] p-6 shadow-[0_10px_30px_rgba(13,27,77,0.05)] flex flex-col">
<div className="flex items-center justify-between mb-6 pb-4 relative">
<h2 className="text-headline-sm font-headline-md text-on-surface">Scan Terbaru</h2>
<button className="text-label-sm text-secondary hover:text-primary transition-colors" onClick={() => navigate('/admin/riwayat')}>Lihat Semua</button>
<div className="absolute bottom-0 left-0 right-0 h-px bg-outline-variant/30"></div>
</div>
<div className="flex-1 overflow-y-auto pr-2 space-y-4">
  {recentScans.length > 0 ? (
    recentScans.map((log) => (
      <div key={log.id} className="flex items-start gap-4 group cursor-default">
        <div className="w-10 h-10 rounded-full flex-shrink-0 bg-primary/10 flex items-center justify-center text-primary font-bold">
          {log.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-medium text-on-surface truncate group-hover:text-primary transition-colors">{log.name}</p>
          <p className="text-body-sm text-on-surface-variant truncate">{log.gugusName} • {log.scanner}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-label-sm text-on-surface-variant">{log.timestamp}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            log.status === 'Valid' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-error-container/50 text-error'
          }`}>{log.status}</span>
        </div>
      </div>
    ))
  ) : (
    <div className="text-center py-8 text-on-surface-variant text-body-md">Tidak ada log aktivitas scan terbaru.</div>
  )}
</div>
</div>
</div>
</div></main></div>
  );
}
