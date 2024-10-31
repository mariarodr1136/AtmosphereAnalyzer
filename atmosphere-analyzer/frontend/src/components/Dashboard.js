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

// Register the necessary components
ChartJS.register(LineElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PointElement);

const Dashboard = () => {
    const [data, setData] = useState({ temperature: [], humidity: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://127.0.0.1:8000/api/sensor-data/');
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

    // Ensure that the labels are unique and that the chart data updates correctly
    const chartData = {
        labels: Array.from({ length: data.temperature.length }, (_, i) => i + 1), // Use time labels if available
        datasets: [
            {
                label: 'Temperature (°C)',
                data: data.temperature,
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
                lineTension: 0, // This can help with smooth line rendering
            },
            {
                label: 'Humidity (%)',
                data: data.humidity,
                borderColor: 'rgba(54, 162, 235, 1)',
                fill: false,
                lineTension: 0, // This can help with smooth line rendering
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
        responsive: true, // Ensure responsiveness
        maintainAspectRatio: false, // Prevent aspect ratio issues
    };

    return (
        <div>
            <h2>Environmental Metrics</h2>
            {loading && <p>Loading data...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div style={{ height: '400px', width: '100%' }}> {/* Add a fixed height to avoid layout shift */}
                <Line data={chartData} options={chartOptions} />
            </div>
        </div>
    );
};

export default Dashboard;
