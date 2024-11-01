# Atmosphere Analyzer: Smart Data Visualization Tool 🌎📊

Atmosphere Analyzer is an innovative environmental monitoring system that simulates real-time sensor data with Python, seamlessly integrates AWS S3 for scalable data storage, and leverages AWS Lambda for on-the-fly data processing. The backend API, built with Django, serves environmental data to a dynamic, data-rich React frontend that visualizes key environmental metrics in an intuitive dashboard. This project is engineered to provide deep insights into environmental trends, supporting sustainable resource management through smart data visualization.

![Python](https://img.shields.io/badge/Python-Programming%20Language-blue) ![Django](https://img.shields.io/badge/Django-Framework-green) ![AWS](https://img.shields.io/badge/AWS-Cloud%20Platform-orange) ![AWS Lambda](https://img.shields.io/badge/AWS%20Lambda-Serverless%20Computing-yellow) ![AWS S3](https://img.shields.io/badge/AWS%20S3-Object%20Storage-lightblue) ![React](https://img.shields.io/badge/React-Library-lightblue) ![Data Visualization](https://img.shields.io/badge/Data%20Visualization-Library-brightgreen) ![IoT](https://img.shields.io/badge/IoT-Concept-yellow)


## Table of Contents
- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Setup and Installation](#setup-and-installation)
- [Usage](#usage)
- [Deployment](#deployment)
- [Future Enhancements](#future-enhancements)

---


<img width="1466" alt="Screenshot 2024-10-31 at 5 24 10 PM" src="https://github.com/user-attachments/assets/c16511f9-5ec5-4c7b-8de1-17c4c1acde90">
<img width="1463" alt="Screenshot 2024-10-31 at 5 24 18 PM" src="https://github.com/user-attachments/assets/b4f004e5-e9d0-4ad0-8db2-92c9446d2a7d">


---

## Project Overview 
Atmosphere Analyzer enables real-time monitoring and visualization of environmental metrics through a robust architecture that simulates, processes, and delivers data efficiently. Designed for scalability and insight-driven analytics, the system models sensor data to help users track environmental changes over time, providing actionable insights for data-driven decision-making.

## Architecture

1. **Data Simulation (Python)**: Simulates sensor data (e.g., temperature, humidity) to mimic real-world readings.
2. **Data Storage (AWS S3)**: Utilizes AWS S3 for scalable and durable storage of environmental metrics.
3. **Data Processing (AWS Lambda)**: Processes incoming data using AWS Lambda, enabling real-time processing without server management.
4. **Backend API (Django)**: Organizes and serves data to the frontend through RESTful endpoints, managing data access efficiently.
5. **Frontend Visualization (React)**: The interactive React dashboard fetches and visualizes data in real-time, enhancing user engagement.

## Technologies

- **Python**: For data simulation and AWS Lambda processing.
- **AWS (S3, Lambda)**: Provides scalable storage and serverless data processing capabilities.
- **Django**: Facilitates API creation and data management.
- **React**: Powers interactive data visualization.
- **Django REST Framework**: Establishes REST API endpoints for seamless data access.

## Setup and Installation

### Prerequisites

- **Python 3.x** and **Django** installed on your machine
- **Node.js and npm** for the React frontend
- **AWS CLI** configured with access to S3 and Lambda

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/atmosphere-analyzer.git
   cd atmosphere-analyzer
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

---

https://github.com/user-attachments/assets/4c8a8693-ebb0-4f83-892d-03498b00b783


---

## Usage

1. **Simulate Sensor Data**: Run the Python script to simulate data transmission to the Django API.
2. **View Data on Dashboard**: Access the React dashboard to visualize real-time environmental metrics sourced from the API.

## Deployment

- **Backend (Django)**: Deploy using AWS Elastic Beanstalk or EC2 for scalable hosting.
- **Frontend (React)**: Deploy via AWS Amplify or S3 static site hosting for reliable frontend delivery.

## Future Enhancements

- **Advanced Data Analytics**: Integrate machine learning models to predict environmental trends.
- **User Authentication**: Implement user management for secure, personalized data access.
- **Expanded Sensor Metrics**: Add more simulated metrics like air quality and light levels.

## Contact 🌐
If you have any questions or feedback, feel free to reach out at [mrodr.contact@gmail.com](mailto:mrodr.contact@gmail.com).
