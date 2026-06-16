import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, ALERT_METRICS } from './constants';
import HeatmapGrid from './HeatmapGrid';

const HeatmapCard = ({ theme }) => {
  const [show, setShow]           = useState(false);
  const [grid, setGrid]           = useState(null);
  const [metric, setMetric]       = useState('temperature');

  const fetchHeatmap = useCallback(async m => {
    try {
      const r = await axios.get(`${API_URL}/api/heatmap/`, { params: { metric: m } });
      setGrid(r.data.grid);
    } catch {
      setGrid({});
    }
  }, []);

  useEffect(() => { if (show) fetchHeatmap(metric); }, [show, metric, fetchHeatmap]);

  return (
    <div className="heatmap-card">
      <div className="card-head">
        <div className="heatmap-head-left">
          <span className="section-label">Activity Heatmap</span>
          <span className="section-sub">last 7 days by hour of day</span>
        </div>
        <div className="heatmap-head-right">
          {show && (
            <div className="ctrl-group">
              {ALERT_METRICS.map(({ key, label }) => (
                <button key={key} className={`ctrl-pill ${metric === key ? 'ctrl-pill--on' : ''}`} onClick={() => setMetric(key)}>
                  {label.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
          <button className={`ctrl-pill ${show ? 'ctrl-pill--on' : ''}`} onClick={() => setShow(s => !s)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {show && grid && <HeatmapGrid grid={grid} theme={theme} />}
    </div>
  );
};

export default HeatmapCard;
