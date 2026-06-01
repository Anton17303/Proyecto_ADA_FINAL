/**
 * Map.jsx
 * Carga el SDK de Google Maps usando el parámetro callback oficial de la API.
 * Google llama a window.__onGoogleMapsReady cuando el SDK está 100% listo,
 * eliminando cualquier race condition.
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

/**
 * Carga el SDK de Maps usando el parámetro &callback= oficial.
 * Google garantiza que cuando llama al callback, todo está inicializado.
 * Retorna una Promise que resuelve cuando el SDK está listo.
 */
function loadMapsSDK(apiKey) {
  return new Promise((resolve, reject) => {
    // Ya completamente listo
    if (window.google?.maps?.Map) {
      resolve();
      return;
    }

    // Definir el callback global que Google va a llamar
    const callbackName = "__googleMapsReady";

    // Si ya hay un script cargando, solo enchufamos al callback existente
    if (window[callbackName + "_pending"]) {
      window[callbackName + "_pending"].push(resolve);
      return;
    }

    window[callbackName + "_pending"] = [resolve];

    window[callbackName] = () => {
      window[callbackName + "_pending"].forEach((fn) => fn());
      delete window[callbackName + "_pending"];
      delete window[callbackName];
    };

    // Eliminar script anterior si existe (limpieza de sesión previa)
    const old = document.getElementById("gmap-sdk");
    if (old) old.remove();

    const script = document.createElement("script");
    script.id = "gmap-sdk";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps. Verifica tu API key."));
    document.head.appendChild(script);
  });
}

export default function Map({ destinations, routeResult, routeMode, calculating }) {
  const apiKey = import.meta.env.VITE_MAPS_JS_KEY;

  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const polylineRef  = useRef(null);
  const infoWindowRef = useRef(null);

  const [sdkReady, setSdkReady]   = useState(false);
  const [loadError, setLoadError] = useState(null);

  // ── 1. Cargar SDK ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey) return;
    loadMapsSDK(apiKey)
      .then(() => setSdkReady(true))
      .catch((err) => setLoadError(err.message));
  }, [apiKey]);

  // ── 2. Inicializar mapa (solo una vez, cuando el SDK está listo) ───────────
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

  // ── 3. Actualizar markers cuando cambian los destinos ─────────────────────
  useEffect(() => {
    if (!mapRef.current || !sdkReady) return;

    // Limpiar markers anteriores
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (destinations.length === 0) {
      mapRef.current.setCenter(DEFAULT_CENTER);
      mapRef.current.setZoom(8);
      return;
    }

    const center = {
      lat: destinations.reduce((s, d) => s + d.lat, 0) / destinations.length,
      lng: destinations.reduce((s, d) => s + d.lng, 0) / destinations.length,
    };
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(10);

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

  // ── 4. Actualizar polyline cuando llega el resultado ──────────────────────
  useEffect(() => {
    if (!mapRef.current || !sdkReady) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!routeResult) return;

    const path = routeResult.ordered_destinations.map((d) => ({
      lat: d.lat,
      lng: d.lng,
    }));
    if (routeMode === "closed" && path.length > 0) path.push(path[0]);
    if (path.length < 2) return;

    polylineRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#00d4aa",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: mapRef.current,
    });

    // Ajustar bounds para mostrar toda la ruta
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
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {!sdkReady && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Cargando mapa…</p>
        </div>
      )}

      {calculating && sdkReady && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Ejecutando algoritmo genético…</p>
        </div>
      )}
    </div>
  );
}
