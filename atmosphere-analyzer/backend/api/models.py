from django.db import models


class SensorReading(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    temperature = models.FloatField()
    humidity = models.FloatField()
    wind_speed = models.FloatField()
    air_quality = models.FloatField()
    source = models.CharField(max_length=16, default='simulated')

    class Meta:
        ordering = ['timestamp']


class SensorLocation(models.Model):
    location_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=64)
    latitude = models.FloatField()
    longitude = models.FloatField()


class SensorLocationReading(models.Model):
    location = models.ForeignKey(SensorLocation, on_delete=models.CASCADE, related_name='readings')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    temperature = models.FloatField()
    humidity = models.FloatField()
    wind_speed = models.FloatField()
    air_quality = models.FloatField()
    source = models.CharField(max_length=16, default='simulated')

    class Meta:
        ordering = ['timestamp']
