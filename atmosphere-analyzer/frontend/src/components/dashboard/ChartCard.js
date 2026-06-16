import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, LineElement, CategoryScale, LinearScale,
  Title, Tooltip, Legend, PointElement, Filler,
} from 'chart.js';
import { ALERT_METRICS } from './constants';

ChartJS.register(LineElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PointElement, Filler);

const ChartCard = ({
  chartData, chartOpts, chartMode, setChartMode,
  windowMinutes, setWindowMinutes,
  tempUnit, setTempUnit,
  cmpMetric, setCmpMetric,
  anomCount, locations, selectedCity,
  onExportCsv, onExportPdf, onShare,
}) => {
  const cmpMetricLabel = {
    temperature: `Temp (°${tempUnit})`,
    humidity:    'Humidity (%)',
    wind_speed:  'Wind (m/s)',
    air_quality: 'Air Quality (AQI)',
  }[cmpMetric];

  const title = chartMode === 'compare'
    ? <>{cmpMetricLabel} <span className="chart-title-sub">— all cities</span></>
    : selectedCity
      ? locations.find(l => l.id === selectedCity)?.name ?? 'City'
      : <>All Metrics <span className="chart-title-sub">— {windowMinutes < 60 ? `${windowMinutes}m` : '1h'} window</span></>;

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div className="chart-head-left">
          <h2 className="chart-title">{title}</h2>
          {anomCount > 0 && (
            <span className="anomaly-pill">⚡ {anomCount} anomal{anomCount === 1 ? 'y' : 'ies'}</span>
          )}
        </div>

        <div className="chart-controls">
          <div className="ctrl-group">
            {[1, 5, 15, 60].map(m => (
              <button key={m} className={`ctrl-pill ${windowMinutes === m ? 'ctrl-pill--on' : ''}`} onClick={() => setWindowMinutes(m)}>
                {m < 60 ? `${m}m` : '1h'}
              </button>
            ))}
          </div>
          <div className="ctrl-sep" />
          <div className="ctrl-group">
            {['C', 'F'].map(u => (
              <button key={u} className={`ctrl-pill ${tempUnit === u ? 'ctrl-pill--on' : ''}`} onClick={() => setTempUnit(u)}>°{u}</button>
            ))}
          </div>
          <div className="ctrl-sep" />
          <div className="ctrl-group">
            <button className={`ctrl-pill ${chartMode === 'single'  ? 'ctrl-pill--on' : ''}`} onClick={() => setChartMode('single')}>Single</button>
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
          <button className="act-btn" onClick={onExportCsv} title="Download CSV">CSV</button>
          <button className="act-btn" onClick={onExportPdf} title="Download PDF">PDF</button>
          <button className="act-btn" onClick={onShare} title="Copy share link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="chart-area">
        <Line data={chartData} options={chartOpts} />
      </div>
    </div>
  );
};

export default ChartCard;
