import os
import math
import requests

MAPS_KEY = os.environ.get("MAPS_KEY")


def haversine_km(lat1, lng1, lat2, lng2):
    """Distancia en km entre dos coordenadas (fórmula de Haversine)."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def validate_radius(destinations, max_km=100):
    """
    Verifica que todos los destinos estén dentro de max_km entre sí.
    Retorna (True, "OK") o (False, mensaje_de_error).
    """
    for i in range(len(destinations)):
        for j in range(i + 1, len(destinations)):
            d = haversine_km(
                destinations[i]["lat"], destinations[i]["lng"],
                destinations[j]["lat"], destinations[j]["lng"],
            )
            if d > max_km:
                return False, (
                    f"Los destinos '{destinations[i].get('name', i+1)}' y "
                    f"'{destinations[j].get('name', j+1)}' están a "
                    f"{d:.1f} km, superando el límite de {max_km} km."
                )
    return True, "OK"


def build_distance_matrix(destinations):
    """
    Construye la matriz de distancias usando la Distance Matrix API de Google Maps.
    destinations: lista de dicts con claves 'lat', 'lng' (y opcionalmente 'name').
    Retorna: lista 2D de distancias en metros (int).
    Lanza ValueError si la API responde con error.
    """
    n = len(destinations)
    matrix = [[0] * n for _ in range(n)]
    coords = [f"{d['lat']},{d['lng']}" for d in destinations]

    # La API acepta hasta 10 orígenes × 10 destinos por llamada
    batch = 10

    for i in range(0, n, batch):
        origins_batch = coords[i: i + batch]
        for j in range(0, n, batch):
            dests_batch = coords[j: j + batch]

            resp = requests.get(
                "https://maps.googleapis.com/maps/api/distancematrix/json",
                params={
                    "origins": "|".join(origins_batch),
                    "destinations": "|".join(dests_batch),
                    "key": MAPS_KEY,
                    "units": "metric",
                },
                timeout=15,
            )
            data = resp.json()

            if data.get("status") != "OK":
                raise ValueError(
                    f"Distance Matrix API error: {data.get('status')} – "
                    f"{data.get('error_message', '')}"
                )

            for ri, row in enumerate(data["rows"]):
                for ci, element in enumerate(row["elements"]):
                    dist = (
                        element["distance"]["value"]
                        if element.get("status") == "OK"
                        else 10 ** 9          # penalización por ruta inexistente
                    )
                    matrix[i + ri][j + ci] = dist

    return matrix
