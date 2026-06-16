import StatCard from './StatCard';
import { toF, feelsLike, dewPoint, getAqiInfo, getTrend } from './utils';

const StatCards = ({ wCelsius, wHumidity, wWind, wAir, tempUnit }) => {
  const wTemps = tempUnit === 'C' ? wCelsius : wCelsius.map(toF);

  const latTC = wCelsius.at(-1)  ?? null;
  const latH  = wHumidity.at(-1) ?? null;
  const latW  = wWind.at(-1)     ?? null;
  const latA  = wAir.at(-1)      ?? null;

  const dispTemp = latTC != null ? (tempUnit === 'C' ? latTC : toF(latTC)).toFixed(1) : '--';
  const dispHum  = latH  != null ? latH.toFixed(1) : '--';
  const dispWind = latW  != null ? latW.toFixed(1) : '--';
  const dispAir  = latA  != null ? latA.toFixed(0) : '--';

  const flVal  = latTC != null && latH != null ? feelsLike(latTC, latH) : null;
  const dpVal  = latTC != null && latH != null ? dewPoint(latTC, latH)  : null;
  const flDisp = flVal != null ? (tempUnit === 'C' ? flVal : toF(flVal)).toFixed(1) : '--';
  const dpDisp = dpVal != null ? (tempUnit === 'C' ? dpVal : toF(dpVal)).toFixed(1) : '--';
  const aqiInfo = latA != null ? getAqiInfo(latA) : null;

  const tTrend = getTrend(wTemps);
  const hTrend = getTrend(wHumidity);
  const wTrend = getTrend(wWind);
  const aTrend = getTrend(wAir);

  return (
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
  );
};

export default StatCards;
