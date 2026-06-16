export const toF = c => (c * 9) / 5 + 32;

export const feelsLike = (t, h) => {
  const e = (h / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  return t + 0.33 * e - 4.0;
};

export const dewPoint = (t, h) => {
  const a = 17.27, b = 237.7;
  const alpha = ((a * t) / (b + t)) + Math.log(Math.max(h, 1) / 100);
  return (b * alpha) / (a - alpha);
};

export const getAqiInfo = aqi => {
  if (aqi <= 50)  return { label: 'Good',                    color: '#10b981' };
  if (aqi <= 100) return { label: 'Moderate',                color: '#f59e0b' };
  if (aqi <= 150) return { label: 'Unhealthy (Sensitive)',   color: '#f97316' };
  if (aqi <= 200) return { label: 'Unhealthy',               color: '#ef4444' };
  if (aqi <= 300) return { label: 'Very Unhealthy',          color: '#a855f7' };
  return                 { label: 'Hazardous',               color: '#be185d' };
};

export const getTrend = series => {
  if (series.length < 2) return 'flat';
  const d = series[series.length - 1] - series[series.length - 2];
  if (Math.abs(d) < 0.05) return 'flat';
  return d > 0 ? 'up' : 'down';
};

export const detectAnomalies = (series, win = 20) =>
  series.map((v, i) => {
    if (i < 5) return false;
    const w    = series.slice(Math.max(0, i - win), i);
    const mean = w.reduce((a, b) => a + b, 0) / w.length;
    const std  = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / w.length);
    return std > 0.001 && Math.abs(v - mean) / std >= 2.0;
  });

export const readUrlParams = () => {
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
