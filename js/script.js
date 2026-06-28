/**
 * script.js — Main Application Logic
 * Handles DOM manipulation, user interactions, and rendering weather data.
 * Parses and dynamically renders complex nested JSON objects from the API.
 */

// ==================== DOM ELEMENTS ====================
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const unitToggle = document.getElementById("unit-toggle");
const errorContainer = document.getElementById("error-container");
const errorMessage = document.getElementById("error-message");
const errorClose = document.getElementById("error-close");
const loadingOverlay = document.getElementById("loading-overlay");
const welcomeScreen = document.getElementById("welcome-screen");
const dashboardContent = document.getElementById("dashboard-content");
const searchSuggestions = document.getElementById("search-suggestions");
const themeToggle = document.getElementById("theme-toggle");

// ==================== STATE ====================
let currentUnit = "metric"; // metric = °C, imperial = °F
let currentWeatherData = null;
let searchHistory = JSON.parse(localStorage.getItem("weatherSearchHistory")) || [];
let isDarkMode = localStorage.getItem("darkMode") === "true";

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderSearchHistory();
  setupEventListeners();
  updateDateTime();
  setInterval(updateDateTime, 60000);
});

// ==================== THEME ====================
function initTheme() {
  if (isDarkMode) {
    document.documentElement.classList.add("dark-mode");
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

function toggleTheme() {
  isDarkMode = !isDarkMode;
  document.documentElement.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDarkMode);
  themeToggle.innerHTML = isDarkMode
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  searchBtn.addEventListener("click", handleSearch);

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleSearch();
      searchSuggestions.classList.add("hidden");
    }
  });

  searchInput.addEventListener("input", debounce(handleSearchInput, 300));

  searchInput.addEventListener("focus", () => {
    if (searchHistory.length > 0 && searchInput.value === "") {
      showSearchHistory();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      searchSuggestions.classList.add("hidden");
    }
  });

  locationBtn.addEventListener("click", handleGeolocation);
  unitToggle.addEventListener("click", handleUnitToggle);
  errorClose.addEventListener("click", hideError);
  themeToggle.addEventListener("click", toggleTheme);
}

// ==================== UTILITY FUNCTIONS ====================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function updateDateTime() {
  const dateEl = document.getElementById("current-date");
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

// ==================== SEARCH FUNCTIONALITY ====================
async function handleSearch() {
  const city = searchInput.value.trim();
  if (!city) {
    showError("Please enter a city name.");
    return;
  }
  searchSuggestions.classList.add("hidden");
  await loadWeatherData(city);
}

function handleSearchInput() {
  const value = searchInput.value.trim();
  if (value === "") {
    showSearchHistory();
  } else {
    filterSearchHistory(value);
  }
}

