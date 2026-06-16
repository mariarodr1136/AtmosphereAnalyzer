import { useRef, useState } from 'react';
import axios from 'axios';
import { API_URL } from './constants';

const CitySearch = ({ onClose, onAddCity }) => {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const debounceRef                 = useRef(null);

  const handleChange = val => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await axios.get(`${API_URL}/api/geocode/`, { params: { q: val } });
        setResults(r.data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleAdd = result => {
    onAddCity(result);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="search-bar">
      <div className="search-inner">
        <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="search-input"
          placeholder="Search any city in the world…"
          value={query}
          onChange={e => handleChange(e.target.value)}
          autoFocus
        />
        {loading && <span className="search-spinner">Searching…</span>}
        <button className="search-close" onClick={onClose}>✕</button>
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map((r, i) => (
            <button key={i} className="search-result" onClick={() => handleAdd(r)}>
              <span className="search-result-name">{r.name}{r.state ? `, ${r.state}` : ''}</span>
              <span className="search-result-country">{r.country}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && query && !results.length && (
        <div className="search-empty">No results found — try a different city name</div>
      )}
    </div>
  );
};

export default CitySearch;
