# Route Optimizer 🗺️

Aplicación web que calcula la **ruta óptima** entre hasta 15 destinos usando un **algoritmo genético**. El cálculo ocurre en una **Cloud Function de GCP** escrita en Python; el frontend es **React + Vite** con autenticación via **Firebase** y visualización con **Google Maps**.

---

## ¿Cómo funciona?

1. El usuario inicia sesión con su cuenta de Google (Firebase Auth).
2. Ingresa entre 2 y 15 destinos usando el autocompletado de Google Places.
3. Elige si la ruta es **abierta** (termina en el último destino) o **cerrada** (regresa al origen).
4. El frontend envía los destinos a la **Cloud Function**.
5. La Cloud Function consulta la **Distance Matrix API** para obtener las distancias reales entre todos los puntos.
6. El **algoritmo genético** calcula el orden óptimo que minimiza la distancia total.
7. El resultado se muestra en el mapa con pines numerados y la ruta trazada por calles reales.

---

## Arquitectura

```
Usuario (Browser)
  │  Firebase Auth (Google Sign-In)
  ▼
React + Vite (frontend)
  │  POST /optimize_route  (con Firebase ID Token)
  ▼
Cloud Function – Python (GCP)
  │  Distance Matrix API → construye matriz de distancias
  │  Algoritmo Genético  → calcula orden óptimo
  ▼
Google Maps Platform
```

---

## Estructura de carpetas

```
route-optimizer/
├── .gitignore
├── README.md
├── backend/
│   ├── pyproject.toml          # dependencias Python (uv)
│   ├── uv.lock                 # generado automáticamente por uv
│   ├── main.py                 # entry point de la Cloud Function
│   ├── genetic_algorithm.py    # lógica del algoritmo genético
│   ├── distance_matrix.py      # llamadas a la Distance Matrix API
│   └── .env.example            # variables requeridas, sin valores reales
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── .env.example            # variables requeridas, sin valores reales
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── components/
│       │   ├── Map.jsx               # mapa con pines y ruta por calles
│       │   ├── DestinationInput.jsx  # ingreso de destinos con autocompletado
│       │   └── RouteResult.jsx       # panel de resultados
│       └── services/
│           ├── firebase.js           # configuración de Firebase Auth
│           └── cloudFunction.js      # llamada a la Cloud Function
└── diagrams/
    ├── flow.drawio             # flujo de usuario
    └── architecture.drawio    # arquitectura del sistema
```

---

## Requisitos previos

- Node.js ≥ 18
- Python ≥ 3.11
- [uv](https://github.com/astral-sh/uv) — manejador de entornos Python (`pip install uv`)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) — para hacer deploy
- Proyecto en **GCP** con estas APIs habilitadas:
  - Cloud Functions API
  - Distance Matrix API
  - Maps JavaScript API
  - Places API
  - Directions API
- Proyecto en **Firebase** con Authentication → Google habilitado

---

## Configuración de variables de entorno

Nunca subas archivos `.env` al repositorio. Cópialos desde los ejemplos y llena los valores:

### Backend
```bash
cd backend
cp .env.example .env
# Agrega tu MAPS_KEY
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Agrega tu Maps JS Key, credenciales de Firebase y URL de la Cloud Function
```

Las variables necesarias están documentadas en cada `.env.example`.

---

## Correr en local

### 1. Backend
```bash
cd backend
pip install uv --break-system-packages
uv sync
export MAPS_KEY="tu_key_aqui"
uv run functions-framework --target=optimize_route --port=8080
```

Prueba que funciona con curl (en otra terminal):
```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "destinations": [
      {"name":"Antigua Guatemala","lat":14.5586,"lng":-90.7295},
      {"name":"Ciudad de Guatemala","lat":14.6349,"lng":-90.5069},
      {"name":"Escuintla","lat":14.3006,"lng":-90.7861}
    ],
    "mode":"open"
  }'
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 en tu navegador.

---

## Deploy a producción

### Cloud Function
```bash
cd backend
gcloud functions deploy optimize-route \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=optimize_route \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars MAPS_KEY="tu_key_aqui"
```

Al terminar, copia la URL que aparece y ponla en `frontend/.env` como `VITE_CF_URL`.

### Frontend
```bash
cd frontend
npm run build
# Sube la carpeta dist/ a Firebase Hosting, Vercel, Netlify, etc.
```

---

## Seguridad

- Las API Keys se manejan **únicamente** por variables de entorno, nunca en el código.
- Los archivos `.env` están en `.gitignore` y **nunca** se suben al repositorio.
- La Cloud Function solo acepta llamadas desde las IPs configuradas en GCP Console → APIs & Services → Credentials.
- Solo usuarios autenticados con Firebase pueden invocar el cálculo de rutas.

---

## Algoritmo Genético

El algoritmo resuelve una variante del **Problema del Viajante (TSP)** para encontrar el orden de visita que minimiza la distancia total.

| Parámetro | Valor |
|---|---|
| Tamaño de población | 120 individuos |
| Generaciones máximas | 600 |
| Élite (pasan sin cambios) | 12 individuos |
| Selección | Torneo (k = 3) |
| Cruce | Order Crossover (OX1) |
| Mutación | Swap (tasa 2% por gen) |
| Parada anticipada | 120 generaciones sin mejora |

- **Cromosoma:** permutación de índices de destinos (ej: `[2, 0, 1]`)
- **Fitness:** distancia total en metros — se minimiza
- **OX1:** conserva sub-secuencias del padre para mantener rutas parcialmente buenas
- **Swap:** intercambia dos destinos al azar para explorar nuevas soluciones
