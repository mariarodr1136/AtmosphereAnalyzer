import React, { useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toF } from './utils';
import Sparkline from './Sparkline';

const markerColor = t => {
  if (t >= 30) return '#ef4444';
  if (t >= 25) return '#f97316';
  if (t >= 20) return '#22c55e';
  if (t >= 10) return '#38bdf8';
  return '#6366f1';
};

const mkIcon = (color, custom) => L.divIcon({
  className: 'sensor-marker',
  html: `<span style="background:${color};${custom ? 'border-color:#f59e0b' : ''}"></span>`,
  iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -8],
});

const SPARK_KEYS = [
  ['Temp',  'temperature', '#818cf8'],
  ['Hum',   'humidity',    '#c084fc'],
  ['Wind',  'wind_speed',  '#34d399'],
  ['AQI',   'air_quality', '#f59e0b'],
];

const InvalidateSize = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    map.invalidateSize();
    return () => ro.disconnect();
  }, [map]);
  return null;
};

const SensorMap = ({ locations, locHistory, tempUnit, isDark }) => {
  const center = locations.length ? [locations[0].latitude, locations[0].longitude] : [37.5, -96];
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';

  return (
    <div className="map-card">
      <div className="card-head">
        <span className="section-label">Sensor Map</span>
        <span className="map-badge">{locations.length} active</span>
      </div>
      <div className="map-body">
        <MapContainer center={center} zoom={4} scrollWheelZoom={false}>
          <InvalidateSize />
          <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' url={tileUrl} />
          {locations.map((loc, i) => {
            const mc   = markerColor(loc.temperature);
            const hist = locHistory[loc.id];
            const dT   = tempUnit === 'C' ? loc.temperature : toF(loc.temperature);
            return (
              <React.Fragment key={loc.id}>
                <Circle
                  center={[loc.latitude, loc.longitude]}
                  radius={14000 + Math.min(16000, loc.temperature * 400)}
                  pathOptions={{ color: mc, fillColor: mc, fillOpacity: 0.15, weight: 0 }}
                />
                <Marker position={[loc.latitude, loc.longitude]} icon={mkIcon(mc, loc.is_custom)}>
                  <Popup>
                    <div className="map-popup">
                      <strong>{loc.name}</strong>
                      {loc.is_custom && <span className="popup-tag">custom</span>}
                      <div>🌡 {dT.toFixed(1)}°{tempUnit}</div>
                      <div>💧 {loc.humidity.toFixed(1)}%</div>
                      <div>💨 {loc.wind_speed.toFixed(1)} m/s</div>
                      <div>🌫 AQI {loc.air_quality.toFixed(0)}</div>
                      {hist && (
                        <div className="popup-sparks">
                          {SPARK_KEYS.map(([lbl, k, c]) => (
                            <div key={k} className="popup-spark-row">
                              <span>{lbl}</span>
                              <Sparkline
                                data={k === 'temperature' && tempUnit === 'F' ? hist[k].map(toF) : hist[k]}
                                color={c}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default SensorMap;
