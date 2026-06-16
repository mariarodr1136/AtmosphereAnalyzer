const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HeatmapGrid = ({ grid, theme }) => {
  const vals = Object.values(grid).filter(v => v != null);
  if (!vals.length) return <p className="empty-msg">Not enough history yet — check back after a few hours.</p>;
  const minV = Math.min(...vals), maxV = Math.max(...vals);

  const cellColor = v => {
    if (v == null) return theme === 'dark' ? '#1e293b' : '#f1f5f9';
    const r = maxV === minV ? 0.5 : (v - minV) / (maxV - minV);
    return `hsl(${Math.round((1 - r) * 200)}, 70%, ${theme === 'dark' ? '32%' : '52%'})`;
  };

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-hour-row">
        <div className="hm-day-lbl" />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="hm-hr-lbl">{h % 6 === 0 ? `${h}h` : ''}</div>
        ))}
      </div>
      {DAYS.map((day, di) => (
        <div key={day} className="heatmap-row">
          <div className="hm-day-lbl">{day}</div>
          {Array.from({ length: 24 }, (_, hr) => {
            const v = grid[`${di + 1}-${hr}`];
            return (
              <div key={hr} className="hm-cell" style={{ background: cellColor(v) }}
                title={v != null ? `${day} ${hr}:00 — ${v.toFixed(1)}` : 'No data'} />
            );
          })}
        </div>
      ))}
      <div className="hm-legend">
        <span className="hm-legend-lo">{minV.toFixed(1)}</span>
        <div className="hm-legend-bar" />
        <span className="hm-legend-hi">{maxV.toFixed(1)}</span>
      </div>
    </div>
  );
};

export default HeatmapGrid;
