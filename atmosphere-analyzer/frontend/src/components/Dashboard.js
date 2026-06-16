import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, LineElement, CategoryScale, LinearScale,
  Title, Tooltip, Legend, PointElement, Filler,
} from 'chart.js';
import axios from 'axios';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const WS_URL  = API_URL.replace(/^http/, 'ws') + '/ws/sensor/';

const CITY_COLORS = [
  '#f43f5e', '#f97316', '#a855f7', '#06b6d4', '#84cc16',
];

const ALERT_METRICS = [
  { key: 'temperature', label: 'Temperature', defaultThreshold: 35 },
  { key: 'humidity',    label: 'Humidity',    defaultThreshold: 85 },
  { key: 'wind_speed',  label: 'Wind Speed',  defaultThreshold: 10 },
  { key: 'air_quality', label: 'Air Quality', defaultThreshold: 100 },
];

const CONDITION_ICONS = {
  Clear:'☀️', Clouds:'☁️', Rain:'🌧️', Drizzle:'🌦️',
  Thunderstorm:'⛈️', Snow:'❄️', Mist:'🌫️', Fog:'🌫️', Haze:'🌫️',
};

ChartJS.register(LineElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PointElement, Filler);

// ── Pure helpers ──────────────────────────────────────────────────────────────

const toF = c => (c * 9) / 5 + 32;

const feelsLike = (t, h) => {
  const e = (h / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  return t + 0.33 * e - 4.0;
};

const dewPoint = (t, h) => {
  const a = 17.27, b = 237.7;
  const alpha = ((a * t) / (b + t)) + Math.log(Math.max(h, 1) / 100);
  return (b * alpha) / (a - alpha);
};

const getAqiInfo = aqi => {
  if (aqi <= 50)  return { label: 'Good',           color: '#10b981' };
  if (aqi <= 100) return { label: 'Moderate',       color: '#f59e0b' };
  if (aqi <= 150) return { label: 'Unhealthy (Sensitive)', color: '#f97316' };
  if (aqi <= 200) return { label: 'Unhealthy',      color: '#ef4444' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: '#a855f7' };
  return               { label: 'Hazardous',         color: '#be185d' };
};

const getTrend = series => {
  if (series.length < 2) return 'flat';
  const d = series[series.length - 1] - series[series.length - 2];
  if (Math.abs(d) < 0.05) return 'flat';
  return d > 0 ? 'up' : 'down';
};

const detectAnomalies = (series, win = 20) =>
  series.map((v, i) => {
    if (i < 5) return false;
    const w = series.slice(Math.max(0, i - win), i);
    const mean = w.reduce((a, b) => a + b, 0) / w.length;
    const std  = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / w.length);
    return std > 0.001 && Math.abs(v - mean) / std >= 2.0;
  });

const readUrlParams = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    selectedCity:  p.has('city')   ? parseInt(p.get('city'), 10) : null,
    windowMinutes: p.has('window') ? parseInt(p.get('window'), 10) : 5,
    chartMode:     p.get('mode')   || 'single',
    compareMetric: p.get('metric') || 'temperature',
    tempUnit:      p.get('unit')   || 'C',
    theme:         p.get('theme')  || localStorage.getItem('aa-theme') || 'light',
  };
};

// ── Micro-components ──────────────────────────────────────────────────────────

