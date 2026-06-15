import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  PointElement,
  Filler,
} from 'chart.js';
import axios from 'axios';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws/sensor/';

const CITY_COLORS = [
    'rgba(244, 63, 94, 1)',
    'rgba(249, 115, 22, 1)',
    'rgba(168, 85, 247, 1)',
    'rgba(6, 182, 212, 1)',
    'rgba(132, 204, 16, 1)',
];

const ALERT_METRICS = [
    { key: 'temperature', label: 'Temperature', defaultThreshold: 35 },
    { key: 'humidity',    label: 'Humidity',    defaultThreshold: 85 },
    { key: 'wind_speed',  label: 'Wind Speed',  defaultThreshold: 10 },
    { key: 'air_quality', label: 'Air Quality', defaultThreshold: 100 },
];

ChartJS.register(LineElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PointElement, Filler);

const feelsLike = (tempC, humidity) => {
    const e = (humidity / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
    return tempC + 0.33 * e - 4.00;
};

const dewPoint = (tempC, humidity) => {
    const a = 17.27, b = 237.7;
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(Math.max(humidity, 1) / 100);
    return (b * alpha) / (a - alpha);
};

const getAqiInfo = (aqi) => {
    if (aqi <= 50)  return { label: 'Good',             color: '#10b981' };
    if (aqi <= 100) return { label: 'Moderate',         color: '#f59e0b' };
    if (aqi <= 150) return { label: 'Sensitive Groups', color: '#f97316' };
    if (aqi <= 200) return { label: 'Unhealthy',        color: '#ef4444' };
    if (aqi <= 300) return { label: 'Very Unhealthy',   color: '#a855f7' };
    return              { label: 'Hazardous',            color: '#be185d' };
};

const getTrend = (series) => {
    if (series.length < 2) return 'flat';
    const diff = series[series.length - 1] - series[series.length - 2];
    if (Math.abs(diff) < 0.05) return 'flat';
    return diff > 0 ? 'up' : 'down';
};

const TREND_META = {
    up:   { arrow: '↑', label: 'Rising' },
    down: { arrow: '↓', label: 'Falling' },
    flat: { arrow: '→', label: 'Steady' },
};

const Sparkline = ({ data: series, color }) => {
    const width = 90, height = 30;
    const safe = series.length > 1 ? series : [series[0] || 0, series[0] || 0];
    const min = Math.min(...safe), max = Math.max(...safe);
    const range = max - min || 1;
    const pts = safe.map((v, i) => {
        const x = (i / (safe.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 6) - 3;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
        </svg>
    );
};

const MetricIcon = ({ type }) => {
    const icons = {
        temperature: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
            </svg>
        ),
        humidity: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
        ),
        wind: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.59 4.59A2 2 0 1 1 11 8H2" /><path d="M10.59 19.41A2 2 0 1 0 12 16H2" /><path d="M15.73 8.27A2.5 2.5 0 1 1 17.5 12H2" />
            </svg>
        ),
        air: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
            </svg>
        ),
    };
    return icons[type] || null;
};

