/**
 * api.js — Weather API Module
 * Handles all asynchronous network requests to the OpenWeatherMap REST API.
 * Uses the modern Fetch API with async/await syntax.
 * Implements comprehensive error handling for failed network requests.
 */

const API_KEY = "7ae651c9a32f265612d227a6fd2ded31"; // OpenWeatherMap free tier API key
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_URL = "https://api.openweathermap.org/geo/1.0";

/**
 * Custom error class for API-related errors
 */
class WeatherAPIError extends Error {
  constructor(message, statusCode = null, type = "UNKNOWN") {
    super(message);
    this.name = "WeatherAPIError";
    this.statusCode = statusCode;
    this.type = type;
  }
}

/**
 * Maps HTTP status codes to user-friendly error messages
 * @param {number} status - HTTP status code
 * @returns {string} Human-readable error message
 */
function getErrorMessage(status) {
  const errorMessages = {
    400: "Bad request. Please check the city name and try again.",
    401: "API key is invalid or not yet activated. Please check your API key.",
    404: "City not found. Please verify the city name and try again.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "Weather server error. Please try again later.",
    502: "Weather service is temporarily unavailable.",
    503: "Weather service is undergoing maintenance. Please try later.",
  };
  return errorMessages[status] || `Unexpected error occurred (Status: ${status}).`;
}

/**
 * Generic fetch wrapper with timeout, retries and error handling
 * @param {string} url - The endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed JSON response
 */
async function fetchWithErrorHandling(url, options = {}) {
  const { timeout = 10000, retries = 2 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMsg = getErrorMessage(response.status);
        throw new WeatherAPIError(errorMsg, response.status, "HTTP_ERROR");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Don't retry on client errors (4xx)
      if (error instanceof WeatherAPIError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // If it's an abort error (timeout)
      if (error.name === "AbortError") {
        if (attempt === retries) {
          throw new WeatherAPIError(
            "Request timed out. Please check your connection and try again.",
            null,
            "TIMEOUT"
          );
        }
        continue; // Retry
      }

      // Network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new WeatherAPIError(
          "Network error. Please check your internet connection.",
          null,
          "NETWORK_ERROR"
        );
      }

      // If it's already our custom error, rethrow on last attempt
      if (error instanceof WeatherAPIError) {
        if (attempt === retries) throw error;
        continue;
      }

      // Unknown errors
      if (attempt === retries) {
        throw new WeatherAPIError(
          "An unexpected error occurred. Please try again.",
          null,
          "UNKNOWN"
        );
      }
    }

    // Wait before retrying (exponential backoff)
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
}

/**
 * Validates that the API key is configured
 */
function validateAPIKey() {
  if (!API_KEY || API_KEY === "") {
    throw new WeatherAPIError(
      "API key is not configured. Please add your OpenWeatherMap API key in js/api.js",
      null,
      "CONFIG_ERROR"
    );
  }
}

/**
 * Fetch current weather data for a given city
 * @param {string} city - City name (e.g., "London", "New York, US")
 * @returns {Promise<object>} Parsed current weather JSON data
 */
async function fetchCurrentWeather(city) {
  validateAPIKey();
  const encodedCity = encodeURIComponent(city.trim());
  const url = `${BASE_URL}/weather?q=${encodedCity}&appid=${API_KEY}&units=metric`;
  console.log(`[API] Fetching current weather for: ${city}`);
  const data = await fetchWithErrorHandling(url);
  console.log("[API] Current weather data received:", data);
  return data;
}

/**
 * Fetch 5-day / 3-hour forecast data for a given city
 * @param {string} city - City name
 * @returns {Promise<object>} Parsed forecast JSON data
 */
async function fetchForecast(city) {
  validateAPIKey();
  const encodedCity = encodeURIComponent(city.trim());
  const url = `${BASE_URL}/forecast?q=${encodedCity}&appid=${API_KEY}&units=metric`;
  console.log(`[API] Fetching forecast for: ${city}`);
  const data = await fetchWithErrorHandling(url);
  console.log("[API] Forecast data received:", data);
  return data;
}

/**
 * Fetch current weather by geographic coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<object>} Parsed current weather JSON data
 */
async function fetchWeatherByCoords(lat, lon) {
  validateAPIKey();
  const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  console.log(`[API] Fetching weather for coords: ${lat}, ${lon}`);
  const data = await fetchWithErrorHandling(url);
  return data;
}

/**
 * Fetch forecast by geographic coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<object>} Parsed forecast JSON data
 */
async function fetchForecastByCoords(lat, lon) {
  validateAPIKey();
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const data = await fetchWithErrorHandling(url);
  return data;
}

/**
 * Fetch air quality data by coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<object>} Air pollution data
 */
async function fetchAirQuality(lat, lon) {
  validateAPIKey();
  const url = `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
  const data = await fetchWithErrorHandling(url);
  return data;
}

/**
 * Geocode a city name to get coordinates
 * @param {string} city - City name
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Array of matching locations
 */
async function geocodeCity(city, limit = 5) {
  validateAPIKey();
  const encodedCity = encodeURIComponent(city.trim());
  const url = `${GEO_URL}/direct?q=${encodedCity}&limit=${limit}&appid=${API_KEY}`;
  const data = await fetchWithErrorHandling(url);
  return data;
}

/**
 * Fetch all weather data concurrently (current + forecast + air quality)
 * Uses Promise.allSettled for resilient parallel fetching
 * @param {string} city - City name
 * @returns {Promise<object>} Combined weather data object
 */
async function fetchAllWeatherData(city) {
  // First get current weather to obtain coordinates
  const currentWeather = await fetchCurrentWeather(city);
  const { lat, lon } = currentWeather.coord;

  // Fetch forecast and air quality in parallel
  const [forecastResult, airQualityResult] = await Promise.allSettled([
    fetchForecast(city),
    fetchAirQuality(lat, lon),
  ]);

  return {
    current: currentWeather,
    forecast: forecastResult.status === "fulfilled" ? forecastResult.value : null,
    airQuality: airQualityResult.status === "fulfilled" ? airQualityResult.value : null,
  };
}

/**
 * Fetch all weather data by coordinates
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object>} Combined weather data object
 */
async function fetchAllWeatherDataByCoords(lat, lon) {
  const [currentResult, forecastResult, airQualityResult] = await Promise.allSettled([
    fetchWeatherByCoords(lat, lon),
    fetchForecastByCoords(lat, lon),
    fetchAirQuality(lat, lon),
  ]);

  if (currentResult.status === "rejected") {
    throw currentResult.reason;
  }

  return {
    current: currentResult.value,
    forecast: forecastResult.status === "fulfilled" ? forecastResult.value : null,
    airQuality: airQualityResult.status === "fulfilled" ? airQualityResult.value : null,
  };
}

// Export functions for use in script.js
window.WeatherAPI = {
  fetchCurrentWeather,
  fetchForecast,
  fetchWeatherByCoords,
  fetchForecastByCoords,
  fetchAirQuality,
  geocodeCity,
  fetchAllWeatherData,
  fetchAllWeatherDataByCoords,
  WeatherAPIError,
};
