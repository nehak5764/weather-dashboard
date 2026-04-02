# WeatherScope — React Weather Dashboard

A responsive weather dashboard built with ReactJS and the Open-Meteo API. Automatically detects user location via GPS.

## Features

- **Page 1: Current Weather**
  - GPS-based location detection on load
  - Date picker to view any past/current date
  - All weather variables: temperature (min/max/current), precipitation, humidity, UV index, sunrise/sunset, wind speed, precip probability
  - Full air quality metrics: AQI, PM10, PM2.5, CO, NO₂, SO₂
  - Hourly charts: Temperature (°C/°F toggle), Humidity, Precipitation, Visibility, Wind Speed, PM10 & PM2.5 combined
  
- **Page 2: Historical Analysis**
  - Date range selector (up to 2 years)
  - Trend charts: Temperature mean/max/min, Sunrise & Sunset (IST), Precipitation totals, Wind speed & direction, PM10 & PM2.5

## Tech Stack

- ReactJS 18
- Recharts (charts)
- Open-Meteo API (weather + air quality)
- date-fns (date utilities)

## Setup

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

Allow location access when prompted for GPS-based weather data.

## Build for Production

```bash
npm run build
```

## APIs Used

- Weather: `https://api.open-meteo.com/v1/forecast`
- Air Quality: `https://air-quality-api.open-meteo.com/v1/air-quality`
- Reverse Geocoding: `https://nominatim.openstreetmap.org/reverse`

No API key required — all free.
