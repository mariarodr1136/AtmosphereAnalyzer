from django.urls import path
from .views import sensor_data, sensor_locations

urlpatterns = [
    path('sensor-data/', sensor_data, name='sensor-data'),
    path('sensor-locations/', sensor_locations, name='sensor-locations'),
]
