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


class CustomSensorLocation(models.Model):
    name = models.CharField(max_length=64)
    city = models.CharField(max_length=64)
    country = models.CharField(max_length=8, blank=True, default='')
    latitude = models.FloatField()
    longitude = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class EventLog(models.Model):
    INFO = 'info'
    WARNING = 'warning'
    CRITICAL = 'critical'

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    event_type = models.CharField(max_length=32)
    message = models.CharField(max_length=255)
    city = models.CharField(max_length=64, blank=True, default='')
    severity = models.CharField(max_length=16, default='info')

    class Meta:
        ordering = ['-timestamp']
