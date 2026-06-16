import { CITY_COLORS } from './constants';
import { toF } from './utils';

const DashNav = ({
  connMode, selectedCity, locations, tempUnit, theme, isPaused,
  onSelectCity, onThemeToggle, onPauseToggle, onToggleSearch, onRemoveCity,
}) => (
  <header className="dash-nav">
    <div className="dash-brand">
      <span className={`conn-dot conn-dot--${connMode}`} />
      <span className="dash-brand-name">AtmosphereAnalyzer</span>
    </div>

    <div className="dash-cities-scroll">
      <button
        className={`city-chip ${!selectedCity ? 'city-chip--active' : ''}`}
        onClick={() => onSelectCity(null, null)}
      >
        All cities
      </button>

      {locations.map((loc, i) => (
        <div key={loc.id} className="city-chip-wrap">
          <button
            className={`city-chip ${selectedCity === loc.id ? 'city-chip--active' : ''}`}
            style={selectedCity === loc.id
              ? { borderColor: CITY_COLORS[i % CITY_COLORS.length], color: CITY_COLORS[i % CITY_COLORS.length] }
              : {}}
            onClick={() => onSelectCity(loc.id === selectedCity ? null : loc.id, loc.name)}
          >
            <span className="city-chip-dot" style={{ background: CITY_COLORS[i % CITY_COLORS.length] }} />
            {loc.name}
            {loc.temperature != null && (
              <span className="city-chip-temp">
                {(tempUnit === 'C' ? loc.temperature : toF(loc.temperature)).toFixed(0)}°
              </span>
            )}
          </button>
          {loc.is_custom && (
            <button className="city-chip-rm" onClick={() => onRemoveCity(loc.custom_id)} title="Remove">✕</button>
          )}
        </div>
      ))}

      <button className="city-chip city-chip--add" onClick={onToggleSearch}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        Add city
      </button>
    </div>

    <div className="dash-nav-actions">
      <span className={`conn-badge conn-badge--${connMode}`}>
        {connMode === 'live' ? 'Live' : connMode === 'polling' ? 'Polling' : 'Connecting'}
      </span>

      <button className="nav-btn" onClick={onThemeToggle} title="Toggle theme">
        {theme === 'light' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        )}
      </button>

      <button
        className={`nav-btn ${isPaused ? 'nav-btn--active' : ''}`}
        onClick={onPauseToggle}
        title={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        }
      </button>
    </div>
  </header>
);

export default DashNav;
