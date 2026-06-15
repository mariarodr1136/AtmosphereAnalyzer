import React, { useRef } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';

const App = () => {
    const dashboardRef = useRef(null);

    const scrollToDashboard = () => {
        dashboardRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="App">
            <header className="App-header">
                <div className="hero-glow hero-glow--1" />
                <div className="hero-glow hero-glow--2" />
                <div className="hero-glow hero-glow--3" />

                <div className="hero-content">
                    <div className="hero-eyebrow">
                        <span className="hero-dot" />
                        Live Environmental Intelligence
                    </div>

                    <h1 className="hero-title">
                        Atmosphere<span className="hero-accent">Analyzer</span>
                    </h1>

                    <p className="hero-subtitle">
                        Track air quality, temperature, humidity, and wind in real time
                        across multiple cities — powered by live sensor data.
                    </p>

                    <div className="hero-pills">
                        <div className="hero-pill">
                            <span className="hero-pill-icon">🌍</span>
                            Multi-city coverage
                        </div>
                        <div className="hero-pill">
                            <span className="hero-pill-icon">📡</span>
                            WebSocket &amp; polling
                        </div>
                        <div className="hero-pill">
                            <span className="hero-pill-icon">🗺</span>
                            Interactive map
                        </div>
                        <div className="hero-pill">
                            <span className="hero-pill-icon">🔔</span>
                            Custom alerts
                        </div>
                    </div>

                    <button className="hero-cta" onClick={scrollToDashboard}>
                        Open Dashboard
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M8 3v10M8 13l-4-4M8 13l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <button className="hero-scroll-hint" onClick={scrollToDashboard} aria-label="Scroll to dashboard">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <path d="M3 6l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </header>

            <div ref={dashboardRef} className="dashboard-wrapper">
                <Dashboard />
            </div>
        </div>
    );
};

export default App;
