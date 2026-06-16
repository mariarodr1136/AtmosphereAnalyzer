import { useState } from 'react';
import { ALERT_METRICS } from './constants';

const AlertsConfig = ({ alertCfg, onChange, tempUnit }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="alerts-card">
      <button className="alerts-toggle" onClick={() => setOpen(s => !s)}>
        <span className="section-label">Configure Alert Thresholds</span>
        <svg className={`chevron ${open ? 'chevron--up' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="alerts-grid">
          {ALERT_METRICS.map(({ key, label }) => (
            <div key={key} className="alert-row">
              <label className="alert-toggle-label">
                <input
                  type="checkbox"
                  checked={alertCfg[key].enabled}
                  onChange={e => onChange(p => ({ ...p, [key]: { ...p[key], enabled: e.target.checked } }))}
                />
                <span>{key === 'temperature' ? `${label} (°${tempUnit})` : label}</span>
              </label>
              <input
                type="number"
                className="alert-input"
                value={alertCfg[key].value}
                disabled={!alertCfg[key].enabled}
                onChange={e => onChange(p => ({ ...p, [key]: { ...p[key], value: Number(e.target.value) } }))}
              />
              <span className="alert-unit">
                {key === 'temperature' ? `°${tempUnit}` : key === 'humidity' ? '%' : key === 'wind_speed' ? 'm/s' : 'AQI'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsConfig;
