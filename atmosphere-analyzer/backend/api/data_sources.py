import os
import random

import requests

OWM_API_KEY = os.environ.get('OPENWEATHER_API_KEY', '')
OWM_BASE = 'https://api.openweathermap.org/data/2.5/weather'

SENSOR_LOCATIONS = [
    {'id': 1, 'name': 'Central Park',   'latitude': 40.7812, 'longitude': -73.9665,  'city': 'New York',    'country': 'US'},
    {'id': 2, 'name': 'Downtown LA',    'latitude': 34.0522, 'longitude': -118.2437, 'city': 'Los Angeles', 'country': 'US'},
    {'id': 3, 'name': 'Chicago Loop',   'latitude': 41.8837, 'longitude': -87.6325,  'city': 'Chicago',     'country': 'US'},
    {'id': 4, 'name': 'Miami Beach',    'latitude': 25.7907, 'longitude': -80.1300,  'city': 'Miami',       'country': 'US'},
    {'id': 5, 'name': 'Seattle Center', 'latitude': 47.6205, 'longitude': -122.3493, 'city': 'Seattle',     'country': 'US'},
]


def _evolve(prev, lo, hi, step):
    """Advance a simulated value by a small random step, clamped to [lo, hi]."""
    return max(lo, min(hi, prev + random.uniform(-step, step)))


def _fetch_owm(city, country):
    if not OWM_API_KEY:
        return None
    try:
        resp = requests.get(OWM_BASE, params={
            'q': f'{city},{country}',
            'appid': OWM_API_KEY,
            'units': 'metric',
        }, timeout=5)
        resp.raise_for_status()
        d = resp.json()
        return {
            'temperature': d['main']['temp'],
            'humidity': float(d['main']['humidity']),
            'wind_speed': d['wind']['speed'],
            # OWM free tier requires a separate AQI call; use a plausible simulated value
            'air_quality': random.uniform(20.0, 80.0),
        }
    except Exception:
        return None


def _seed_reading():
    return {
        'temperature': random.uniform(18.0, 26.0),
        'humidity': random.uniform(45.0, 65.0),
        'wind_speed': random.uniform(1.0, 6.0),
        'air_quality': random.uniform(25.0, 75.0),
    }


def get_aggregated_reading():
    from .models import SensorReading
    last = SensorReading.objects.order_by('-timestamp').first()
    if not last:
        return _seed_reading()
    return {
        'temperature': _evolve(last.temperature, 15.0, 30.0, 0.5),
        'humidity':    _evolve(last.humidity,    30.0, 90.0, 2.0),
        'wind_speed':  _evolve(last.wind_speed,  0.5,  12.0, 0.3),
        'air_quality': _evolve(last.air_quality, 0.0,  200.0, 5.0),
    }


def get_location_reading(location_def):
    from .models import SensorLocation, SensorLocationReading

    live = _fetch_owm(location_def['city'], location_def['country'])
    if live:
        return live, 'live'

    loc_obj = SensorLocation.objects.filter(location_id=location_def['id']).first()
    if loc_obj:
        last = SensorLocationReading.objects.filter(location=loc_obj).order_by('-timestamp').first()
        if last:
            return {
                'temperature': _evolve(last.temperature, 10.0, 38.0, 0.4),
                'humidity':    _evolve(last.humidity,    20.0, 95.0, 1.5),
                'wind_speed':  _evolve(last.wind_speed,  0.0,  15.0, 0.2),
                'air_quality': _evolve(last.air_quality, 5.0,  180.0, 4.0),
            }, 'simulated'

    return _seed_reading(), 'simulated'
