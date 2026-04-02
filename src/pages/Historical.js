import React, { useState } from "react";
import { format, subDays, differenceInDays } from "date-fns";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart, Area
} from "recharts";
import { fetchHistoricalWeather, getWindDirection } from "../api";

const ACCENT = "#00e5ff";
const ACCENT2 = "#ff6b35";
const ACCENT3 = "#b388ff";
const GOOD = "#4ade80";

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
        fontFamily: "Space Mono, monospace", fontSize: "0.72rem", color: "#e8e8f0"
      }}>
        <div style={{ color: "#8888aa", marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.name}: {p.value != null ? Number(p.value).toFixed(1) : "—"} {unit || ""}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Convert UTC time string to IST display
function toIST(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    const ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    return format(ist, "HH:mm");
  } catch { return "—"; }
}

// Thin out data for large ranges to keep charts readable
function thinData(arr, maxPoints = 120) {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}

export default function Historical({ location }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 90), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFetch = async () => {
    const diff = differenceInDays(new Date(endDate), new Date(startDate));
    if (diff < 0) { setError("Start date must be before end date."); return; }
    if (diff > 730) { setError("Maximum date range is 2 years (730 days)."); return; }
    setError(null);
    setLoading(true);

    try {
      const { weatherData, airData } = await fetchHistoricalWeather(
        location.lat, location.lon, startDate, endDate
      );

      const daily = weatherData.daily;
      const dates = daily.time || [];

      // Build daily chart rows
      const rows = dates.map((d, i) => {
        // Average PM from hourly (24 values per day)
        const base = i * 24;
        const pm10Slice = airData.hourly?.pm10?.slice(base, base + 24) || [];
        const pm25Slice = airData.hourly?.pm2_5?.slice(base, base + 24) || [];
        const avg = (arr) => {
          const valid = arr.filter(v => v != null);
          return valid.length ? (valid.reduce((a, b) => a + b, 0) / valid.length) : null;
        };

        return {
          date: format(new Date(d), "MMM d"),
          fullDate: d,
          tempMean: daily.temperature_2m_mean?.[i],
          tempMax: daily.temperature_2m_max?.[i],
          tempMin: daily.temperature_2m_min?.[i],
          sunriseIST: toIST(daily.sunrise?.[i]),
          sunsetIST: toIST(daily.sunset?.[i]),
          sunriseNum: (() => {
            try { const t = toIST(daily.sunrise?.[i]); const [h,m] = t.split(":"); return parseFloat(h) + parseFloat(m)/60; } catch { return null; }
          })(),
          sunsetNum: (() => {
            try { const t = toIST(daily.sunset?.[i]); const [h,m] = t.split(":"); return parseFloat(h) + parseFloat(m)/60; } catch { return null; }
          })(),
          precip: daily.precipitation_sum?.[i],
          windMax: daily.wind_speed_10m_max?.[i],
          windDir: daily.wind_direction_10m_dominant?.[i],
          windDirLabel: getWindDirection(daily.wind_direction_10m_dominant?.[i] ?? 0),
          pm10: avg(pm10Slice) != null ? parseFloat(avg(pm10Slice).toFixed(1)) : null,
          pm25: avg(pm25Slice) != null ? parseFloat(avg(pm25Slice).toFixed(1)) : null,
        };
      });

      setChartData(thinData(rows, 180));
    } catch (e) {
      setError("Failed to fetch historical data.");
      console.error(e);
    }
    setLoading(false);
  };

  // Two-year max from today
  const minStart = format(subDays(new Date(), 730), "yyyy-MM-dd");

  return (
    <div>
      <div className="section-title">Historical Analysis</div>

      <div className="hist-controls">
        <div className="hist-control-group">
          <label>Start Date</label>
          <input
            type="date"
            className="date-input"
            value={startDate}
            min={minStart}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="hist-control-group">
          <label>End Date</label>
          <input
            type="date"
            className="date-input"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button className="fetch-btn" onClick={handleFetch} disabled={loading}>
          {loading ? "Loading..." : "Fetch Data"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#f87171", fontFamily: "Space Mono", fontSize: "0.8rem", marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div className="loading-screen" style={{ height: "40vh" }}>
          <div className="loader-ring" />
          <p>Fetching historical data...</p>
        </div>
      )}

      {chartData && !loading && (
        <>
          {/* Temperature */}
          <ChartWrap title="Temperature Trends — Mean / Max / Min (°C)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#8888aa", fontFamily: "Space Mono" }} interval={Math.ceil(chartData.length / 12)} />
                <YAxis tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
                <Tooltip content={<CustomTooltip unit="°C" />} />
                <Legend wrapperStyle={{ fontSize: "0.7rem", fontFamily: "Space Mono" }} />
                <Line type="monotone" dataKey="tempMean" stroke={ACCENT} strokeWidth={2} dot={false} name="Mean" />
                <Line type="monotone" dataKey="tempMax" stroke={ACCENT2} strokeWidth={1.5} dot={false} name="Max" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="tempMin" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Min" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrap>

          {/* Sun Cycle */}
          <ChartWrap title="Sun Cycle — Sunrise & Sunset (IST, 24h decimal)">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#8888aa", fontFamily: "Space Mono" }} interval={Math.ceil(chartData.length / 12)} />
                <YAxis domain={[4, 20]} tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} tickFormatter={v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2,"0")}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "10px 14px", fontFamily: "Space Mono", fontSize: "0.72rem", color: "#e8e8f0" }}>
                        <div style={{ color: "#8888aa", marginBottom: 4 }}>{label}</div>
                        {payload.map((p, i) => {
                          const h = Math.floor(p.value);
                          const m = String(Math.round((p.value % 1) * 60)).padStart(2, "0");
                          return <div key={i} style={{ color: p.color }}>{p.name}: {h}:{m} IST</div>;
                        })}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "0.7rem", fontFamily: "Space Mono" }} />
                <Line type="monotone" dataKey="sunriseNum" stroke="#facc15" strokeWidth={2} dot={false} name="Sunrise" />
                <Line type="monotone" dataKey="sunsetNum" stroke={ACCENT2} strokeWidth={2} dot={false} name="Sunset" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartWrap>

          {/* Precipitation */}
          <ChartWrap title="Precipitation — Daily Total (mm)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#8888aa", fontFamily: "Space Mono" }} interval={Math.ceil(chartData.length / 12)} />
                <YAxis tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
                <Tooltip content={<CustomTooltip unit="mm" />} />
                <Bar dataKey="precip" fill="#3b82f6" name="Precipitation" radius={[2, 2, 0, 0]} maxBarSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrap>

          {/* Wind */}
          <ChartWrap title="Wind — Max Speed (km/h) & Dominant Direction">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#8888aa", fontFamily: "Space Mono" }} interval={Math.ceil(chartData.length / 12)} />
                <YAxis tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
                <Tooltip content={<CustomTooltip unit="km/h" />} />
                <Legend wrapperStyle={{ fontSize: "0.7rem", fontFamily: "Space Mono" }} />
                <Area type="monotone" dataKey="windMax" stroke={ACCENT2} fill={ACCENT2 + "22"} strokeWidth={2} dot={false} name="Max Wind Speed" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartWrap>

          {/* Air Quality */}
          <ChartWrap title="Air Quality — Daily Avg PM10 & PM2.5 (µg/m³)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#8888aa", fontFamily: "Space Mono" }} interval={Math.ceil(chartData.length / 12)} />
                <YAxis tick={{ fontSize: 10, fill: "#8888aa", fontFamily: "Space Mono" }} />
                <Tooltip content={<CustomTooltip unit="µg/m³" />} />
                <Legend wrapperStyle={{ fontSize: "0.7rem", fontFamily: "Space Mono" }} />
                <Line type="monotone" dataKey="pm10" stroke="#fb923c" strokeWidth={2} dot={false} name="PM10" />
                <Line type="monotone" dataKey="pm25" stroke={ACCENT3} strokeWidth={2} dot={false} name="PM2.5" />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrap>
        </>
      )}

      {!chartData && !loading && (
        <div style={{ textAlign: "center", color: "#555570", fontFamily: "Space Mono", fontSize: "0.8rem", marginTop: 60 }}>
          Select a date range and click Fetch Data to view historical trends.
        </div>
      )}
    </div>
  );
}
