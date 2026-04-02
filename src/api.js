import { format, subDays } from "date-fns";

const WEATHER_BASE = "https://api.open-meteo.com/v1";
const AIR_BASE = "https://air-quality-api.open-meteo.com/v1";

export async function fetchCurrentWeather(lat, lon, date) {
  const dateStr = date || format(new Date(), "yyyy-MM-dd");

  const weatherUrl = new URL(`${WEATHER_BASE}/forecast`);
  weatherUrl.searchParams.set("latitude", lat);
  weatherUrl.searchParams.set("longitude", lon);
  weatherUrl.searchParams.set("start_date", dateStr);
  weatherUrl.searchParams.set("end_date", dateStr);
  weatherUrl.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,precipitation,visibility,wind_speed_10m,uv_index"
  );
  weatherUrl.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max,precipitation_probability_max,wind_direction_10m_dominant"
  );
  weatherUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index");
  weatherUrl.searchParams.set("timezone", "auto");

  const airUrl = new URL(`${AIR_BASE}/air-quality`);
  airUrl.searchParams.set("latitude", lat);
  airUrl.searchParams.set("longitude", lon);
  airUrl.searchParams.set("start_date", dateStr);
  airUrl.searchParams.set("end_date", dateStr);
  airUrl.searchParams.set("hourly", "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,european_aqi");
  airUrl.searchParams.set("timezone", "auto");

  const [weatherRes, airRes] = await Promise.all([
    fetch(weatherUrl.toString()),
    fetch(airUrl.toString()),
  ]);

  const [weatherData, airData] = await Promise.all([
    weatherRes.json(),
    airRes.json(),
  ]);

  return { weatherData, airData };
}

export async function fetchHistoricalWeather(lat, lon, startDate, endDate) {
  const weatherUrl = new URL(`${WEATHER_BASE}/forecast`);
  weatherUrl.searchParams.set("latitude", lat);
  weatherUrl.searchParams.set("longitude", lon);
  weatherUrl.searchParams.set("start_date", startDate);
  weatherUrl.searchParams.set("end_date", endDate);
  weatherUrl.searchParams.set(
    "daily",
    "temperature_2m_mean,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant"
  );
  weatherUrl.searchParams.set("timezone", "auto");

  const airUrl = new URL(`${AIR_BASE}/air-quality`);
  airUrl.searchParams.set("latitude", lat);
  airUrl.searchParams.set("longitude", lon);
  airUrl.searchParams.set("start_date", startDate);
  airUrl.searchParams.set("end_date", endDate);
  airUrl.searchParams.set("hourly", "pm10,pm2_5");
  airUrl.searchParams.set("timezone", "auto");

  const [weatherRes, airRes] = await Promise.all([
    fetch(weatherUrl.toString()),
    fetch(airUrl.toString()),
  ]);

  const [weatherData, airData] = await Promise.all([
    weatherRes.json(),
    airRes.json(),
  ]);

  return { weatherData, airData };
}

export function getHourIndex(hours, targetHour) {
  return hours.findIndex((h) => {
    const d = new Date(h);
    return d.getHours() === targetHour;
  });
}

export function celsiusToFahrenheit(c) {
  return ((c * 9) / 5 + 32).toFixed(1);
}

export function getWindDirection(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function getAQILabel(aqi) {
  if (aqi <= 20) return { label: "Good", color: "#4ade80" };
  if (aqi <= 40) return { label: "Fair", color: "#a3e635" };
  if (aqi <= 60) return { label: "Moderate", color: "#facc15" };
  if (aqi <= 80) return { label: "Poor", color: "#fb923c" };
  if (aqi <= 100) return { label: "Very Poor", color: "#f87171" };
  return { label: "Hazardous", color: "#c026d3" };
}
