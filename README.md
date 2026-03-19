# Atmosphere Analyzer: Smart Data Visualization Tool 🌎📊

![Python](https://img.shields.io/badge/Python-Programming%20Language-blue) ![Django](https://img.shields.io/badge/Django-Framework-green) ![AWS](https://img.shields.io/badge/AWS-Cloud%20Platform-orange) ![AWS Lambda](https://img.shields.io/badge/AWS%20Lambda-Serverless%20Computing-yellow) ![AWS S3](https://img.shields.io/badge/AWS%20S3-Object%20Storage-lightblue) ![React](https://img.shields.io/badge/React-Library-lightblue) ![Data Visualization](https://img.shields.io/badge/Data%20Visualization-Library-brightgreen) ![IoT](https://img.shields.io/badge/IoT-Concept-yellow)

**Atmosphere Analyzer** is a comprehensive environmental monitoring system designed to simulate real-time sensor data using **Python**. It seamlessly integrates **AWS S3** for scalable and reliable data storage, while leveraging **AWS Lambda** for efficient, serverless data processing. The system's backend API, built with **Django**, organizes and serves environmental data through RESTful endpoints, ensuring robust data access. The frontend, developed with **React**, presents these metrics on an interactive dashboard with live controls (pause/resume, rolling windows, unit toggle), downloadable CSV history, and a Leaflet-powered sensor map with heat overlays and live sensor cards. The project is now deployment-ready, using **Render** to host the Django API and a static React build, with **Gunicorn**, **WhiteNoise**, and **CORS** configuration for production stability and cross-origin access. 

This project empowers data-driven decision-making for sustainable resource management by delivering actionable insights through smart data visualization.

---

Live Application: https://atmosphere-analyzer-dashboard.onrender.com/

*Note: The live application is hosted on Render’s free tier, so the backend may take 1–2 minutes to wake up on the first visit after inactivity. If the data loads slowly, please be patient while the server starts.*

---

<img width="1452" height="696" alt="Screenshot 2026-03-19 at 3 58 41 PM" src="https://github.com/user-attachments/assets/262d6d8e-c5b9-448e-b8e8-a4fcfbd6c979" />

<img width="1457" height="565" alt="Screenshot 2026-03-19 at 4 05 32 PM" src="https://github.com/user-attachments/assets/f0275efe-4e9d-4420-af65-818503b441a3" />

---


## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Data Flow](#data-flow)
- [Technical Highlights](#technical-highlights)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Deployment](#deployment)
- [Future Enhancements](#future-enhancements)
- [Setup and Installation](#setup-and-installation)
- [Contributing](#contributing)
- [Contact](#contact-)


---

## Project Overview 
Atmosphere Analyzer enables real-time monitoring and visualization of environmental metrics through a robust architecture that simulates, processes, and delivers data efficiently. Designed for scalability and insight-driven analytics, the system models sensor data to help users track environmental changes over time, offering rolling windows, downloadable history, and geospatial context via an interactive map.

## Key Features

- **Live Controls**: Pause/resume streaming updates, switch temperature units (°C/°F), and choose rolling windows (1m/5m/15m/1h).
- **Rich Metrics**: Temperature, humidity, wind speed, and air quality (AQI) with historical charting.
- **Geospatial Context**: Leaflet-powered map with sensor markers, heat overlays, and per-sensor trend popups.
- **Downloadable History**: Export the current time window to CSV for quick analysis or reporting.
- **Sensor Sidebar**: Live sensor list with current values and timestamps for fast situational awareness.

## Data Flow

1. **Simulation** generates sensor readings (temperature, humidity, wind speed, AQI).
2. **Django API** exposes endpoints for live readings and sensor locations.
3. **React Dashboard** polls for updates, applies rolling windows, and renders charts, cards, and maps.
4. **Export Layer** converts the visible time window into a CSV file for download.

## Technical Highlights

- **Rolling Window Time Series**: The chart uses a dynamic sliding window (1m/5m/15m/1h) while keeping the full stream in memory for accurate exports and comparisons.
- **CSV Export From Live Window**: One click exports the exact window currently displayed in the chart, including precise timestamps and multiple metrics.
- **Geospatial Trends & Context**: Marker popups show per-sensor trend sparklines alongside live values for quick visual diagnosis.
- **Heat Overlay Layer**: A lightweight heatmap-like overlay uses vector circles to emphasize spatial intensity without heavyweight GIS dependencies.
- **UX-First Controls**: Pause/resume, unit toggle, and live sensor sidebar are optimized for quick scanning and operational use.

## Architecture

1. **Data Simulation (Python)**: Simulates sensor data (e.g., temperature, humidity, wind speed, air quality) to mimic real-world readings.
2. **Data Storage (AWS S3)**: Utilizes AWS S3 for scalable and durable storage of environmental metrics.
3. **Data Processing (AWS Lambda)**: Processes incoming data using AWS Lambda, enabling real-time processing without server management.
4. **Backend API (Django)**: Organizes and serves data to the frontend through RESTful endpoints, managing data access efficiently.
5. **Frontend Visualization (React)**: The interactive React dashboard fetches and visualizes data in real-time with rolling windows, live controls, and downloadable CSV history.
6. **Geospatial View (Leaflet)**: A map view displays sensor locations with heat overlays and per-sensor trend popups.
7. **Deployment (Render)**: Django runs with **Gunicorn**, static assets are served via **WhiteNoise**, and the React app is built and deployed as a static site with environment-based API configuration and CORS support.

## Technologies

- **Python**: For data simulation and AWS Lambda processing.
- **AWS (S3, Lambda)**: Provides scalable storage and serverless data processing capabilities.
- **Django**: Facilitates API creation and data management.
- **React**: Powers interactive data visualization.
- **Django REST Framework**: Establishes REST API endpoints for seamless data access.
- **Render**: Hosts the Django API and the React static build for deployment.
- **Gunicorn**: Production WSGI server for Django.
- **WhiteNoise**: Serves static files in production for the Django backend.
- **django-cors-headers**: Enables CORS configuration for the frontend-to-backend requests.
- **Chart.js + react-chartjs-2**: Powers the dashboard visualizations.
- **Leaflet + react-leaflet**: Provides the interactive sensor map and heat overlays.
- **Axios**: Handles API requests from the React frontend.

## Deployment

- **Backend (Django)**: Deploy on **Render** with Gunicorn and WhiteNoise, or use AWS Elastic Beanstalk / EC2 for scalable hosting.
- **Frontend (React)**: Deploy the static build on **Render**, or use AWS Amplify / S3 static site hosting for reliable frontend delivery.

## Future Enhancements

- **Advanced Data Analytics**: Integrate machine learning models to predict environmental trends.
- **User Authentication**: Implement user management for secure, personalized data access.
- **Expanded Sensor Metrics**: Add more simulated metrics like light levels or noise pollution.

---

https://github.com/user-attachments/assets/97a042df-3726-4756-ace5-f9cd916edede

---


## Setup and Installation

### Prerequisites

- **Python 3.x** and **Django** installed on your machine
- **Node.js and npm** for the React frontend
- **AWS CLI** configured with access to S3 and Lambda
- (Optional for deployment) **Render** account and CLI or dashboard access

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/mariarodr1136/AtmosphereAnalyzer.git
   cd AtmosphereAnalyzer
2. **Backend Setup (Django)**
- Navigate to the backend directory:
   ```bash
   cd backend
- Install dependencies:
   ```bash
   pip install -r requirements.txt
- Configure AWS S3 settings in Django.
- Start the Django Server:
   ```bash
   python manage.py runserver
3. **Frontend Setup (React)**
- Navigate to the frontend directory:
   ```bash
   cd frontend
- Install dependencies:
   ```bash
   npm install
- Start the React development server:
   ```bash
   npm start
4. **AWS Lambda Setup**
- Create a Lambda function for data processing and configure it to store data in S3.
5. **Render Deployment Setup (Optional)**
- Configure environment variables for the backend (e.g., `DJANGO_SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`) and for the frontend (`REACT_APP_API_URL`).
- Use the provided `render.yaml` to deploy the Django API (Gunicorn + WhiteNoise) and the React static site.

---

## Contributing
Feel free to submit issues or pull requests for improvements or bug fixes. You can also open issues to discuss potential changes or enhancements. All contributions are welcome to enhance the app’s features or functionality!

To contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feat/your-feature-name
- Alternatively, for bug fixes:
   ```bash
   git checkout -b fix/your-bug-fix-name
3. Make your changes and run all tests before committing the changes and make sure all tests are passed.
4. After all tests are passed, commit your changes with descriptive messages:
   ```bash
   git commit -m 'add your commit message'
5. Push your changes to your forked repository:
   ```bash
   git push origin feat/your-feature-name.
6. Submit a pull request to the main repository, explaining your changes and providing any necessary details.

## Contact 🌐
If you have any questions or feedback, feel free to reach out at [mrodr.contact@gmail.com](mailto:mrodr.contact@gmail.com).
