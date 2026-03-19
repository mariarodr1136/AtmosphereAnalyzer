import random
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def sensor_data(request):
    # Simulate sensor data
    data = {
        'temperature': random.uniform(15.0, 30.0),
        'humidity': random.uniform(30.0, 90.0),
        'wind_speed': random.uniform(0.5, 12.0),
        'air_quality': random.uniform(0.0, 200.0),
    }

    return Response(data)


@api_view(['GET'])
def sensor_locations(request):
    # Simulated sensor locations
    locations = [
        {
            'id': 1,
            'name': 'Central Park',
            'latitude': 40.7812,
            'longitude': -73.9665,
            'temperature': random.uniform(15.0, 30.0),
            'humidity': random.uniform(30.0, 90.0),
            'wind_speed': random.uniform(0.5, 12.0),
            'air_quality': random.uniform(0.0, 200.0),
        },
        {
            'id': 2,
            'name': 'Downtown LA',
            'latitude': 34.0522,
            'longitude': -118.2437,
            'temperature': random.uniform(15.0, 30.0),
            'humidity': random.uniform(30.0, 90.0),
            'wind_speed': random.uniform(0.5, 12.0),
            'air_quality': random.uniform(0.0, 200.0),
        },
        {
            'id': 3,
            'name': 'Chicago Loop',
            'latitude': 41.8837,
            'longitude': -87.6325,
            'temperature': random.uniform(15.0, 30.0),
            'humidity': random.uniform(30.0, 90.0),
            'wind_speed': random.uniform(0.5, 12.0),
            'air_quality': random.uniform(0.0, 200.0),
        },
        {
            'id': 4,
            'name': 'Miami Beach',
            'latitude': 25.7907,
            'longitude': -80.1300,
            'temperature': random.uniform(15.0, 30.0),
            'humidity': random.uniform(30.0, 90.0),
            'wind_speed': random.uniform(0.5, 12.0),
            'air_quality': random.uniform(0.0, 200.0),
        },
        {
            'id': 5,
            'name': 'Seattle Center',
            'latitude': 47.6205,
            'longitude': -122.3493,
            'temperature': random.uniform(15.0, 30.0),
            'humidity': random.uniform(30.0, 90.0),
            'wind_speed': random.uniform(0.5, 12.0),
            'air_quality': random.uniform(0.0, 200.0),
        },
    ]

    return Response({'locations': locations})
