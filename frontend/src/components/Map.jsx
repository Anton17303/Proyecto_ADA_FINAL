import { useEffect, useRef } from "react";

/**
 * Mapa interactivo con rutas reales por calles usando la Directions API.
 * Muestra pines numerados y traza el recorrido siguiendo las vías.
 */
export default function Map({ result }) {
  const mapRef        = useRef(null);
  const googleMapRef  = useRef(null);
  const markersRef    = useRef([]);
  const rendererRef   = useRef(null);

  // Inicializar el mapa una sola vez
  useEffect(() => {
    if (googleMapRef.current) return;
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 14.634915, lng: -90.506882 },
      zoom: 12,
      mapTypeControl: false,
    });
  }, []);

  // Actualizar ruta cuando cambia el resultado
  useEffect(() => {
    if (!googleMapRef.current || !result) return;

    // Limpiar marcadores anteriores
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Limpiar renderer anterior
    if (rendererRef.current) {
      rendererRef.current.setMap(null);
      rendererRef.current = null;
    }

    const { ordered_destinations, mode } = result;
    const n = ordered_destinations.length;

    // Dibujar pines numerados
    const bounds = new window.google.maps.LatLngBounds();
    ordered_destinations.forEach((dest, i) => {
      const pos = { lat: dest.lat, lng: dest.lng };
      bounds.extend(pos);

      const marker = new window.google.maps.Marker({
        position: pos,
        map: googleMapRef.current,
        label: {
          text: String(i + 1),
          color: "#fff",
          fontWeight: "bold",
          fontSize: "13px",
        },
        title: dest.name || `Destino ${i + 1}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: i === 0 ? "#1a73e8" : "#ea4335",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        zIndex: 10,
      });
      markersRef.current.push(marker);
    });

    // Construir petición a Directions API
    // origin → primer destino
    // destination → último destino (o primero si es cerrada)
    // waypoints → destinos intermedios
    const origin      = { lat: ordered_destinations[0].lat, lng: ordered_destinations[0].lng };
    const destination = mode === "closed"
      ? origin
      : { lat: ordered_destinations[n - 1].lat, lng: ordered_destinations[n - 1].lng };

    const waypointEnd = mode === "closed" ? n : n - 1;
    const waypoints   = ordered_destinations.slice(1, waypointEnd).map((d) => ({
      location: { lat: d.lat, lng: d.lng },
      stopover: true,
    }));

    const directionsService  = new window.google.maps.DirectionsService();
    rendererRef.current = new window.google.maps.DirectionsRenderer({
      map: googleMapRef.current,
      suppressMarkers: true,          // usamos nuestros propios pines
      polylineOptions: {
        strokeColor: "#1a73e8",
        strokeOpacity: 0.85,
        strokeWeight: 4,
      },
    });

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,     // el orden ya lo calculó el GA
      },
      (result, status) => {
        if (status === "OK") {
          rendererRef.current.setDirections(result);
        } else {
          console.warn("Directions API error:", status);
          // Fallback: línea recta si la API falla
          const path = ordered_destinations.map((d) => ({ lat: d.lat, lng: d.lng }));
          if (mode === "closed") path.push(path[0]);
          new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: "#1a73e8",
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map: googleMapRef.current,
          });
        }
      }
    );

    googleMapRef.current.fitBounds(bounds);
  }, [result]);

  return <div ref={mapRef} className="map-container" />;
}
