/**
 * cloudFunction.js
 * Encapsula la llamada HTTP a la Cloud Function de optimización de rutas.
 * El usuario debe estar autenticado; el ID Token de Firebase se envía en
 * el header Authorization para que la función pueda verificar la sesión.
 */

import { getIdToken } from "./firebase.js";

// URL de la Cloud Function desplegada en GCP (desde .env)
const CLOUD_FUNCTION_URL = import.meta.env.VITE_CF_URL;

/**
 * Llama a la Cloud Function con los destinos y el modo de ruta.
 *
 * @param {Array<{name: string, lat: number, lng: number}>} destinations
 *   Lista de 2 a 15 destinos.
 * @param {"open"|"closed"} mode
 *   "open" → termina en el último destino; "closed" → regresa al origen.
 * @returns {Promise<{
 *   ordered_destinations: Array,
 *   route_indices: number[],
 *   total_distance_m: number,
 *   total_distance_km: number,
 *   mode: string
 * }>}
 * @throws {Error} Si el usuario no está autenticado o la función retorna error.
 */
export async function optimizeRoute(destinations, mode = "open") {
  // Validaciones básicas del lado del cliente (el backend también las hace)
  if (!destinations || destinations.length < 2) {
    throw new Error("Se necesitan al menos 2 destinos.");
  }
  if (destinations.length > 15) {
    throw new Error("Máximo 15 destinos permitidos.");
  }
  if (!["open", "closed"].includes(mode)) {
    throw new Error("El modo debe ser 'open' o 'closed'.");
  }

  // Obtener el token de autenticación de Firebase
  const token = await getIdToken();
  if (!token) {
    throw new Error("Debes iniciar sesión para calcular la ruta.");
  }

  if (!CLOUD_FUNCTION_URL) {
    throw new Error(
      "URL de la Cloud Function no configurada. Revisa VITE_CF_URL en tu .env."
    );
  }

  const response = await fetch(CLOUD_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ destinations, mode }),
  });

  const data = await response.json();

  if (!response.ok) {
    // El backend retorna { error: "mensaje" } en casos de error
    throw new Error(data.error || `Error del servidor: ${response.status}`);
  }

  return data;
}
