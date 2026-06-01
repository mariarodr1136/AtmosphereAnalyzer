import os
import random
import time

import requests

OWM_API_KEY = os.environ.get('OPENWEATHER_API_KEY', '')
OWM_BASE = 'https://api.openweathermap.org/data/2.5/weather'

OPENAQ_API_KEY = os.environ.get('OPENAQ_API_KEY', '')
OPENAQ_BASE = 'https://api.openaq.org/v3'
OPENAQ_CACHE_TTL = 600  # 10 min — real monitors report every 10–60 min anyway

SENSOR_LOCATIONS = [
    {'id': 1, 'name': 'Central Park',   'latitude': 40.7812, 'longitude': -73.9665,  'city': 'New York',    'country': 'US'},
    {'id': 2, 'name': 'Downtown LA',    'latitude': 34.0522, 'longitude': -118.2437, 'city': 'Los Angeles', 'country': 'US'},
    {'id': 3, 'name': 'Chicago Loop',   'latitude': 41.8837, 'longitude': -87.6325,  'city': 'Chicago',     'country': 'US'},
    {'id': 4, 'name': 'Miami Beach',    'latitude': 25.7907, 'longitude': -80.1300,  'city': 'Miami',       'country': 'US'},
    {'id': 5, 'name': 'Seattle Center', 'latitude': 47.6205, 'longitude': -122.3493, 'city': 'Seattle',     'country': 'US'},
]

# EPA PM2.5 → AQI breakpoints: (c_lo, c_hi, aqi_lo, aqi_hi)
_PM25_BREAKPOINTS = [
    (0.0,   12.0,   0,   50),
    (12.1,  35.4,  51,  100),
    (35.5,  55.4, 101,  150),
    (55.5, 150.4, 151,  200),
    (150.5, 250.4, 201, 300),
    (250.5, 500.4, 301, 500),
]

_openaq_cache = {}  # location_def id -> {'aqi': float, 'expires_at': float}


def _pm25_to_aqi(pm25):
    for c_lo, c_hi, aqi_lo, aqi_hi in _PM25_BREAKPOINTS:
        if c_lo <= pm25 <= c_hi:
            return ((aqi_hi - aqi_lo) / (c_hi - c_lo)) * (pm25 - c_lo) + aqi_lo
    return min(500.0, pm25 * 2.0)


def _fetch_openaq_aqi(location_def):
    if not OPENAQ_API_KEY:
        return None
    loc_id = location_def['id']
    now = time.time()

    cached = _openaq_cache.get(loc_id)
    if cached and now < cached['expires_at']:
        return cached['aqi']

    try:
        resp = requests.get(
            f'{OPENAQ_BASE}/locations',
            params={
                'coordinates': f"{location_def['latitude']},{location_def['longitude']}",
                'radius': 50000,
                'parameters_id': 2,   # PM2.5
                'limit': 1,
                'order_by': 'distance',
            },
            headers={'X-API-Key': OPENAQ_API_KEY},
            timeout=8,
        )
        resp.raise_for_status()
        results = resp.json().get('results', [])
        if not results:
            return None
        for sensor in results[0].get('sensors', []):
            if sensor.get('parameter', {}).get('id') == 2:
                val = sensor.get('latest', {}).get('value')
                if val is not None and val >= 0:
                    aqi = _pm25_to_aqi(float(val))
                    _openaq_cache[loc_id] = {'aqi': aqi, 'expires_at': now + OPENAQ_CACHE_TTL}
                    return aqi
    except Exception:
        pass
    return None


def _evolve(prev, lo, hi, step):
    """Advance a simulated value by a small random step, clamped to [lo, hi]."""
    return max(lo, min(hi, prev + random.uniform(-step, step)))


def _fetch_owm(city, country):
    """Returns temperature, humidity, wind_speed from OWM, or None on failure."""
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

    weather = _fetch_owm(location_def['city'], location_def['country'])
    aqi = _fetch_openaq_aqi(location_def)

    if weather or aqi is not None:
        loc_obj = SensorLocation.objects.filter(location_id=location_def['id']).first()
        last = (
            SensorLocationReading.objects.filter(location=loc_obj).order_by('-timestamp').first()
            if loc_obj else None
        )
        reading = {
            'temperature': weather['temperature'] if weather else (
                _evolve(last.temperature, 10.0, 38.0, 0.4) if last else random.uniform(18.0, 28.0)
            ),
            'humidity': weather['humidity'] if weather else (
                _evolve(last.humidity, 20.0, 95.0, 1.5) if last else random.uniform(40.0, 70.0)
            ),
            'wind_speed': weather['wind_speed'] if weather else (
                _evolve(last.wind_speed, 0.0, 15.0, 0.2) if last else random.uniform(1.0, 6.0)
            ),
            'air_quality': aqi if aqi is not None else (
                _evolve(last.air_quality, 5.0, 180.0, 4.0) if last else random.uniform(20.0, 80.0)
            ),
        }
        return reading, 'live'

    # Full simulation fallback
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
