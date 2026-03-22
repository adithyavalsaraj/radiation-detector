import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "./index.css";
import Onboarding from './components/Onboarding';
import DownloadsModal from './components/DownloadsModal';

const getInitialSocketUrl = () => {

  const savedUrl = localStorage.getItem("backend_url");
  if (savedUrl) return savedUrl;

  const isElectron = navigator.userAgent.toLowerCase().includes(" electron/");
  const isCapacitor = window.origin && window.origin.includes("capacitor://");

  if (isElectron || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return "http://localhost:3001";
  }

  return isCapacitor ? "http://192.168.1.100:3001" : "http://";
};

function App() {
  const [showOnboarding, setShowOnboarding] = useState(
    localStorage.getItem("onboarding_complete") !== "true"
  );
  const [showDownloads, setShowDownloads] = useState(false);
  const [socketUrl, setSocketUrl] = useState(getInitialSocketUrl());
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState([]);
  const [direction, setDirection] = useState("STABLE");
  const [emitters, setEmitters] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [filterTab, setFilterTab] = useState("ALL");
  const [platform, setPlatform] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const sweepAngleRef = useRef(0);
  const anglesRef = useRef({});
  const socketRef = useRef(null);
  const radarRef = useRef(null);

  const smoothedRssiRef = useRef({});
  const ALPHA = 0.5;

  const smooth = (id, newRssi) => {
    const prev = smoothedRssiRef.current[id] || newRssi;
    const current = prev + ALPHA * (newRssi - prev);
    smoothedRssiRef.current[id] = current;
    return current;
  };

  const getDistanceFactor = (rssi) => {
    const power = Math.max(Math.min(rssi, -30), -100);
    const ratio = (power + 100) / 70;
    return 95 - Math.pow(ratio, 0.5) * 85;
  };

  useEffect(() => {
    socketRef.current = io(socketUrl);

    socketRef.current.on("connect", () => setConnected(true));
    socketRef.current.on("platform", (p) => setPlatform(p));

    socketRef.current.on("wifi-signal", (data) => {
      if (isPausedRef.current) return;
      setSignal(data);
      setHistory((prev) => {
        const newHistory = [...prev, data.rssi].slice(-10);
        if (newHistory.length >= 2) {
          const delta = newHistory[newHistory.length - 1] - newHistory[newHistory.length - 2];
          if (Math.abs(delta) < 2) setDirection("STABLE");
          else if (delta > 0) setDirection("APPROACHING");
          else setDirection("RECEDING");
        }
        return newHistory;
      });
    });

    socketRef.current.on("emitters", (data) => {
      if (isPausedRef.current) return;
      setEmitters((prev) => {
        return data.map((dev) => {
          const id = dev.id || dev.mac || dev.ssid;
          const rssi = dev.rssi || -95;
          const smoothedRssi = smooth(id, rssi);
          const distance = getDistanceFactor(smoothedRssi);

          if (!anglesRef.current[id]) {
            anglesRef.current[id] = dev.source === 'WIFI' 
              ? (Math.random() * 360) 
              : (sweepAngleRef.current % 360);
          }
          const angle = anglesRef.current[id];

          return { ...dev, id, angle, distance, smoothedRssi };
        });
      });
    });

    socketRef.current.on("disconnect", () => setConnected(false));

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [socketUrl]);

  useEffect(() => {
    const sweepInterval = setInterval(() => {
      sweepAngleRef.current = (sweepAngleRef.current + 3) % 360;
    }, 33);
    return () => clearInterval(sweepInterval);
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest(".zoom-btn")) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getFilteredList = () => {
    let list = [];
    switch (filterTab) {
      case "ALL":
        list = emitters;
        break;
      case "IDENTIFIED":
        list = emitters.filter((d) => d.type !== "UNKNOWN" && d.type !== "CONNECTED NODE" && d.type !== "BLUETOOTH");
        break;
      case "UNKNOWN":
        list = emitters.filter((d) => d.type === "UNKNOWN" || d.type === "CONNECTED NODE" || d.type === "BLUETOOTH");
        break;
      case "HIDDEN":
        list = emitters.filter((item) => (item.ssid === "<redacted>" || !item.ssid || item.ssid === "<hidden>"));
        break;
      default:
        list = emitters;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return list.filter((dev) => 
        (dev.name && dev.name.toLowerCase().includes(q)) ||
        (dev.ssid && dev.ssid.toLowerCase().includes(q)) ||
        (dev.mac && dev.mac.toLowerCase().includes(q)) ||
        (dev.type && dev.type.toLowerCase().includes(q))
      );
    }
    return list;
  };

  return (
    <div className={`dashboard-wrapper ${isSidebarOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar">
        <div className="sidebar-mobile-header">
          <h2 className="sidebar-title">RADIATION TRACKER</h2>
          <button className="close-sidebar" onClick={() => setIsSidebarOpen(false)}>×</button>
        </div>

        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search devices, types..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {["ALL", "IDENTIFIED", "UNKNOWN", "HIDDEN"].map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${filterTab === tab ? "active" : ""}`}
              onClick={() => setFilterTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="network-list">
          {getFilteredList().length === 0 && (
            <div className="no-data">No matching signals...</div>
          )}
          {getFilteredList()
            .sort((a, b) => b.rssi - a.rssi)
            .map((emitter) => {
              const displayName = emitter.name || emitter.ssid || emitter.mac;
              const isSelected = selectedDevice?.id === emitter.id;
              return (
                <div
                  key={emitter.id}
                  className={`network-item ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedDevice(emitter)}
                >
                  <div className="network-info">
                    <div className="network-ssid" title={emitter.id}>
                      {displayName}
                    </div>
                    <div className="network-rssi">
                      {Math.round(emitter.smoothedRssi)} dBm
                    </div>
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.4rem" }}>
                    SOURCE: {emitter.source} | {emitter.type}
                  </div>
                  <div className="network-bar-bg">
                    <div
                      className="network-bar"
                      style={{
                        width: `${Math.min(Math.max((emitter.smoothedRssi + 100) * 1.4, 0), 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="stats-box">
          <div className="stat">
            <span className="stat-label">Total Emitters</span>
            <span className="stat-value">{emitters.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Scan Source</span>
            <span className="stat-value" style={{ fontSize: '0.7rem', color: isPaused ? '#ff3e3e' : 'var(--accent-color)' }}>
              {isPaused ? 'PAUSED' : (platform.toUpperCase() || 'SEARCHING...')}
            </span>
          </div>
        </div>

        <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
          <button 
            style={{ width: '100%', padding: '0.8rem', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} 
            onClick={() => setShowDownloads(true)}>
            GET NATIVE APPS ↓
          </button>
        </div>

        {import.meta.env.DEV && (
          <>
            <div className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? "Hide Developer Settings" : "Developer Settings"} ⚙️
            </div>

            {showAdvanced && (
              <div className="settings-box">
                <label>BACKEND NODE</label>
                <input
                  type="text"
                  value={socketUrl}
                  onChange={(e) => {
                    setSocketUrl(e.target.value);
                    localStorage.setItem("backend_url", e.target.value);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="main-content" onClick={() => setSelectedDevice(null)}>
        <button className="menu-toggle" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }}>
          ☰
        </button>

        {!connected && <div className="status-banner">OFFLINE</div>}

        <div className="zoom-controls">
          <button 
            className={`zoom-btn ${isPaused ? "paused-state" : ""}`} 
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume Scanning" : "Pause Scanning"}
          >
            {isPaused ? "▶" : "⏸"}
          </button>
          <button className="zoom-btn" onClick={() => setZoom((prev) => Math.min(prev * 1.5, 20))}>+</button>
          <button className="zoom-btn" onClick={() => setZoom((prev) => Math.max(prev / 1.5, 1))}>-</button>
          <button className="zoom-btn" onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}>RESET</button>
        </div>

        <div className="radar-legend glass-card">
          <div className="legend-item"><span className="dot wifi"></span> WIFI AP</div>
          <div className="legend-item"><span className="dot node"></span> NODE</div>
          <div className="legend-item"><span className="dot bt"></span> BT</div>
          <div className="legend-item"><span className="dot unknown"></span> UNKNOWN</div>
        </div>

        <div
          className="radar-container"
          ref={radarRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="radar-viewport"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
          >
            {[80, 60, 40, 20].map((size) => {
              const currentSize = size * zoom;
              if (currentSize > 120) return null;
              return (
                <div
                  key={size}
                  className="radar-circle"
                  style={{ width: `${currentSize}vmin`, height: `${currentSize}vmin` }}
                ></div>
              );
            })}

            {!isPaused && <div className="radar-sweep"></div>}

            <div style={{
              position: "absolute", top: "50%", left: "50%", width: "12px", height: "12px",
              background: "var(--color-core)", borderRadius: "50%",
              transform: "translate(-50%, -50%)", boxShadow: "0 0 20px var(--color-core)", zIndex: 100
            }}></div>

            {getFilteredList(emitters).map((dev) => {
              const dist = dev.distance * 0.45 * zoom;
              if (dist > 100) return null;
              return (
                <div
                  key={dev.id}
                  className={`blip-container ${selectedDevice?.id === dev.id ? "selected" : ""}`}
                  style={{ transform: `rotate(${dev.angle}deg) translateY(-${dist}vmin)` }}
                  onClick={(e) => { e.stopPropagation(); setSelectedDevice(dev); }}
                >
                  <div
                    className="blip-dot"
                    style={{
                      background: dev.source === 'WIFI' ? 'var(--color-router)' : dev.source === 'BLUETOOTH' ? 'var(--color-bluetooth)' : 'var(--accent-color)',
                      width: dev.source === 'WIFI' ? '6px' : '8px',
                      height: dev.source === 'WIFI' ? '6px' : '8px'
                    }}
                  >
                    <div className="blip-label" style={{ transform: `rotate(-${dev.angle}deg)` }}>
                      {(dev.name || dev.ssid || 'UNKNOWN').toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedDevice ? (
          <div className="device-tooltip glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="tooltip-header">
              <h3>{selectedDevice.name || selectedDevice.ssid}</h3>
              <button className="close-btn" onClick={() => setSelectedDevice(null)}>×</button>
            </div>
            <div className="tooltip-body">
              <div className="tooltip-row"><span>Type</span> <b>{selectedDevice.type}</b></div>
              <div className="tooltip-row"><span>Source</span> <b>{selectedDevice.source}</b></div>
              <div className="tooltip-row"><span>Signal</span> <b style={{ color: "var(--accent-color)" }}>{Math.round(selectedDevice.smoothedRssi)} dBm</b></div>
              <div className="tooltip-row"><span>Distance</span> <b>~{Math.round(selectedDevice.distance / 10)}m</b></div>
              {selectedDevice.mac && <div className="tooltip-row"><span>Address</span> <b>{selectedDevice.mac}</b></div>}
            </div>
          </div>
        ) : (
          <div className="signal-info">
            <div className="signal-dbm" style={{ color: signal && signal.rssi > -60 ? "var(--color-router)" : "white" }}>
              {signal ? `${signal.rssi}` : "--"}
              <span style={{ fontSize: "1rem", marginLeft: "5px" }}>dBm</span>
            </div>
            <div className="signal-status">
              {direction} | ~{signal ? Math.round(getDistanceFactor(signal.rssi) / 10) : 0}m
            </div>
          </div>
        )}
      </div>
      
      {showDownloads && (
        <DownloadsModal onClose={() => setShowDownloads(false)} />
      )}

      {showOnboarding && (
        <Onboarding 
          onComplete={() => setShowOnboarding(false)} 
          socketUrl={socketUrl} 
          setSocketUrl={setSocketUrl} 
        />
      )}
    </div>
  );
}

export default App;
