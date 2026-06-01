import asyncio
import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class SensorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self._running = True
        asyncio.ensure_future(self._push_loop())

    async def disconnect(self, close_code):
        self._running = False

    async def _push_loop(self):
        while self._running:
            payload = await sync_to_async(_build_payload)()
            await self.send(text_data=json.dumps(payload))
            await asyncio.sleep(5)


def _build_payload():
    from .data_sources import SENSOR_LOCATIONS, get_aggregated_reading, get_location_reading
    from .models import SensorLocation, SensorLocationReading, SensorReading

    reading = get_aggregated_reading()
    SensorReading.objects.create(**reading, source='simulated')

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
        loc_reading, source = get_location_reading(loc_def)
        SensorLocationReading.objects.create(location=loc_obj, source=source, **loc_reading)
        locations.append({
            'id': loc_def['id'],
            'name': loc_def['name'],
            'latitude': loc_def['latitude'],
            'longitude': loc_def['longitude'],
            **loc_reading,
        })

    return {'type': 'sensor_update', 'sensor_data': reading, 'locations': locations}
