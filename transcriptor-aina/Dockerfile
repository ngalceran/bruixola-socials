FROM python:3.12-slim
# ffmpeg cal per al motor Transformers; faster-whisper ja decodifica amb PyAV.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
# Els models es descarreguen a /models la primera vegada (munteu-hi un volum per no repetir-ho).
ENV HF_HOME=/models
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
