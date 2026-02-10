import React, { useEffect, useState } from 'react';
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
import './Dashboard.css';

// Register the necessary components
ChartJS.register(LineElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PointElement);

const Dashboard = () => {
    const [data, setData] = useState({ temperature: [], humidity: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const apiUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
            const response = await axios.get(`${apiUrl}/api/sensor-data/`);
            setData(prevData => ({
                temperature: [...prevData.temperature, response.data.temperature],
                humidity: [...prevData.humidity, response.data.humidity],
            }));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to fetch data. Please try again later.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(); // Initial data fetch
        const interval = setInterval(fetchData, 5000); // Polling every 5 seconds
        return () => clearInterval(interval); // Cleanup on component unmount
    }, []);

    const latestTemp = data.temperature.length > 0
        ? data.temperature[data.temperature.length - 1].toFixed(1)
        : '--';
    const latestHumidity = data.humidity.length > 0
        ? data.humidity[data.humidity.length - 1].toFixed(1)
        : '--';

    // Ensure that the labels are unique and that the chart data updates correctly
    const chartData = {
        labels: Array.from({ length: data.temperature.length }, (_, i) => i + 1),
        datasets: [
            {
                label: 'Temperature (\u00B0C)',
                data: data.temperature,
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
                lineTension: 0,
            },
            {
                label: 'Humidity (%)',
                data: data.humidity,
                borderColor: 'rgba(54, 162, 235, 1)',
                fill: false,
                lineTension: 0,
            },
        ],
    };

    const chartOptions = {
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                title: {
                    display: true,
                    text: 'Data Points',
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

    return (
        <div className="dashboard">
            <h2>Environmental Metrics</h2>
            {loading && data.temperature.length === 0 && <p>Loading data...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div className="chart-container">
                <Line data={chartData} options={chartOptions} />
            </div>

            <div className="current-readings">
                <div className="reading-card temperature-card">
                    <span className="reading-label">Temperature</span>
                    <span className="reading-value">{latestTemp}<span className="reading-unit">{'\u00B0'}C</span></span>
                </div>
                <div className="reading-card humidity-card">
                    <span className="reading-label">Humidity</span>
                    <span className="reading-value">{latestHumidity}<span className="reading-unit">%</span></span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
