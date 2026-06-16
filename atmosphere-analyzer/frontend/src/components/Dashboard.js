import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './Dashboard.css';

import { API_URL, WS_URL, ALERT_METRICS, CITY_COLORS } from './dashboard/constants';
import { toF, detectAnomalies, readUrlParams } from './dashboard/utils';
import DashNav      from './dashboard/DashNav';
import CitySearch   from './dashboard/CitySearch';
import StatCards    from './dashboard/StatCards';
import ChartCard    from './dashboard/ChartCard';
import ForecastCard from './dashboard/ForecastCard';
import SensorMap    from './dashboard/SensorMap';
import SidePanel    from './dashboard/SidePanel';
import HeatmapCard  from './dashboard/HeatmapCard';
import AlertsConfig from './dashboard/AlertsConfig';

// ── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const urlState = useMemo(() => readUrlParams(), []); // eslint-disable-line

  // Core data
  const [data, setData]         = useState({ temperature: [], humidity: [], wind_speed: [], air_quality: [], timestamps: [] });
  const [locations, setLocations] = useState([]);
  const [locHistory, setLocHistory] = useState({});
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [connMode, setConnMode] = useState('connecting');

  // View controls
  const [isPaused, setIsPaused]         = useState(false);
  const [tempUnit, setTempUnit]         = useState(urlState.tempUnit);
  const [windowMinutes, setWindowMinutes] = useState(urlState.windowMinutes);
  const [selectedCity, setSelectedCity] = useState(urlState.selectedCity);
  const [chartMode, setChartMode]       = useState(urlState.chartMode);
  const [cmpMetric, setCmpMetric]       = useState(urlState.compareMetric);
  const [theme, setTheme]               = useState(urlState.theme);
  const [fcastCity, setFcastCity]       = useState('New York');
  const [showSearch, setShowSearch]     = useState(false);
  const [shareToast, setShareToast]     = useState(false);

  // Alerts
  const [alertCfg, setAlertCfg]       = useState(
    Object.fromEntries(ALERT_METRICS.map(m => [m.key, { enabled: false, value: m.defaultThreshold }]))
  );
  const [activeAlerts, setActiveAlerts] = useState([]);

  const pausedRef    = useRef(false);
  const alertCfgRef  = useRef(alertCfg);
  const tempUnitRef  = useRef(tempUnit);
  const prevLocsRef  = useRef({});
  const dashRef      = useRef(null);

  useEffect(() => { pausedRef.current   = isPaused;  }, [isPaused]);
  useEffect(() => { alertCfgRef.current = alertCfg;  }, [alertCfg]);
  useEffect(() => { tempUnitRef.current = tempUnit;  }, [tempUnit]);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aa-theme', theme);
  }, [theme]);

  // URL sync
  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedCity)         p.set('city',   selectedCity);
    if (windowMinutes !== 5)  p.set('window', windowMinutes);
    if (chartMode !== 'single')       p.set('mode',   chartMode);
    if (cmpMetric !== 'temperature')  p.set('metric', cmpMetric);
    if (tempUnit !== 'C')     p.set('unit',   tempUnit);
    if (theme !== 'light')    p.set('theme',  theme);
    window.history.replaceState({}, '', p.toString() ? `?${p}` : window.location.pathname);
  }, [selectedCity, windowMinutes, chartMode, cmpMetric, tempUnit, theme]);

  // Alert threshold crossings
  useEffect(() => {
    if (!locations.length) return;
    const cfg  = alertCfgRef.current;
    const unit = tempUnitRef.current;
    const newAlerts = [];
    locations.forEach(loc => {
      const prev = prevLocsRef.current[loc.id];
      ALERT_METRICS.forEach(({ key, label }) => {
        const c = cfg[key];
        if (!c?.enabled) return;
        let val = loc[key], prevVal = prev?.[key] ?? null;
        if (key === 'temperature' && unit === 'F') { val = toF(val); if (prevVal != null) prevVal = toF(prevVal); }
        if (val > c.value && (prevVal == null || prevVal <= c.value)) {
          const u = key === 'temperature' ? `°${unit}` : key === 'humidity' ? '%' : key === 'wind_speed' ? ' m/s' : ' AQI';
          newAlerts.push({ id: `${loc.id}-${key}-${Date.now()}`, city: loc.name, metric: label, value: val.toFixed(key === 'air_quality' ? 0 : 1), threshold: c.value, unit: u });
        }
      });
      prevLocsRef.current[loc.id] = { ...loc };
    });
    if (newAlerts.length) {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      newAlerts.forEach(a => {
        if ('Notification' in window && Notification.permission === 'granted')
          new Notification(`${a.metric} Alert — ${a.city}`, { body: `${a.metric} hit ${a.value}${a.unit}` });
      });
      setActiveAlerts(p => [...newAlerts, ...p].slice(0, 8));
    }
  }, [locations]); // eslint-disable-line

  // WebSocket + polling
  useEffect(() => {
    let ws = null, poll = null;

    const applyReading = sd => {
      if (pausedRef.current) return;
      setData(p => ({
        temperature: [...p.temperature, sd.temperature],
        humidity:    [...p.humidity,    sd.humidity],
        wind_speed:  [...p.wind_speed,  sd.wind_speed],
        air_quality: [...p.air_quality, sd.air_quality],
        timestamps:  [...p.timestamps,  Date.now()],
      }));
      setUpdatedAt(Date.now()); setLoading(false);
    };

    const applyLocs = locs => {
      if (pausedRef.current) return;
      setLocations(locs); setUpdatedAt(Date.now());
      setLocHistory(p => {
        const n = { ...p };
        locs.forEach(loc => {
          const ex = n[loc.id] || { ...loc, temperature: [], humidity: [], wind_speed: [], air_quality: [], timestamps: [] };
          ex.temperature = [...ex.temperature, loc.temperature].slice(-20);
          ex.humidity    = [...ex.humidity,    loc.humidity   ].slice(-20);
          ex.wind_speed  = [...ex.wind_speed,  loc.wind_speed ].slice(-20);
          ex.air_quality = [...ex.air_quality, loc.air_quality].slice(-20);
          ex.timestamps  = [...(ex.timestamps || []), Date.now()].slice(-20);
          n[loc.id] = ex;
        });
        return n;
      });
    };

    const applyEvents = evs => {
      if (!evs?.length) return;
      setEvents(p => {
        const seen  = new Set(p.map(e => e.timestamp + e.message));
        const fresh = evs.filter(e => !seen.has(e.timestamp + e.message));
        return fresh.length ? [...fresh, ...p].slice(0, 100) : p;
      });
    };

    const startPoll = () => {
      if (poll) return;
      setConnMode('polling');
      const run = async () => {
        if (pausedRef.current) return;
        try {
          const [s, l] = await Promise.all([
            axios.get(`${API_URL}/api/sensor-data/`),
            axios.get(`${API_URL}/api/sensor-locations/`),
          ]);
          applyReading(s.data); applyLocs(l.data.locations || []); setError(null);
        } catch { setError('Connection lost — retrying…'); setLoading(false); }
      };
      run(); poll = setInterval(run, 5000);
    };

    const connectWs = async () => {
      let url = WS_URL;
      try { const r = await axios.get(`${API_URL}/api/auth/token/`); url = `${WS_URL}?token=${r.data.token}`; } catch {}
      ws = new WebSocket(url);
      ws.onopen    = () => { setConnMode('live'); setError(null); };
      ws.onmessage = e => {
        const p = JSON.parse(e.data);
        if (p.type === 'sensor_update') { applyReading(p.sensor_data); applyLocs(p.locations || []); applyEvents(p.recent_events); }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => startPoll();
    };
    connectWs();
    return () => { ws?.close(); if (poll) clearInterval(poll); };
  }, []); // eslint-disable-line

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectCity = useCallback((id, name) => {
    setSelectedCity(id);
    if (name) setFcastCity(name.split(',')[0].trim());
  }, []);

  const handleAddCity = useCallback(async result => {
    const name = result.state ? `${result.name}, ${result.state}` : result.name;
    try { await axios.post(`${API_URL}/api/custom-cities/`, { name, city: result.name, country: result.country, latitude: result.lat, longitude: result.lon }); } catch {}
    setShowSearch(false);
  }, []);

  const handleRemoveCity = useCallback(async id => {
    try { await axios.delete(`${API_URL}/api/custom-cities/${id}/`); } catch {}
  }, []);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => { setShareToast(true); setTimeout(() => setShareToast(false), 2500); });
  }, []);

  const handleExportCsv = useCallback(() => {
    const ppm  = 12;
    const wPts = Math.max(1, windowMinutes * ppm);
    const cityHist = selectedCity ? locHistory[selectedCity] : null;
    const aTs  = cityHist ? (cityHist.timestamps || []) : data.timestamps;
    const aCel = cityHist ? cityHist.temperature  : data.temperature;
    const aHum = cityHist ? cityHist.humidity     : data.humidity;
    const aWnd = cityHist ? cityHist.wind_speed   : data.wind_speed;
    const aAir = cityHist ? cityHist.air_quality  : data.air_quality;
    const wTs  = aTs.slice(-wPts);
    const wCel = aCel.slice(-wPts);
    const wHum = aHum.slice(-wPts);
    const wWnd = aWnd.slice(-wPts);
    const wAir = aAir.slice(-wPts);
    const hdrs = ['timestamp', 'temperature_c', 'temperature_f', 'humidity', 'wind_speed', 'air_quality'];
    const rows = wTs.map((ts, i) => [
      new Date(ts).toISOString(), (wCel[i] ?? 0).toFixed(2), (toF(wCel[i] ?? 0)).toFixed(2),
      (wHum[i] ?? 0).toFixed(2), (wWnd[i] ?? 0).toFixed(2), (wAir[i] ?? 0).toFixed(0),
    ]);
    const csv = [hdrs.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `atmosphere-${windowMinutes}m.csv`,
    });
    document.body.appendChild(a); a.click(); a.remove();
  }, [data, locHistory, selectedCity, windowMinutes]);

  const handleExportPdf = useCallback(async () => {
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF }                = await import('jspdf');
    if (!dashRef.current) return;
    const canvas = await html2canvas(dashRef.current, { scale: 1.5, useCORS: true });
    const img    = canvas.toDataURL('image/png');
    const pdf    = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 1.5, canvas.height / 1.5] });
    pdf.addImage(img, 'PNG', 0, 0, canvas.width / 1.5, canvas.height / 1.5);
    pdf.save(`atmosphere-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const ppm      = 12;
  const wPts     = Math.max(1, windowMinutes * ppm);
  const cityHist = selectedCity ? locHistory[selectedCity] : null;

  const aTemps    = cityHist ? cityHist.temperature  : data.temperature;
  const aHumidity = cityHist ? cityHist.humidity     : data.humidity;
  const aWind     = cityHist ? cityHist.wind_speed   : data.wind_speed;
  const aAir      = cityHist ? cityHist.air_quality  : data.air_quality;
  const aTs       = cityHist ? (cityHist.timestamps || []) : data.timestamps;

  const wCelsius  = aTemps.slice(-wPts);
  const wHumidity = aHumidity.slice(-wPts);
  const wWind     = aWind.slice(-wPts);
  const wAir      = aAir.slice(-wPts);
  const wTimestamps = aTs.slice(-wPts);
  const wTemps    = tempUnit === 'C' ? wCelsius : wCelsius.map(toF);

  const anomT     = useMemo(() => detectAnomalies(wTemps),    [wTemps]);    // eslint-disable-line
  const anomA     = useMemo(() => detectAnomalies(wAir),      [wAir]);      // eslint-disable-line
  const anomCount = useMemo(() => [...anomT, ...anomA].filter(Boolean).length, [anomT, anomA]);

  const isDark = theme === 'dark';
  const gridC  = isDark ? 'rgba(51,65,85,0.5)'   : 'rgba(226,232,240,0.8)';
  const tickC  = isDark ? '#64748b'               : '#94a3b8';
  const bordC  = isDark ? '#334155'               : '#e2e8f0';

  const timeLabels = wTimestamps.map(ts =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const ptStyle = (anom, base) => ({
    pointRadius:          anom.map(a => a ? 5 : 0),
    pointHoverRadius:     anom.map(a => a ? 7 : 5),
    pointBackgroundColor: anom.map(a => a ? '#ef4444' : base),
    pointBorderColor:     anom.map(a => a ? '#fff' : 'transparent'),
    pointBorderWidth:     anom.map(a => a ? 2 : 0),
  });

  const singleChart = useMemo(() => ({
    labels: timeLabels,
    datasets: [
      { label: `Temp (°${tempUnit})`, data: wTemps,    borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.05)', fill: true, tension: 0.4, borderWidth: 2, ...ptStyle(anomT, '#818cf8') },
      { label: 'Humidity (%)',        data: wHumidity, borderColor: '#c084fc', backgroundColor: 'rgba(192,132,252,0.05)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 },
      { label: 'Wind (m/s)',          data: wWind,     borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.05)',  fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 },
      { label: 'AQI',                 data: wAir,      borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.05)', fill: true, tension: 0.4, borderWidth: 2, ...ptStyle(anomA, '#22d3ee') },
    ],
  }), [timeLabels, wTemps, wHumidity, wWind, wAir, tempUnit, anomT, anomA]); // eslint-disable-line

  const cmpTs = useMemo(() => {
    const ids = Object.keys(locHistory);
    return ids.length ? (locHistory[ids[0]].timestamps || []).slice(-wPts) : [];
  }, [locHistory, wPts]);

  const cmpChart = useMemo(() => ({
    labels: cmpTs.map(ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
    datasets: locations.map((loc, i) => {
      const h = locHistory[loc.id];
      let s = h ? (h[cmpMetric] || []) : [];
      if (cmpMetric === 'temperature' && tempUnit === 'F') s = s.map(toF);
      return { label: loc.name, data: s.slice(-wPts), borderColor: CITY_COLORS[i % CITY_COLORS.length], backgroundColor: CITY_COLORS[i % CITY_COLORS.length] + '0d', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 };
    }),
  }), [cmpTs, locations, locHistory, cmpMetric, tempUnit, wPts]); // eslint-disable-line

  const chartData = chartMode === 'compare' ? cmpChart : singleChart;

  const chartOpts = useMemo(() => ({
    plugins: {
      legend:  { position: 'top', align: 'end', labels: { color: tickC, usePointStyle: true, pointStyleWidth: 8, font: { family: 'Inter,sans-serif', size: 11 }, boxHeight: 4, padding: 14 } },
      title:   { display: false },
      tooltip: { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: bordC, borderWidth: 1, titleColor: isDark ? '#f1f5f9' : '#0f172a', bodyColor: isDark ? '#94a3b8' : '#64748b', padding: 12, cornerRadius: 10, titleFont: { family: 'Inter,sans-serif', weight: '600' }, bodyFont: { family: 'Inter,sans-serif', size: 12 } },
    },
    scales: {
      x: { ticks: { color: tickC, font: { size: 10, family: 'Inter,sans-serif' }, maxTicksLimit: 8 }, grid: { color: gridC }, border: { color: bordC } },
      y: { beginAtZero: true, ticks: { color: tickC, font: { size: 10, family: 'Inter,sans-serif' } }, grid: { color: gridC }, border: { color: bordC } },
    },
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation:   { duration: 0 },
  }), [isDark, gridC, tickC, bordC]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="dash" ref={dashRef}>
      <DashNav
        connMode={connMode} selectedCity={selectedCity} locations={locations}
        tempUnit={tempUnit} theme={theme} isPaused={isPaused}
        onSelectCity={handleSelectCity}
        onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        onPauseToggle={() => setIsPaused(p => !p)}
        onToggleSearch={() => setShowSearch(s => !s)}
        onRemoveCity={handleRemoveCity}
      />

      {showSearch && (
        <CitySearch
          onClose={() => setShowSearch(false)}
          onAddCity={handleAddCity}
        />
      )}

      <div className="dash-body">
        {error      && <div className="toast toast--error">{error}</div>}
        {shareToast && <div className="toast toast--ok">Link copied to clipboard!</div>}
        {loading && !data.temperature.length && <div className="toast toast--info">Connecting to sensors…</div>}

        {activeAlerts.length > 0 && (
          <div className="alert-strip">
            {activeAlerts.map(a => (
              <div className="alert-chip" key={a.id}>
                <span className="alert-chip-icon">⚠</span>
                <span><strong>{a.city}</strong> — {a.metric} {a.value}{a.unit}</span>
                <button onClick={() => setActiveAlerts(p => p.filter(x => x.id !== a.id))}>✕</button>
              </div>
            ))}
          </div>
        )}

        <StatCards wCelsius={wCelsius} wHumidity={wHumidity} wWind={wWind} wAir={wAir} tempUnit={tempUnit} />

        <ChartCard
          chartData={chartData} chartOpts={chartOpts}
          chartMode={chartMode} setChartMode={setChartMode}
          windowMinutes={windowMinutes} setWindowMinutes={setWindowMinutes}
          tempUnit={tempUnit} setTempUnit={setTempUnit}
          cmpMetric={cmpMetric} setCmpMetric={setCmpMetric}
          anomCount={anomCount} locations={locations} selectedCity={selectedCity}
          onExportCsv={handleExportCsv} onExportPdf={handleExportPdf} onShare={handleShare}
        />

        <ForecastCard city={fcastCity} tempUnit={tempUnit} />

        <div className="bottom-grid">
          <SensorMap locations={locations} locHistory={locHistory} tempUnit={tempUnit} isDark={isDark} />
          <SidePanel locations={locations} locHistory={locHistory} events={events} tempUnit={tempUnit} updatedAt={updatedAt} />
        </div>

        <HeatmapCard theme={theme} />

        <AlertsConfig alertCfg={alertCfg} onChange={setAlertCfg} tempUnit={tempUnit} />
      </div>
    </div>
  );
};

export default Dashboard;
