import { useState, useRef, useEffect } from "react";

/**
 * Input de destinos con autocompletado de Google Places.
 * Permite agregar entre 2 y 15 destinos y elegir el modo de ruta.
 */
export default function DestinationInput({ onSubmit, loading }) {
  const [destinations, setDestinations] = useState([
    { name: "", lat: null, lng: null },
    { name: "", lat: null, lng: null },
  ]);
  const [mode, setMode] = useState("open");
  const inputRefs = useRef([]);

  // Inicializar Autocomplete de Google Places por cada input
  useEffect(() => {
    destinations.forEach((_, i) => {
      const input = inputRefs.current[i];
      if (!input || input._autocomplete) return;

      const ac = new window.google.maps.places.Autocomplete(input, {
        fields: ["geometry", "formatted_address", "name"],
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.geometry) return;
        setDestinations((prev) => {
          const next = [...prev];
          next[i] = {
            name: place.name || place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          return next;
        });
      });

      input._autocomplete = ac;
    });
  }, [destinations.length]);

  const addDestination = () => {
    if (destinations.length >= 15) return;
    setDestinations((p) => [...p, { name: "", lat: null, lng: null }]);
  };

  const removeDestination = (i) => {
    if (destinations.length <= 2) return;
    setDestinations((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    const valid = destinations.filter((d) => d.lat !== null && d.lng !== null);
    if (valid.length < 2) {
      alert("Selecciona al menos 2 destinos válidos del autocompletado.");
      return;
    }
    onSubmit(valid, mode);
  };

  return (
    <div className="input-panel">
      <h2>Destinos</h2>

      {destinations.map((d, i) => (
        <div key={i} className="dest-row">
          <span className="dest-num">{i + 1}</span>
          <input
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            placeholder={`Destino ${i + 1}`}
            defaultValue={d.name}
            className={d.lat ? "valid" : ""}
          />
          {destinations.length > 2 && (
            <button className="btn-remove" onClick={() => removeDestination(i)}>
              ✕
            </button>
          )}
        </div>
      ))}

      {destinations.length < 15 && (
        <button className="btn-add" onClick={addDestination}>
          + Agregar destino
        </button>
      )}

      <div className="mode-selector">
        <label>
          <input
            type="radio"
            value="open"
            checked={mode === "open"}
            onChange={() => setMode("open")}
          />
          Ruta abierta
        </label>
        <label>
          <input
            type="radio"
            value="closed"
            checked={mode === "closed"}
            onChange={() => setMode("closed")}
          />
          Ruta cerrada (regresa al origen)
        </label>
      </div>

      <button
        className="btn-optimize"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Calculando…" : "Optimizar ruta"}
      </button>
    </div>
  );
}
