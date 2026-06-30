from django.urls import path

from .views import (
    auth_token,
    custom_cities,
    delete_custom_city,
    events,
    forecast,
    geocode,
    health,
    heatmap,
    sensor_data,
    sensor_history,
    sensor_locations,
)

urlpatterns = [
    path('sensor-data/',        sensor_data,        name='sensor-data'),
    path('sensor-locations/',   sensor_locations,   name='sensor-locations'),
    path('sensor-history/',     sensor_history,     name='sensor-history'),
    path('forecast/',           forecast,           name='forecast'),
    path('heatmap/',            heatmap,            name='heatmap'),
    path('events/',             events,             name='events'),
    path('geocode/',            geocode,            name='geocode'),
    path('custom-cities/',      custom_cities,      name='custom-cities'),
    path('custom-cities/<int:pk>/', delete_custom_city, name='delete-custom-city'),
    path('auth/token/',         auth_token,         name='auth-token'),
    path('health/',             health,             name='health'),
]
