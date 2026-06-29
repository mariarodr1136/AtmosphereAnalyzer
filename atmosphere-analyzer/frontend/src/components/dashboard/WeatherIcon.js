const Svg = ({ size, stroke, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}
  >
    {children}
  </svg>
);

export const DropIcon = ({ size = 10, color = '#60a5fa' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    fillOpacity="0.25"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}
  >
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const WeatherIcon = ({ condition, size = 22, color = 'currentColor' }) => {
  const p = { size, stroke: color };
  switch (condition) {
    case 'Clear':
      return (
        <Svg {...p}>
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </Svg>
      );
    case 'Clouds':
      return (
        <Svg {...p}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </Svg>
      );
    case 'Rain':
      return (
        <Svg {...p}>
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
          <line x1="16" y1="13" x2="16" y2="21" />
          <line x1="8" y1="13" x2="8" y2="21" />
          <line x1="12" y1="15" x2="12" y2="23" />
        </Svg>
      );
    case 'Drizzle':
      return (
        <Svg {...p}>
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
          <path d="M8 19v2m4-4v2m4-4v2" />
        </Svg>
      );
    case 'Thunderstorm':
      return (
        <Svg {...p}>
          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
          <polyline points="13 11 9 17 15 17 11 23" />
        </Svg>
      );
    case 'Snow':
      return (
        <Svg {...p}>
          <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
          <line x1="8" y1="16" x2="8.01" y2="16" />
          <line x1="8" y1="20" x2="8.01" y2="20" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
          <line x1="12" y1="22" x2="12.01" y2="22" />
          <line x1="16" y1="16" x2="16.01" y2="16" />
          <line x1="16" y1="20" x2="16.01" y2="20" />
        </Svg>
      );
    case 'Mist':
    case 'Fog':
    case 'Haze':
      return (
        <Svg {...p}>
          <line x1="3" y1="8" x2="21" y2="8" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="16" x2="21" y2="16" />
        </Svg>
      );
    case 'Wind':
      return (
        <Svg {...p}>
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2" />
          <path d="M10.59 19.41A2 2 0 1 0 12 16H2" />
          <path d="M15.73 8.27A2.5 2.5 0 1 1 17.5 12H2" />
        </Svg>
      );
    default:
      return (
        <Svg {...p}>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </Svg>
      );
  }
};

export default WeatherIcon;
