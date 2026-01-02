// State Management
let statsHistory = [];
let chart = null;
let stream = null;
let autoCaptureInterval = null;
const API_URL = "http://localhost:8000";

// DOM Elements
const landing = document.getElementById('landing');
const monitor = document.getElementById('monitor');
const startBtn = document.getElementById('start-btn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-btn');
const uploadInput = document.getElementById('upload-img');
const autoToggle = document.getElementById('auto-capture-sync');
const lastUpdateEl = document.getElementById('last-update');

// Initialize
startBtn.addEventListener('click', () => {
    landing.classList.add('hidden');
    monitor.classList.remove('hidden');
    initCamera();
    initChart();
});

// Camera Logic
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("Camera error:", err);
        alert("Camera access denied or unavailable. Please use image upload.");
    }
}

// Capture & Process
captureBtn.addEventListener('click', captureFrame);

async function captureFrame() {
    triggerFlash();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    processImage(blob);
}

uploadInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        processImage(e.target.files[0]);
    }
});

async function processImage(imageBlob) {
    const formData = new FormData();
    formData.append('file', imageBlob, 'capture.jpg');

    try {
        const response = await fetch(`${API_URL}/api/process`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.status === 'success') {
            updateDashboard(data);
        } else {
            console.error("Processing error:", data.message);
        }
    } catch (err) {
        console.error("API call failed:", err);
    }
}

// UI Updates
function updateDashboard(data) {
    // Update preview image
    if (data.processed_image) {
        const previewImg = document.getElementById('processed-img-preview');
        const noPreview = document.getElementById('no-preview');

        previewImg.src = data.processed_image;
        previewImg.classList.add('loaded');
        noPreview.classList.add('hidden');
    }

    // Update metric values
    document.getElementById('val-aqi').textContent = data.aqi;
    document.getElementById('val-pm25').textContent = data.pm25;
    document.getElementById('val-pm10').textContent = data.pm10;
    document.getElementById('val-co2').textContent = data.co2;
    document.getElementById('val-temp').textContent = data.temp;
    document.getElementById('val-humidity').textContent = data.humidity;

    // AQI Status
    const aqi = parseInt(data.aqi);
    const statusEl = document.getElementById('status-aqi');
    const aqiCard = document.querySelector('.aqi-card');

    statusEl.className = 'status-pill';
    if (aqi < 50) {
        statusEl.textContent = 'GOOD';
        statusEl.classList.add('status-good');
        aqiCard.style.borderLeftColor = 'var(--accent-green)';
    } else if (aqi < 150) {
        statusEl.textContent = 'MODERATE';
        statusEl.classList.add('status-mod');
        aqiCard.style.borderLeftColor = 'var(--accent-yellow)';
    } else {
        statusEl.textContent = 'POOR';
        statusEl.classList.add('status-poor');
        aqiCard.style.borderLeftColor = 'var(--accent-red)';
    }

    // Add to History
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    statsHistory.push({
        time: timestamp,
        aqi: data.aqi,
        pm25: data.pm25,
        status: statusEl.textContent
    });

    if (statsHistory.length > 10) statsHistory.shift();

    updateHistoryTable();
    updateChart();
    lastUpdateEl.textContent = `Last sync: ${timestamp}`;
}

function updateHistoryTable() {
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = '';

    [...statsHistory].reverse().forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.time}</td>
            <td>${entry.aqi}</td>
            <td>${entry.pm25}</td>
            <td style="color: ${entry.status === 'GOOD' ? 'var(--accent-green)' : (entry.status === 'MODERATE' ? 'var(--accent-yellow)' : 'var(--accent-red)')}">${entry.status}</td>
        `;
        tbody.appendChild(row);
    });
}

// Charting
function initChart() {
    const ctx = document.getElementById('aqi-chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'AQI Index',
                data: [],
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#a1a1aa' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#a1a1aa' }
                }
            }
        }
    });
}

function updateChart() {
    if (!chart) return;
    chart.data.labels = statsHistory.map(h => h.time);
    chart.data.datasets[0].data = statsHistory.map(h => h.aqi);
    chart.update('none');
}

// Auto Capture
autoToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        autoCaptureInterval = setInterval(captureFrame, 5000);
    } else {
        clearInterval(autoCaptureInterval);
    }
});

// Animations
function triggerFlash() {
    const overlay = document.getElementById('capture-overlay');
    overlay.classList.remove('hidden');
    overlay.style.opacity = '1';
    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }, 50);
}
