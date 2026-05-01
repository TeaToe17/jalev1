FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Add this 👇
CMD ["bash", "-c", "python manage.py migrate && daphne backend.asgi:application --port $PORT --bind 0.0.0.0"]