# Atmosphere Analyzer: Smart Data Visualization Tool 🌎📊

![Python](https://img.shields.io/badge/Python-Programming%20Language-blue) ![Django](https://img.shields.io/badge/Django-Framework-green) ![Django%20Channels](https://img.shields.io/badge/Django%20Channels-WebSockets-purple) ![React](https://img.shields.io/badge/React-Library-lightblue) ![Data Visualization](https://img.shields.io/badge/Data%20Visualization-Library-brightgreen) ![OpenWeatherMap](https://img.shields.io/badge/OpenWeatherMap-Live%20Data-orange) ![OpenAQ](https://img.shields.io/badge/OpenAQ-Air%20Quality-green)

**Atmosphere Analyzer** is a real-time environmental monitoring dashboard that streams live weather and air quality data for five US cities. Temperature, humidity, and wind speed come from the **OpenWeatherMap API**; PM2.5 readings are fetched from the nearest monitoring station via the **OpenAQ API** and converted to AQI using the EPA formula. The backend, built with **Django** and **Django Channels**, pushes all data over **WebSockets** every five seconds and persists every reading to SQLite for accurate historical analysis. The frontend, built with **React**, renders an interactive time-series chart with a city selector and compare-cities mode, configurable alert thresholds with browser notifications, rolling window controls, a Leaflet-powered sensor map, and a live sensor sidebar. The app is deployed on **Render** using **Daphne** as the ASGI server.

This project demonstrates full-stack real-time data engineering: dual live API integration, WebSocket streaming, database-backed history, EPA AQI conversion, and interactive geospatial visualization.

---

Live Application: https://atmosphere-analyzer-dashboard.onrender.com/

*Note: The live application is hosted on Render's free tier, so the backend may take 1–2 minutes to wake up on the first visit after inactivity.*

---




https://github.com/user-attachments/assets/1e70043d-610c-44b3-bae9-1ccb0247b2ac



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
Atmosphere Analyzer streams live environmental data for five US cities — New York, Los Angeles, Chicago, Miami, and Seattle — and visualizes it in real time. Temperature, humidity, and wind speed are fetched from the OpenWeatherMap API; air quality (AQI) is derived from real PM2.5 readings sourced from the nearest monitoring station via the OpenAQ API, converted using EPA breakpoints, and cached for 10 minutes to respect free-tier rate limits. Every reading is persisted to SQLite, enabling real historical data for rolling-window charts and CSV exports. When an API key is absent or a request fails, the system falls back to a stateful simulation where each value evolves smoothly from the previous database row. The React frontend connects over WebSocket and automatically falls back to HTTP polling if the connection drops.

## Key Features

- **Fully Live Data**: Temperature, humidity, and wind speed from OpenWeatherMap; AQI from the nearest PM2.5 monitoring station via OpenAQ, converted using the EPA formula. OWM and OpenAQ are fetched independently so one failing doesn't affect the other.
- **WebSocket Streaming**: Django Channels pushes a combined payload (global aggregate + all 5 city readings) every 5 seconds. The frontend shows a "WebSocket" or "Polling" badge to indicate the active connection mode.
- **Compare Cities Mode**: Toggle the chart between single-city/all-metrics view and a per-metric/all-cities comparison, with each city rendered in a distinct color for at-a-glance spatial analysis.
- **Alert Thresholds**: Collapsible panel lets users set per-metric limits. Alerts fire only on threshold crossings (not every push), appear as dismissible banners, and trigger browser notifications when permission is granted.
- **City Selector**: Dropdown switches the single-city chart and metric cards between any of the five cities or the global aggregate.
- **Stateful Simulation Fallback**: When an API key is absent or a request fails, readings evolve from the previous persisted value using small random deltas — charts always show coherent trends, never random noise.
- **Database Persistence**: Every reading is stored in SQLite (`SensorReading`, `SensorLocation`, `SensorLocationReading` models), enabling real historical data for exports and rolling-window charts.
- **Rolling Window Time Series**: Dynamic sliding window (1m / 5m / 15m / 1h) applied to persisted data so the chart reflects actual trends over time.
- **Downloadable CSV History**: One click exports the exact window and city currently displayed, with precise timestamps.
- **Geospatial Context**: Leaflet map with per-city markers, heat overlays scaled to temperature, and sparkline trend popups in each marker.
- **Sensor Sidebar**: Live card list showing current readings for all five cities, updated on every push.
- **Test Suite**: 12 Django tests covering data evolution, value bounds, database persistence, and the history endpoint.

## Data Flow

1. **OpenWeatherMap API** fetches temperature, humidity, and wind speed for each city. **OpenAQ API** fetches PM2.5 from the nearest monitoring station and converts it to AQI via the EPA formula (cached 10 min). Both fall back to stateful simulation independently.
2. **Django Channels consumer** calls both data sources, saves each reading to SQLite, and broadcasts the full payload (global + 5 cities) over WebSocket every 5 seconds.
3. **React Dashboard** receives the WebSocket message, appends readings to per-city history, checks alert thresholds for crossings, and re-renders the chart, metric cards, and map.
4. **HTTP polling** activates automatically as a fallback if the WebSocket connection cannot be established.
5. **Export Layer** converts the currently visible chart window (city + time range) to a CSV download.

## Technical Highlights

- **Dual Live API Integration**: OWM and OpenAQ are fetched independently on every push cycle. Either can fail without affecting the other; each falls back to its own stateful simulation path.
- **EPA AQI Conversion**: Raw PM2.5 concentrations (µg/m³) from OpenAQ are converted to AQI using the standard EPA linear interpolation formula across six breakpoint ranges. Results are cached for 10 minutes since real monitors only update every 10–60 minutes.
- **Compare Cities Mode**: Toggling compare mode switches the chart dataset source from a single city's four-metric history to all five cities' history for one selected metric, each in a distinct color.
- **Threshold Alerts on Crossing**: Alerts are only triggered when a value transitions from below to above a threshold, not on every push. Previous values are tracked in a ref to detect the crossing edge without adding state renders.
- **WebSocket with HTTP Fallback**: The frontend attempts a WebSocket connection on mount. If it fails or closes, it switches to 5-second HTTP polling automatically with no user action required.
- **Stateful Simulation**: Each simulated reading is derived from the previous database row using bounded random deltas, so charts always display smooth, realistic trends rather than random scatter.
- **DB-Backed Rolling Window**: Because readings are persisted, the rolling window chart reflects real elapsed time — not just in-memory session data.
- **ASGI + Daphne**: The Django app runs under Daphne (ASGI) rather than Gunicorn (WSGI), enabling concurrent WebSocket connections alongside standard HTTP requests.
- **Geospatial Trends**: Marker popups include per-metric sparklines built from the last 20 readings stored in `locationHistory`, giving instant trend context without a separate API call.

---

<img width="1470" height="799" alt="Screenshot 2026-06-15 at 6 29 29 PM" src="https://github.com/user-attachments/assets/f5099420-172a-4506-bffd-a8566745b542" />

---

<img width="1470" height="799" alt="Screenshot 2026-06-15 at 6 30 07 PM" src="https://github.com/user-attachments/assets/6e81c877-e62a-43df-beb4-89ec717e4dc4" />

---

## Architecture

1. **Live Data (OpenWeatherMap + OpenAQ APIs)**: OWM fetches temperature, humidity, and wind speed; OpenAQ fetches PM2.5 from the nearest monitoring station within 50km and converts it to AQI using the EPA formula. Each source falls back to stateful simulation independently.
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
- **OpenAQ API**: Source of real PM2.5 air quality readings, converted to AQI via the EPA formula.
- **React**: Frontend library powering the interactive dashboard.
- **Chart.js + react-chartjs-2**: Time-series chart with rolling window, city selector, and compare-cities mode.
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
| `OPENWEATHER_API_KEY` | Backend | OpenWeatherMap API key — temperature, humidity, wind speed (falls back to simulation if unset) |
| `OPENAQ_API_KEY` | Backend | OpenAQ API key — real PM2.5 → AQI (falls back to simulation if unset) |
| `REACT_APP_API_URL` | Frontend | Backend service URL |

## Setup and Installation

### Prerequisites

- Python 3.10+ and pip
- Node.js and npm
- (Optional) OpenWeatherMap API key — free tier at [openweathermap.org](https://openweathermap.org/api)
- (Optional) OpenAQ API key — free tier at [openaq.org](https://openaq.org)

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
   Optionally set API keys for live data:
   ```bash
   export OPENWEATHER_API_KEY=your_owm_key     # live temperature, humidity, wind
   export OPENAQ_API_KEY=your_openaq_key        # real PM2.5 → AQI
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
   pytest
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
   pytest
   ```
4. Commit and push:
   ```bash
   git commit -m 'add your commit message'
   git push origin feat/your-feature-name
   ```
5. Submit a pull request with a description of your changes.

## Contact 🌐
If you have any questions or feedback, feel free to reach out at [mrodr.contact@gmail.com](mailto:mrodr.contact@gmail.com).
