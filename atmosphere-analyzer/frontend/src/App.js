import React from 'react';
import './App.css';
import Dashboard from './components/Dashboard';

const App = () => {
    return (
        <div className="App">
            <header className="App-header">
                <h1>Atmosphere Analyzer</h1>
            </header>
            <Dashboard />
        </div>
    );
};

export default App;
