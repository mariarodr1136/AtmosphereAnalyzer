import asyncio
import json
from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class SensorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Validate token if provided; allow connection either way so existing
        # clients without a token still work during the transition period.
        qs = parse_qs(self.scope.get('query_string', b'').decode())
        token = qs.get('token', [None])[0]
        if token:
            from .views import _valid_ws_tokens
            if token not in _valid_ws_tokens:
                await self.close(code=4001)
                return
            _valid_ws_tokens.discard(token)

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
    from .data_sources import (
        SENSOR_LOCATIONS,
        compute_z_score,
        get_aggregated_reading,
        get_location_reading,
    )
    from .models import (
        CustomSensorLocation,
        EventLog,
        SensorLocation,
        SensorLocationReading,
        SensorReading,
    )

    reading = get_aggregated_reading()
    SensorReading.objects.create(**reading, source='simulated')

    new_events = []

    # ── Built-in locations ──────────────────────────────────────────────────
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

        # Anomaly detection: check each metric against last 20 readings
        history_qs = SensorLocationReading.objects.filter(location=loc_obj).order_by('-timestamp')[:20]
        history_list = list(history_qs.values('temperature', 'humidity', 'wind_speed', 'air_quality'))
        history_list.reverse()

        for metric_key, label in (('temperature', 'Temperature'), ('air_quality', 'AQI')):
            history_vals = [h[metric_key] for h in history_list]
            z = compute_z_score(loc_reading[metric_key], history_vals)
            if z >= 2.5 and len(history_vals) >= 5:
                msg = f'{label} anomaly at {loc_def["name"]}: {loc_reading[metric_key]:.1f} (z={z:.1f})'
                EventLog.objects.create(
                    event_type='anomaly',
                    message=msg,
                    city=loc_def['name'],
                    severity='warning',
                )
                new_events.append({'type': 'anomaly', 'city': loc_def['name'],
                                   'metric': label, 'severity': 'warning', 'message': msg})

        locations.append({
            'id': loc_def['id'],
            'name': loc_def['name'],
            'latitude': loc_def['latitude'],
            'longitude': loc_def['longitude'],
            'is_custom': False,
            **loc_reading,
        })

    # ── Custom locations ────────────────────────────────────────────────────
    for custom in CustomSensorLocation.objects.all():
        loc_def = {
            'id': 1000 + custom.id,
            'name': custom.name,
            'city': custom.city,
            'country': custom.country,
            'latitude': custom.latitude,
            'longitude': custom.longitude,
        }
        loc_obj, _ = SensorLocation.objects.get_or_create(
            location_id=loc_def['id'],
            defaults={
                'name': custom.name,
                'latitude': custom.latitude,
                'longitude': custom.longitude,
            },
        )
        loc_reading, source = get_location_reading(loc_def)
        SensorLocationReading.objects.create(location=loc_obj, source=source, **loc_reading)
        locations.append({
            'id': loc_def['id'],
            'name': custom.name,
            'latitude': custom.latitude,
            'longitude': custom.longitude,
            'is_custom': True,
            'custom_id': custom.id,
            **loc_reading,
        })

    # Pull the most recent persisted events to include in every push
    recent_events = list(
        EventLog.objects.order_by('-timestamp')[:10].values(
            'timestamp', 'event_type', 'message', 'city', 'severity'
        )
    )
    for e in recent_events:
        if e['timestamp']:
            e['timestamp'] = e['timestamp'].isoformat()

    return {
        'type': 'sensor_update',
        'sensor_data': reading,
        'locations': locations,
        'new_events': new_events,
        'recent_events': recent_events,
    }