function showSearchHistory() {
  if (searchHistory.length === 0) {
    searchSuggestions.classList.add("hidden");
    return;
  }

  searchSuggestions.innerHTML = `
    <div class="suggestions-header">
      <span>Recent Searches</span>
      <button onclick="clearSearchHistory()" class="clear-history-btn">Clear All</button>
    </div>
    ${searchHistory
      .slice(0, 5)
      .map(
        (city) => `
      <div class="suggestion-item" onclick="selectSuggestion('${city.replace(/'/g, "\\'")}')">
        <i class="fas fa-history"></i>
        <span>${city}</span>
        <button class="remove-history-btn" onclick="event.stopPropagation(); removeFromHistory('${city.replace(/'/g, "\\'")}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `
      )
      .join("")}
  `;
  searchSuggestions.classList.remove("hidden");
}

function filterSearchHistory(query) {
  const filtered = searchHistory.filter((city) =>
    city.toLowerCase().includes(query.toLowerCase())
  );
  if (filtered.length === 0) {
    searchSuggestions.classList.add("hidden");
    return;
  }
  searchSuggestions.innerHTML = filtered
    .slice(0, 5)
    .map(
      (city) => `
    <div class="suggestion-item" onclick="selectSuggestion('${city.replace(/'/g, "\\'")}')">
      <i class="fas fa-history"></i>
      <span>${city}</span>
    </div>
  `
    )
    .join("");
  searchSuggestions.classList.remove("hidden");
}

function selectSuggestion(city) {
  searchInput.value = city;
  searchSuggestions.classList.add("hidden");
  loadWeatherData(city);
}

function addToSearchHistory(city) {
  searchHistory = searchHistory.filter((c) => c.toLowerCase() !== city.toLowerCase());
  searchHistory.unshift(city);
  searchHistory = searchHistory.slice(0, 10);
  localStorage.setItem("weatherSearchHistory", JSON.stringify(searchHistory));
}

function removeFromHistory(city) {
  searchHistory = searchHistory.filter((c) => c !== city);
  localStorage.setItem("weatherSearchHistory", JSON.stringify(searchHistory));
  showSearchHistory();
}

function clearSearchHistory() {
  searchHistory = [];
  localStorage.setItem("weatherSearchHistory", JSON.stringify(searchHistory));
  searchSuggestions.classList.add("hidden");
}

function renderSearchHistory() {
  // Just initialize, don't show until focused
}

// ==================== GEOLOCATION ====================
async function handleGeolocation() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }

  showLoading();
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const data = await WeatherAPI.fetchAllWeatherDataByCoords(latitude, longitude);
        currentWeatherData = data;
        const cityName = `${data.current.name}, ${data.current.sys.country}`;
        addToSearchHistory(cityName);
        searchInput.value = cityName;
        renderDashboard(data);
        hideLoading();
        hideError();
      } catch (error) {
        hideLoading();
        showError(error.message);
      }
    },
    (error) => {
      hideLoading();
      const geoErrors = {
        1: "Location access denied. Please allow location access and try again.",
        2: "Unable to determine your location. Please try searching by city name.",
        3: "Location request timed out. Please try again.",
      };
      showError(geoErrors[error.code] || "Unable to get your location.");
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// ==================== UNIT TOGGLE ====================
function handleUnitToggle() {
  currentUnit = currentUnit === "metric" ? "imperial" : "metric";
  unitToggle.textContent = currentUnit === "metric" ? "°C" : "°F";
  if (currentWeatherData) {
    renderDashboard(currentWeatherData);
  }
}

function convertTemp(tempCelsius) {
  if (currentUnit === "imperial") {
    return Math.round((tempCelsius * 9) / 5 + 32);
  }
  return Math.round(tempCelsius);
}

function tempUnit() {
  return currentUnit === "metric" ? "°C" : "°F";
}

function convertSpeed(speedMs) {
  if (currentUnit === "imperial") {
    return (speedMs * 2.237).toFixed(1); // m/s to mph
  }
  return (speedMs * 3.6).toFixed(1); // m/s to km/h
}

function speedUnit() {
  return currentUnit === "metric" ? "km/h" : "mph";
}

// ==================== LOAD DATA ====================
async function loadWeatherData(city) {
  showLoading();
  hideError();

  try {
    const data = await WeatherAPI.fetchAllWeatherData(city);
    currentWeatherData = data;
    const cityName = `${data.current.name}, ${data.current.sys.country}`;
    addToSearchHistory(cityName);
    searchInput.value = cityName;
    renderDashboard(data);
  } catch (error) {
    console.error("[App] Error loading weather data:", error);
    showError(error.message || "Failed to load weather data. Please try again.");
  } finally {
    hideLoading();
  }
}

// ==================== ERROR HANDLING UI ====================
function showError(message) {
  errorMessage.textContent = message;
  errorContainer.classList.remove("hidden");
  errorContainer.classList.add("animate-shake");
  setTimeout(() => errorContainer.classList.remove("animate-shake"), 500);
}

function hideError() {
  errorContainer.classList.add("hidden");
}

// ==================== LOADING UI ====================
function showLoading() {
  loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  loadingOverlay.classList.add("hidden");
}

// ==================== WEATHER ICON MAPPING ====================
function getWeatherIcon(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

function getWeatherBackground(weatherMain) {
  const backgrounds = {
    Clear: "from-yellow-400 to-orange-500",
    Clouds: "from-gray-400 to-gray-600",
    Rain: "from-blue-400 to-blue-700",
    Drizzle: "from-blue-300 to-blue-500",
    Thunderstorm: "from-gray-700 to-gray-900",
    Snow: "from-blue-100 to-blue-300",
    Mist: "from-gray-300 to-gray-500",
    Haze: "from-yellow-200 to-gray-400",
    Fog: "from-gray-300 to-gray-500",
    Dust: "from-yellow-600 to-yellow-800",
    Smoke: "from-gray-500 to-gray-700",
    Tornado: "from-gray-800 to-red-900",
  };
  return backgrounds[weatherMain] || "from-blue-400 to-blue-600";
}

function getWeatherEmoji(weatherMain) {
  const emojis = {
    Clear: "☀️",
    Clouds: "☁️",
    Rain: "🌧️",
    Drizzle: "🌦️",
    Thunderstorm: "⛈️",
    Snow: "❄️",
    Mist: "🌫️",
    Haze: "🌫️",
    Fog: "🌫️",
  };
  return emojis[weatherMain] || "🌤️";
}

// ==================== AIR QUALITY ====================
function getAQILabel(aqi) {
  const labels = {
    1: { text: "Good", color: "#4ade80", bg: "rgba(74, 222, 128, 0.15)" },
    2: { text: "Fair", color: "#facc15", bg: "rgba(250, 204, 21, 0.15)" },
    3: { text: "Moderate", color: "#fb923c", bg: "rgba(251, 146, 60, 0.15)" },
    4: { text: "Poor", color: "#f87171", bg: "rgba(248, 113, 113, 0.15)" },
    5: { text: "Very Poor", color: "#dc2626", bg: "rgba(220, 38, 38, 0.15)" },
  };
  return labels[aqi] || labels[1];
}

// ==================== WIND DIRECTION ====================
function getWindDirection(deg) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

// ==================== RENDER DASHBOARD ====================
function renderDashboard(data) {
  const { current, forecast, airQuality } = data;

  welcomeScreen.classList.add("hidden");
  dashboardContent.classList.remove("hidden");

  renderCurrentWeather(current, airQuality);
  renderMetricsCards(current);
  renderHourlyForecast(forecast);
  renderDailyForecast(forecast);
  renderDetailsGrid(current, airQuality);

  // Animate cards
  animateCards();
}

function animateCards() {
  const cards = document.querySelectorAll(".weather-card");
  cards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "all 0.5s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 80);
  });
}

// ==================== RENDER CURRENT WEATHER ====================
function renderCurrentWeather(current, airQuality) {
  const container = document.getElementById("current-weather");
  const weatherMain = current.weather[0].main;
  const bgGradient = getWeatherBackground(weatherMain);
  const sunrise = new Date(current.sys.sunrise * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const sunset = new Date(current.sys.sunset * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const aqiInfo = airQuality ? getAQILabel(airQuality.list[0].main.aqi) : null;

  container.innerHTML = `
    <div class="current-weather-card weather-card bg-gradient-to-br ${bgGradient}">
      <div class="current-weather-top">
        <div class="current-location">
          <h2><i class="fas fa-map-marker-alt"></i> ${current.name}, ${current.sys.country}</h2>
          <p class="weather-description">${current.weather[0].description}</p>
          <p class="current-date-time" id="current-date">${new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
        </div>
        <div class="current-temp-display">
          <img src="${getWeatherIcon(current.weather[0].icon)}" alt="${current.weather[0].description}" class="current-weather-icon" />
          <div class="temp-value">
            <span class="temp-number">${convertTemp(current.main.temp)}</span>
            <span class="temp-unit">${tempUnit()}</span>
          </div>
        </div>
      </div>
      <div class="current-weather-bottom">
        <div class="current-detail">
          <i class="fas fa-temperature-low"></i>
          <span>Feels Like</span>
          <strong>${convertTemp(current.main.feels_like)}${tempUnit()}</strong>
        </div>
        <div class="current-detail">
          <i class="fas fa-arrow-up"></i>
          <span>High</span>
          <strong>${convertTemp(current.main.temp_max)}${tempUnit()}</strong>
        </div>
        <div class="current-detail">
          <i class="fas fa-arrow-down"></i>
          <span>Low</span>
          <strong>${convertTemp(current.main.temp_min)}${tempUnit()}</strong>
        </div>
        <div class="current-detail">
          <i class="fas fa-sun" style="color: #fbbf24"></i>
          <span>Sunrise</span>
          <strong>${sunrise}</strong>
        </div>
        <div class="current-detail">
          <i class="fas fa-moon" style="color: #f59e0b"></i>
          <span>Sunset</span>
          <strong>${sunset}</strong>
        </div>
        ${aqiInfo ? `
        <div class="current-detail">
          <i class="fas fa-wind" style="color: ${aqiInfo.color}"></i>
          <span>Air Quality</span>
          <strong style="color: ${aqiInfo.color}">${aqiInfo.text}</strong>
        </div>
        ` : ""}
      </div>
    </div>
  `;
}

// ==================== RENDER METRIC CARDS ====================
function renderMetricsCards(current) {
  const container = document.getElementById("metrics-cards");

  const metrics = [
    {
      icon: "fas fa-tint",
      label: "Humidity",
      value: `${current.main.humidity}%`,
      color: "#3b82f6",
      desc: current.main.humidity > 70 ? "High" : current.main.humidity > 40 ? "Normal" : "Low",
      progress: current.main.humidity,
    },
    {
      icon: "fas fa-wind",
      label: "Wind Speed",
      value: `${convertSpeed(current.wind.speed)} ${speedUnit()}`,
      color: "#10b981",
      desc: getWindDirection(current.wind.deg || 0),
      progress: Math.min((current.wind.speed / 20) * 100, 100),
    },
    {
      icon: "fas fa-compress-arrows-alt",
      label: "Pressure",
      value: `${current.main.pressure} hPa`,
      color: "#8b5cf6",
      desc: current.main.pressure > 1013 ? "High" : "Low",
      progress: ((current.main.pressure - 950) / (1050 - 950)) * 100,
    },
    {
      icon: "fas fa-eye",
      label: "Visibility",
      value: `${(current.visibility / 1000).toFixed(1)} km`,
      color: "#f59e0b",
      desc: current.visibility >= 10000 ? "Clear" : current.visibility >= 5000 ? "Moderate" : "Poor",
      progress: Math.min((current.visibility / 10000) * 100, 100),
    },
    {
      icon: "fas fa-cloud",
      label: "Cloudiness",
      value: `${current.clouds.all}%`,
      color: "#6b7280",
      desc: current.clouds.all > 75 ? "Overcast" : current.clouds.all > 25 ? "Partly Cloudy" : "Clear",
      progress: current.clouds.all,
    },
    {
      icon: "fas fa-thermometer-half",
      label: "Dew Point",
      value: `${convertTemp(current.main.temp - ((100 - current.main.humidity) / 5))}${tempUnit()}`,
      color: "#06b6d4",
      desc: "Estimated",
      progress: current.main.humidity,
    },
  ];

  container.innerHTML = metrics
    .map(
      (m) => `
    <div class="metric-card weather-card">
      <div class="metric-header">
        <div class="metric-icon" style="background: ${m.color}15; color: ${m.color}">
          <i class="${m.icon}"></i>
        </div>
        <span class="metric-label">${m.label}</span>
      </div>
      <div class="metric-value">${m.value}</div>
      <div class="metric-bar">
        <div class="metric-bar-fill" style="width: ${m.progress}%; background: ${m.color}"></div>
      </div>
      <div class="metric-desc">${m.desc}</div>
    </div>
  `
    )
    .join("");
}

// ==================== RENDER HOURLY FORECAST ====================
function renderHourlyForecast(forecast) {
  const container = document.getElementById("hourly-forecast");
  if (!forecast) {
    container.innerHTML = '<p class="no-data">Forecast data unavailable</p>';
    return;
  }

  // Take next 8 entries (24 hours in 3-hour steps)
  const hourlyData = forecast.list.slice(0, 8);

  container.innerHTML = `
    <div class="forecast-card weather-card">
      <h3 class="section-title"><i class="fas fa-clock"></i> Hourly Forecast</h3>
      <div class="hourly-scroll">
        ${hourlyData
          .map((item) => {
            const time = new Date(item.dt * 1000);
            const hour = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            return `
            <div class="hourly-item">
              <span class="hourly-time">${hour}</span>
              <img src="${getWeatherIcon(item.weather[0].icon)}" alt="${item.weather[0].description}" class="hourly-icon" />
              <span class="hourly-temp">${convertTemp(item.main.temp)}${tempUnit()}</span>
              <span class="hourly-rain"><i class="fas fa-tint"></i> ${Math.round((item.pop || 0) * 100)}%</span>
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;
}

// ==================== RENDER DAILY FORECAST ====================
function renderDailyForecast(forecast) {
  const container = document.getElementById("daily-forecast");
  if (!forecast) {
    container.innerHTML = '<p class="no-data">Forecast data unavailable</p>';
    return;
  }

  // Group forecast data by day
  const dailyMap = {};
  forecast.list.forEach((item) => {
    const date = new Date(item.dt * 1000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!dailyMap[date]) {
      dailyMap[date] = {
        temps: [],
        icons: [],
        descriptions: [],
        humidity: [],
        pop: [],
        weather: [],
      };
    }
    dailyMap[date].temps.push(item.main.temp);
    dailyMap[date].icons.push(item.weather[0].icon);
    dailyMap[date].descriptions.push(item.weather[0].description);
    dailyMap[date].humidity.push(item.main.humidity);
    dailyMap[date].pop.push(item.pop || 0);
    dailyMap[date].weather.push(item.weather[0].main);
  });

  const days = Object.entries(dailyMap).slice(0, 5);

  container.innerHTML = `
    <div class="forecast-card weather-card">
      <h3 class="section-title"><i class="fas fa-calendar-alt"></i> 5-Day Forecast</h3>
      <div class="daily-list">
        ${days
          .map(([date, data], index) => {
            const maxTemp = Math.max(...data.temps);
            const minTemp = Math.min(...data.temps);
            // Use the midday icon (index 4 = ~12:00 or the middle entry)
            const midIcon = data.icons[Math.floor(data.icons.length / 2)];
            const avgHumidity = Math.round(data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length);
            const maxPop = Math.round(Math.max(...data.pop) * 100);
            const dayLabel = index === 0 ? "Today" : date.split(",")[0];

            return `
            <div class="daily-item">
              <span class="daily-day">${dayLabel}</span>
              <span class="daily-date">${date}</span>
              <img src="${getWeatherIcon(midIcon)}" alt="weather" class="daily-icon" />
              <div class="daily-temp-range">
                <span class="daily-high">${convertTemp(maxTemp)}°</span>
                <div class="temp-range-bar">
                  <div class="temp-range-fill"></div>
                </div>
                <span class="daily-low">${convertTemp(minTemp)}°</span>
              </div>
              <span class="daily-rain"><i class="fas fa-tint"></i> ${maxPop}%</span>
              <span class="daily-humidity">${avgHumidity}%</span>
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;
}

// ==================== RENDER DETAILS GRID ====================
function renderDetailsGrid(current, airQuality) {
  const container = document.getElementById("details-grid");

  let aqiHTML = "";
  if (airQuality && airQuality.list && airQuality.list[0]) {
    const aqi = airQuality.list[0].main.aqi;
    const components = airQuality.list[0].components;
    const aqiInfo = getAQILabel(aqi);

    aqiHTML = `
      <div class="detail-card weather-card">
        <h3 class="section-title"><i class="fas fa-lungs"></i> Air Quality Details</h3>
        <div class="aqi-badge" style="background: ${aqiInfo.bg}; color: ${aqiInfo.color}">
          AQI: ${aqi} — ${aqiInfo.text}
        </div>
        <div class="aqi-components">
          <div class="aqi-item">
            <span>PM2.5</span>
            <strong>${components.pm2_5.toFixed(1)} μg/m³</strong>
          </div>
          <div class="aqi-item">
            <span>PM10</span>
            <strong>${components.pm10.toFixed(1)} μg/m³</strong>
          </div>
          <div class="aqi-item">
            <span>O₃</span>
            <strong>${components.o3.toFixed(1)} μg/m³</strong>
          </div>
          <div class="aqi-item">
            <span>NO₂</span>
            <strong>${components.no2.toFixed(1)} μg/m³</strong>
          </div>
          <div class="aqi-item">
            <span>SO₂</span>
            <strong>${components.so2.toFixed(1)} μg/m³</strong>
          </div>
          <div class="aqi-item">
            <span>CO</span>
            <strong>${components.co.toFixed(1)} μg/m³</strong>
          </div>
        </div>
      </div>
    `;
  }

  const windDeg = current.wind.deg || 0;

  container.innerHTML = `
    <div class="detail-card weather-card">
      <h3 class="section-title"><i class="fas fa-wind"></i> Wind Details</h3>
      <div class="wind-compass">
        <div class="compass">
          <div class="compass-arrow" style="transform: rotate(${windDeg}deg)">
            <i class="fas fa-location-arrow"></i>
          </div>
          <span class="compass-n">N</span>
          <span class="compass-e">E</span>
          <span class="compass-s">S</span>
          <span class="compass-w">W</span>
        </div>
        <div class="wind-info">
          <div class="wind-detail">
            <span>Speed</span>
            <strong>${convertSpeed(current.wind.speed)} ${speedUnit()}</strong>
          </div>
          <div class="wind-detail">
            <span>Direction</span>
            <strong>${getWindDirection(windDeg)} (${windDeg}°)</strong>
          </div>
          ${current.wind.gust ? `
          <div class="wind-detail">
            <span>Gust</span>
            <strong>${convertSpeed(current.wind.gust)} ${speedUnit()}</strong>
          </div>
          ` : ""}
        </div>
      </div>
    </div>
    ${aqiHTML}
    <div class="detail-card weather-card">
      <h3 class="section-title"><i class="fas fa-info-circle"></i> Additional Info</h3>
      <div class="info-grid">
        <div class="info-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>Coordinates</span>
          <strong>${current.coord.lat.toFixed(2)}°, ${current.coord.lon.toFixed(2)}°</strong>
        </div>
        <div class="info-item">
          <i class="fas fa-globe"></i>
          <span>Timezone</span>
          <strong>UTC${current.timezone >= 0 ? "+" : ""}${current.timezone / 3600}h</strong>
        </div>
        <div class="info-item">
          <i class="fas fa-tint"></i>
          <span>Humidity</span>
          <strong>${current.main.humidity}%</strong>
        </div>
        <div class="info-item">
          <i class="fas fa-compress-arrows-alt"></i>
          <span>Sea Level</span>
          <strong>${current.main.sea_level || current.main.pressure} hPa</strong>
        </div>
        <div class="info-item">
          <i class="fas fa-mountain"></i>
          <span>Ground Level</span>
          <strong>${current.main.grnd_level || "N/A"} ${current.main.grnd_level ? "hPa" : ""}</strong>
        </div>
        <div class="info-item">
          <i class="fas fa-database"></i>
          <span>Data Source</span>
          <strong>OpenWeatherMap</strong>
        </div>
      </div>
    </div>
  `;
}

// Make functions globally accessible for inline event handlers
window.selectSuggestion = selectSuggestion;
window.clearSearchHistory = clearSearchHistory;
window.removeFromHistory = removeFromHistory;
