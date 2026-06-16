import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, CONDITION_ICONS } from './constants';
import { toF } from './utils';

const ForecastCard = ({ city, tempUnit }) => {
  const [forecast, setForecast]   = useState(null);
  const [loading, setLoading]     = useState(false);

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

  return (
    <div className="forecast-card">
      <div className="forecast-head">
        <span className="section-label">5-Day Forecast</span>
        {loading
          ? <span className="fc-loading">Loading…</span>
          : <span className="fc-city-badge">{city}</span>
        }
      </div>

      {!loading && !forecast && (
        <p className="empty-msg">Forecast unavailable — add an OpenWeatherMap API key to enable.</p>
      )}

      {forecast && (
        <div className="forecast-grid">
          {forecast.map(day => {
            const minT  = tempUnit === 'F' ? toF(day.temp_min) : day.temp_min;
            const maxT  = tempUnit === 'F' ? toF(day.temp_max) : day.temp_max;
            const icon  = CONDITION_ICONS[day.condition] ?? '🌤️';
            const label = new Date(day.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
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
  );
};

export default ForecastCard;
