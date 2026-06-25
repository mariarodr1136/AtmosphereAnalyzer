# Atmosphere Analyzer: Smart Data Visualization Tool 🌎📊

![Python](https://img.shields.io/badge/Python-Programming%20Language-blue) ![Django](https://img.shields.io/badge/Django-Framework-green) ![Django%20Channels](https://img.shields.io/badge/Django%20Channels-WebSockets-purple) ![React](https://img.shields.io/badge/React-Library-lightblue) ![Data Visualization](https://img.shields.io/badge/Data%20Visualization-Library-brightgreen) ![OpenWeatherMap](https://img.shields.io/badge/OpenWeatherMap-Live%20Data-orange) ![OpenAQ](https://img.shields.io/badge/OpenAQ-Air%20Quality-green) ![Docker](https://img.shields.io/badge/Docker-Compose-blue) ![Redis](https://img.shields.io/badge/Redis-Channel%20Layer-red)

**Atmosphere Analyzer** is a real-time environmental monitoring dashboard that streams live weather and air quality data for five US cities — plus any custom city you add via geocoding search. Temperature, humidity, and wind speed come from the **OpenWeatherMap API**; PM2.5 readings are fetched from the nearest monitoring station via the **OpenAQ API** and converted to AQI using the EPA formula. The backend, built with **Django** and **Django Channels**, pushes all data over **WebSockets** every five seconds and persists every reading to SQLite for accurate historical analysis. The frontend, built with **React**, features a modern redesigned dashboard with a sticky navigation header, animated stat cards, inline chart controls, a 5-day forecast panel, an activity heatmap, anomaly detection with z-score alerts, a real-time event log, custom city search, dark/light theme toggle, shareable URLs, and PDF export. The app is deployed on **Render** using **Daphne** as the ASGI server.

This project demonstrates full-stack real-time data engineering: dual live API integration, WebSocket streaming with token authentication, database-backed history, EPA AQI conversion, z-score anomaly detection, Redis-backed horizontal scaling, and interactive geospatial visualization.

---

Live Application: https://atmosphere-analyzer-dashboard.onrender.com/

*Note: The live application is hosted on Render's free tier, so the backend may take 1–2 minutes to wake up on the first visit after inactivity.*

---

https://github.com/user-attachments/assets/5d11f0ce-2d97-414c-8c2d-d5487a45ad1e

---

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Data Flow](#data-flow)
- [API Endpoints](#api-endpoints)
- [Technical Highlights](#technical-highlights)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Deployment](#deployment)
- [Setup and Installation](#setup-and-installation)
- [Docker](#docker)
- [Contributing](#contributing)
- [Contact](#contact-)

---

## Project Overview
Atmosphere Analyzer streams live environmental data for five US cities — New York, Los Angeles, Chicago, Miami, and Seattle — and visualizes it in real time. You can also search for and add any city in the world via OWM geocoding. Temperature, humidity, and wind speed are fetched from the OpenWeatherMap API; air quality (AQI) is derived from real PM2.5 readings sourced from the nearest monitoring station via the OpenAQ API, converted using EPA breakpoints, and cached for 10 minutes to respect free-tier rate limits. Every reading is persisted to SQLite, enabling real historical data for rolling-window charts, heatmaps, anomaly detection, and CSV exports. When an API key is absent or a request fails, the system falls back to a stateful simulation where each value evolves smoothly from the previous database row. The React frontend connects over WebSocket (authenticated via a UUID token) and automatically falls back to HTTP polling if the connection drops.

## Key Features

- **Real-Time WebSocket Streaming**: Django Channels pushes a combined payload (global aggregate + all city readings) every 5 seconds. The frontend shows a live "WebSocket" or "Polling" badge. Connections are authenticated with a one-time UUID token from `/api/auth/token/`.
- **Anomaly Detection**: Z-score computed on a rolling 20-point window per metric per city. Values with |z| ≥ 2.5 are flagged, rendered as red dots on the chart, and written to the `EventLog` model.
- **5-Day Forecast Panel**: Pulls the OWM `/data/2.5/forecast` endpoint and groups 3-hourly entries into daily high/low/condition summaries displayed in a clean forecast card.
- **Activity Heatmap**: Aggregates the last 7 days of DB readings by hour-of-day × weekday using Django ORM `ExtractHour`/`ExtractWeekDay`. Renders as a color-scaled 24×7 grid, toggleable per metric.
- **Shareable URLs**: Dashboard state (city, metric, window, compare mode, theme) is encoded into URL search params. Copying the URL restores the exact view.
- **PDF Export**: Captures the dashboard with `html2canvas` and packages it into a PDF via `jsPDF`. One-click download from the actions bar.
- **Real-Time Event Log**: Anomalies and threshold crossings are written to `EventLog` on every push cycle and displayed in the Events tab with severity badges (INFO / WARNING / CRITICAL).
- **Custom City Search**: Debounced geocoding search (OWM `/geo/1.0/direct`) lets you add any city worldwide. Custom cities persist in `CustomSensorLocation` and are included in every subsequent WS push.
- **Dark / Light Theme**: Full CSS custom properties theming system (`--bg`, `--surface`, `--text-1..4`, `--accent`, etc.) toggled instantly via `[data-theme="dark"]` on `document.documentElement`.
- **Compare Cities Mode**: Toggle the chart between single-city/all-metrics and per-metric/all-cities, each city in a distinct color.
- **Alert Thresholds**: Set per-metric limits; alerts fire only on threshold crossings with browser notifications when permission is granted.
- **Rolling Window Time Series**: Dynamic sliding window (1m / 5m / 15m / 1h) applied to persisted data so the chart reflects actual elapsed-time trends.
- **Geospatial Map**: Leaflet map with per-city markers, heat overlays scaled to temperature, and sparkline trend popups from the last 20 readings.
- **Tabbed Side Panel**: Sensors tab shows live readings for all cities; Events tab shows the rolling event log with timestamps and severity.
- **CSV Export**: Downloads the exact window and city currently displayed with precise timestamps.
- **Stateful Simulation Fallback**: When an API key is absent or a request fails, readings evolve from the previous DB row using small random deltas — coherent trends, never random noise.
- **Database Persistence**: Every reading stored in SQLite across five models: `SensorReading`, `SensorLocation`, `SensorLocationReading`, `CustomSensorLocation`, `EventLog`.
- **Rate Limiting**: DRF `AnonRateThrottle` at 120 req/min on all endpoints.
- **Redis Channel Layer**: `channels_redis` when `REDIS_URL` is set for horizontally scalable WebSocket fan-out; falls back to `InMemoryChannelLayer` locally.
- **Test Suite**: 12 Django tests covering data evolution, value bounds, database persistence, and the history endpoint.

## Data Flow

1. **OpenWeatherMap API** fetches temperature, humidity, and wind speed for each city (cached 5 min per city — OWM free tier refreshes every 10 min). **OpenAQ API** fetches PM2.5 from the nearest monitoring station and converts it to AQI via the EPA formula (cached 10 min). Both fall back to stateful simulation independently.
2. **WebSocket consumer** authenticates the token on connect, then every 5 seconds: calls both data sources, saves readings to SQLite, runs z-score anomaly detection per metric per city, writes anomaly events to `EventLog`, fetches any `CustomSensorLocation` rows, and broadcasts the full payload.
3. **React Dashboard** receives the WebSocket message, appends readings to per-city history, checks alert thresholds for crossings, syncs state to URL params, and re-renders all panels.
4. **HTTP polling** activates automatically as a fallback if the WebSocket connection cannot be established.
5. **Export layer**: CSV from DB-backed history; PDF via `html2canvas` + `jsPDF` capture of the live DOM.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sensor-data/` | Latest reading for all cities (HTTP fallback) |
| `GET` | `/api/sensor-locations/` | All sensor location metadata |
| `GET` | `/api/sensor-history/` | DB-backed reading history (`?city=&window=`) |
| `GET` | `/api/forecast/` | 5-day forecast grouped by day (`?city=&country=`) |
| `GET` | `/api/heatmap/` | Hour×weekday AQI heatmap from last 7 days |
| `GET` | `/api/events/` | Last 50 `EventLog` entries |
| `GET` | `/api/geocode/` | OWM city geocoding search (`?q=`) |
| `GET/POST` | `/api/custom-cities/` | List or create a custom city |
| `DELETE` | `/api/custom-cities/<id>/` | Remove a custom city |
| `POST` | `/api/auth/token/` | Issue a one-time UUID WebSocket auth token |

WebSocket: `ws://<host>/ws/sensor/`
Connect with `?token=<uuid>` from `/api/auth/token/`. Omitting the token is allowed for backward compatibility; providing an invalid token closes with code 4001.

## Technical Highlights

- **Z-Score Anomaly Detection**: Each metric's rolling 20-point history per city is maintained in-memory in the consumer. A z-score ≥ 2.5 flags an anomaly. Requires at least 5 data points and a non-zero standard deviation to fire, preventing false positives during startup.
- **OWM Forecast Grouping**: The `/data/2.5/forecast` endpoint returns 40 × 3-hourly entries. The backend groups them by date, extracting daily min/max temperatures and the modal weather condition description.
- **Heatmap Aggregation**: Uses Django ORM's `ExtractHour`/`ExtractWeekDay` with `Avg` aggregation across the last 7 days — all server-side, no Python loops over results.
- **UUID Token Auth**: `POST /api/auth/token/` generates a UUID stored in `_valid_ws_tokens` (in-memory set). The consumer pops the token on first connect — it cannot be reused.
- **CSS Custom Properties Theming**: All colors, shadows, and radii are CSS variables on `:root`. The `[data-theme="dark"]` attribute on `document.documentElement` swaps all of them instantly with no class toggling.
- **Shareable URL Encoding**: A `useEffect` writes `city`, `metric`, `window`, `compare`, `compareMetric`, and `theme` to `URLSearchParams` on every state change. A `useMemo` reads them on mount to restore the saved view.
- **Redis Channel Layer**: `channels_redis.core.RedisChannelLayer` is configured when `REDIS_URL` is set, enabling multiple backend instances to fan out WebSocket messages to all connected clients.
- **Dual Live API Integration**: OWM and OpenAQ are fetched independently. OWM weather responses are cached for 5 minutes per city (matching the API's actual refresh rate), reducing calls by ~60×. OpenAQ is cached for 10 minutes. Either source can fail without affecting the other; each falls back to its own stateful simulation path.
- **Modular Frontend Architecture**: The React dashboard is split into 15 focused files under `src/components/dashboard/` — `constants.js`, `utils.js`, and one file per component (`DashNav`, `CitySearch`, `StatCards`, `ChartCard`, `ForecastCard`, `SensorMap`, `SidePanel`, `HeatmapCard`, `AlertsConfig`, plus primitive components `StatCard`, `Sparkline`, `TrendBadge`, `HeatmapGrid`). `Dashboard.js` is a pure state orchestrator; each panel owns its own local state and data fetching.
- **EPA AQI Conversion**: Raw PM2.5 concentrations (µg/m³) from OpenAQ are converted to AQI using the standard EPA linear interpolation formula across six breakpoint ranges, cached 10 minutes.
- **Threshold Alerts on Crossing**: Alerts trigger only when a value transitions from below to above a threshold. Previous values are tracked in a ref to detect the crossing edge without adding render cycles.
- **WebSocket with HTTP Fallback**: The frontend attempts a WebSocket connection on mount. If it fails or closes, it switches to 5-second HTTP polling automatically.
- **DB-Backed Rolling Window**: Because readings are persisted, the rolling window chart reflects real elapsed time — not just in-memory session data.
- **ASGI + Daphne**: Runs under Daphne (ASGI), enabling concurrent WebSocket connections alongside standard HTTP requests.
- **Geospatial Sparklines**: Marker popups include per-metric sparklines built from the last 20 readings in `locationHistory`, giving instant trend context with no extra API call.

---

<img width="1470" height="800" alt="Screenshot 2026-06-25 at 5 10 32 PM" src="https://github.com/user-attachments/assets/f0ffcf70-6064-491e-9e64-bceb07e854a0" />


---

<img width="1462" height="801" alt="Screenshot 2026-06-16 at 3 08 41 PM" src="https://github.com/user-attachments/assets/0a91c27e-4d84-4b6c-96a6-0da1c41f6a25" />


---

## Architecture

1. **Live Data (OpenWeatherMap + OpenAQ APIs)**: OWM fetches temperature, humidity, wind speed, 5-day forecast, and city geocoding; OpenAQ fetches PM2.5 from the nearest monitoring station within 50 km and converts it to AQI via the EPA formula. Each source falls back to stateful simulation independently.
2. **Backend API (Django + Django REST Framework)**: Exposes sensor data, history, forecast, heatmap, event log, geocoding, custom city CRUD, and WebSocket token endpoints. Rate-limited at 120 req/min via `AnonRateThrottle`.
3. **WebSocket Layer (Django Channels + Daphne)**: A persistent consumer authenticates the token on connect, then pushes combined sensor payloads with anomaly detection results and custom city readings every 5 seconds.
4. **Channel Layer (Redis / In-Memory)**: `channels_redis` when `REDIS_URL` is set for horizontal scaling; `InMemoryChannelLayer` for local development.
5. **Database (SQLite)**: Stores `SensorReading`, `SensorLocation`, `SensorLocationReading`, `CustomSensorLocation`, and `EventLog` records for history, anomaly events, custom cities, exports, and stateful simulation continuity.
6. **Frontend (React)**: Sticky nav header with city chips, 4 animated stat cards, Chart.js time-series with inline segmented controls, 5-day forecast card, Leaflet sensor map, tabbed side panel (Sensors / Events), activity heatmap, collapsible alert thresholds, dark/light theme, shareable URLs, CSV/PDF export.
7. **Geospatial View (Leaflet)**: Sensor markers with temperature-based heat overlays and sparkline popups.
8. **Containerization (Docker Compose)**: Three-service stack — Redis, Django/Daphne backend, React/nginx frontend — with health checks and environment-variable wiring.
9. **Deployment (Render)**: Daphne serves the ASGI application; static assets via WhiteNoise; the React app as a static site.

## Technologies

- **Python**: Backend language for data fetching, simulation, and API logic.
- **Django**: Web framework for API endpoints and database management.
- **Django Channels**: Adds WebSocket support to Django via the ASGI interface.
- **Django REST Framework**: REST API endpoints with `AnonRateThrottle` rate limiting.
- **Daphne**: ASGI server that handles both HTTP and WebSocket connections.
- **channels-redis**: Redis-backed channel layer for horizontally scalable WebSocket fan-out.
- **SQLite**: Lightweight database for persisting all sensor readings and events.
- **OpenWeatherMap API**: Source of live temperature, humidity, wind speed, 5-day forecast, and city geocoding.
- **OpenAQ API**: Source of real PM2.5 air quality readings, converted to AQI via the EPA formula.
- **React**: Frontend library powering the interactive dashboard.
- **Chart.js + react-chartjs-2**: Time-series chart with rolling window, compare-cities mode, and anomaly markers.
- **Leaflet + react-leaflet**: Interactive sensor map with heat overlays and sparkline popups.
- **html2canvas + jsPDF**: PDF export of the live dashboard.
- **Axios**: HTTP client for the polling fallback path.
- **CSS Custom Properties**: Full theming system for dark/light mode with instant switching.
- **Docker + Docker Compose**: Containerized three-service stack (Redis, backend, frontend/nginx).
- **Redis**: Message broker for the channel layer in Docker/production deployments.
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
| `DJANGO_SECRET_KEY` | Backend | Django secret key |
| `DEBUG` | Backend | Set to `False` in production |
| `ALLOWED_HOSTS` | Backend | e.g. `.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | Backend | Frontend URL for CORS |
| `OPENWEATHER_API_KEY` | Backend | OpenWeatherMap key — weather, forecast, geocoding (falls back to simulation if unset) |
| `OPENAQ_API_KEY` | Backend | OpenAQ key — real PM2.5 → AQI (falls back to simulation if unset) |
| `REDIS_URL` | Backend | Redis connection URL — enables `channels_redis` channel layer (omit for in-memory) |
| `REACT_APP_API_URL` | Frontend | Backend service URL |

## Setup and Installation

### Prerequisites

- Python 3.10+ and pip
- Node.js 18+ and npm
- (Optional) OpenWeatherMap API key — free tier at [openweathermap.org](https://openweathermap.org/api)
- (Optional) OpenAQ API key — free tier at [openaq.org](https://openaq.org)
- (Optional) Redis — only needed if you want the Redis channel layer locally

### Local Development

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
   ```
   Start the backend with API keys:
   ```bash
   OPENWEATHER_API_KEY=your_owm_key \
   OPENAQ_API_KEY=your_openaq_key \
   daphne -b 127.0.0.1 -p 8000 atmosphere_analyzer.asgi:application
   ```
   Both keys are optional — the app falls back to stateful simulation if either is unset.

   To enable the Redis channel layer locally (requires Redis running):
   ```bash
   REDIS_URL=redis://localhost:6379 \
   OPENWEATHER_API_KEY=your_owm_key \
   daphne -b 127.0.0.1 -p 8000 atmosphere_analyzer.asgi:application
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

## Docker

The repo includes a `docker-compose.yml` at the project root that runs the full three-service stack: Redis, backend (Django/Daphne), and frontend (React/nginx).

```bash
# From the repo root
docker compose up --build
```

The frontend is served at `http://localhost:3000`. The backend API is at `http://localhost:8000`.

Pass API keys at run time:

```bash
OPENWEATHER_API_KEY=your_owm_key \
OPENAQ_API_KEY=your_openaq_key \
docker compose up --build
```

**Services:**

| Service | Port | Description |
|---|---|---|
| `redis` | 6379 | Redis 7 (channel layer broker) |
| `backend` | 8000 | Django/Daphne ASGI server |
| `frontend` | 3000 | React app served via nginx |

The backend waits for the Redis health check before starting. `REDIS_URL` is automatically wired from the `redis` service.

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
