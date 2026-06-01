/**
 * RouteResult.jsx
 * Muestra el resultado de la optimización de ruta:
 *  - Distancia total del recorrido.
 *  - Modo de ruta (abierta o cerrada).
 *  - Orden óptimo de los destinos.
 */

export default function RouteResult({ result }) {
  if (!result) return null;

  const { ordered_destinations, total_distance_km, mode } = result;

  return (
    <div className="card" style={{ animation: "fadeInUp 0.3s ease" }}>
      <p className="card-title">Ruta óptima calculada ✓</p>

      {/* Stats principales */}
      <div style={{ marginBottom: 16 }}>
        <div className="stat-row">
          <span className="stat-label">Distancia total</span>
          <span className="stat-value">{total_distance_km.toFixed(2)} km</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Modo</span>
          <span className="stat-value">
            {mode === "closed" ? "🔁 Cerrada" : "🔓 Abierta"}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Destinos</span>
          <span className="stat-value">{ordered_destinations.length}</span>
        </div>
      </div>

      {/* Orden de destinos */}
      <p
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 10,
        }}
      >
        Orden óptimo
      </p>

      <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {ordered_destinations.map((dest, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.82rem",
              padding: "6px 8px",
              background: "rgba(0,212,170,0.05)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(0,212,170,0.1)",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                background: "var(--accent)",
                color: "#000",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {dest.name || `Destino ${i + 1}`}
            </span>
          </li>
        ))}

        {/* Si es cerrada, mostrar regreso al origen */}
        {mode === "closed" && ordered_destinations.length > 0 && (
          <li
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.82rem",
              padding: "6px 8px",
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            <span style={{ width: 22, height: 22, display: "grid", placeItems: "center" }}>
              ↩
            </span>
            Regreso a {ordered_destinations[0]?.name || "origen"}
          </li>
        )}
      </ol>
    </div>
  );
}
