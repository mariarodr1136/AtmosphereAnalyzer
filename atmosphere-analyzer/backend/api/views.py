import uuid
from collections import defaultdict
from datetime import timedelta

from django.db.models import Avg
from django.db.models.functions import ExtractHour, ExtractWeekDay
from django.utils import timezone
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .data_sources import (
    SENSOR_LOCATIONS,
    geocode_city,
    get_aggregated_reading,
    get_forecast,
    get_location_reading,
)
from .models import (
    CustomSensorLocation,
    EventLog,
    SensorLocation,
    SensorLocationReading,
    SensorReading,
)

# In-memory token store for WebSocket auth.
# A production system would use Redis with TTLs.
_valid_ws_tokens: set = set()


@api_view(['GET'])
def auth_token(request):
    """Issue a short-lived token for WebSocket authentication."""
    token = str(uuid.uuid4())
    _valid_ws_tokens.add(token)
    # Keep the set bounded to prevent unbounded growth
    if len(_valid_ws_tokens) > 10_000:
        _valid_ws_tokens.clear()
    return Response({'token': token})


@api_view(['GET'])
def sensor_data(request):
    reading = get_aggregated_reading()
    SensorReading.objects.create(**reading, source='simulated')
    return Response(reading)


@api_view(['GET'])
def sensor_locations(request):
    locations = []
    for loc_def in SENSOR_LOCATIONS:
        loc_obj, _ = SensorLocation.objects.get_or_create(
            location_id=loc_def['id'],
            defaults={
                'name': loc_def['name'],
                'latitude': loc_def['latitude'],
                'longitude': loc_def['longitude'],
            },
        )
        reading, source = get_location_reading(loc_def)
        SensorLocationReading.objects.create(location=loc_obj, source=source, **reading)
        locations.append({
            'id': loc_def['id'],
            'name': loc_def['name'],
            'latitude': loc_def['latitude'],
            'longitude': loc_def['longitude'],
            'is_custom': False,
            **reading,
        })
    return Response({'locations': locations})


@api_view(['GET'])
def sensor_history(request):
    limit = min(int(request.query_params.get('limit', 100)), 500)
    readings = SensorReading.objects.order_by('timestamp')[:limit]
    return Response({
        'readings': list(readings.values(
            'timestamp', 'temperature', 'humidity', 'wind_speed', 'air_quality', 'source'
        ))
    })


@api_view(['GET'])
@throttle_classes([AnonRateThrottle])
def forecast(request):
    """Return 5-day daily forecast summary for a given city."""
    city = request.query_params.get('city', 'New York')
    country = request.query_params.get('country', 'US')
    data = get_forecast(city, country)
    if data is None:
        return Response(
            {'error': 'Forecast unavailable — check OPENWEATHER_API_KEY'},
            status=503,
        )
    return Response({'city': city, 'country': country, 'forecast': data})


@api_view(['GET'])
def heatmap(request):
    """Return avg metric values grouped by (weekday, hour) for the last 7 days."""
    metric = request.query_params.get('metric', 'temperature')
    if metric not in ('temperature', 'humidity', 'wind_speed', 'air_quality'):
        metric = 'temperature'

    cutoff = timezone.now() - timedelta(days=7)
    qs = (
        SensorReading.objects
        .filter(timestamp__gte=cutoff)
        .annotate(hr=ExtractHour('timestamp'), wd=ExtractWeekDay('timestamp'))
        .values('hr', 'wd')
        .annotate(avg=Avg(metric))
    )

    # Build {weekday-hour: avg} dict
    grid = {}
    for r in qs:
        grid[f"{r['wd']}-{r['hr']}"] = round(r['avg'], 2) if r['avg'] is not None else None

    return Response({'metric': metric, 'grid': grid})


@api_view(['GET'])
def events(request):
    """Return recent event log entries."""
    limit = min(int(request.query_params.get('limit', 50)), 200)
    evs = EventLog.objects.order_by('-timestamp')[:limit]
    return Response({
        'events': list(evs.values('timestamp', 'event_type', 'message', 'city', 'severity'))
    })


@api_view(['GET'])
@throttle_classes([AnonRateThrottle])
def geocode(request):
    """Proxy OWM geocoding for city search."""
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response({'results': []})
    raw = geocode_city(q)
    results = [
        {
            'name': r.get('name', ''),
            'country': r.get('country', ''),
            'state': r.get('state', ''),
            'lat': r['lat'],
            'lon': r['lon'],
        }
        for r in raw
    ]
    return Response({'results': results})


@api_view(['GET', 'POST'])
def custom_cities(request):
    if request.method == 'GET':
        cities = CustomSensorLocation.objects.all()
        return Response({'cities': list(cities.values())})

    data = request.data
    required = ('name', 'city', 'latitude', 'longitude')
    for field in required:
        if field not in data:
            return Response({'error': f'Missing field: {field}'}, status=400)

    city = CustomSensorLocation.objects.create(
        name=data['name'],
        city=data['city'],
        country=data.get('country', ''),
        latitude=float(data['latitude']),
        longitude=float(data['longitude']),
    )
    EventLog.objects.create(
        event_type='city_added',
        message=f'Custom city added: {city.name}',
        city=city.name,
        severity='info',
    )
    return Response({'id': city.id, 'name': city.name, 'city': city.city,
                     'country': city.country, 'latitude': city.latitude,
                     'longitude': city.longitude}, status=201)


@api_view(['DELETE'])
def delete_custom_city(request, pk):
    deleted, _ = CustomSensorLocation.objects.filter(pk=pk).delete()
    if not deleted:
        return Response({'error': 'Not found'}, status=404)
    return Response({'deleted': True})


@api_view(['GET'])
def health(request):
    return Response({'status': 'ok'})
