import boto3
import json
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
import random

# Initialize S3 client
s3 = boto3.client('s3', region_name='us-east-1')

@api_view(['GET'])
def sensor_data(request):
    # Simulate sensor data
    data = {
        'temperature': random.uniform(15.0, 30.0),
        'humidity': random.uniform(30.0, 90.0)
    }

    # Convert data to JSON
    json_data = json.dumps(data)

    # Upload data to S3
    s3_bucket = 'atmosphereanalyzer'
    s3_key = f'sensor_data/{data["temperature"]}_{data["humidity"]}.json'
    
    try:
        s3.put_object(Bucket=s3_bucket, Key=s3_key, Body=json_data)
        print(f"Data uploaded to S3: {s3_key}")
    except Exception as e:
        print(f"Error uploading to S3: {e}")

    return Response(data)
