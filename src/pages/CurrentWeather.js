import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart
} from "recharts";
import { fetchCurrentWeather, getAQILabel, celsiusToFahrenheit } from "../api";
const ACCENT = "#00e5ff";
const ACCENT2 = "#ff6b35";
const ACCENT3 = "#b388ff";
const GOOD = "#4ade80";

function StatCard({ icon, label, value, unit, color }) {
  return (
    <div className="stat-card">
      <span className="icon">{icon}</span>
      <div className="label">{label}</div>
      <div className="value" style={color ? { color } : {}}>
        {value ?? "—"}
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  );
}

function ChartWrap({ title, children }) {
  return (
    <div className="chart-wrap">
      <div className="chart-title">{title}</div>
      <div className="chart-inner">{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#111118", border: "1px solid #2a2a3a",
        borderRadius: 8, padding: "10px 14px",
        fontFamily: "Space Mono, monospace", fontSize: "0.72rem",
        color: "#e8e8f0"
      }}>
        <div style={{ color: "#8888aa", marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.name}: {p.value} {unit || p.unit || ""}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function CurrentWeather({ location }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tempUnit, setTempUnit] = useState("C");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCurrentWeather(location.lat, location.lon, selectedDate);
      setData(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [location, selectedDate]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-ring" />
        <p>Fetching weather data...</p>
      </div>
    );
  }

  if (!data) return <div style={{ color: "#f87171", fontFamily: "Space Mono" }}>Failed to load data.</div>;

  const { weatherData, airData } = data;
  const daily = weatherData.daily;
  const current = weatherData.current;
  const hourly = weatherData.hourly;
  const airHourly = airData.hourly;

  // Build hourly chart data
  const hours = hourly.time || [];
  const hourlyChart = hours.map((t, i) => {
    const label = format(new Date(t), "HH:mm");
    const tempC = hourly.temperature_2m?.[i];
    const tempVal = tempUnit === "C" ? tempC : parseFloat(celsiusToFahrenheit(tempC));
    return {
      time: label,
      temp: tempVal,
      humidity: hourly.relative_humidity_2m?.[i],
      precip: hourly.precipitation?.[i],
      visibility: hourly.visibility?.[i] != null ? (hourly.visibility[i] / 1000).toFixed(2) : null,
      wind: hourly.wind_speed_10m?.[i],
      pm10: airHourly?.pm10?.[i],
      pm25: airHourly?.pm2_5?.[i],
    };
  });

  // Current values
  const currentTemp = current?.temperature_2m;
  const maxTemp = daily?.temperature_2m_max?.[0];
  const minTemp = daily?.temperature_2m_min?.[0];
  const precip = daily?.precipitation_sum?.[0];
  const humidity = current?.relative_humidity_2m;
  const uvIndex = daily?.uv_index_max?.[0];
  const sunrise = daily?.sunrise?.[0];
  const sunset = daily?.sunset?.[0];
  const windMax = daily?.wind_speed_10m_max?.[0];
  const precipProbMax = daily?.precipitation_probability_max?.[0];

  // Air quality (use midday index ~12)
  const aqiArr = airHourly?.european_aqi || [];
  const noonAQI = aqiArr[12] ?? aqiArr.find(v => v != null);
  const pm10Val = airHourly?.pm10?.[12];
  const pm25Val = airHourly?.pm2_5?.[12];
  const coVal = airHourly?.carbon_monoxide?.[12];
  const no2Val = airHourly?.nitrogen_dioxide?.[12];
  const so2Val = airHourly?.sulphur_dioxide?.[12];

  const aqiInfo = getAQILabel(noonAQI ?? 0);

  const displayTemp = (c) =>
    c == null ? "—" : tempUnit === "C" ? `${c}` : `${celsiusToFahrenheit(c)}`;

  const formatTime = (isoStr) => {
    if (!isoStr) return "—";
    try { return format(new Date(isoStr), "HH:mm"); } catch { return "—"; }
  };

  return (
    <div>
      {/* Date selector */}
      <div className="date-row">
        <span className="date-label">Date</span>
        <input
          type="date"
          className="date-input"
          value={selectedDate}
          max={format(new Date(), "yyyy-MM-dd")}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <div className="toggle-row">
          <span className="toggle-label">°C / °F</span>
          <button
            className={`toggle-btn ${tempUnit === "F" ? "on" : ""}`}
            onClick={() => setTempUnit(tempUnit === "C" ? "F" : "C")}
          >
            °{tempUnit === "C" ? "F" : "C"}
          </button>
        </div>
      </div>

      {/* Temp Hero */}
      <div className="temp-hero">
        <div>
          <div className="temp-current">
            {displayTemp(currentTemp)}°{tempUnit}
          </div>
          <div className="temp-range">
            ↓ {displayTemp(minTemp)}° &nbsp; ↑ {displayTemp(maxTemp)}°{tempUnit}
          </div>
        </div>
        <div className="temp-meta">
          <div className="temp-date">{format(new Date(selectedDate), "EEEE, MMM d yyyy")}</div>
          <div className="temp-loc">
            {location.lat.toFixed(3)}°, {location.lon.toFixed(3)}°
          </div>
          <div style={{ marginTop: 12 }}>
            <span className="aqi-badge" style={{ background: aqiInfo.color + "22", color: aqiInfo.color, border: `1px solid ${aqiInfo.color}40` }}>
              AQI {noonAQI ?? "—"} · {aqiInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid — Weather */}
      <div className="section-title">Atmospheric Conditions</div>
      <div className="stat-grid">
        <StatCard icon="🌧" label="Precipitation" value={precip} unit="mm" />
        <StatCard icon="💧" label="Humidity" value={humidity} unit="%" />
        <StatCard icon="☀️" label="UV Index" value={uvIndex} />
        <StatCard icon="🌅" label="Sunrise" value={formatTime(sunrise)} />
        <StatCard icon="🌇" label="Sunset" value={formatTime(sunset)} />
        <StatCard icon="💨" label="Max Wind" value={windMax} unit="km/h" />
        <StatCard icon="🌂" label="Precip Prob" value={precipProbMax} unit="%" />
      </div>

      {/* Stats Grid — Air Quality */}
      <div className="section-title">Air Quality</div>
      <div className="stat-grid">
        <StatCard icon="🌫" label="AQI (EU)" value={noonAQI} color={aqiInfo.color} />
        <StatCard icon="🔵" label="PM10" value={pm10Val?.toFixed(1)} unit="µg/m³" />
        <StatCard icon="🟣" label="PM2.5" value={pm25Val?.toFixed(1)} unit="µg/m³" />
        <StatCard icon="🟠" label="CO" value={coVal?.toFixed(1)} unit="µg/m³" />
        <StatCard icon="🟤" label="NO₂" value={no2Val?.toFixed(1)} unit="µg/m³" />
        <StatCard icon="🟡" label="SO₂" value={so2Val?.toFixed(1)} unit="µg/m³" />
        <StatCard icon="🌿" label="CO₂" value="~415" unit="ppm" />
      </div>

      {/* Hourly Charts */}
      <div className="section-title">Hourly Forecast</div>

      <ChartWrap title={`Temperature (°${tempUnit})`}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={hourlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
            <Tooltip content={<CustomTooltip unit={`°${tempUnit}`} />} />
            <Line type="monotone" dataKey="temp" stroke={ACCENT} strokeWidth={2} dot={false} name="Temperature" />
          </LineChart>
        </ResponsiveContainer>
      </ChartWrap>

      <ChartWrap title="Relative Humidity (%)">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={hourlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} interval={3} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
            <Tooltip content={<CustomTooltip unit="%" />} />
            <Area type="monotone" dataKey="humidity" stroke={ACCENT3} fill={ACCENT3 + "22"} strokeWidth={2} dot={false} name="Humidity" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrap>

      <ChartWrap title="Precipitation (mm)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
            <Tooltip content={<CustomTooltip unit="mm" />} />
            <Bar dataKey="precip" fill="#3b82f6" name="Precipitation" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrap>

      <ChartWrap title="Visibility (km)">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={hourlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
            <Tooltip content={<CustomTooltip unit="km" />} />
            <Line type="monotone" dataKey="visibility" stroke={GOOD} strokeWidth={2} dot={false} name="Visibility" />
          </LineChart>
        </ResponsiveContainer>
      </ChartWrap>

      <ChartWrap title="Wind Speed at 10m (km/h)">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={hourlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
            <Tooltip content={<CustomTooltip unit="km/h" />} />
            <Area type="monotone" dataKey="wind" stroke={ACCENT2} fill={ACCENT2 + "22"} strokeWidth={2} dot={false} name="Wind Speed" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrap>

      <ChartWrap title="PM10 & PM2.5 (µg/m³)">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={hourlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
            <Tooltip content={<CustomTooltip unit="µg/m³" />} />
            <Legend wrapperStyle={{ fontSize: "0.7rem", fontFamily: "Space Mono" }} />
            <Line type="monotone" dataKey="pm10" stroke="#fb923c" strokeWidth={2} dot={false} name="PM10" />
            <Line type="monotone" dataKey="pm25" stroke={ACCENT3} strokeWidth={2} dot={false} name="PM2.5" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartWrap>
    </div>
  );
}
