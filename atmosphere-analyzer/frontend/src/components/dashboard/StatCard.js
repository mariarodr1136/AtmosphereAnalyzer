import Sparkline from './Sparkline';
import TrendBadge from './TrendBadge';

const StatCard = ({ accent, icon, label, value, unit, sparkData, sparkColor, sub1, sub2, trend, style }) => (
  <div className="stat-card" style={{ '--accent': accent, ...style }}>
    <div className="stat-top">
      <div className="stat-icon-wrap" style={{ background: accent + '18', color: accent }}>{icon}</div>
      <div className="stat-label-row">
        <span className="stat-label">{label}</span>
        <TrendBadge trend={trend} />
      </div>
    </div>
    <div className="stat-value-row">
      <span className="stat-value">{value}</span>
      <span className="stat-unit">{unit}</span>
      <Sparkline data={sparkData.length > 1 ? sparkData : [0, 0]} color={sparkColor} />
    </div>
    <div className="stat-footer">
      <span>{sub1}</span>
      <span>{sub2}</span>
    </div>
  </div>
);

export default StatCard;
