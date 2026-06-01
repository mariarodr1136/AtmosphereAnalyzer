from django.test import TestCase
from django.urls import reverse


class SensorDataTests(TestCase):
    def test_returns_all_fields(self):
        response = self.client.get(reverse('sensor-data'))
        self.assertEqual(response.status_code, 200)
        for field in ('temperature', 'humidity', 'wind_speed', 'air_quality'):
            self.assertIn(field, response.json())

    def test_persists_reading(self):
        from api.models import SensorReading
        self.client.get(reverse('sensor-data'))
        self.client.get(reverse('sensor-data'))
        self.assertEqual(SensorReading.objects.count(), 2)

    def test_evolves_from_previous(self):
        r1 = self.client.get(reverse('sensor-data')).json()
        r2 = self.client.get(reverse('sensor-data')).json()
        self.assertAlmostEqual(r1['temperature'], r2['temperature'], delta=0.6)
        self.assertAlmostEqual(r1['humidity'], r2['humidity'], delta=2.5)

    def test_values_within_bounds(self):
        for _ in range(5):
            data = self.client.get(reverse('sensor-data')).json()
        self.assertGreaterEqual(data['temperature'], 15.0)
        self.assertLessEqual(data['temperature'], 30.0)
        self.assertGreaterEqual(data['air_quality'], 0.0)
        self.assertLessEqual(data['air_quality'], 200.0)


class SensorLocationsTests(TestCase):
    def test_returns_five_locations(self):
        response = self.client.get(reverse('sensor-locations'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['locations']), 5)

    def test_locations_have_required_fields(self):
        response = self.client.get(reverse('sensor-locations'))
        for loc in response.json()['locations']:
            for field in ('id', 'name', 'latitude', 'longitude', 'temperature', 'humidity', 'wind_speed', 'air_quality'):
                self.assertIn(field, loc)

    def test_locations_persist_readings(self):
        from api.models import SensorLocationReading
        self.client.get(reverse('sensor-locations'))
        self.client.get(reverse('sensor-locations'))
        self.assertEqual(SensorLocationReading.objects.count(), 10)  # 5 locations × 2 calls

    def test_locations_evolve_from_previous(self):
        r1 = self.client.get(reverse('sensor-locations')).json()['locations'][0]
        r2 = self.client.get(reverse('sensor-locations')).json()['locations'][0]
        self.assertAlmostEqual(r1['temperature'], r2['temperature'], delta=0.5)


class SensorHistoryTests(TestCase):
    def test_returns_persisted_readings(self):
        self.client.get(reverse('sensor-data'))
        self.client.get(reverse('sensor-data'))
        response = self.client.get(reverse('sensor-history'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['readings']), 2)

    def test_limit_parameter(self):
        for _ in range(10):
            self.client.get(reverse('sensor-data'))
        response = self.client.get(reverse('sensor-history') + '?limit=5')
        self.assertEqual(len(response.json()['readings']), 5)

    def test_readings_have_timestamp_and_source(self):
        self.client.get(reverse('sensor-data'))
        readings = self.client.get(reverse('sensor-history')).json()['readings']
        self.assertIn('timestamp', readings[0])
        self.assertIn('source', readings[0])

    def test_empty_history(self):
        response = self.client.get(reverse('sensor-history'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['readings'], [])
