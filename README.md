# Atmosphere Analyzer: Smart Data Visualization Tool 🌎📊

![Python](https://img.shields.io/badge/Python-Programming%20Language-blue) ![Django](https://img.shields.io/badge/Django-Framework-green) ![Django%20Channels](https://img.shields.io/badge/Django%20Channels-WebSockets-purple) ![React](https://img.shields.io/badge/React-Library-lightblue) ![Data Visualization](https://img.shields.io/badge/Data%20Visualization-Library-brightgreen) ![OpenWeatherMap](https://img.shields.io/badge/OpenWeatherMap-Live%20Data-orange)

**Atmosphere Analyzer** is a real-time environmental monitoring dashboard that streams live weather data from the **OpenWeatherMap API** for five US cities. The backend, built with **Django** and **Django Channels**, serves sensor readings over **WebSockets** and persists every reading to a database for accurate historical analysis. The frontend, built with **React**, renders an interactive time-series chart with a city selector, rolling window controls, a Leaflet-powered sensor map with heat overlays, and a live sensor sidebar. The app is deployed on **Render** using **Daphne** as the ASGI server.

This project demonstrates full-stack real-time data engineering: live API integration, WebSocket streaming, database-backed history, and interactive geospatial visualization.

---

Live Application: https://atmosphere-analyzer-dashboard.onrender.com/

*Note: The live application is hosted on Render's free tier, so the backend may take 1–2 minutes to wake up on the first visit after inactivity.*

---

<img width="1452" height="696" alt="Screenshot 2026-03-19 at 3 58 41 PM" src="https://github.com/user-attachments/assets/262d6d8e-c5b9-448e-b8e8-a4fcfbd6c979" />

<img width="1457" height="565" alt="Screenshot 2026-03-19 at 4 05 32 PM" src="https://github.com/user-attachments/assets/f0275efe-4e9d-4420-af65-818503b441a3" />

---

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Data Flow](#data-flow)
- [Technical Highlights](#technical-highlights)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Deployment](#deployment)
- [Setup and Installation](#setup-and-installation)
- [Contributing](#contributing)
- [Contact](#contact-)

---

## Project Overview
Atmosphere Analyzer streams live weather data for five US cities — New York, Los Angeles, Chicago, Miami, and Seattle — and visualizes it in real time. The backend fetches temperature, humidity, and wind speed from the OpenWeatherMap API on every WebSocket push cycle, persists each reading to SQLite, and serves a queryable history endpoint. When no API key is configured, the system falls back to a stateful simulation where each reading evolves smoothly from the previous one. The React frontend connects over WebSocket and automatically falls back to HTTP polling if the connection drops.

## Key Features

- **Live Weather Data**: Temperature, humidity, and wind speed sourced from the OpenWeatherMap API for five real US cities, with AQI simulation.
- **WebSocket Streaming**: Django Channels pushes a combined payload (global aggregate + all 5 city readings) every 5 seconds. The frontend shows a "WebSocket" or "Polling" badge to indicate the active connection mode.
- **City Selector**: Dropdown in the chart controls lets you switch the time-series chart between any individual city or the global aggregate.
- **Stateful Simulation Fallback**: When the API key is absent or a request fails, readings evolve from the previous persisted value using small random deltas — charts always show coherent trends, never random noise.
- **Database Persistence**: Every reading is stored in SQLite (`SensorReading`, `SensorLocation`, `SensorLocationReading` models), enabling real historical data for exports and the rolling window chart.
- **Rolling Window Time Series**: Dynamic sliding window (1m / 5m / 15m / 1h) applied to persisted data so the chart reflects actual trends over time.
- **Downloadable CSV History**: One click exports the exact window and city currently displayed, with precise timestamps.
- **Geospatial Context**: Leaflet map with per-city markers, heat overlays scaled to temperature, and sparkline trend popups in each marker.
- **Sensor Sidebar**: Live card list showing current readings for all five cities, updated on every push.
- **Test Suite**: 12 Django tests covering data evolution, value bounds, database persistence, and the history endpoint.

## Data Flow

1. **OpenWeatherMap API** (or stateful simulation fallback) produces a reading for each city on every cycle.
2. **Django Channels consumer** calls the data source, saves each reading to the database, and broadcasts the full payload over WebSocket every 5 seconds.
3. **React Dashboard** receives the WebSocket message, appends readings to per-city history, and re-renders the chart, metric cards, and map.
4. **HTTP polling** activates automatically as a fallback if the WebSocket connection cannot be established.
5. **Export Layer** converts the currently visible chart window (city + time range) to a CSV download.

## Technical Highlights

- **WebSocket with HTTP Fallback**: The frontend attempts a WebSocket connection on mount. If it fails or closes unexpectedly, it switches to 5-second HTTP polling with no user action required.
- **Stateful Simulation**: Each simulated reading is derived from the previous database row using bounded random deltas, so charts always display smooth, realistic trends rather than random scatter.
- **DB-Backed Rolling Window**: Because readings are persisted, the rolling window chart reflects real elapsed time — not just in-memory session data.
- **City-Level Chart Selector**: Switching cities in the dropdown re-sources the chart, metric cards, and CSV export from that city's `locationHistory` without re-fetching from the server.
- **ASGI + Daphne**: The Django app runs under Daphne (ASGI) rather than Gunicorn (WSGI), enabling concurrent WebSocket connections alongside standard HTTP requests.
- **Geospatial Trends**: Marker popups include per-metric sparklines built from the last 20 readings stored in `locationHistory`, giving instant trend context without a separate API call.

## Architecture

1. **Live Data (OpenWeatherMap API)**: Fetches real temperature, humidity, and wind speed for each city. Falls back to a stateful simulation when the API key is not set or a request fails.
2. **Backend API (Django + Django REST Framework)**: Exposes `/api/sensor-data/`, `/api/sensor-locations/`, and `/api/sensor-history/` endpoints alongside the WebSocket consumer.
3. **WebSocket Layer (Django Channels + Daphne)**: A persistent consumer pushes combined sensor payloads to all connected clients every 5 seconds.
4. **Database (SQLite)**: Stores `SensorReading`, `SensorLocation`, and `SensorLocationReading` records for history, exports, and stateful simulation continuity.
5. **Frontend Visualization (React)**: Connects via WebSocket, maintains per-city history in state, and renders the time-series chart, metric cards, sensor map, and sidebar.
6. **Geospatial View (Leaflet)**: Displays sensor locations with temperature-based heat overlays and sparkline popups.
7. **Deployment (Render)**: Daphne serves the ASGI application; static assets are served via WhiteNoise; the React app is deployed as a static site.

## Technologies

- **Python**: Backend language for data fetching, simulation, and API logic.
- **Django**: Web framework for API endpoints and database management.
- **Django Channels**: Adds WebSocket support to Django via the ASGI interface.
- **Django REST Framework**: REST API endpoints for sensor data and history.
- **Daphne**: ASGI server that handles both HTTP and WebSocket connections in production.
- **SQLite**: Lightweight database for persisting all sensor readings.
- **OpenWeatherMap API**: Source of live temperature, humidity, and wind speed data.
- **React**: Frontend library powering the interactive dashboard.
- **Chart.js + react-chartjs-2**: Time-series chart with rolling window and city selector.
- **Leaflet + react-leaflet**: Interactive sensor map with heat overlays and sparkline popups.
- **Axios**: HTTP client used for the polling fallback path.
- **WhiteNoise**: Serves Django static files in production.
- **django-cors-headers**: CORS configuration for frontend-to-backend requests.
- **Render**: Hosts the Django/Daphne backend and the React static build.
- **pytest + pytest-django**: Test runner for the 12-test Django test suite.

## Deployment

**Backend (Django + Channels)**: Deployed on Render using Daphne as the ASGI server. `render.yaml` configures the start command, environment variables, and build steps including `python manage.py migrate`.

**Frontend (React)**: Deployed as a static site on Render. Set `REACT_APP_API_URL` to the backend service URL so the frontend connects to the correct WebSocket and API endpoints.

**Environment Variables**:

| Variable | Service | Purpose |
|---|---|---|
| `DJANGO_SECRET_KEY` | Backend | Django secret key (auto-generated by Render) |
| `DEBUG` | Backend | Set to `False` in production |
| `ALLOWED_HOSTS` | Backend | e.g. `.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | Backend | Frontend URL for CORS |
| `OPENWEATHER_API_KEY` | Backend | OpenWeatherMap API key (falls back to simulation if unset) |
| `REACT_APP_API_URL` | Frontend | Backend service URL |

## Setup and Installation

### Prerequisites

- Python 3.10+ and pip
- Node.js and npm
- (Optional) OpenWeatherMap API key — free tier at [openweathermap.org](https://openweathermap.org/api)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/mariarodr1136/AtmosphereAnalyzer.git
   cd AtmosphereAnalyzer/atmosphere-analyzer
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```
   Optionally set `OPENWEATHER_API_KEY` in your environment for live weather data:
   ```bash
   export OPENWEATHER_API_KEY=your_key_here
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   The frontend defaults to `http://127.0.0.1:8000` for the API. Override with:
   ```bash
   REACT_APP_API_URL=http://127.0.0.1:8000 npm start
   ```

4. **Running Tests**
   ```bash
   cd backend
   python manage.py test api
   ```

---

## Contributing
Feel free to submit issues or pull requests for improvements or bug fixes. All contributions are welcome!

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make your changes and ensure all tests pass:
   ```bash
   python manage.py test api
   ```
4. Commit and push:
   ```bash
   git commit -m 'add your commit message'
   git push origin feat/your-feature-name
   ```
5. Submit a pull request with a description of your changes.

## Contact 🌐
If you have any questions or feedback, feel free to reach out at [mrodr.contact@gmail.com](mailto:mrodr.contact@gmail.com).
