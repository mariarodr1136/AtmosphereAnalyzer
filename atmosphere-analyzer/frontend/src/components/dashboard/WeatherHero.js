import { toF, feelsLike, getAqiInfo } from './utils';
import WeatherIcon from './WeatherIcon';

function conditionText(temp, wind, hum) {
  if (wind > 12)  return 'Windy';
  if (hum  > 88)  return 'Very Humid';
  if (temp >= 32) return 'Hot & Sunny';
  if (temp >= 24) return 'Warm';
  if (temp >= 18) return 'Partly Cloudy';
  if (temp >= 10) return 'Mild';
  return 'Cool';
}

function conditionKey(temp, wind, hum) {
  if (wind > 12)  return 'Wind';
  if (hum  > 88)  return 'Rain';
  if (temp >= 32) return 'Clear';
  if (temp >= 24) return 'Clouds';
  if (temp >= 15) return 'Clouds';
  return 'Mist';
}

const WeatherHero = ({
  wCelsius, wHumidity, wWind, wAir, tempUnit,
  locations, selectedCity,
}) => {
  const latT = wCelsius.at(-1)  ?? null;
  const latH = wHumidity.at(-1) ?? null;
  const latW = wWind.at(-1)     ?? null;
  const latA = wAir.at(-1)      ?? null;

  const dispT   = latT != null ? Math.round(tempUnit === 'C' ? latT : toF(latT)) : '--';
  const flVal   = latT != null && latH != null ? feelsLike(latT, latH) : null;
  const dispFL  = flVal != null ? Math.round(tempUnit === 'C' ? flVal : toF(flVal)) : '--';
  const aqiInfo = latA != null ? getAqiInfo(latA) : null;

  const cityName = selectedCity
    ? (locations.find(l => l.id === selectedCity)?.name ?? 'Sensor')
    : locations.length > 0 ? 'All Cities' : 'Live Sensors';

  const cond    = latT != null ? conditionText(latT, latW ?? 0, latH ?? 50) : '—';
  const iconKey = latT != null ? conditionKey(latT, latW ?? 0, latH ?? 50) : 'Clouds';

  const now     = new Date();
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="wx-hero">
      <div className="wx-hero-left">
        <p className="wx-date">{dateStr} · {timeStr}</p>
        <p className="wx-city">{cityName}</p>
        <div className="wx-temp-row">
          <span className="wx-temp">{dispT}°{tempUnit}</span>
          <div className="wx-cond-block">
            <div className="wx-icon">
              <WeatherIcon condition={iconKey} size={46} color="rgba(255,255,255,0.92)" />
            </div>
            <span className="wx-cond">{cond}</span>
          </div>
        </div>
        <div className="wx-meta">
          <div className="wx-meta-item">
            <span className="wx-meta-label">Feels Like</span>
            <span className="wx-meta-val">{dispFL}°</span>
          </div>
          <span className="wx-sep" />
          <div className="wx-meta-item">
            <span className="wx-meta-label">Humidity</span>
            <span className="wx-meta-val">{latH != null ? Math.round(latH) : '--'}%</span>
          </div>
          <span className="wx-sep" />
          <div className="wx-meta-item">
            <span className="wx-meta-label">Wind</span>
            <span className="wx-meta-val">{latW != null ? latW.toFixed(1) : '--'} m/s</span>
          </div>
          {aqiInfo && (
            <>
              <span className="wx-sep" />
              <div className="wx-meta-item">
                <span className="wx-meta-label">Air Quality</span>
                <span className="wx-meta-val" style={{ color: aqiInfo.color }}>{aqiInfo.label}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherHero;
