export const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
export const WS_URL  = API_URL.replace(/^http/, 'ws') + '/ws/sensor/';

export const CITY_COLORS = [
  '#2563eb', '#f59e0b', '#60a5fa', '#d97706', '#93c5fd',
];

export const ALERT_METRICS = [
  { key: 'temperature', label: 'Temperature', defaultThreshold: 35 },
  { key: 'humidity',    label: 'Humidity',    defaultThreshold: 85 },
  { key: 'wind_speed',  label: 'Wind Speed',  defaultThreshold: 10 },
  { key: 'air_quality', label: 'Air Quality', defaultThreshold: 100 },
];

