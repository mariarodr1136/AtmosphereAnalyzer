from rest_framework.decorators import api_view
from rest_framework.response import Response

from .data_sources import SENSOR_LOCATIONS, get_aggregated_reading, get_location_reading
from .models import SensorLocation, SensorLocationReading, SensorReading


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
