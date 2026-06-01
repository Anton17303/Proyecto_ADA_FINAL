/**
 * DestinationInput.jsx
 * Ingreso de destinos con autocompletado usando la API nativa de Google Places.
 * NO usa @react-google-maps/api — el SDK ya lo carga Map.jsx via callback oficial.
 * Este componente espera a que window.google.maps esté disponible.
 */

import { useEffect, useRef, useState } from "react";

// ── Haversine ────────────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function validateRadius(destinations) {
  for (let i = 0; i < destinations.length; i++) {
    for (let j = i + 1; j < destinations.length; j++) {
      const d = haversineKm(
        destinations[i].lat, destinations[i].lng,
        destinations[j].lat, destinations[j].lng
      );
      if (d > 100) {
        return `"${destinations[i].name}" y "${destinations[j].name}" están a ${d.toFixed(1)} km (máx. 100 km).`;
      }
    }
  }
  return null;
}

// ── Hook: espera a que el SDK de Maps esté listo ─────────────────────────────
function useMapsReady() {
  const [ready, setReady] = useState(!!window.google?.maps?.places);
  useEffect(() => {
    if (window.google?.maps?.places) { setReady(true); return; }
    const iv = setInterval(() => {
      if (window.google?.maps?.places) { setReady(true); clearInterval(iv); }
    }, 200);
    return () => clearInterval(iv);
  }, []);
  return ready;
}

// ── Formulario con Autocomplete nativo ───────────────────────────────────────
function AddDestinationForm({ onAdd, count }) {
  const [name, setName]   = useState("");
  const [lat, setLat]     = useState("");
  const [lng, setLng]     = useState("");
  const [error, setError] = useState(null);
  const inputRef          = useRef(null);
  const acRef             = useRef(null);
  const mapsReady         = useMapsReady();

  // Inicializar Autocomplete nativo una vez que el SDK esté listo
  useEffect(() => {
    if (!mapsReady || !inputRef.current || acRef.current) return;

    acRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name"],
    });

    acRef.current.addListener("place_changed", () => {
      const place = acRef.current.getPlace();
      if (!place?.geometry?.location) {
        setError("Selecciona una opción válida de la lista.");
        return;
      }
      setName(place.name || place.formatted_address || "");
      setLat(String(place.geometry.location.lat()));
      setLng(String(place.geometry.location.lng()));
      setError(null);
    });
  }, [mapsReady]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!name.trim())                              return setError("El nombre es obligatorio.");
    if (isNaN(latNum) || latNum < -90 || latNum > 90)   return setError("Latitud inválida (-90 a 90).");
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) return setError("Longitud inválida (-180 a 180).");
    onAdd({ name: name.trim(), lat: latNum, lng: lngNum });
    setName(""); setLat(""); setLng("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const disabled = count >= 15;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Campo de búsqueda con Autocomplete */}
      <input
        ref={inputRef}
        className="input"
        type="text"
        placeholder={mapsReady ? "Buscar lugar en Google Maps…" : "Cargando buscador…"}
        disabled={disabled || !mapsReady}
      />

      {/* Nombre editable */}
      <input
        className="input"
        type="text"
        placeholder="Nombre del destino"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
        maxLength={60}
      />

      {/* Lat / Lng */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input className="input" type="number" step="any" placeholder="Latitud"
          value={lat} onChange={(e) => setLat(e.target.value)} disabled={disabled} />
        <input className="input" type="number" step="any" placeholder="Longitud"
          value={lng} onChange={(e) => setLng(e.target.value)} disabled={disabled} />
      </div>

      {error && (
        <div className="alert alert-error" style={{ padding: "8px 12px" }}>{error}</div>
      )}

      <button type="submit" className="btn btn-secondary" disabled={disabled}
        style={{ alignSelf: "flex-start" }}>
        + Agregar destino
      </button>

      {disabled && (
        <div className="alert alert-warning" style={{ padding: "8px 12px" }}>
          Máximo 15 destinos alcanzado.
        </div>
      )}
    </form>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function DestinationInput({ destinations, onChange }) {
  const radiusError = destinations.length >= 2 ? validateRadius(destinations) : null;

  return (
    <div className="card">
      <p className="card-title">
        Destinos{" "}
        <span style={{ color: destinations.length >= 2 ? "var(--accent)" : "inherit" }}>
          ({destinations.length}/15)
        </span>
      </p>

      {destinations.length > 0 && (
        <ul className="destination-list">
          {destinations.map((dest, i) => (
            <li key={i} className="destination-item">
              <span className="dest-index">{i + 1}</span>
              <span className="dest-name">{dest.name}</span>
              <span className="dest-coords">{dest.lat.toFixed(4)}, {dest.lng.toFixed(4)}</span>
              <button className="dest-remove" onClick={() => onChange(destinations.filter((_, j) => j !== i))} title="Eliminar">×</button>
            </li>
          ))}
        </ul>
      )}

      {radiusError && (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          <span>📍</span><span>{radiusError}</span>
        </div>
      )}

      <AddDestinationForm onAdd={(dest) => onChange([...destinations, dest])} count={destinations.length} />

      <style>{`
        .destination-list { list-style:none; margin-bottom:16px; display:flex; flex-direction:column; gap:6px; }
        .destination-item { display:flex; align-items:center; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.82rem; }
        .dest-index { width:20px; height:20px; background:var(--accent); color:#000; border-radius:50%; display:grid; place-items:center; font-size:0.7rem; font-weight:700; flex-shrink:0; }
        .dest-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dest-coords { font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); white-space:nowrap; }
        .dest-remove { background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem; line-height:1; padding:0 2px; transition:color var(--transition); }
        .dest-remove:hover { color:var(--danger); }
        .input { width:100%; padding:9px 12px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-display); font-size:0.85rem; outline:none; transition:border-color var(--transition); }
        .input:focus { border-color:var(--border-accent); }
        .input::placeholder { color:var(--text-muted); }
        .input:disabled { opacity:0.4; cursor:not-allowed; }
      `}</style>
    </div>
  );
}
