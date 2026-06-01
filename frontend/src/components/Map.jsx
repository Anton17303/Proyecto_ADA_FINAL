/**
 * Map.jsx
 * Componente de visualización del mapa con Google Maps JavaScript API.
 *
 * Muestra:
 *  - Un pin numerado por cada destino ingresado.
 *  - La ruta óptima trazada sobre el mapa (cuando hay resultado).
 *  - Overlay de carga mientras se calcula.
 *
 * Requiere la variable de entorno VITE_MAPS_JS_KEY configurada.
 */

import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from "@react-google-maps/api";
import { useState } from "react";

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const GOOGLE_MAPS_LIBRARIES = ["places"];

// Estilo oscuro para el mapa (acorde al tema de la app)
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a2333" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#141b24" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a97a8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#283548" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a97a8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1117" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

// Centro por defecto: Guatemala City
const DEFAULT_CENTER = { lat: 14.6349, lng: -90.5069 };

export default function Map({ destinations, routeResult, routeMode, calculating }) {
  const [activeMarker, setActiveMarker] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_MAPS_JS_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Determinar el centro del mapa según los destinos
  const center =
    destinations.length > 0
      ? {
          lat: destinations.reduce((sum, d) => sum + d.lat, 0) / destinations.length,
          lng: destinations.reduce((sum, d) => sum + d.lng, 0) / destinations.length,
        }
      : DEFAULT_CENTER;

  // Construir el path de la polyline según el resultado óptimo
  const routePath = routeResult
    ? [
        ...routeResult.ordered_destinations.map((d) => ({ lat: d.lat, lng: d.lng })),
        ...(routeMode === "closed" && routeResult.ordered_destinations.length > 0
          ? [{ lat: routeResult.ordered_destinations[0].lat, lng: routeResult.ordered_destinations[0].lng }]
          : []),
      ]
    : [];

  if (loadError) {
    return (
      <div className="map-placeholder">
        <span className="icon">⚠️</span>
        <p>Error al cargar Google Maps. Verifica VITE_MAPS_JS_KEY.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-placeholder">
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <p>Cargando mapa…</p>
      </div>
    );
  }

  // Si no hay API key configurada, mostrar placeholder informativo
  if (!import.meta.env.VITE_MAPS_JS_KEY) {
    return (
      <div className="map-placeholder">
        <span className="icon">🗺️</span>
        <p>Configura VITE_MAPS_JS_KEY para ver el mapa.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={destinations.length > 0 ? 10 : 8}
        options={{
          styles: DARK_MAP_STYLE,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Pins numerados por destino */}
        {destinations.map((dest, i) => (
          <Marker
            key={i}
            position={{ lat: dest.lat, lng: dest.lng }}
            label={{
              text: String(i + 1),
              color: "#000",
              fontWeight: "700",
              fontSize: "12px",
            }}
            onClick={() => setActiveMarker(i)}
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
              fillColor: "#00d4aa",
              fillOpacity: 1,
              strokeColor: "#000",
              strokeWeight: 1,
              scale: 14,
            }}
          />
        ))}

        {/* InfoWindow al hacer click en un marker */}
        {activeMarker !== null && destinations[activeMarker] && (
          <InfoWindow
            position={{
              lat: destinations[activeMarker].lat,
              lng: destinations[activeMarker].lng,
            }}
            onCloseClick={() => setActiveMarker(null)}
          >
            <div style={{ color: "#000", fontSize: 13, fontFamily: "sans-serif" }}>
              <strong>{destinations[activeMarker].name}</strong>
              <br />
              <small>
                {destinations[activeMarker].lat.toFixed(5)},{" "}
                {destinations[activeMarker].lng.toFixed(5)}
              </small>
            </div>
          </InfoWindow>
        )}

        {/* Polyline de la ruta óptima */}
        {routePath.length > 1 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: "#00d4aa",
              strokeOpacity: 0.9,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        )}
      </GoogleMap>

      {/* Overlay de carga mientras se calcula */}
      {calculating && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Ejecutando algoritmo genético…</p>
        </div>
      )}
    </div>
  );
}
