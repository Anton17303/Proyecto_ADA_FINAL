/**
 * Panel de resultados: muestra el orden óptimo y la distancia total.
 */
export default function RouteResult({ result }) {
  if (!result) return null;

  const { ordered_destinations, total_distance_km, mode } = result;

  return (
    <div className="result-panel">
      <h2>Ruta óptima</h2>
      <p className="total-dist">
        Distancia total: <strong>{total_distance_km} km</strong>
        <span className="mode-badge">
          {mode === "closed" ? "🔁 Cerrada" : "➡️ Abierta"}
        </span>
      </p>

      <ol className="route-list">
        {ordered_destinations.map((d, i) => (
          <li key={i}>
            <span className="pin-num">{i + 1}</span>
            {d.name || `${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}`}
          </li>
        ))}
        {mode === "closed" && (
          <li className="return">
            <span className="pin-num">↩</span>
            {ordered_destinations[0]?.name || "Origen"}
          </li>
        )}
      </ol>
    </div>
  );
}
