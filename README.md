# Route Optimizer 🗺️

Aplicación web que calcula la ruta óptima entre hasta 15 destinos usando un **algoritmo genético**. El cálculo ocurre en una **Cloud Function de GCP** (Python); el frontend es **React + Vite** con autenticación vía **Firebase** y visualización con **Google Maps**.

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
  │  Distance Matrix API
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
│   ├── uv.lock                 # generado automáticamente
│   ├── main.py                 # entry point Cloud Function
│   ├── genetic_algorithm.py    # lógica del algoritmo genético
│   ├── distance_matrix.py      # Distance Matrix API
│   └── .env.example
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── components/
│       │   ├── Map.jsx
│       │   ├── DestinationInput.jsx
│       │   └── RouteResult.jsx
│       └── services/
│           ├── firebase.js
│           └── cloudFunction.js
└── diagrams/
    ├── flow.drawio
    └── architecture.drawio
```

---

## Requisitos previos

- Node.js ≥ 18
- Python ≥ 3.11
- [uv](https://github.com/astral-sh/uv) (`pip install uv`)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install)
- Proyecto en GCP con las siguientes APIs habilitadas:
  - Cloud Functions
  - Distance Matrix API
  - Maps JavaScript API
  - Places API
- Proyecto en Firebase con Authentication → Google habilitado

---

## Configuración de variables de entorno

### Backend
```bash
cd backend
cp .env.example .env
# Edita .env y agrega tu MAPS_KEY
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Edita .env con tus credenciales de Firebase, Maps JS Key y URL de la Cloud Function
```

---

## Correr en local (desarrollo)

### Backend
```bash
cd backend
uv sync                          # instala dependencias
export MAPS_KEY="tu_key_aqui"
uv run functions-framework --target=optimize_route --port=8080
```

Prueba con curl:
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

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Abre http://localhost:5173

---

## Deploy

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

Copia la URL que aparece al final y ponla en `frontend/.env` como `VITE_CF_URL`.

### Frontend (Vite build)
```bash
cd frontend
npm run build
# Sube la carpeta dist/ a Firebase Hosting, Vercel, Netlify, etc.
```

---

## Seguridad

- Las API Keys se manejan **únicamente** por variables de entorno.
- Los archivos `.env` están en `.gitignore` y **nunca** se suben al repositorio.
- La Cloud Function acepta solo las IPs configuradas en GCP Console → APIs & Services → Credentials.
- Solo usuarios autenticados con Firebase pueden invocar el cálculo.

---

## Algoritmo Genético

| Parámetro | Valor |
|---|---|
| Tamaño de población | 120 |
| Generaciones máximas | 600 |
| Élite | 12 individuos |
| Selección | Torneo (k=3) |
| Cruce | Order Crossover OX1 |
| Mutación | Swap (tasa 2%) |
| Parada anticipada | 120 gen sin mejora |

**Cromosoma:** permutación de índices de destinos.  
**Fitness:** distancia total en metros (se minimiza).
