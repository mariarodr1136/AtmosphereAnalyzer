import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  PointElement
} from 'chart.js';
import axios from 'axios';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

// Register the necessary components
ChartJS.register(LineElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PointElement);

const Dashboard = () => {
    const [data, setData] = useState({
        temperature: [],
        humidity: [],
        wind_speed: [],
        air_quality: [],
        timestamps: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [tempUnit, setTempUnit] = useState('C');
    const [windowMinutes, setWindowMinutes] = useState(5);
    const [locations, setLocations] = useState([]);
    const [locationHistory, setLocationHistory] = useState({});
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const pausedRef = useRef(false);

    useEffect(() => {
        pausedRef.current = isPaused;
    }, [isPaused]);

    const fetchData = async () => {
        try {
            if (pausedRef.current) {
                return;
            }
            setLoading(true);
            const apiUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
            const response = await axios.get(`${apiUrl}/api/sensor-data/`);
            setData(prevData => ({
                temperature: [...prevData.temperature, response.data.temperature],
                humidity: [...prevData.humidity, response.data.humidity],
                wind_speed: [...prevData.wind_speed, response.data.wind_speed],
                air_quality: [...prevData.air_quality, response.data.air_quality],
                timestamps: [...prevData.timestamps, Date.now()],
            }));
            setLastUpdatedAt(Date.now());
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to fetch data. Please try again later.');
            setLoading(false);
        }
    };

    const fetchLocations = async () => {
        try {
            if (pausedRef.current) {
                return;
            }
            const apiUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
            const response = await axios.get(`${apiUrl}/api/sensor-locations/`);
            const fetchedLocations = response.data.locations || [];
            setLocations(fetchedLocations);
            setLastUpdatedAt(Date.now());
            setLocationHistory(prevHistory => {
                const nextHistory = { ...prevHistory };
                fetchedLocations.forEach(location => {
                    const existing = nextHistory[location.id] || {
                        id: location.id,
                        name: location.name,
                        latitude: location.latitude,
                        longitude: location.longitude,
                        temperature: [],
                        humidity: [],
                        wind_speed: [],
                        air_quality: [],
                    };
                    existing.name = location.name;
                    existing.latitude = location.latitude;
                    existing.longitude = location.longitude;
                    existing.temperature = [...existing.temperature, location.temperature].slice(-20);
                    existing.humidity = [...existing.humidity, location.humidity].slice(-20);
                    existing.wind_speed = [...existing.wind_speed, location.wind_speed].slice(-20);
                    existing.air_quality = [...existing.air_quality, location.air_quality].slice(-20);
                    nextHistory[location.id] = existing;
                });
                return nextHistory;
            });
        } catch (locationsError) {
            console.error('Error fetching locations:', locationsError);
        }
    };

    useEffect(() => {
        fetchData(); // Initial data fetch
        fetchLocations();
        const interval = setInterval(() => {
            fetchData();
            fetchLocations();
        }, 5000); // Polling every 5 seconds
        return () => clearInterval(interval); // Cleanup on component unmount
    }, []);

    const toFahrenheit = celsius => (celsius * 9) / 5 + 32;
    const displayTemps = tempUnit === 'C'
        ? data.temperature
        : data.temperature.map(value => toFahrenheit(value));

    const pointsPerMinute = 12;
    const windowPoints = Math.max(1, windowMinutes * pointsPerMinute);
    const windowedCelsius = data.temperature.slice(-windowPoints);
    const windowedFahrenheit = windowedCelsius.map(value => toFahrenheit(value));
    const windowedTemps = tempUnit === 'C' ? windowedCelsius : windowedFahrenheit;
    const windowedHumidity = data.humidity.slice(-windowPoints);
    const windowedWind = data.wind_speed.slice(-windowPoints);
    const windowedAir = data.air_quality.slice(-windowPoints);
    const windowedTimestamps = data.timestamps.slice(-windowPoints);

    const latestTemp = displayTemps.length > 0
        ? displayTemps[displayTemps.length - 1].toFixed(1)
        : '--';
    const latestHumidity = data.humidity.length > 0
        ? data.humidity[data.humidity.length - 1].toFixed(1)
        : '--';
    const latestWind = data.wind_speed.length > 0
        ? data.wind_speed[data.wind_speed.length - 1].toFixed(1)
        : '--';
    const latestAirQuality = data.air_quality.length > 0
        ? data.air_quality[data.air_quality.length - 1].toFixed(0)
        : '--';

    // Ensure that the labels are unique and that the chart data updates correctly
    const chartData = {
        labels: windowedTimestamps.map(timestamp =>
            new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        ),
        datasets: [
            {
                label: `Temperature (\u00B0${tempUnit})`,
                data: windowedTemps,
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
                lineTension: 0,
            },
            {
                label: 'Humidity (%)',
                data: windowedHumidity,
                borderColor: 'rgba(54, 162, 235, 1)',
                fill: false,
                lineTension: 0,
            },
            {
                label: 'Wind Speed (m/s)',
                data: windowedWind,
                borderColor: 'rgba(34, 197, 94, 1)',
                fill: false,
                lineTension: 0,
            },
            {
                label: 'Air Quality (AQI)',
                data: windowedAir,
                borderColor: 'rgba(234, 179, 8, 1)',
                fill: false,
                lineTension: 0,
            },
        ],
    };

    const chartOptions = {
        scales: {
            x: {
                position: 'bottom',
                title: {
                    display: true,
                    text: 'Time',
                },
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Values',
                },
            },
        },
        responsive: true,
        maintainAspectRatio: false,
    };

    const getMarkerColor = location => {
        const tempValue = location.temperature;

        if (tempValue >= 30) return '#ef4444';
        if (tempValue >= 25) return '#f97316';
        if (tempValue >= 20) return '#22c55e';
        if (tempValue >= 10) return '#38bdf8';
        return '#2563eb';
    };

    const getHeatmapColor = value => {
        if (value >= 30) return '#ef4444';
        if (value >= 25) return '#f97316';
        if (value >= 20) return '#22c55e';
        if (value >= 10) return '#38bdf8';
        return '#2563eb';
    };

    const getHeatmapRadius = value => 12000 + Math.min(18000, value * 500);

    const handleDownloadCsv = () => {
        const headers = [
            'timestamp',
            'temperature_c',
            'temperature_f',
            'humidity',
            'wind_speed',
            'air_quality',
        ];

        const rows = windowedTimestamps.map((timestamp, index) => [
            new Date(timestamp).toISOString(),
            (windowedCelsius[index] ?? 0).toFixed(2),
            (windowedFahrenheit[index] ?? 0).toFixed(2),
            (windowedHumidity[index] ?? 0).toFixed(2),
            (windowedWind[index] ?? 0).toFixed(2),
            (windowedAir[index] ?? 0).toFixed(0),
        ]);

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `sensor-history-${windowMinutes}m.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const Sparkline = ({ data: series, color }) => {
        const width = 120;
        const height = 36;
        const safeSeries = series.length > 1 ? series : [series[0] || 0, series[0] || 0];
        const min = Math.min(...safeSeries);
        const max = Math.max(...safeSeries);
        const range = max - min || 1;

        const points = safeSeries
            .map((value, index) => {
                const x = (index / (safeSeries.length - 1)) * width;
                const y = height - ((value - min) / range) * height;
                return `${x},${y}`;
            })
            .join(' ');

        return (
            <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    points={points}
                />
            </svg>
        );
    };

    const mapCenter = locations.length > 0
        ? [locations[0].latitude, locations[0].longitude]
        : [39.8283, -98.5795];

    const createMarkerIcon = color => L.divIcon({
        className: 'sensor-marker',
        html: `<span style="background:${color}"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8],
    });

    return (
        <div className="dashboard">
            <h2>Environmental Metrics</h2>
            <div className="dashboard-controls">
                <button
                    className={`control-button ${isPaused ? 'is-paused' : ''}`}
                    onClick={() => setIsPaused(prev => !prev)}
                    aria-pressed={isPaused}
                >
                    {isPaused ? 'Resume Live Updates' : 'Pause Live Updates'}
                </button>
                <div className="window-toggle" role="group" aria-label="Rolling window">
                    <button
                        className={`control-button ${windowMinutes === 1 ? 'is-active' : ''}`}
                        onClick={() => setWindowMinutes(1)}
                        aria-pressed={windowMinutes === 1}
                    >
                        1m
                    </button>
                    <button
                        className={`control-button ${windowMinutes === 5 ? 'is-active' : ''}`}
                        onClick={() => setWindowMinutes(5)}
                        aria-pressed={windowMinutes === 5}
                    >
                        5m
                    </button>
                    <button
                        className={`control-button ${windowMinutes === 15 ? 'is-active' : ''}`}
                        onClick={() => setWindowMinutes(15)}
                        aria-pressed={windowMinutes === 15}
                    >
                        15m
                    </button>
                    <button
                        className={`control-button ${windowMinutes === 60 ? 'is-active' : ''}`}
                        onClick={() => setWindowMinutes(60)}
                        aria-pressed={windowMinutes === 60}
                    >
                        1h
                    </button>
                </div>
                <div className="unit-toggle" role="group" aria-label="Temperature unit">
                    <button
                        className={`control-button ${tempUnit === 'C' ? 'is-active' : ''}`}
                        onClick={() => setTempUnit('C')}
                        aria-pressed={tempUnit === 'C'}
                    >
                        °C
                    </button>
                    <button
                        className={`control-button ${tempUnit === 'F' ? 'is-active' : ''}`}
                        onClick={() => setTempUnit('F')}
                        aria-pressed={tempUnit === 'F'}
                    >
                        °F
                    </button>
                </div>
                <button className="control-button" onClick={handleDownloadCsv}>
                    Download CSV
                </button>
            </div>
            {loading && data.temperature.length === 0 && <p>Loading data...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div className="chart-container">
                <Line data={chartData} options={chartOptions} />
            </div>

            <div className="current-readings">
                <div className="reading-card temperature-card">
                    <span className="reading-label">Temperature</span>
                    <span className="reading-value">{latestTemp}<span className="reading-unit">{'\u00B0'}{tempUnit}</span></span>
                </div>
                <div className="reading-card humidity-card">
                    <span className="reading-label">Humidity</span>
                    <span className="reading-value">{latestHumidity}<span className="reading-unit">%</span></span>
                </div>
                <div className="reading-card wind-card">
                    <span className="reading-label">Wind Speed</span>
                    <span className="reading-value">{latestWind}<span className="reading-unit">m/s</span></span>
                </div>
                <div className="reading-card air-card">
                    <span className="reading-label">Air Quality</span>
                    <span className="reading-value">{latestAirQuality}<span className="reading-unit">AQI</span></span>
                </div>
            </div>

            <div className="map-section">
                <h3>Sensor Locations</h3>
                <div className="map-layout">
                    <div className="map-container">
                        <MapContainer center={mapCenter} zoom={4} scrollWheelZoom={false}>
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {locations.map(location => {
                                const displayLocationTemp = tempUnit === 'C'
                                    ? location.temperature
                                    : toFahrenheit(location.temperature);
                                const history = locationHistory[location.id];
                                const tempSeries = history?.temperature || [];
                                const humiditySeries = history?.humidity || [];
                                const windSeries = history?.wind_speed || [];
                                const airSeries = history?.air_quality || [];
                                const markerColor = getMarkerColor(location);
                                const heatValue = location.temperature;
                                const heatColor = getHeatmapColor(heatValue);
                                const heatRadius = getHeatmapRadius(heatValue);

                                return (
                                <React.Fragment key={location.id}>
                                    <Circle
                                        center={[location.latitude, location.longitude]}
                                        radius={heatRadius}
                                        pathOptions={{
                                            color: heatColor,
                                            fillColor: heatColor,
                                            fillOpacity: 0.25,
                                            weight: 0,
                                        }}
                                    />
                                    <Marker
                                        position={[location.latitude, location.longitude]}
                                        icon={createMarkerIcon(markerColor)}
                                    >
                                        <Popup>
                                            <div className="map-popup">
                                                <strong>{location.name}</strong>
                                                <div>Temperature: {displayLocationTemp.toFixed(1)}°{tempUnit}</div>
                                                <div>Humidity: {location.humidity.toFixed(1)}%</div>
                                                <div>Wind: {location.wind_speed.toFixed(1)} m/s</div>
                                                <div>Air Quality: {location.air_quality.toFixed(0)} AQI</div>
                                                <div className="map-trends">
                                                    <div className="trend-row">
                                                        <span className="trend-label">Temp trend</span>
                                                        <Sparkline
                                                            data={tempUnit === 'C' ? tempSeries : tempSeries.map(toFahrenheit)}
                                                            color="#ef4444"
                                                        />
                                                    </div>
                                                    <div className="trend-row">
                                                        <span className="trend-label">Humidity trend</span>
                                                        <Sparkline
                                                            data={humiditySeries}
                                                            color="#3b82f6"
                                                        />
                                                    </div>
                                                    <div className="trend-row">
                                                        <span className="trend-label">Wind trend</span>
                                                        <Sparkline
                                                            data={windSeries}
                                                            color="#22c55e"
                                                        />
                                                    </div>
                                                    <div className="trend-row">
                                                        <span className="trend-label">AQI trend</span>
                                                        <Sparkline
                                                            data={airSeries}
                                                            color="#eab308"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                </React.Fragment>
                                );
                            })}
                        </MapContainer>
                    </div>
                    <aside className="sensor-sidebar">
                        <div className="sensor-sidebar-header">
                            <h4>Live Sensors</h4>
                            {lastUpdatedAt && (
                                <span className="sensor-updated">
                                    Updated {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            )}
                        </div>
                        <div className="sensor-list">
                            {locations.map(location => (
                                <div className="sensor-card" key={location.id}>
                                    <div className="sensor-name">{location.name}</div>
                                    <div className="sensor-values">
                                        <span>Temp: {(tempUnit === 'C' ? location.temperature : toFahrenheit(location.temperature)).toFixed(1)}°{tempUnit}</span>
                                        <span>Humidity: {location.humidity.toFixed(1)}%</span>
                                        <span>Wind: {location.wind_speed.toFixed(1)} m/s</span>
                                        <span>AQI: {location.air_quality.toFixed(0)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
