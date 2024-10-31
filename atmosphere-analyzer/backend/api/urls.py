from django.urls import path
from .views import sensor_data

urlpatterns = [
    path('sensor-data/', sensor_data, name='sensor-data'),
]
