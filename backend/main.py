"""
Cloud Function: optimize_route
Recibe una lista de destinos y devuelve el orden óptimo calculado
con un algoritmo genético usando la Distance Matrix API de Google Maps.
"""

import json
import functions_framework
from distance_matrix import build_distance_matrix, validate_radius
from genetic_algorithm import run as run_ga

# Headers CORS – ajusta el origen en producción
_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}


@functions_framework.http
def optimize_route(request):
    # ── Pre-flight CORS ────────────────────────────────────────────────────
    if request.method == "OPTIONS":
        return ("", 204, _CORS)

    # ── Parsear body ───────────────────────────────────────────────────────
    data = request.get_json(silent=True)
    if not data:
        return (_err("Body JSON requerido"), 400, _CORS)

    destinations = data.get("destinations", [])
    mode = data.get("mode", "open")          # "open" | "closed"

    # ── Validaciones básicas ───────────────────────────────────────────────
    if not isinstance(destinations, list) or len(destinations) < 2:
        return (_err("Se necesitan al menos 2 destinos"), 400, _CORS)

    if len(destinations) > 15:
        return (_err("Máximo 15 destinos permitidos"), 400, _CORS)

    for i, d in enumerate(destinations):
        if "lat" not in d or "lng" not in d:
            return (_err(f"Destino {i+1} sin lat/lng"), 400, _CORS)

    if mode not in ("open", "closed"):
        return (_err("mode debe ser 'open' o 'closed'"), 400, _CORS)

    # ── Validar radio 100 km ───────────────────────────────────────────────
    ok, msg = validate_radius(destinations)
    if not ok:
        return (_err(msg), 400, _CORS)

    # ── Construir matriz de distancias ─────────────────────────────────────
    try:
        matrix = build_distance_matrix(destinations)
    except ValueError as exc:
        return (_err(str(exc)), 502, _CORS)
    except Exception as exc:
        return (_err(f"Error interno: {exc}"), 500, _CORS)

    # ── Ejecutar algoritmo genético ────────────────────────────────────────
    closed = mode == "closed"
    best_route, best_dist = run_ga(matrix, closed=closed)

    # ── Construir respuesta ────────────────────────────────────────────────
    ordered = [destinations[i] for i in best_route]

    body = json.dumps({
        "ordered_destinations": ordered,
        "route_indices": best_route,
        "total_distance_m": best_dist,
        "total_distance_km": round(best_dist / 1000, 2),
        "mode": mode,
    })
    return (body, 200, {**_CORS, "Content-Type": "application/json"})


def _err(msg: str) -> str:
    return json.dumps({"error": msg})
