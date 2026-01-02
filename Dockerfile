# Build stage (None needed for frontend as it's vanilla)
FROM python:3.9-slim

# Install system dependencies for OpenCV and EasyOCR
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expose ports (FastAPI on 8000)
EXPOSE 8000

# Script to run both backend and a simple static server for frontend
# Or just use FastAPI to serve static files
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
