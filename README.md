AQUAAIRE
A professional, full-stack web application that extracts Air Quality Index (AQI) parameters from physical AQI device displays using OpenCV-based OCR, and presents them in a modern React dashboard with timestamps and real-time updates.

This system enables AQI data digitization using a camera or uploaded images, making it useful for environments where sensors expose data only via physical displays.

🚀 Features

📷 Live camera capture via browser (mobile & desktop)

⏱ Automatic image capture every 5 seconds

🖱 Manual Capture Button

🧠 OpenCV-based image preprocessing

🔎 OCR extraction of AQI device parameters

📊 Professional React Dashboard

🕒 Timestamped AQI readings

📈 Historical data table & charts

🎨 AQI-based color indicators (Good / Moderate / Poor)

🌐 Deployable on Hugging Face Spaces

🧠 Extracted Parameters

The OCR pipeline is designed to extract commonly displayed AQI metrics such as:

AQI

PM2.5

PM10

CO₂

Temperature

Humidity

(Automatically parsed from device screens using regex-based logic)

🏗️ Tech Stack
Frontend

React.js

JavaScript (ES6+)

HTML5 & CSS3

Chart.js / Recharts (for visualization)

Backend

Python

OpenCV

EasyOCR / Tesseract OCR

NumPy

Flask / FastAPI (REST API)

Deployment

Hugging Face Spaces

Node.js



⚙️ How It Works

User opens the web app landing page

Camera feed starts (or image is uploaded)

Image is captured manually or automatically every 5 seconds

OpenCV preprocesses the image:

Grayscale conversion

Noise removal

Adaptive thresholding

OCR extracts text from AQI device display

Parameters are parsed and timestamped

Data is displayed live on the React dashboard