const Sparkline = ({ data: s, color }) => {
  const W = 80, H = 28;
  const safe = s.length > 1 ? s : [s[0] || 0, s[0] || 0];
  const min = Math.min(...safe), max = Math.max(...safe), range = max - min || 1;
  const pts = safe.map((v, i) => {
    const x = (i / (safe.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

const TrendBadge = ({ trend }) => {
  const map = { up: { icon: '↑', cls: 'up' }, down: { icon: '↓', cls: 'down' }, flat: { icon: '→', cls: 'flat' } };
  const { icon, cls } = map[trend] || map.flat;
  return <span className={`trend-badge trend-badge--${cls}`}>{icon}</span>;
};

const StatCard = ({ accent, icon, label, value, unit, sparkData, sparkColor, sub1, sub2, trend, style }) => (
  <div className="stat-card" style={{ '--accent': accent, ...style }}>
    <div className="stat-top">
      <div className="stat-icon-wrap" style={{ background: accent + '18', color: accent }}>{icon}</div>
      <div className="stat-label-row">
        <span className="stat-label">{label}</span>
        <TrendBadge trend={trend} />
      </div>
    </div>
    <div className="stat-value-row">
      <span className="stat-value">{value}</span>
      <span className="stat-unit">{unit}</span>
      <Sparkline data={sparkData.length > 1 ? sparkData : [0, 0]} color={sparkColor} />
    </div>
    <div className="stat-footer">
      <span>{sub1}</span>
      <span>{sub2}</span>
    </div>
  </div>
);

const HeatmapGrid = ({ grid, theme }) => {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const vals = Object.values(grid).filter(v => v != null);
  if (!vals.length) return <p className="empty-msg">Not enough history yet — check back after a few hours.</p>;
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const cell = v => {
    if (v == null) return theme === 'dark' ? '#1e293b' : '#f1f5f9';
    const r = maxV === minV ? 0.5 : (v - minV) / (maxV - minV);
    return `hsl(${Math.round((1 - r) * 200)}, 70%, ${theme === 'dark' ? '32%' : '52%'})`;
  };
  return (
    <div className="heatmap-wrap">
      <div className="heatmap-hour-row">
        <div className="hm-day-lbl" />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="hm-hr-lbl">{h % 6 === 0 ? `${h}h` : ''}</div>
        ))}
      </div>
      {DAYS.map((day, di) => (
        <div key={day} className="heatmap-row">
          <div className="hm-day-lbl">{day}</div>
          {Array.from({ length: 24 }, (_, hr) => {
            const v = grid[`${di + 1}-${hr}`];
            return (
              <div key={hr} className="hm-cell" style={{ background: cell(v) }}
                title={v != null ? `${day} ${hr}:00 — ${v.toFixed(1)}` : 'No data'} />
            );
          })}
        </div>
      ))}
      <div className="hm-legend">
        <span className="hm-legend-lo">{minV.toFixed(1)}</span>
        <div className="hm-legend-bar" />
        <span className="hm-legend-hi">{maxV.toFixed(1)}</span>
      </div>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const urlState = useMemo(() => readUrlParams(), []); // eslint-disable-line

  const [data, setData]             = useState({ temperature: [], humidity: [], wind_speed: [], air_quality: [], timestamps: [] });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [isPaused, setIsPaused]     = useState(false);
  const [tempUnit, setTempUnit]     = useState(urlState.tempUnit);
  const [windowMinutes, setWindowMinutes] = useState(urlState.windowMinutes);
  const [locations, setLocations]   = useState([]);
  const [locHistory, setLocHistory] = useState({});
  const [updatedAt, setUpdatedAt]   = useState(null);
  const [connMode, setConnMode]     = useState('connecting');
  const [selectedCity, setSelectedCity] = useState(urlState.selectedCity);
  const [chartMode, setChartMode]   = useState(urlState.chartMode);
  const [cmpMetric, setCmpMetric]   = useState(urlState.compareMetric);
  const [theme, setTheme]           = useState(urlState.theme);

  // Alerts
  const [alertCfg, setAlertCfg]     = useState(
    Object.fromEntries(ALERT_METRICS.map(m => [m.key, { enabled: false, value: m.defaultThreshold }]))
  );
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showAlertsCfg, setShowAlertsCfg] = useState(false);

  // Event log
  const [events, setEvents]         = useState([]);
  const [sideTab, setSideTab]       = useState('sensors'); // 'sensors' | 'events'

  // Forecast
  const [forecast, setForecast]     = useState(null);
  const [fcastCity, setFcastCity]   = useState('New York');
  const [fcastLoading, setFcastLoading] = useState(false);

  // Heatmap
  const [showHeatmap, setShowHeatmap]   = useState(false);
  const [heatmapData, setHeatmapData]   = useState(null);
  const [heatmapMetric, setHeatmapMetric] = useState('temperature');

  // City search
  const [showSearch, setShowSearch] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Share
  const [shareToast, setShareToast] = useState(false);

  const pausedRef    = useRef(false);
  const alertCfgRef  = useRef(alertCfg);
  const tempUnitRef  = useRef(tempUnit);
  const prevLocsRef  = useRef({});
  const dashRef      = useRef(null);
  const debounceRef  = useRef(null);

  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { alertCfgRef.current = alertCfg; }, [alertCfg]);
  useEffect(() => { tempUnitRef.current = tempUnit; }, [tempUnit]);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aa-theme', theme);
  }, [theme]);

  // URL sync
  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedCity) p.set('city', selectedCity);
    if (windowMinutes !== 5) p.set('window', windowMinutes);
    if (chartMode !== 'single') p.set('mode', chartMode);
    if (cmpMetric !== 'temperature') p.set('metric', cmpMetric);
    if (tempUnit !== 'C') p.set('unit', tempUnit);
    if (theme !== 'light') p.set('theme', theme);
    window.history.replaceState({}, '', p.toString() ? `?${p}` : window.location.pathname);
  }, [selectedCity, windowMinutes, chartMode, cmpMetric, tempUnit, theme]);

  // Alerts check
  useEffect(() => {
    if (!locations.length) return;
    const cfg = alertCfgRef.current;
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

  // WS + polling
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
          ex.humidity    = [...ex.humidity,    loc.humidity].slice(-20);
          ex.wind_speed  = [...ex.wind_speed,  loc.wind_speed].slice(-20);
          ex.air_quality = [...ex.air_quality, loc.air_quality].slice(-20);
          ex.timestamps  = [...(ex.timestamps||[]), Date.now()].slice(-20);
          n[loc.id] = ex;
        });
        return n;
      });
    };

    const applyEvents = evs => {
      if (!evs?.length) return;
      setEvents(p => {
        const seen = new Set(p.map(e => e.timestamp + e.message));
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
      ws.onopen  = () => { setConnMode('live'); setError(null); };
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

  // Forecast
  const fetchForecast = useCallback(async city => {
    setFcastLoading(true);
    try {
      const r = await axios.get(`${API_URL}/api/forecast/`, { params: { city, country: 'US' } });
      setForecast(r.data.forecast);
    } catch { setForecast(null); }
    finally { setFcastLoading(false); }
  }, []);
  useEffect(() => { fetchForecast(fcastCity); }, [fetchForecast, fcastCity]);

  // Heatmap
  const fetchHeatmap = useCallback(async metric => {
    try { const r = await axios.get(`${API_URL}/api/heatmap/`, { params: { metric } }); setHeatmapData(r.data.grid); }
    catch { setHeatmapData({}); }
  }, []);
  useEffect(() => { if (showHeatmap) fetchHeatmap(heatmapMetric); }, [showHeatmap, heatmapMetric, fetchHeatmap]);

  // City search
  const handleSearchChange = val => {
    setCitySearch(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try { const r = await axios.get(`${API_URL}/api/geocode/`, { params: { q: val } }); setSearchResults(r.data.results || []); }
      catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
  };

  const handleAddCity = async result => {
    const name = result.state ? `${result.name}, ${result.state}` : result.name;
    try { await axios.post(`${API_URL}/api/custom-cities/`, { name, city: result.name, country: result.country, latitude: result.lat, longitude: result.lon }); }
    catch {}
    setCitySearch(''); setSearchResults([]); setShowSearch(false);
  };

  const handleRemoveCity = async id => { try { await axios.delete(`${API_URL}/api/custom-cities/${id}/`); } catch {} };

  // Share & export
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => { setShareToast(true); setTimeout(() => setShareToast(false), 2500); });
  };
  const handleExportCsv = () => {
    const hdrs = ['timestamp','temperature_c','temperature_f','humidity','wind_speed','air_quality'];
    const rows = wTimestamps.map((ts, i) => [
      new Date(ts).toISOString(), (wCelsius[i]??0).toFixed(2), (wFahrenheit[i]??0).toFixed(2),
      (wHumidity[i]??0).toFixed(2), (wWind[i]??0).toFixed(2), (wAir[i]??0).toFixed(0),
    ]);
    const csv = [hdrs.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `atmosphere-${windowMinutes}m.csv` });
    document.body.appendChild(a); a.click(); a.remove();
  };
  const handleExportPdf = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');
    if (!dashRef.current) return;
    const canvas = await html2canvas(dashRef.current, { scale: 1.5, useCORS: true });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width/1.5, canvas.height/1.5] });
    pdf.addImage(img, 'PNG', 0, 0, canvas.width/1.5, canvas.height/1.5);
    pdf.save(`atmosphere-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const cityHist   = selectedCity ? locHistory[selectedCity] : null;
  const aTemps     = cityHist ? cityHist.temperature  : data.temperature;
  const aHumidity  = cityHist ? cityHist.humidity     : data.humidity;
  const aWind      = cityHist ? cityHist.wind_speed   : data.wind_speed;
  const aAir       = cityHist ? cityHist.air_quality  : data.air_quality;
  const aTs        = cityHist ? (cityHist.timestamps||[]) : data.timestamps;

  const ppm  = 12;
  const wPts = Math.max(1, windowMinutes * ppm);

  const wCelsius   = aTemps.slice(-wPts);
  const wFahrenheit = wCelsius.map(toF);
  const wTemps     = tempUnit === 'C' ? wCelsius : wFahrenheit;
  const wHumidity  = aHumidity.slice(-wPts);
  const wWind      = aWind.slice(-wPts);
  const wAir       = aAir.slice(-wPts);
  const wTimestamps = aTs.slice(-wPts);

  const latTC  = aTemps.at(-1)    ?? null;
  const latH   = aHumidity.at(-1) ?? null;
  const latW   = aWind.at(-1)     ?? null;
  const latA   = aAir.at(-1)      ?? null;

  const dispTemp = latTC != null ? (tempUnit === 'C' ? latTC : toF(latTC)).toFixed(1) : '--';
  const dispHum  = latH  != null ? latH.toFixed(1)  : '--';
  const dispWind = latW  != null ? latW.toFixed(1)  : '--';
  const dispAir  = latA  != null ? latA.toFixed(0)  : '--';

  const flVal    = latTC != null && latH != null ? feelsLike(latTC, latH) : null;
  const dpVal    = latTC != null && latH != null ? dewPoint(latTC, latH)  : null;
  const flDisp   = flVal != null ? (tempUnit === 'C' ? flVal : toF(flVal)).toFixed(1) : '--';
  const dpDisp   = dpVal != null ? (tempUnit === 'C' ? dpVal : toF(dpVal)).toFixed(1) : '--';
  const aqiInfo  = latA  != null ? getAqiInfo(latA) : null;

  const tTrend = getTrend(tempUnit === 'C' ? aTemps : aTemps.map(toF));
  const hTrend = getTrend(aHumidity);
  const wTrend = getTrend(aWind);
  const aTrend = getTrend(aAir);

  const timeLabels = wTimestamps.map(ts =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Anomalies
  const anomT = useMemo(() => detectAnomalies(wTemps), [wTemps]);
  const anomA = useMemo(() => detectAnomalies(wAir),   [wAir]);
  const anomCount = useMemo(() => [...anomT, ...anomA].filter(Boolean).length, [anomT, anomA]);

  const ptStyle = (anom, base, bad = '#ef4444') => ({
    pointRadius:          anom.map(a => a ? 5 : 0),
    pointHoverRadius:     anom.map(a => a ? 7 : 5),
    pointBackgroundColor: anom.map(a => a ? bad : base),
    pointBorderColor:     anom.map(a => a ? '#fff' : 'transparent'),
    pointBorderWidth:     anom.map(a => a ? 2 : 0),
  });

  const isDark = theme === 'dark';
  const gridC  = isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)';
  const tickC  = isDark ? '#64748b' : '#94a3b8';
  const bordC  = isDark ? '#334155' : '#e2e8f0';

  const singleChart = useMemo(() => ({
    labels: timeLabels,
    datasets: [
      { label: `Temp (°${tempUnit})`, data: wTemps,    borderColor:'#818cf8', backgroundColor:'rgba(129,140,248,0.05)', fill:true, tension:0.4, borderWidth:2, ...ptStyle(anomT,'#818cf8') },
      { label: 'Humidity (%)',        data: wHumidity, borderColor:'#c084fc', backgroundColor:'rgba(192,132,252,0.05)', fill:true, tension:0.4, borderWidth:2, pointRadius:0, pointHoverRadius:5 },
      { label: 'Wind (m/s)',          data: wWind,     borderColor:'#34d399', backgroundColor:'rgba(52,211,153,0.05)',  fill:true, tension:0.4, borderWidth:2, pointRadius:0, pointHoverRadius:5 },
      { label: 'AQI',                 data: wAir,      borderColor:'#22d3ee', backgroundColor:'rgba(34,211,238,0.05)', fill:true, tension:0.4, borderWidth:2, ...ptStyle(anomA,'#22d3ee') },
    ],
  }), [timeLabels, wTemps, wHumidity, wWind, wAir, tempUnit, anomT, anomA]); // eslint-disable-line

  const cmpTs = useMemo(() => {
    const ids = Object.keys(locHistory);
    return ids.length ? (locHistory[ids[0]].timestamps||[]).slice(-wPts) : [];
  }, [locHistory, wPts]);

  const cmpChart = useMemo(() => ({
    labels: cmpTs.map(ts => new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })),
    datasets: locations.map((loc, i) => {
      const h = locHistory[loc.id];
      let s = h ? (h[cmpMetric]||[]) : [];
      if (cmpMetric === 'temperature' && tempUnit === 'F') s = s.map(toF);
      return { label: loc.name, data: s.slice(-wPts), borderColor: CITY_COLORS[i % CITY_COLORS.length], backgroundColor: CITY_COLORS[i % CITY_COLORS.length] + '0d', fill:true, tension:0.4, borderWidth:2, pointRadius:0, pointHoverRadius:5 };
    }),
  }), [cmpTs, locations, locHistory, cmpMetric, tempUnit, wPts]);

  const chartData = chartMode === 'compare' ? cmpChart : singleChart;

  const chartOpts = useMemo(() => ({
    plugins: {
      legend: { position:'top', align:'end', labels:{ color:tickC, usePointStyle:true, pointStyleWidth:8, font:{ family:'Inter,sans-serif', size:11 }, boxHeight:4, padding:14 } },
      title: { display:false },
      tooltip: { backgroundColor: isDark?'#1e293b':'#fff', borderColor:bordC, borderWidth:1, titleColor:isDark?'#f1f5f9':'#0f172a', bodyColor:isDark?'#94a3b8':'#64748b', padding:12, cornerRadius:10, titleFont:{ family:'Inter,sans-serif', weight:'600' }, bodyFont:{ family:'Inter,sans-serif', size:12 } },
    },
    scales: {
      x: { ticks:{ color:tickC, font:{ size:10, family:'Inter,sans-serif' }, maxTicksLimit:8 }, grid:{ color:gridC }, border:{ color:bordC } },
      y: { beginAtZero:true, ticks:{ color:tickC, font:{ size:10, family:'Inter,sans-serif' } }, grid:{ color:gridC }, border:{ color:bordC } },
    },
    responsive:true, maintainAspectRatio:false,
    interaction:{ mode:'index', intersect:false },
    animation:{ duration:0 },
  }), [isDark, gridC, tickC, bordC]);

  const markerColor = loc => {
    const t = loc.temperature;
    if (t >= 30) return '#ef4444'; if (t >= 25) return '#f97316';
    if (t >= 20) return '#22c55e'; if (t >= 10) return '#38bdf8';
    return '#6366f1';
  };
  const mkIcon = (color, custom) => L.divIcon({
    className:'sensor-marker',
    html:`<span style="background:${color};${custom?'border-color:#f59e0b':''}"></span>`,
    iconSize:[14,14], iconAnchor:[7,7], popupAnchor:[0,-8],
  });

  const mapCenter = locations.length ? [locations[0].latitude, locations[0].longitude] : [37.5, -96];

  const cmpMetricLabel = { temperature:`Temp (°${tempUnit})`, humidity:'Humidity (%)', wind_speed:'Wind (m/s)', air_quality:'Air Quality (AQI)' }[cmpMetric];

  const SREV_ICONS = {
    info:     { dot:'#10b981', bg:'#f0fdf4', border:'#bbf7d0', text:'#166534' },
    warning:  { dot:'#f59e0b', bg:'#fffbeb', border:'#fde68a', text:'#92400e' },
    critical: { dot:'#ef4444', bg:'#fef2f2', border:'#fecaca', text:'#991b1b' },
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="dash" ref={dashRef}>

      {/* ── STICKY HEADER ──────────────────────────────────────────────── */}
      <header className="dash-nav">
        <div className="dash-brand">
          <span className={`conn-dot conn-dot--${connMode}`} />
          <span className="dash-brand-name">AtmosphereAnalyzer</span>
        </div>

        <div className="dash-cities-scroll">
          <button className={`city-chip ${!selectedCity ? 'city-chip--active' : ''}`} onClick={() => setSelectedCity(null)}>
            All cities
          </button>
          {locations.map((loc, i) => (
            <div key={loc.id} className="city-chip-wrap">
              <button
                className={`city-chip ${selectedCity === loc.id ? 'city-chip--active' : ''}`}
                style={selectedCity === loc.id ? { borderColor: CITY_COLORS[i % CITY_COLORS.length], color: CITY_COLORS[i % CITY_COLORS.length] } : {}}
                onClick={() => {
                  setSelectedCity(p => p === loc.id ? null : loc.id);
                  if (loc.name) setFcastCity(loc.name.split(',')[0].trim());
                }}
              >
                <span className="city-chip-dot" style={{ background: CITY_COLORS[i % CITY_COLORS.length] }} />
                {loc.name}
                {loc.temperature != null && (
                  <span className="city-chip-temp">
                    {(tempUnit === 'C' ? loc.temperature : toF(loc.temperature)).toFixed(0)}°
                  </span>
                )}
              </button>
              {loc.is_custom && (
                <button className="city-chip-rm" onClick={() => handleRemoveCity(loc.custom_id)} title="Remove">✕</button>
              )}
            </div>
          ))}
          <button className="city-chip city-chip--add" onClick={() => setShowSearch(s => !s)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Add city
          </button>
        </div>

        <div className="dash-nav-actions">
          <span className={`conn-badge conn-badge--${connMode}`}>
            {connMode === 'live' ? 'Live' : connMode === 'polling' ? 'Polling' : 'Connecting'}
          </span>
          <button className="nav-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Toggle theme">
            {theme === 'light' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            )}
          </button>
          <button className={`nav-btn ${isPaused ? 'nav-btn--active' : ''}`} onClick={() => setIsPaused(p => !p)} title={isPaused ? 'Resume' : 'Pause'}>
            {isPaused
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            }
          </button>
        </div>
      </header>

      {/* ── CITY SEARCH DROPDOWN ────────────────────────────────────────── */}
      {showSearch && (
        <div className="search-bar">
          <div className="search-inner">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="search-input"
              placeholder="Search any city in the world…"
              value={citySearch}
              onChange={e => handleSearchChange(e.target.value)}
              autoFocus
            />
            {searchLoading && <span className="search-spinner">Searching…</span>}
            <button className="search-close" onClick={() => { setShowSearch(false); setCitySearch(''); setSearchResults([]); }}>✕</button>
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((r, i) => (
                <button key={i} className="search-result" onClick={() => handleAddCity(r)}>
                  <span className="search-result-name">{r.name}{r.state ? `, ${r.state}` : ''}</span>
                  <span className="search-result-country">{r.country}</span>
                </button>
              ))}
            </div>
          )}
          {!searchLoading && citySearch && !searchResults.length && (
            <div className="search-empty">No results found — try a different city name</div>
          )}
        </div>
      )}

      {/* ── BODY ────────────────────────────────────────────────────────── */}
      <div className="dash-body">

        {/* Toasts */}
        {error       && <div className="toast toast--error">{error}</div>}
        {shareToast  && <div className="toast toast--ok">Link copied to clipboard!</div>}
        {loading && !data.temperature.length && <div className="toast toast--info">Connecting to sensors…</div>}

        {/* Alert banners */}
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

        {/* ── STAT CARDS ────────────────────────────────────────────────── */}
        <div className="stat-row">
          <StatCard
            accent="#818cf8" label="Temperature" trend={tTrend}
            value={dispTemp} unit={`°${tempUnit}`}
            sparkData={wTemps} sparkColor="#818cf8"
            sub1={<>Feels like <strong>{flDisp}°</strong></>}
            sub2={<>Dew point <strong>{dpDisp}°</strong></>}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>}
          />
          <StatCard
            accent="#c084fc" label="Humidity" trend={hTrend}
            value={dispHum} unit="%"
            sparkData={wHumidity} sparkColor="#c084fc"
            sub1={latH != null ? latH < 30 ? 'Dry' : latH < 60 ? 'Comfortable' : latH < 80 ? 'Humid' : 'Very Humid' : '--'}
            sub2={<>Dew <strong>{dpDisp}°</strong></>}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>}
          />
          <StatCard
            accent="#34d399" label="Wind Speed" trend={wTrend}
            value={dispWind} unit="m/s"
            sparkData={wWind} sparkColor="#34d399"
            sub1={latW != null ? latW < 0.5 ? 'Calm' : latW < 3.3 ? 'Light breeze' : latW < 7.9 ? 'Moderate' : 'Strong' : '--'}
            sub2={<><strong>{latW != null ? (latW * 3.6).toFixed(1) : '--'}</strong> km/h</>}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2"/><path d="M10.59 19.41A2 2 0 1 0 12 16H2"/><path d="M15.73 8.27A2.5 2.5 0 1 1 17.5 12H2"/></svg>}
          />
          <StatCard
            accent={aqiInfo?.color ?? '#22d3ee'} label="Air Quality" trend={aTrend}
            value={dispAir} unit="AQI"
            sparkData={wAir} sparkColor={aqiInfo?.color ?? '#22d3ee'}
            sub1={<span style={{ color: aqiInfo?.color }}>{aqiInfo?.label ?? '--'}</span>}
            sub2="via OpenAQ"
            style={aqiInfo ? { '--accent': aqiInfo.color } : {}}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>}
          />
        </div>

        {/* ── CHART CARD ────────────────────────────────────────────────── */}
        <div className="chart-card">
          <div className="chart-head">
            <div className="chart-head-left">
              <h2 className="chart-title">
                {chartMode === 'compare'
                  ? <>{cmpMetricLabel} <span className="chart-title-sub">— all cities</span></>
                  : selectedCity
                    ? locations.find(l => l.id === selectedCity)?.name ?? 'City'
                    : <>All Metrics <span className="chart-title-sub">— {windowMinutes < 60 ? `${windowMinutes}m` : '1h'} window</span></>
                }
              </h2>
              {anomCount > 0 && <span className="anomaly-pill">⚡ {anomCount} anomal{anomCount === 1 ? 'y' : 'ies'}</span>}
            </div>

            <div className="chart-controls">
              {/* Time window */}
              <div className="ctrl-group">
                {[1, 5, 15, 60].map(m => (
                  <button key={m} className={`ctrl-pill ${windowMinutes === m ? 'ctrl-pill--on' : ''}`} onClick={() => setWindowMinutes(m)}>
                    {m < 60 ? `${m}m` : '1h'}
                  </button>
                ))}
              </div>
              <div className="ctrl-sep" />
              {/* Temp unit */}
              <div className="ctrl-group">
                {['C','F'].map(u => (
                  <button key={u} className={`ctrl-pill ${tempUnit === u ? 'ctrl-pill--on' : ''}`} onClick={() => setTempUnit(u)}>°{u}</button>
                ))}
              </div>
              <div className="ctrl-sep" />
              {/* Mode */}
              <div className="ctrl-group">
                <button className={`ctrl-pill ${chartMode === 'single' ? 'ctrl-pill--on' : ''}`} onClick={() => setChartMode('single')}>Single</button>
                <button className={`ctrl-pill ${chartMode === 'compare' ? 'ctrl-pill--on' : ''}`} onClick={() => setChartMode('compare')}>Compare</button>
              </div>
              {chartMode === 'compare' && (
                <>
                  <div className="ctrl-sep" />
                  <div className="ctrl-group">
                    {ALERT_METRICS.map(({ key, label }) => (
                      <button key={key} className={`ctrl-pill ${cmpMetric === key ? 'ctrl-pill--on' : ''}`} onClick={() => setCmpMetric(key)}>
                        {label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="chart-actions">
              <button className="act-btn" onClick={handleExportCsv} title="Download CSV">CSV</button>
              <button className="act-btn" onClick={handleExportPdf} title="Download PDF">PDF</button>
              <button className="act-btn" onClick={handleShare} title="Copy share link">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
            </div>
          </div>

          <div className="chart-area">
            <Line data={chartData} options={chartOpts} />
          </div>
        </div>

        {/* ── FORECAST ──────────────────────────────────────────────────── */}
        <div className="forecast-card">
          <div className="forecast-head">
            <span className="section-label">5-Day Forecast</span>
            {fcastLoading
              ? <span className="fc-loading">Loading…</span>
              : <span className="fc-city-badge">{fcastCity}</span>
            }
          </div>
          {!fcastLoading && !forecast && (
            <p className="empty-msg">Forecast unavailable — add an OpenWeatherMap API key to enable.</p>
          )}
          {forecast && (
            <div className="forecast-grid">
              {forecast.map(day => {
                const minT = tempUnit === 'F' ? toF(day.temp_min) : day.temp_min;
                const maxT = tempUnit === 'F' ? toF(day.temp_max) : day.temp_max;
                const icon = CONDITION_ICONS[day.condition] ?? '🌤️';
                const label = new Date(day.date + 'T12:00:00').toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
                return (
                  <div key={day.date} className="fc-day">
                    <span className="fc-date">{label}</span>
                    <span className="fc-icon">{icon}</span>
                    <span className="fc-cond">{day.condition}</span>
                    <div className="fc-temps">
                      <span className="fc-hi">{maxT.toFixed(0)}°</span>
                      <span className="fc-lo">{minT.toFixed(0)}°</span>
                    </div>
                    <span className="fc-meta">💧{day.humidity_avg.toFixed(0)}% · 💨{day.wind_avg.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── BOTTOM GRID: MAP + SIDE PANEL ─────────────────────────────── */}
        <div className="bottom-grid">

          {/* Map */}
          <div className="map-card">
            <div className="card-head">
              <span className="section-label">Sensor Map</span>
              <span className="map-badge">{locations.length} active</span>
            </div>
            <div className="map-body">
              <MapContainer center={mapCenter} zoom={4} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url={isDark
                    ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
                    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png'}
                />
                {locations.map(loc => {
                  const mc   = markerColor(loc);
                  const hc   = mc;
                  const hist = locHistory[loc.id];
                  const dT   = tempUnit === 'C' ? loc.temperature : toF(loc.temperature);
                  return (
                    <React.Fragment key={loc.id}>
                      <Circle center={[loc.latitude, loc.longitude]}
                        radius={14000 + Math.min(16000, loc.temperature * 400)}
                        pathOptions={{ color:hc, fillColor:hc, fillOpacity:0.15, weight:0 }} />
                      <Marker position={[loc.latitude, loc.longitude]} icon={mkIcon(mc, loc.is_custom)}>
                        <Popup>
                          <div className="map-popup">
                            <strong>{loc.name}</strong>{loc.is_custom && <span className="popup-tag">custom</span>}
                            <div>🌡 {dT.toFixed(1)}°{tempUnit}</div>
                            <div>💧 {loc.humidity.toFixed(1)}%</div>
                            <div>💨 {loc.wind_speed.toFixed(1)} m/s</div>
                            <div>🌫 AQI {loc.air_quality.toFixed(0)}</div>
                            {hist && (
                              <div className="popup-sparks">
                                {[['Temp','temperature','#818cf8'],['Hum','humidity','#c084fc'],['Wind','wind_speed','#34d399'],['AQI','air_quality','#f59e0b']].map(([lbl,k,c]) => (
                                  <div key={k} className="popup-spark-row">
                                    <span>{lbl}</span>
                                    <Sparkline data={k === 'temperature' && tempUnit === 'F' ? hist[k].map(toF) : hist[k]} color={c} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* Side panel */}
          <div className="side-panel">
            <div className="panel-tabs">
              <button className={`panel-tab ${sideTab === 'sensors' ? 'panel-tab--on' : ''}`} onClick={() => setSideTab('sensors')}>
                Live Sensors
              </button>
              <button className={`panel-tab ${sideTab === 'events' ? 'panel-tab--on' : ''}`} onClick={() => setSideTab('events')}>
                Events
                {events.length > 0 && <span className="tab-badge">{Math.min(events.length, 99)}</span>}
              </button>
            </div>

            {sideTab === 'sensors' && (
              <div className="sensor-list">
                {locations.length === 0 && <p className="empty-msg">Waiting for sensor data…</p>}
                {locations.map((loc, i) => (
                  <div key={loc.id} className="sensor-row" style={{ '--row-accent': CITY_COLORS[i % CITY_COLORS.length] }}>
                    <div className="sensor-row-top">
                      <span className="sensor-dot" style={{ background: CITY_COLORS[i % CITY_COLORS.length] }} />
                      <span className="sensor-name">{loc.name}</span>
                      {loc.is_custom && <span className="custom-tag">custom</span>}
                    </div>
                    <div className="sensor-metrics">
                      <div className="sensor-metric">
                        <span className="sm-label">Temp</span>
                        <span className="sm-val">{(tempUnit === 'C' ? loc.temperature : toF(loc.temperature)).toFixed(1)}°{tempUnit}</span>
                      </div>
                      <div className="sensor-metric">
                        <span className="sm-label">Humidity</span>
                        <span className="sm-val">{loc.humidity.toFixed(1)}%</span>
                      </div>
                      <div className="sensor-metric">
                        <span className="sm-label">Wind</span>
                        <span className="sm-val">{loc.wind_speed.toFixed(1)} m/s</span>
                      </div>
                      <div className="sensor-metric">
                        <span className="sm-label">AQI</span>
                        <span className="sm-val" style={{ color: getAqiInfo(loc.air_quality).color }}>{loc.air_quality.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sideTab === 'events' && (
              <div className="event-list">
                {events.length === 0 && <p className="empty-msg">No events yet — anomalies and alerts appear here.</p>}
                {events.map((ev, i) => {
                  const s = SREV_ICONS[ev.severity] ?? SREV_ICONS.info;
                  const ts = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '';
                  return (
                    <div key={i} className="event-row" style={{ borderLeftColor: s.dot }}>
                      <div className="event-meta">
                        <span className="event-dot" style={{ background: s.dot }} />
                        <span className="event-type" style={{ color: s.text }}>{ev.event_type}</span>
                        {ev.city && <span className="event-city">{ev.city}</span>}
                        <span className="event-time">{ts}</span>
                      </div>
                      <div className="event-msg">{ev.message}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {updatedAt && (
              <div className="panel-footer">
                Updated {new Date(updatedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* ── HEATMAP ───────────────────────────────────────────────────── */}
        <div className="heatmap-card">
          <div className="card-head">
            <div className="heatmap-head-left">
              <span className="section-label">Activity Heatmap</span>
              <span className="section-sub">last 7 days by hour of day</span>
            </div>
            <div className="heatmap-head-right">
              {showHeatmap && (
                <div className="ctrl-group">
                  {ALERT_METRICS.map(({ key, label }) => (
                    <button key={key} className={`ctrl-pill ${heatmapMetric === key ? 'ctrl-pill--on' : ''}`} onClick={() => setHeatmapMetric(key)}>
                      {label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
              <button className={`ctrl-pill ${showHeatmap ? 'ctrl-pill--on' : ''}`} onClick={() => setShowHeatmap(s => !s)}>
                {showHeatmap ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {showHeatmap && heatmapData && <HeatmapGrid grid={heatmapData} theme={theme} />}
        </div>

        {/* ── ALERT THRESHOLDS ──────────────────────────────────────────── */}
        <div className="alerts-card">
          <button className="alerts-toggle" onClick={() => setShowAlertsCfg(s => !s)}>
            <span className="section-label">Configure Alert Thresholds</span>
            <svg className={`chevron ${showAlertsCfg ? 'chevron--up' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showAlertsCfg && (
            <div className="alerts-grid">
              {ALERT_METRICS.map(({ key, label }) => (
                <div key={key} className="alert-row">
                  <label className="alert-toggle-label">
                    <input type="checkbox" checked={alertCfg[key].enabled}
                      onChange={e => setAlertCfg(p => ({ ...p, [key]: { ...p[key], enabled: e.target.checked } }))} />
                    <span>{key === 'temperature' ? `${label} (°${tempUnit})` : label}</span>
                  </label>
                  <input type="number" className="alert-input"
                    value={alertCfg[key].value} disabled={!alertCfg[key].enabled}
                    onChange={e => setAlertCfg(p => ({ ...p, [key]: { ...p[key], value: Number(e.target.value) } }))} />
                  <span className="alert-unit">{key === 'temperature' ? `°${tempUnit}` : key === 'humidity' ? '%' : key === 'wind_speed' ? 'm/s' : 'AQI'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>{/* /dash-body */}
    </div>
  );
};

export default Dashboard;
