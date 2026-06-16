import { useState } from 'react';
import { CITY_COLORS } from './constants';
import { toF, getAqiInfo } from './utils';

const SEV_STYLES = {
  info:     { dot: '#10b981', text: '#166534' },
  warning:  { dot: '#f59e0b', text: '#92400e' },
  critical: { dot: '#ef4444', text: '#991b1b' },
};

const SidePanel = ({ locations, locHistory, events, tempUnit, updatedAt }) => {
  const [sideTab, setSideTab] = useState('sensors');

  return (
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
                  <span className="sm-val" style={{ color: getAqiInfo(loc.air_quality).color }}>
                    {loc.air_quality.toFixed(0)}
                  </span>
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
            const s  = SEV_STYLES[ev.severity] ?? SEV_STYLES.info;
            const ts = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
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
          Updated {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      )}
    </div>
  );
};

export default SidePanel;
