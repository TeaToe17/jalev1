FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "daphne backend.asgi:application -b 0.0.0.0 -p ${PORT:-10000}"]


