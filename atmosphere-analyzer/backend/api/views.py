import random
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def sensor_data(request):
    # Simulate sensor data
    data = {
        'temperature': random.uniform(15.0, 30.0),
        'humidity': random.uniform(30.0, 90.0),
    }

    return Response(data)
