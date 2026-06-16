const Sparkline = ({ data: s, color }) => {
  const W = 80, H = 28;
  const safe = s.length > 1 ? s : [s[0] || 0, s[0] || 0];
  const min = Math.min(...safe), max = Math.max(...safe), range = max - min || 1;
  const pts = safe.map((v, i) => {
    const x = (i / (safe.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

export default Sparkline;
