/**
 * Map.jsx
 * Fix: se usa LoadScript en lugar de useJsApiLoader para garantizar que
 * el SDK de Google Maps se limpia correctamente al desmontar el componente.
 * Esto evita el error "Map is not a constructor" causado por conflictos
 * de caché entre sesiones del navegador.
 */

import { useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Polyline,
  InfoWindow,
} from "@react-google-maps/api";

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

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

const DEFAULT_CENTER = { lat: 14.6349, lng: -90.5069 };

// ── Spinner / placeholders reutilizables ─────────────────────────────────────
function MapSpinner() {
  return (
    <div className="map-placeholder">
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <p>Cargando mapa…</p>
    </div>
  );
}

// ── Contenido interno del mapa (solo se monta cuando el SDK está listo) ──────
function MapContent({ destinations, routeResult, routeMode, calculating }) {
  const [activeMarker, setActiveMarker] = useState(null);

  const center =
    destinations.length > 0
      ? {
          lat: destinations.reduce((s, d) => s + d.lat, 0) / destinations.length,
          lng: destinations.reduce((s, d) => s + d.lng, 0) / destinations.length,
        }
      : DEFAULT_CENTER;

  const routePath = routeResult
    ? [
        ...routeResult.ordered_destinations.map((d) => ({ lat: d.lat, lng: d.lng })),
        ...(routeMode === "closed" && routeResult.ordered_destinations.length > 0
          ? [
              {
                lat: routeResult.ordered_destinations[0].lat,
                lng: routeResult.ordered_destinations[0].lng,
              },
            ]
          : []),
      ]
    : [];

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={destinations.length > 0 ? 10 : 8}
        options={{
          styles: DARK_MAP_STYLE,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Pins numerados */}
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
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#00d4aa",
              fillOpacity: 1,
              strokeColor: "#000",
              strokeWeight: 1,
              scale: 14,
            }}
          />
        ))}

        {/* InfoWindow al hacer click en marker */}
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

      {/* Overlay mientras calcula */}
      {calculating && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Ejecutando algoritmo genético…</p>
        </div>
      )}
    </div>
  );
}

// ── Componente público ────────────────────────────────────────────────────────
export default function Map(props) {
  const apiKey = import.meta.env.VITE_MAPS_JS_KEY;

  if (!apiKey) {
    return (
      <div className="map-placeholder">
        <span className="icon">🗺️</span>
        <p>Configura VITE_MAPS_JS_KEY en tu .env para ver el mapa.</p>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      loadingElement={<MapSpinner />}
      onError={() => console.error("Error cargando Google Maps SDK")}
    >
      <MapContent {...props} />
    </LoadScript>
  );
}
