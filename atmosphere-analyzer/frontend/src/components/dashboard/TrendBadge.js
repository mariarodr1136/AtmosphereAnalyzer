const TrendBadge = ({ trend }) => {
  const map = {
    up:   { icon: '↑', cls: 'up'   },
    down: { icon: '↓', cls: 'down' },
    flat: { icon: '→', cls: 'flat' },
  };
  const { icon, cls } = map[trend] || map.flat;
  return <span className={`trend-badge trend-badge--${cls}`}>{icon}</span>;
};

export default TrendBadge;
