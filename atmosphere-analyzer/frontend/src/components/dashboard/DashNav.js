import { toF } from './utils';
import { CITY_COLORS } from './constants';

const DashNav = ({
  connMode, isPaused,
  onPauseToggle, onBack,
  locations = [], selectedCity, onSelectCity, onRemoveCity, onToggleSearch, tempUnit,
}) => (
  <header className="dash-nav">
    <div className="dash-brand">
      {onBack && (
        <button className="nav-btn nav-btn--back" onClick={onBack} title="Back to home">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <span className={`conn-dot conn-dot--${connMode}`} />
      <span className="dash-brand-name">AtmosphereAnalyzer</span>
    </div>

    <div className="nav-cities">
      <button
        className={`nav-loc-item ${!selectedCity ? 'nav-loc-item--active' : ''}`}
        onClick={() => onSelectCity?.(null, null)}
      >
        <span className="nav-loc-name">All Cities</span>
      </button>

      {locations.map((loc, i) => {
        const locTemp = loc.temperature != null
          ? Math.round(tempUnit === 'C' ? loc.temperature : toF(loc.temperature))
          : null;
        const color = CITY_COLORS[i % CITY_COLORS.length];
        return (
          <div key={loc.id} className="nav-loc-row">
            <button
              className={`nav-loc-item ${selectedCity === loc.id ? 'nav-loc-item--active' : ''}`}
              onClick={() => onSelectCity?.(loc.id === selectedCity ? null : loc.id, loc.name)}
            >
              <span className="nav-loc-dot" style={{ background: color }} />
              <span className="nav-loc-name">{loc.name}</span>
              {locTemp != null && <span className="nav-loc-temp">{locTemp}°</span>}
            </button>
            {loc.is_custom && (
              <button className="nav-loc-rm" onClick={() => onRemoveCity?.(loc.custom_id)} title="Remove">✕</button>
            )}
          </div>
        );
      })}

      <button className="nav-loc-add" onClick={onToggleSearch}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        Add city
      </button>
    </div>

    <div className="dash-nav-actions">
      <span className={`conn-badge conn-badge--${connMode}`}>
        {connMode === 'live' ? 'Live' : connMode === 'polling' ? 'Polling' : 'Connecting'}
      </span>

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
