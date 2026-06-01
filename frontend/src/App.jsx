import { useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "./services/firebase";
import { optimizeRoute } from "./services/cloudFunction";
import DestinationInput from "./components/DestinationInput";
import RouteResult from "./components/RouteResult";
import Map from "./components/Map";
import "./App.css";

export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const [mapsReady, setMapsReady] = useState(false);

  // Escuchar cambios de sesión de Firebase
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Cargar la Google Maps JS API dinámicamente
  useEffect(() => {
    if (window.google?.maps) { setMapsReady(true); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${
      import.meta.env.VITE_MAPS_KEY
    }&libraries=places`;
    script.async = true;
    script.onload = () => setMapsReady(true);
    document.head.appendChild(script);
  }, []);

  const handleLogin = () => signInWithPopup(auth, provider).catch(console.error);
  const handleLogout = () => signOut(auth);

  const handleOptimize = async (destinations, mode) => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await optimizeRoute(destinations, mode);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Login screen ───────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Route Optimizer</h1>
          <p>Optimización de rutas con algoritmo genético</p>
          <button className="btn-google" onClick={handleLogin}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Iniciar sesión con Google
          </button>
        </div>
      </div>
    );
  }

  // ── App principal ──────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>Route Optimizer</h1>
        <div className="user-info">
          <img src={user.photoURL} alt={user.displayName} className="avatar" />
          <span>{user.displayName}</span>
          <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>

      <main className="main">
        {/* Panel izquierdo */}
        <aside className="sidebar">
          {mapsReady ? (
            <DestinationInput onSubmit={handleOptimize} loading={loading} />
          ) : (
            <p>Cargando Google Maps…</p>
          )}
          {error && <div className="error-msg">⚠️ {error}</div>}
          <RouteResult result={result} />
        </aside>

        {/* Mapa */}
        <section className="map-section">
          {mapsReady ? (
            <Map result={result} />
          ) : (
            <div className="map-placeholder">Cargando mapa…</div>
          )}
        </section>
      </main>
    </div>
  );
}
