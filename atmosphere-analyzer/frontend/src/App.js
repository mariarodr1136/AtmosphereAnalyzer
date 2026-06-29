import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function conditionLabel(temp, wind) {
  if (wind > 10) return 'Windy';
  if (temp >= 30) return 'Warm & Sunny';
  if (temp >= 20) return 'Clear';
  if (temp >= 10) return 'Mild';
  return 'Cool';
}

const WeatherIcon = () => (
  <svg className="hero-wx-icon" viewBox="0 0 160 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g className="hero-sun-spin">
      <line x1="108" y1="6"  x2="108" y2="14" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round"/>
      <line x1="108" y1="74" x2="108" y2="82" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round"/>
      <line x1="70"  y1="44" x2="78"  y2="44" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round"/>
      <line x1="138" y1="44" x2="146" y2="44" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round"/>
      <line x1="81"  y1="17" x2="87"  y2="23" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round"/>
      <line x1="129" y1="65" x2="135" y2="71" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round"/>
      <line x1="129" y1="17" x2="135" y2="23" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round"/>
      <line x1="81"  y1="65" x2="87"  y2="71" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round"/>
    </g>
    <circle cx="108" cy="44" r="26" fill="#FCD34D"/>
    <circle cx="58"  cy="88" r="26" fill="white"/>
    <circle cx="36"  cy="96" r="18" fill="white"/>
    <circle cx="80"  cy="96" r="18" fill="white"/>
    <rect   x="18"   y="96" width="80" height="22" fill="white"/>
  </svg>
);

const App = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/sensor-data/`)
      .then(r => r.json())
      .then(d => setWeather(d))
      .catch(() => {});
  }, []);

  const temp      = weather ? Math.round(weather.temperature)       : null;
  const humidity  = weather ? Math.round(weather.humidity)          : null;
  const wind      = weather ? weather.wind_speed.toFixed(1)         : null;
  const aqi       = weather ? Math.round(weather.air_quality)       : null;
  const condition = weather ? conditionLabel(weather.temperature, weather.wind_speed) : '—';

  return (
    <div className="App">
      <div className={`hero-page${showDashboard ? ' hero-page--exit' : ''}`}>
        <WeatherIcon />

        <div className="hero-current">
          <span className="hero-temp">{temp !== null ? `${temp}°C` : '—'}</span>
          <span className="hero-condition">{condition}</span>
        </div>

        <h1 className="hero-title">AtmosphereAnalyzer</h1>
        <p className="hero-desc">Real-time air quality, temperature, wind, and weather forecasts across multiple sensor locations — all in one live dashboard.</p>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-label">Humidity</span>
            <span className="hero-stat-val">{humidity !== null ? `${humidity}%` : '—'}</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-label">Wind</span>
            <span className="hero-stat-val">{wind !== null ? `${wind} m/s` : '—'}</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-label">Air Quality</span>
            <span className="hero-stat-val">{aqi !== null ? aqi : '—'}</span>
          </div>
        </div>

        <div className="hero-pills">
          <span className="hero-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Multi-city coverage
          </span>
          <span className="hero-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Live sensor data
          </span>
          <span className="hero-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Interactive map
          </span>
          <span className="hero-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Custom alerts
          </span>
        </div>

        <button className="hero-open-btn" onClick={() => setShowDashboard(true)}>
          Open Dashboard
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M8 13l-4-4M8 13l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className={`dashboard-page${showDashboard ? ' dashboard-page--visible' : ''}`}>
        <Dashboard onBack={() => setShowDashboard(false)} />
      </div>
    </div>
  );
};

export default App;