const Dashboard = () => {
    const [data, setData] = useState({ temperature: [], humidity: [], wind_speed: [], air_quality: [], timestamps: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [tempUnit, setTempUnit] = useState('C');
    const [windowMinutes, setWindowMinutes] = useState(5);
    const [locations, setLocations] = useState([]);
    const [locationHistory, setLocationHistory] = useState({});
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [connectionMode, setConnectionMode] = useState('connecting');
    const [selectedCity, setSelectedCity] = useState(null);
    const [chartMode, setChartMode] = useState('single');
    const [compareMetric, setCompareMetric] = useState('temperature');
    const [alertThresholds, setAlertThresholds] = useState(
        Object.fromEntries(ALERT_METRICS.map(m => [m.key, { enabled: false, value: m.defaultThreshold }]))
    );
    const [activeAlerts, setActiveAlerts] = useState([]);
    const pausedRef = useRef(false);
    const alertThresholdsRef = useRef(alertThresholds);
    const tempUnitRef = useRef(tempUnit);
    const prevLocationsRef = useRef({});

    useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { alertThresholdsRef.current = alertThresholds; }, [alertThresholds]);
    useEffect(() => { tempUnitRef.current = tempUnit; }, [tempUnit]);

    useEffect(() => {
        if (locations.length === 0) return;
        const thresholds = alertThresholdsRef.current;
        const unit = tempUnitRef.current;
        const newAlerts = [];
        locations.forEach(location => {
            const prev = prevLocationsRef.current[location.id];
            ALERT_METRICS.forEach(({ key, label }) => {
                const cfg = thresholds[key];
                if (!cfg?.enabled) return;
                let val = location[key];
                let prevVal = prev != null ? prev[key] : null;
                if (key === 'temperature' && unit === 'F') {
                    val = (val * 9) / 5 + 32;
                    if (prevVal != null) prevVal = (prevVal * 9) / 5 + 32;
                }
                if (val > cfg.value && (prevVal == null || prevVal <= cfg.value)) {
                    const unitStr = key === 'temperature' ? `°${unit}` : key === 'humidity' ? '%' : key === 'wind_speed' ? ' m/s' : ' AQI';
                    newAlerts.push({ id: `${location.id}-${key}-${Date.now()}`, city: location.name, metric: label, value: val.toFixed(key === 'air_quality' ? 0 : 1), threshold: cfg.value, unit: unitStr });
                }
            });
            prevLocationsRef.current[location.id] = { ...location };
        });
        if (newAlerts.length > 0) {
            if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
            newAlerts.forEach(a => {
                if ('Notification' in window && Notification.permission === 'granted')
                    new Notification(`${a.metric} Alert — ${a.city}`, { body: `${a.metric} reached ${a.value}${a.unit} (threshold: ${a.threshold}${a.unit})` });
            });
            setActiveAlerts(prev => [...newAlerts, ...prev].slice(0, 8));
        }
    }, [locations]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let ws = null, pollInterval = null;
        const applyReading = (sensorData) => {
            if (pausedRef.current) return;
            setData(prev => ({
                temperature: [...prev.temperature, sensorData.temperature],
                humidity: [...prev.humidity, sensorData.humidity],
                wind_speed: [...prev.wind_speed, sensorData.wind_speed],
                air_quality: [...prev.air_quality, sensorData.air_quality],
                timestamps: [...prev.timestamps, Date.now()],
            }));
            setLastUpdatedAt(Date.now());
            setLoading(false);
        };
        const applyLocations = (fetched) => {
            if (pausedRef.current) return;
            setLocations(fetched);
            setLastUpdatedAt(Date.now());
            setLocationHistory(prev => {
                const next = { ...prev };
                fetched.forEach(loc => {
                    const ex = next[loc.id] || { id: loc.id, name: loc.name, latitude: loc.latitude, longitude: loc.longitude, temperature: [], humidity: [], wind_speed: [], air_quality: [], timestamps: [] };
                    ex.temperature = [...ex.temperature, loc.temperature].slice(-20);
                    ex.humidity    = [...ex.humidity, loc.humidity].slice(-20);
                    ex.wind_speed  = [...ex.wind_speed, loc.wind_speed].slice(-20);
                    ex.air_quality = [...ex.air_quality, loc.air_quality].slice(-20);
                    ex.timestamps  = [...(ex.timestamps || []), Date.now()].slice(-20);
                    next[loc.id] = ex;
                });
                return next;
            });
        };
        const startPolling = () => {
            if (pollInterval) return;
            setConnectionMode('polling');
            const poll = async () => {
                if (pausedRef.current) return;
                try {
                    const [sRes, lRes] = await Promise.all([
                        axios.get(`${API_URL}/api/sensor-data/`),
                        axios.get(`${API_URL}/api/sensor-locations/`),
                    ]);
                    applyReading(sRes.data);
                    applyLocations(lRes.data.locations || []);
                    setError(null);
                } catch { setError('Failed to fetch data. Retrying…'); setLoading(false); }
            };
            poll();
            pollInterval = setInterval(poll, 5000);
        };
        const connectWs = () => {
            ws = new WebSocket(WS_URL);
            ws.onopen = () => { setConnectionMode('live'); setError(null); };
            ws.onmessage = (e) => {
                const p = JSON.parse(e.data);
                if (p.type === 'sensor_update') { applyReading(p.sensor_data); applyLocations(p.locations || []); }
            };
            ws.onerror = () => ws.close();
            ws.onclose = () => startPolling();
        };
        connectWs();
        return () => { if (ws) ws.close(); if (pollInterval) clearInterval(pollInterval); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const toF = c => (c * 9) / 5 + 32;
    const cityHistory = selectedCity ? locationHistory[selectedCity] : null;
    const activeTemps      = cityHistory ? cityHistory.temperature  : data.temperature;
    const activeHumidity   = cityHistory ? cityHistory.humidity     : data.humidity;
    const activeWind       = cityHistory ? cityHistory.wind_speed   : data.wind_speed;
    const activeAir        = cityHistory ? cityHistory.air_quality  : data.air_quality;
    const activeTimestamps = cityHistory ? (cityHistory.timestamps || []) : data.timestamps;

    const displayTemps = tempUnit === 'C' ? activeTemps : activeTemps.map(toF);
    const pointsPerMinute = 12;
    const windowPoints = Math.max(1, windowMinutes * pointsPerMinute);
    const windowedCelsius     = activeTemps.slice(-windowPoints);
    const windowedFahrenheit  = windowedCelsius.map(toF);
    const windowedTemps       = tempUnit === 'C' ? windowedCelsius : windowedFahrenheit;
    const windowedHumidity    = activeHumidity.slice(-windowPoints);
    const windowedWind        = activeWind.slice(-windowPoints);
    const windowedAir         = activeAir.slice(-windowPoints);
    const windowedTimestamps  = activeTimestamps.slice(-windowPoints);

    const latestTempC       = activeTemps.length     > 0 ? activeTemps[activeTemps.length - 1]         : null;
    const latestHumidityVal = activeHumidity.length  > 0 ? activeHumidity[activeHumidity.length - 1]   : null;
    const latestWindVal     = activeWind.length      > 0 ? activeWind[activeWind.length - 1]           : null;
    const latestAirVal      = activeAir.length       > 0 ? activeAir[activeAir.length - 1]             : null;

    const latestTemp       = latestTempC != null       ? (tempUnit === 'C' ? latestTempC : toF(latestTempC)).toFixed(1) : '--';
    const latestHumidity   = latestHumidityVal != null ? latestHumidityVal.toFixed(1) : '--';
    const latestWind       = latestWindVal != null     ? latestWindVal.toFixed(1) : '--';
    const latestAirQuality = latestAirVal != null      ? latestAirVal.toFixed(0) : '--';

    const feelsLikeVal     = latestTempC != null && latestHumidityVal != null ? feelsLike(latestTempC, latestHumidityVal) : null;
    const feelsLikeDisplay = feelsLikeVal != null ? (tempUnit === 'C' ? feelsLikeVal : toF(feelsLikeVal)).toFixed(1) : '--';
    const dewPointVal      = latestTempC != null && latestHumidityVal != null ? dewPoint(latestTempC, latestHumidityVal) : null;
    const dewPointDisplay  = dewPointVal != null ? (tempUnit === 'C' ? dewPointVal : toF(dewPointVal)).toFixed(1) : '--';
    const aqiInfo          = latestAirVal != null ? getAqiInfo(latestAirVal) : null;

    const tempTrend     = getTrend(displayTemps);
    const humidityTrend = getTrend(activeHumidity);
    const windTrend     = getTrend(activeWind);
    const airTrend      = getTrend(activeAir);

    const timeLabels = windowedTimestamps.map(ts =>
        new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );

    const singleChartData = {
        labels: timeLabels,
        datasets: [
            { label: `Temperature (°${tempUnit})`, data: windowedTemps,    borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.06)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
            { label: 'Humidity (%)',               data: windowedHumidity, borderColor: '#c084fc', backgroundColor: 'rgba(192,132,252,0.06)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
            { label: 'Wind Speed (m/s)',            data: windowedWind,     borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.06)',  fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
            { label: 'Air Quality (AQI)',           data: windowedAir,      borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.06)',  fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
        ],
    };

    const compareTimestamps = (() => {
        const ids = Object.keys(locationHistory);
        if (ids.length === 0) return [];
        return (locationHistory[ids[0]].timestamps || []).slice(-windowPoints);
    })();

    const compareMetricLabel = { temperature: `Temperature (°${tempUnit})`, humidity: 'Humidity (%)', wind_speed: 'Wind Speed (m/s)', air_quality: 'Air Quality (AQI)' }[compareMetric];

    const compareChartData = {
        labels: compareTimestamps.map(ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        datasets: locations.map((loc, i) => {
            const hist = locationHistory[loc.id];
            let series = hist ? (hist[compareMetric] || []) : [];
            if (compareMetric === 'temperature' && tempUnit === 'F') series = series.map(v => (v * 9) / 5 + 32);
            return { label: loc.name, data: series.slice(-windowPoints), borderColor: CITY_COLORS[i % CITY_COLORS.length], backgroundColor: CITY_COLORS[i % CITY_COLORS.length].replace('1)', '0.06)'), fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 };
        }),
    };

    const activeChartData = chartMode === 'compare' ? compareChartData : singleChartData;

    const chartOptions = {
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: { color: '#94a3b8', usePointStyle: true, pointStyleWidth: 8, font: { family: 'Inter, sans-serif', size: 11 }, boxHeight: 5, padding: 16 },
            },
            title: { display: false },
            tooltip: {
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                titleColor: '#0f172a',
                bodyColor: '#64748b',
                padding: 12,
                cornerRadius: 10,
                titleFont: { family: 'Inter, sans-serif', weight: '600' },
                bodyFont: { family: 'Inter, sans-serif', size: 12 },
                boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
            },
        },
        scales: {
            x: {
                ticks: { color: '#94a3b8', font: { size: 10, family: 'Inter, sans-serif' }, maxTicksLimit: 8 },
                grid: { color: '#f1f5f9' },
                border: { color: '#e2e8f0' },
            },
            y: {
                beginAtZero: true,
                ticks: { color: '#94a3b8', font: { size: 10, family: 'Inter, sans-serif' } },
                grid: { color: '#f1f5f9' },
                border: { color: '#e2e8f0' },
            },
        },
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
    };

    const getMarkerColor = loc => {
        const t = loc.temperature;
        if (t >= 30) return '#ef4444';
        if (t >= 25) return '#f97316';
        if (t >= 20) return '#22c55e';
        if (t >= 10) return '#38bdf8';
        return '#6366f1';
    };

    const getHeatColor = v => {
        if (v >= 30) return '#ef4444';
        if (v >= 25) return '#f97316';
        if (v >= 20) return '#22c55e';
        if (v >= 10) return '#38bdf8';
        return '#6366f1';
    };

    const mapCenter = locations.length > 0 ? [locations[0].latitude, locations[0].longitude] : [29.6, -86.5];

    const createMarkerIcon = color => L.divIcon({
        className: 'sensor-marker',
        html: `<span style="background:${color}"></span>`,
        iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -7],
    });

    const handleDownloadCsv = () => {
        const headers = ['timestamp', 'temperature_c', 'temperature_f', 'humidity', 'wind_speed', 'air_quality'];
        const rows = windowedTimestamps.map((ts, i) => [
            new Date(ts).toISOString(),
            (windowedCelsius[i] ?? 0).toFixed(2),
            (windowedFahrenheit[i] ?? 0).toFixed(2),
            (windowedHumidity[i] ?? 0).toFixed(2),
            (windowedWind[i] ?? 0).toFixed(2),
            (windowedAir[i] ?? 0).toFixed(0),
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url; a.setAttribute('download', `atmosphere-${windowMinutes}m.csv`);
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    const TrendPill = ({ trend }) => {
        const m = TREND_META[trend];
        return <span className={`trend-pill trend-pill--${trend}`}>{m.arrow} {m.label}</span>;
    };

    return (
        <div className="dashboard">

            {/* ── LEFT SIDEBAR ── */}
            <aside className="sidebar">
                <div className="sidebar-top">
                    <div className="sidebar-brand">
                        <span className={`live-dot live-dot--${connectionMode}`} />
                        <span className="live-label">
                            {connectionMode === 'live' ? 'Live' : connectionMode === 'polling' ? 'Polling' : 'Connecting'}
                        </span>
                    </div>
                    {lastUpdatedAt && (
                        <span className="sidebar-updated">
                            {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    )}
                </div>

                {/* Cities */}
                <div className="sidebar-section">
                    <div className="sidebar-label">Cities</div>
                    <div className="sidebar-city-list">
                        <button
                            className={`city-row ${!selectedCity ? 'city-row--active' : ''}`}
                            onClick={() => setSelectedCity(null)}
                        >
                            <span className="city-row-dot" style={{ background: '#475569' }} />
                            <span className="city-row-name">All Cities</span>
                        </button>
                        {locations.map((loc, i) => (
                            <button
                                key={loc.id}
                                className={`city-row ${selectedCity === loc.id ? 'city-row--active' : ''}`}
                                onClick={() => setSelectedCity(selectedCity === loc.id ? null : loc.id)}
                                style={selectedCity === loc.id ? { borderColor: CITY_COLORS[i % CITY_COLORS.length] } : {}}
                            >
                                <span className="city-row-dot" style={{ background: CITY_COLORS[i % CITY_COLORS.length] }} />
                                <span className="city-row-name">{loc.name}</span>
                                {loc.temperature != null && (
                                    <span className="city-row-temp">
                                        {(tempUnit === 'C' ? loc.temperature : toF(loc.temperature)).toFixed(0)}°
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Window */}
                <div className="sidebar-section">
                    <div className="sidebar-label">Time Window</div>
                    <div className="sidebar-pills">
                        {[1, 5, 15, 60].map(m => (
                            <button key={m} className={`pill ${windowMinutes === m ? 'pill--active' : ''}`} onClick={() => setWindowMinutes(m)}>
                                {m < 60 ? `${m}m` : '1h'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Temp unit */}
                <div className="sidebar-section">
                    <div className="sidebar-label">Temperature Unit</div>
                    <div className="sidebar-pills">
                        {['C', 'F'].map(u => (
                            <button key={u} className={`pill ${tempUnit === u ? 'pill--active' : ''}`} onClick={() => setTempUnit(u)}>
                                °{u}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart mode */}
                <div className="sidebar-section">
                    <div className="sidebar-label">Chart Mode</div>
                    <div className="sidebar-pills">
                        <button className={`pill ${chartMode === 'single' ? 'pill--active' : ''}`} onClick={() => setChartMode('single')}>Single</button>
                        <button className={`pill ${chartMode === 'compare' ? 'pill--active' : ''}`} onClick={() => setChartMode('compare')}>Compare</button>
                    </div>
                    {chartMode === 'compare' && (
                        <div className="sidebar-pills" style={{ marginTop: 8 }}>
                            {ALERT_METRICS.map(({ key, label }) => (
                                <button key={key} className={`pill pill--sm ${compareMetric === key ? 'pill--active' : ''}`} onClick={() => setCompareMetric(key)}>
                                    {label.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Alert thresholds */}
                <div className="sidebar-section sidebar-section--grow">
                    <div className="sidebar-label">Alert Thresholds</div>
                    {ALERT_METRICS.map(({ key, label }) => (
                        <div className="alert-threshold-row" key={key}>
                            <label className="alert-threshold-label">
                                <input
                                    type="checkbox"
                                    checked={alertThresholds[key].enabled}
                                    onChange={e => setAlertThresholds(prev => ({ ...prev, [key]: { ...prev[key], enabled: e.target.checked } }))}
                                />
                                {key === 'temperature' ? `${label} °${tempUnit}` : label}
                            </label>
                            <input
                                type="number"
                                className="alert-threshold-val"
                                value={alertThresholds[key].value}
                                disabled={!alertThresholds[key].enabled}
                                onChange={e => setAlertThresholds(prev => ({ ...prev, [key]: { ...prev[key], value: Number(e.target.value) } }))}
                            />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="sidebar-footer">
                    <button className={`sidebar-btn ${isPaused ? 'sidebar-btn--pause' : ''}`} onClick={() => setIsPaused(p => !p)}>
                        {isPaused ? '▶ Resume' : '⏸ Pause'}
                    </button>
                    <button className="sidebar-btn sidebar-btn--export" onClick={handleDownloadCsv}>
                        ↓ Export CSV
                    </button>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <div className="main-content">

                {error && <div className="toast toast--error">{error}</div>}
                {loading && data.temperature.length === 0 && <div className="toast toast--loading">Connecting to sensors…</div>}

                {/* Alert banners */}
                {activeAlerts.length > 0 && (
                    <div className="alert-strip">
                        {activeAlerts.map(a => (
                            <div className="alert-chip" key={a.id}>
                                <span>⚠ <strong>{a.city}</strong> — {a.metric} {a.value}{a.unit}</span>
                                <button onClick={() => setActiveAlerts(p => p.filter(x => x.id !== a.id))}>✕</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── STAT CARDS ── */}
                <div className="stat-grid">

                    <div className="stat-card stat-card--temp">
                        <div className="stat-card-top">
                            <div className="stat-icon stat-icon--temp"><MetricIcon type="temperature" /></div>
                            <div className="stat-meta">
                                <span className="stat-name">Temperature</span>
                                <TrendPill trend={tempTrend} />
                            </div>
                        </div>
                        <div className="stat-body">
                            <div className="stat-number">
                                {latestTemp}
                                <span className="stat-unit">°{tempUnit}</span>
                            </div>
                            <Sparkline data={windowedTemps.length > 1 ? windowedTemps : [0, 0]} color="#818cf8" />
                        </div>
                        <div className="stat-footer">
                            <span>Feels like <strong>{feelsLikeDisplay}°</strong></span>
                            <span>Dew <strong>{dewPointDisplay}°</strong></span>
                        </div>
                    </div>

                    <div className="stat-card stat-card--humidity">
                        <div className="stat-card-top">
                            <div className="stat-icon stat-icon--humidity"><MetricIcon type="humidity" /></div>
                            <div className="stat-meta">
                                <span className="stat-name">Humidity</span>
                                <TrendPill trend={humidityTrend} />
                            </div>
                        </div>
                        <div className="stat-body">
                            <div className="stat-number">
                                {latestHumidity}
                                <span className="stat-unit">%</span>
                            </div>
                            <Sparkline data={windowedHumidity.length > 1 ? windowedHumidity : [0, 0]} color="#c084fc" />
                        </div>
                        <div className="stat-footer">
                            <span>{latestHumidityVal != null ? latestHumidityVal < 30 ? 'Dry' : latestHumidityVal < 60 ? 'Comfortable' : latestHumidityVal < 80 ? 'Humid' : 'Very Humid' : '--'}</span>
                            <span>Dew <strong>{dewPointDisplay}°</strong></span>
                        </div>
                    </div>

                    <div className="stat-card stat-card--wind">
                        <div className="stat-card-top">
                            <div className="stat-icon stat-icon--wind"><MetricIcon type="wind" /></div>
                            <div className="stat-meta">
                                <span className="stat-name">Wind Speed</span>
                                <TrendPill trend={windTrend} />
                            </div>
                        </div>
                        <div className="stat-body">
                            <div className="stat-number">
                                {latestWind}
                                <span className="stat-unit">m/s</span>
                            </div>
                            <Sparkline data={windowedWind.length > 1 ? windowedWind : [0, 0]} color="#34d399" />
                        </div>
                        <div className="stat-footer">
                            <span>{latestWindVal != null ? latestWindVal < 0.5 ? 'Calm' : latestWindVal < 3.3 ? 'Light breeze' : latestWindVal < 7.9 ? 'Moderate' : 'Strong' : '--'}</span>
                            <span><strong>{latestWindVal != null ? (latestWindVal * 3.6).toFixed(1) : '--'}</strong> km/h</span>
                        </div>
                    </div>

                    <div className="stat-card stat-card--air" style={aqiInfo ? { '--aqi-color': aqiInfo.color } : {}}>
                        <div className="stat-card-top">
                            <div className="stat-icon stat-icon--air"><MetricIcon type="air" /></div>
                            <div className="stat-meta">
                                <span className="stat-name">Air Quality</span>
                                <TrendPill trend={airTrend} />
                            </div>
                        </div>
                        <div className="stat-body">
                            <div className="stat-number" style={aqiInfo ? { color: aqiInfo.color } : {}}>
                                {latestAirQuality}
                                <span className="stat-unit" style={{ color: '#475569' }}>AQI</span>
                            </div>
                            <Sparkline data={windowedAir.length > 1 ? windowedAir : [0, 0]} color={aqiInfo ? aqiInfo.color : '#22d3ee'} />
                        </div>
                        <div className="stat-footer">
                            <span style={aqiInfo ? { color: aqiInfo.color } : {}}>{aqiInfo ? aqiInfo.label : '--'}</span>
                            <span>via OpenAQ</span>
                        </div>
                    </div>
                </div>

                {/* ── CHART ── */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <h3 className="chart-card-title">
                                {chartMode === 'compare'
                                    ? `${compareMetricLabel} — All Cities`
                                    : selectedCity
                                        ? locations.find(l => l.id === selectedCity)?.name || 'City'
                                        : 'All Metrics'}
                            </h3>
                            <p className="chart-card-sub">Last {windowMinutes < 60 ? `${windowMinutes} min` : '1 hour'}</p>
                        </div>
                    </div>
                    <div className="chart-wrap">
                        <Line data={activeChartData} options={chartOptions} />
                    </div>
                </div>

                {/* ── BOTTOM ROW: MAP + LIVE SENSORS ── */}
                <div className="bottom-row">

                    <div className="map-card">
                        <div className="map-card-header">
                            <h3>Sensor Locations</h3>
                            <span className="map-count">{locations.length} active</span>
                        </div>
                        <div className="map-wrap">
                            <MapContainer center={mapCenter} zoom={6} scrollWheelZoom={false}>
                                <TileLayer
                                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                />
                                {locations.map(loc => {
                                    const displayTemp = tempUnit === 'C' ? loc.temperature : toF(loc.temperature);
                                    const hist = locationHistory[loc.id];
                                    const markerColor = getMarkerColor(loc);
                                    const heatColor = getHeatColor(loc.temperature);
                                    return (
                                        <React.Fragment key={loc.id}>
                                            <Circle
                                                center={[loc.latitude, loc.longitude]}
                                                radius={12000 + Math.min(18000, loc.temperature * 500)}
                                                pathOptions={{ color: heatColor, fillColor: heatColor, fillOpacity: 0.18, weight: 0 }}
                                            />
                                            <Marker position={[loc.latitude, loc.longitude]} icon={createMarkerIcon(markerColor)}>
                                                <Popup>
                                                    <div className="map-popup">
                                                        <strong>{loc.name}</strong>
                                                        <div>Temperature: {displayTemp.toFixed(1)}°{tempUnit}</div>
                                                        <div>Humidity: {loc.humidity.toFixed(1)}%</div>
                                                        <div>Wind: {loc.wind_speed.toFixed(1)} m/s</div>
                                                        <div>AQI: {loc.air_quality.toFixed(0)}</div>
                                                        {hist && (
                                                            <div className="map-trends">
                                                                <div className="trend-row"><span className="trend-label">Temp</span><Sparkline data={tempUnit === 'C' ? hist.temperature : hist.temperature.map(toF)} color="#818cf8" /></div>
                                                                <div className="trend-row"><span className="trend-label">Humidity</span><Sparkline data={hist.humidity} color="#c084fc" /></div>
                                                                <div className="trend-row"><span className="trend-label">Wind</span><Sparkline data={hist.wind_speed} color="#34d399" /></div>
                                                                <div className="trend-row"><span className="trend-label">AQI</span><Sparkline data={hist.air_quality} color="#f59e0b" /></div>
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

                    <div className="live-panel">
                        <div className="live-panel-header">
                            <h3>Live Sensors</h3>
                            {lastUpdatedAt && (
                                <span className="live-updated">
                                    {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            )}
                        </div>
                        <div className="live-list">
                            {locations.map((loc, i) => (
                                <div key={loc.id} className="live-card" style={{ borderLeftColor: CITY_COLORS[i % CITY_COLORS.length] }}>
                                    <div className="live-card-name">
                                        <span className="live-dot-sm" style={{ background: CITY_COLORS[i % CITY_COLORS.length] }} />
                                        {loc.name}
                                    </div>
                                    <div className="live-card-grid">
                                        <div className="live-metric">
                                            <span className="live-metric-label">Temp</span>
                                            <span className="live-metric-val">{(tempUnit === 'C' ? loc.temperature : toF(loc.temperature)).toFixed(1)}°{tempUnit}</span>
                                        </div>
                                        <div className="live-metric">
                                            <span className="live-metric-label">Humidity</span>
                                            <span className="live-metric-val">{loc.humidity.toFixed(1)}%</span>
                                        </div>
                                        <div className="live-metric">
                                            <span className="live-metric-label">Wind</span>
                                            <span className="live-metric-val">{loc.wind_speed.toFixed(1)} m/s</span>
                                        </div>
                                        <div className="live-metric">
                                            <span className="live-metric-label">AQI</span>
                                            <span className="live-metric-val" style={{ color: getAqiInfo(loc.air_quality).color }}>{loc.air_quality.toFixed(0)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
