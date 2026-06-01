/**
 * Map.jsx
 * Carga el SDK de Google Maps directamente via script tag, sin depender de
 * @react-google-maps/api. Esto evita los bugs de caché y "Map is not a
 * constructor" que tiene la librería en versión 2.x.
 *
 * Flujo:
 *  1. Al montar, verifica si el SDK ya está cargado (window.google?.maps).
 *  2. Si no, inyecta el script tag y espera el evento de carga.
 *  3. Una vez listo, inicializa el mapa con la API nativa.
 *  4. Actualiza markers y polyline cuando cambian destinations/routeResult.
 */

import { useEffect, useRef, useState } from "react";

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
const SCRIPT_ID = "gmap-sdk";

/** Carga el SDK de Maps una sola vez; resuelve cuando está listo. */
function loadMapsSDK(apiKey) {
  return new Promise((resolve, reject) => {
    // Ya cargado
    if (window.google?.maps?.Map) {
      resolve();
      return;
    }

    // Script ya insertado pero aún cargando → esperar
    if (document.getElementById(SCRIPT_ID)) {
      const poll = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      return;
    }

    // Insertar script por primera vez
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps."));
    document.head.appendChild(script);
  });
}

export default function Map({ destinations, routeResult, routeMode, calculating }) {
  const apiKey = import.meta.env.VITE_MAPS_JS_KEY;
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const infoWindowRef = useRef(null);

  const [sdkReady, setSdkReady] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // ── 1. Cargar SDK ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey) return;
    loadMapsSDK(apiKey)
      .then(() => setSdkReady(true))
      .catch((err) => setLoadError(err.message));
  }, [apiKey]);

  // ── 2. Inicializar mapa una vez que el SDK esté listo ─────────────────────
  useEffect(() => {
    if (!sdkReady || !containerRef.current || mapRef.current) return;

    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 8,
      styles: DARK_MAP_STYLE,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, [sdkReady]);

  // ── 3. Sincronizar markers cuando cambian los destinos ────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar markers anteriores
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (destinations.length === 0) return;

    // Recalcular centro
    const center = {
      lat: destinations.reduce((s, d) => s + d.lat, 0) / destinations.length,
      lng: destinations.reduce((s, d) => s + d.lng, 0) / destinations.length,
    };
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(10);

    // Crear nuevos markers
    destinations.forEach((dest, i) => {
      const marker = new window.google.maps.Marker({
        position: { lat: dest.lat, lng: dest.lng },
        map: mapRef.current,
        label: {
          text: String(i + 1),
          color: "#000",
          fontWeight: "700",
          fontSize: "12px",
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: "#00d4aa",
          fillOpacity: 1,
          strokeColor: "#000000",
          strokeWeight: 1,
          scale: 14,
        },
        title: dest.name,
      });

      marker.addListener("click", () => {
        infoWindowRef.current.setContent(
          `<div style="color:#000;font-family:sans-serif;font-size:13px">
            <strong>${dest.name}</strong><br/>
            <small>${dest.lat.toFixed(5)}, ${dest.lng.toFixed(5)}</small>
          </div>`
        );
        infoWindowRef.current.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [destinations, sdkReady]);

  // ── 4. Sincronizar polyline cuando llega el resultado ─────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar polyline anterior
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!routeResult) return;

    const path = routeResult.ordered_destinations.map((d) => ({
      lat: d.lat,
      lng: d.lng,
    }));

    // Ruta cerrada: agregar el primer destino al final
    if (routeMode === "closed" && path.length > 0) {
      path.push(path[0]);
    }

    if (path.length < 2) return;

    polylineRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#00d4aa",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: mapRef.current,
    });

    // Ajustar zoom para que entre toda la ruta
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    mapRef.current.fitBounds(bounds, { padding: 60 });
  }, [routeResult, routeMode, sdkReady]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="map-placeholder">
        <span className="icon">🗺️</span>
        <p>Configura VITE_MAPS_JS_KEY en tu .env para ver el mapa.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="map-placeholder">
        <span className="icon">⚠️</span>
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Contenedor nativo del mapa */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Spinner mientras carga el SDK */}
      {!sdkReady && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Cargando mapa…</p>
        </div>
      )}

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
