import React, { useState, useEffect } from "react";
import CurrentWeather from "./pages/CurrentWeather";
import Historical from "./pages/Historical";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("current");
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState(null);
  const [locName, setLocName] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lon: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.county ||
            "Unknown";
          const country = data.address.country_code?.toUpperCase() || "";
          setLocName(`${city}, ${country}`);
        } catch {
          setLocName(`${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
        }
      },
      (err) => {
        setLocError("Location access denied. Using default (New Delhi).");
        setLocation({ lat: 28.6139, lon: 77.209 });
        setLocName("New Delhi, IN");
      }
    );
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo">⬡ WEATHERSCOPE</span>
          {locName && <span className="loc-badge">📍 {locName}</span>}
        </div>
        <nav className="app-nav">
          <button
            className={`nav-btn ${page === "current" ? "active" : ""}`}
            onClick={() => setPage("current")}
          >
            NOW
          </button>
          <button
            className={`nav-btn ${page === "historical" ? "active" : ""}`}
            onClick={() => setPage("historical")}
          >
            HISTORY
          </button>
        </nav>
      </header>

      {locError && <div className="loc-error">{locError}</div>}

      <main className="app-main">
        {!location ? (
          <div className="loading-screen">
            <div className="loader-ring" />
            <p>Detecting location...</p>
          </div>
        ) : page === "current" ? (
          <CurrentWeather location={location} />
        ) : (
          <Historical location={location} />
        )}
      </main>
    </div>
  );
}
