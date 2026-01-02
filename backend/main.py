from fastapi import FastAPI, File, UploadFile, HTTPException, APIRouter
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import logging
import cv2
import numpy as np
import easyocr
import base64
import time
from datetime import datetime
import io
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AQI-API")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

app = FastAPI(title="AQI OCR Monitoring API")

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- OCR ENGINE ---
# Initialize EasyOCR Reader
reader = easyocr.Reader(['en'])

def preprocess_image(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None: return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    thresh = cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    kernel = np.ones((2,2), np.uint8)
    processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    return processed

# --- API ROUTES ---
api_router = APIRouter(prefix="/api")

@api_router.post("/process")
async def process_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        processed_img = preprocess_image(contents)
        if processed_img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")

        results = reader.readtext(processed_img, allowlist='0123456789. ')
        extracted_values = []
        for (bbox, text, prob) in results:
            if prob > 0.1: # Lowered threshold for better detection
                val = text.strip()
                if val: extracted_values.append(val)

        # Prepare image for response (base64)
        _, buffer = cv2.imencode('.png', processed_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        response_data = {
            "aqi": extracted_values[0] if len(extracted_values) > 0 else "0",
            "pm25": extracted_values[1] if len(extracted_values) > 1 else "0",
            "pm10": extracted_values[2] if len(extracted_values) > 2 else "0",
            "co2": extracted_values[3] if len(extracted_values) > 3 else "0",
            "temp": extracted_values[4] if len(extracted_values) > 4 else "0",
            "humidity": extracted_values[5] if len(extracted_values) > 5 else "0",
            "timestamp": datetime.now().isoformat(),
            "processed_image": f"data:image/png;base64,{img_base64}",
            "status": "success"
        }
        return response_data
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.get("/health")
def health_check():
    return {"status": "healthy", "time": datetime.now().isoformat()}

app.include_router(api_router)

# --- STATIC FILES ---
@app.get("/{path:path}")
async def serve_static(path: str):
    # Prevent catch-all from stealing API requests (this causes 405 if POSTed)
    if path.startswith("api"):
        raise HTTPException(status_code=404)

    # Clean path for root
    if not path or path == "/":
        target = os.path.join(FRONTEND_DIR, "index.html")
    else:
        target = os.path.join(FRONTEND_DIR, path)

    if os.path.exists(target) and os.path.isfile(target):
        return FileResponse(target)
    
    # Fallback to SPA index
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
