import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from './constants';
import { toF } from './utils';
import WeatherIcon, { DropIcon } from './WeatherIcon';

const ForecastCard = ({ city, tempUnit }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading]   = useState(false);

  const fetchForecast = useCallback(async c => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_URL}/api/forecast/`, { params: { city: c, country: 'US' } });
      setForecast(r.data.forecast);
    } catch {
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForecast(city); }, [fetchForecast, city]);

  const converted = forecast?.map(day => ({
    ...day,
    minT: tempUnit === 'F' ? toF(day.temp_min) : day.temp_min,
    maxT: tempUnit === 'F' ? toF(day.temp_max) : day.temp_max,
  }));

  const allMin  = converted ? Math.min(...converted.map(d => d.minT)) : 0;
  const allMax  = converted ? Math.max(...converted.map(d => d.maxT)) : 1;
  const allSpan = allMax - allMin || 1;

  return (
    <div className="forecast-card">
      {(loading || city) && (
        <div className="card-head">
          {city && !loading && <span className="section-sub" style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{city}</span>}
          {loading && <span className="fc-loading">Loading…</span>}
        </div>
      )}

      {!loading && !forecast && (
        <p className="empty-msg">Forecast unavailable — add an OpenWeatherMap API key to enable.</p>
      )}

      {converted && (
        <div className="fc-list">
          {converted.slice(0, 8).map(day => {
            const label   = new Date(day.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short' });
            const dateNum = new Date(day.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
            const barLeft  = ((day.minT - allMin) / allSpan) * 100;
            const barWidth = ((day.maxT - day.minT) / allSpan) * 100;
            return (
              <div key={day.date} className="fc-row">
                <div className="fc-row-date">
                  <span className="fc-row-day">{label}</span>
                  <span className="fc-row-num">{dateNum}</span>
                </div>
                <div className="fc-row-icon">
                  <WeatherIcon condition={day.condition} size={22} />
                </div>
                <span className="fc-row-cond">{day.condition}</span>
                <span className="fc-row-precip">
                  <DropIcon size={10} />
                  {day.humidity_avg.toFixed(0)}%
                </span>
                <div className="fc-bar-track">
                  <div className="fc-bar-fill" style={{ left: `${barLeft}%`, width: `${Math.max(barWidth, 8)}%` }} />
                </div>
                <span className="fc-row-lo">{day.minT.toFixed(0)}°</span>
                <span className="fc-row-hi">{day.maxT.toFixed(0)}°</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ForecastCard;
