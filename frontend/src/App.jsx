/**
 * App.jsx
 * Componente raíz de la aplicación.
 *
 * Responsabilidades (Persona 3 – Auth y lógica frontend):
 *  - Gestionar el estado de autenticación de Firebase en toda la app.
 *  - Mostrar la pantalla de login si el usuario no tiene sesión.
 *  - Orquestar el flujo: ingreso de destinos → llamada a Cloud Function → resultado.
 *  - Propagar errores de autenticación y de la API al usuario.
 */

import { useState, useEffect, useCallback } from "react";
import { onAuthChange, loginWithGoogle, logout } from "./services/firebase.js";
import { optimizeRoute } from "./services/cloudFunction.js";
import DestinationInput from "./components/DestinationInput.jsx";
import Map from "./components/Map.jsx";
import RouteResult from "./components/RouteResult.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Pantalla de Login
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, error }) {
  return (
    <main className="login-screen">
      <div className="login-card">
        <span className="login-icon">🗺️</span>
        <h1>
          Route <span>Optimizer</span>
        </h1>
        <p className="login-subtitle">
          Calcula la ruta óptima entre hasta 15 destinos usando un algoritmo
          genético. Inicia sesión para comenzar.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "16px" }}>
            ⚠️ {error}
          </div>
        )}

        <button className="btn btn-google btn-full" onClick={onLogin}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          Continuar con Google
        </button>

        <hr className="login-divider" />
        <p className="login-footer">
          Solo usuarios autenticados pueden calcular rutas.
        </p>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App principal
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Estado de autenticación ──────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // ── Estado de la aplicación ──────────────────────────────────────────────
  const [destinations, setDestinations] = useState([]);
  const [routeMode, setRouteMode] = useState("open"); // "open" | "closed"
  const [routeResult, setRouteResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [apiError, setApiError] = useState(null);

  // ── Suscripción al estado de autenticación de Firebase ───────────────────
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe; // cleanup al desmontar
  }, []);

  // ── Handlers de autenticación ────────────────────────────────────────────
  const handleLogin = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
      // onAuthChange actualiza `user` automáticamente
    } catch (err) {
      setAuthError("No se pudo iniciar sesión. Intenta de nuevo.");
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Limpiar estado de la app al cerrar sesión
      setDestinations([]);
      setRouteResult(null);
      setApiError(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // ── Handler de cálculo de ruta ───────────────────────────────────────────
  const handleCalculate = useCallback(async () => {
    setApiError(null);
    setRouteResult(null);
    setCalculating(true);

    try {
      const result = await optimizeRoute(destinations, routeMode);
      setRouteResult(result);
    } catch (err) {
      setApiError(err.message || "Error al calcular la ruta.");
      console.error("Optimization error:", err);
    } finally {
      setCalculating(false);
    }
  }, [destinations, routeMode]);

  // ── Limpiar resultado cuando cambian los destinos ────────────────────────
  const handleDestinationsChange = (newDestinations) => {
    setDestinations(newDestinations);
    setRouteResult(null);
    setApiError(null);
  };

  // ── Pantallas de carga / login ────────────────────────────────────────────
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-wrapper">
        <LoginScreen onLogin={handleLogin} error={authError} />
      </div>
    );
  }

  // ── Vista principal (autenticado) ─────────────────────────────────────────
  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <div className="logo-icon">🗺</div>
          <span className="logo-text">
            Route<span>Opt</span>
          </span>
        </div>

        <div className="header-user">
          <span className="user-email">{user.email}</span>
          <button className="btn btn-danger" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          {/* Modo de ruta */}
          <div className="card">
            <p className="card-title">Modo de ruta</p>
            <div className="mode-selector">
              <button
                className={`mode-btn ${routeMode === "open" ? "active" : ""}`}
                onClick={() => {
                  setRouteMode("open");
                  setRouteResult(null);
                }}
              >
                🔓 Ruta abierta
              </button>
              <button
                className={`mode-btn ${routeMode === "closed" ? "active" : ""}`}
                onClick={() => {
                  setRouteMode("closed");
                  setRouteResult(null);
                }}
              >
                🔁 Ruta cerrada
              </button>
            </div>
          </div>

          {/* Ingreso de destinos */}
          <DestinationInput
            destinations={destinations}
            onChange={handleDestinationsChange}
          />

          {/* Error de API */}
          {apiError && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          {/* Botón calcular */}
          <button
            className="btn btn-primary btn-full"
            onClick={handleCalculate}
            disabled={destinations.length < 2 || calculating}
          >
            {calculating ? (
              <>
                <div className="spinner" />
                Calculando...
              </>
            ) : (
              <>⚡ Calcular ruta óptima</>
            )}
          </button>

          {/* Resultado */}
          {routeResult && <RouteResult result={routeResult} />}
        </aside>

        {/* ── Mapa ── */}
        <div className="map-area">
          <Map
            destinations={destinations}
            routeResult={routeResult}
            routeMode={routeMode}
            calculating={calculating}
          />
        </div>
      </main>
    </div>
  );
}
