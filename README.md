# 🌤️ Weather Dashboard — Real-Time Weather Data

A dynamic, responsive weather dashboard that fetches and displays real-time weather data using the **OpenWeatherMap REST API** with **asynchronous JavaScript** (Fetch API + async/await).

---

## 📁 Project Structure

```
weather-dashboard/
│
├── index.html              # Main HTML file — entry point
│
├── css/
│   ├── style.css           # Core styles, theming, component styles
│   └── responsive.css      # Responsive breakpoints & mobile styles
│
├── js/
│   ├── api.js              # API module — async fetch, error handling, data fetching
│   └── script.js           # Main app logic — DOM manipulation, rendering, events
│
├── assets/
│   ├── images/             # Static image assets
│   └── icons/              # Custom icon assets
│
├── favicon.ico             # Browser tab icon
└── README.md               # Project documentation (this file)
```

---

## ✨ Key Features

### 1. **Asynchronous API Calls (Fetch API + async/await)**
- Modern `fetch()` API with `async/await` syntax for clean, readable asynchronous code
- `Promise.allSettled()` for concurrent API calls (current weather + forecast + air quality)
- Automatic request timeout with `AbortController` (10-second limit)
- Exponential backoff retry logic (up to 2 retries for server errors)

### 2. **Comprehensive Error Handling**
- Custom `WeatherAPIError` class with error types (`HTTP_ERROR`, `TIMEOUT`, `NETWORK_ERROR`, `CONFIG_ERROR`)
- HTTP status code mapping to user-friendly messages (401, 404, 429, 500, etc.)
- Network connectivity detection
- Graceful degradation — partial data still renders if one API call fails
- Visual error banner with dismiss functionality

### 3. **Complex Nested JSON Parsing**
- Parses deeply nested weather response objects (`data.main.temp`, `data.wind.speed`, `data.sys.sunrise`, etc.)
- Transforms 3-hourly forecast data into daily summaries with min/max aggregation
- Processes air quality component data (`pm2_5`, `pm10`, `o3`, `no2`, `so2`, `co`)
- Handles optional/missing JSON fields with fallback values

### 4. **City Search Functionality**
- Real-time search by city name with keyboard support (Enter key)
- Search history stored in `localStorage` with recent searches dropdown
- Filter suggestions as you type
- Geolocation support — detect user's current location
- Geocoding API integration for accurate city lookups

### 5. **Live Weather Metrics Displayed**
| Metric | Source |
|---|---|
| 🌡️ Temperature (current, feels like, high/low) | `main.temp`, `main.feels_like`, `main.temp_max/min` |
| 💧 Humidity | `main.humidity` |
| 💨 Wind Speed, Direction, Gusts | `wind.speed`, `wind.deg`, `wind.gust` |
| 🌫️ Visibility | `visibility` |
| 📊 Atmospheric Pressure | `main.pressure` |
| ☁️ Cloudiness | `clouds.all` |
| 🌅 Sunrise / Sunset | `sys.sunrise`, `sys.sunset` |
| 🫁 Air Quality Index (AQI) | Air Pollution API |
| 📅 5-Day Forecast | 5-day/3-hour Forecast API |
| ⏰ Hourly Forecast (24h) | 5-day/3-hour Forecast API |

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- An [OpenWeatherMap](https://openweathermap.org/) account (free tier)

### Setup

1. **Clone or download** this project

2. **Get your API key:**
   - Sign up at [https://openweathermap.org/](https://openweathermap.org/)
   - Go to [API Keys](https://home.openweathermap.org/api_keys)
   - Copy your API key (it may take 1-2 hours to activate after signup)

3. **Add your API key:**
   - Open `js/api.js`
   - Replace the empty string on line 8:
     ```javascript
     const API_KEY = "YOUR_API_KEY_HERE";
     ```

4. **Open the dashboard:**
   - Simply open `index.html` in your browser
   - Or use a local dev server:
     ```bash
     # Using Python
     python -m http.server 8000

     # Using Node.js (npx)
     npx serve .

     # Using VS Code
     # Install "Live Server" extension, right-click index.html → Open with Live Server
     ```

5. **Search for a city** and see real-time weather data!

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic structure with ARIA accessibility attributes |
| **CSS3** | Custom properties (variables), Grid, Flexbox, animations |
| **Vanilla JavaScript (ES6+)** | async/await, Fetch API, destructuring, template literals |
| **OpenWeatherMap API** | Current weather, 5-day forecast, air quality, geocoding |
| **Font Awesome 6** | Weather and UI icons |
| **Google Fonts (Inter)** | Typography |
| **LocalStorage API** | Persistent search history and user preferences |
| **Geolocation API** | Browser-based location detection |

---

## 🎨 Features Overview

- **🌓 Dark / Light Mode** — Toggle with persistent preference
- **🌡️ Unit Toggle** — Switch between °C/km/h and °F/mph
- **📱 Fully Responsive** — Mobile-first design with breakpoints at 1024px, 768px, 480px, 360px
- **🔍 Search History** — Recent searches stored locally with quick re-search
- **📍 Geolocation** — One-click weather for current location
- **🎭 Dynamic Backgrounds** — Weather-condition-based gradient colors
- **🧭 Wind Compass** — Visual wind direction indicator
- **♿ Accessible** — ARIA labels, reduced-motion support, keyboard navigation
- **🖨️ Print Styles** — Clean printable layout

---

## 📡 API Endpoints Used

| Endpoint | URL | Purpose |
|---|---|---|
| Current Weather | `/data/2.5/weather` | Real-time weather conditions |
| 5-Day Forecast | `/data/2.5/forecast` | 3-hourly forecast for 5 days |
| Air Pollution | `/data/2.5/air_pollution` | Air quality index & pollutants |
| Geocoding | `/geo/1.0/direct` | City name to coordinates |

All endpoints use the **free tier** (60 calls/min, 1M calls/month, no credit card required).

---

## 📝 Error Handling Strategy

```
User Action → Input Validation → API Call → Network Check → HTTP Status Check → JSON Parse → Render
                    ↓                 ↓              ↓                ↓              ↓
              Show Error        Retry (2x)     Show Error       Show Error     Fallback UI
```

- **No API Key** → Config error message with setup instructions
- **Invalid City** → 404 error with friendly "city not found" message
- **Rate Limited** → 429 error with "please wait" message
- **Network Offline** → TypeError caught, offline message shown
- **Timeout** → AbortController cancels after 10s, retry with backoff
- **Partial Failure** → `Promise.allSettled()` renders available data

---

## 📄 License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).

---

## 🙏 Acknowledgments

- Weather data provided by [OpenWeatherMap](https://openweathermap.org/)
- Icons by [Font Awesome](https://fontawesome.com/)
- Font by [Google Fonts — Inter](https://fonts.google.com/specimen/Inter)
