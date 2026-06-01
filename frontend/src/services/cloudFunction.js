import { auth } from "./firebase";

const CF_URL = import.meta.env.VITE_CF_URL;

/**
 * Llama a la Cloud Function optimize_route.
 * @param {Array}  destinations  Lista de {lat, lng, name}
 * @param {string} mode          "open" | "closed"
 * @returns {Promise<Object>}    Respuesta de la Cloud Function
 */
export async function optimizeRoute(destinations, mode) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado");

  // Obtener token de Firebase para autenticación
  const token = await user.getIdToken();

  const resp = await fetch(CF_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ destinations, mode }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Error en la Cloud Function");
  return data;
}
