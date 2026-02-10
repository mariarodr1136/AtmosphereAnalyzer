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
                <h1>Atmosphere Analyzer</h1>
                <button className="scroll-arrow" onClick={scrollToDashboard} aria-label="Scroll to dashboard">
                    &#x25BC;
                </button>
            </header>
            <div ref={dashboardRef}>
                <Dashboard />
            </div>
        </div>
    );
};

export default App;
