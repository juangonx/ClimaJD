// Referencias al DOM
const cityInput = document.getElementById('cityInput');
const dateInput = document.getElementById('dateInput');
const searchBtn = document.getElementById('searchBtn');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const chartContainer = document.getElementById('chartContainer');
const canvas = document.getElementById('weatherChart');

// Variable global para almacenar la instancia de la gráfica
let myChart = null;

// Configurar fecha por defecto (hoy)
dateInput.valueAsDate = new Date();

// Event Listener
searchBtn.addEventListener('click', handleSearch);

async function handleSearch() {
    const city = cityInput.value.trim();
    if (!city) return;

    // Reiniciar UI
    showLoading();
    
    try {
        // 1. Obtener coordenadas (Geocoding)
        const coords = await getCoordinates(city);
        if (!coords) throw new Error("Ciudad no encontrada");

        // 2. Obtener Clima
        const weatherData = await getWeatherData(coords.lat, coords.lon);

        // 3. Renderizar Gráfica
        renderChart(weatherData);
        showSuccess();

    } catch (error) {
        console.error(error);
        showError();
    }
}

// Función: Obtener Coordenadas
async function getCoordinates(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
        return { 
            lat: data.results[0].latitude, 
            lon: data.results[0].longitude 
        };
    }
    return null;
}

// Función: Obtener Datos del Clima
async function getWeatherData(lat, lon) {
    // Calculamos fecha de inicio y fin (5 días)
    const startDate = dateInput.value; 
    // Open-Meteo permite pedir 'forecast_days', usaremos 5 días
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&timezone=auto&forecast_days=5`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Error en API del clima");
    
    return await response.json();
}

// Función Principal: Crear/Actualizar Gráfica
function renderChart(data) {
    const times = data.hourly.time; // Array de fechas/horas (Eje X)
    const temps = data.hourly.temperature_2m; // Array de temperaturas (Eje Y)

    // Formatear etiquetas de tiempo para que se vean mejor (DD/MM HH:mm)
    const labels = times.map(t => {
        const date = new Date(t);
        return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:00`;
    });

    // Control de Memoria: Destruir gráfica anterior si existe
    if (myChart) {
        myChart.destroy();
    }

    // Configuración de Colores Condicionales (Segments)
    // Chart.js permite colorear segmentos de línea según condiciones
    const ctx = canvas.getContext('2d');

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperatura (°C)',
                data: temps,
                borderWidth: 2,
                tension: 0.4, // Curva suave
                pointRadius: 3,
                fill: false,
                // Lógica de segmentos para color de línea
                segment: {
                    borderColor: ctx => {
                        // ctx.p0 es el punto anterior, ctx.p1 es el punto actual
                        const val = ctx.p1.parsed.y;
                        if (val > 30) return '#ff4d4d'; // Rojo
                        if (val < 10) return '#3399ff'; // Azul
                        return '#666666'; // Gris por defecto
                    }
                },
                // Color de los puntos
                pointBackgroundColor: context => {
                    const val = context.raw;
                    if (val > 30) return '#ff4d4d';
                    if (val < 10) return '#3399ff';
                    return '#666666';
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { font: { size: 14 } }
                },
                title: {
                    display: true,
                    text: 'Pronóstico a 5 días'
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Temperatura (°C)' }
                }
            }
        }
    });
}

// Funciones de Estado de UI
function showLoading() {
    loadingState.classList.remove('hidden');
    chartContainer.classList.remove('active');
    errorState.classList.add('hidden');
}

function showSuccess() {
    loadingState.classList.add('hidden');
    chartContainer.classList.add('active');
    errorState.classList.add('hidden');
}

function showError() {
    loadingState.classList.add('hidden');
    chartContainer.classList.remove('active');
    errorState.classList.remove('hidden');
}