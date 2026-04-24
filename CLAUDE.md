# TravelMate-Bot — CLAUDE.md

## Objectif du projet

TravelMate-Bot est un assistant de voyage intelligent propulsé par IA. Il permet à un utilisateur de générer automatiquement des itinéraires de voyage personnalisés en fonction de ses dates, budget, destination et profil de voyageur. Le tout via une interface web moderne qui communique avec un backend Python/LLM.

---

## Architecture générale

```
TravelMate-Bot/
├── backend/              # API Python FastAPI
│   ├── main.py           # Serveur + logique LLM (point d'entrée)
│   ├── .env              # Variables d'environnement (GROQ_API_KEY)
│   └── venv/             # Environnement virtuel Python
└── frontend/             # Interface React / Next.js
    ├── app/
    │   ├── page.js       # Page principale : formulaire + affichage résultats
    │   ├── layout.js     # Layout racine + métadonnées
    │   └── globals.css   # Styles globaux (Tailwind CSS)
    ├── public/           # Assets statiques
    └── package.json      # Dépendances npm
```

---

## Stack technique

| Couche     | Technologie                          |
|------------|--------------------------------------|
| Frontend   | Next.js 16, React 19, Tailwind CSS 4 |
| Backend    | Python, FastAPI, Uvicorn             |
| LLM        | Groq SDK → Llama 3.3-70B versatile   |
| Validation | Pydantic v2                          |
| Config     | python-dotenv                        |

---

## Flux de données

```
Utilisateur (browser)
  └─► page.js (React)
        └─► POST http://127.0.0.1:8000/itineraire  [JSON]
              └─► main.py (FastAPI)
                    └─► Groq API → Llama 3.3-70B
                          └─► Réponse JSON structurée
                                └─► Rendu React (3 types d'affichage)
```

---

## API Backend

### Endpoint principal

**POST** `/itineraire`

Corps de la requête :
```json
{
  "destination": "Rome",        // null = suggestions automatiques
  "date_debut": "2025-07-01",
  "date_fin": "2025-07-07",
  "budget": 1500,               // null = 3 variantes de budget
  "nb_personnes": 2,
  "categorie": "couple"         // couple | famille | retraités | backpacker | groupe d'amis
}
```

### Logique de réponse (3 cas)

| Condition                        | Type de réponse | Description                          |
|----------------------------------|-----------------|--------------------------------------|
| `destination` est null           | `suggestions`   | TOP 3 destinations recommandées      |
| `destination` fournie, pas de budget | `variantes` | 3 itinéraires à niveaux de prix différents |
| `destination` + `budget` fournis | `itineraire`    | Planning jour par jour + budget détaillé |

### Endpoint de santé

**GET** `/` → `{"message": "TravelMate API is running 🚀"}`

---

## Variables d'environnement

Fichier : `backend/.env`

```env
GROQ_API_KEY=your_groq_api_key_here
```

---

## Lancer le projet

### Backend
```bash
cd backend
source venv/Scripts/activate      # Windows (bash)
# ou: source venv/bin/activate    # Linux/Mac
uvicorn main:app --reload
# Disponible sur : http://127.0.0.1:8000
```

### Frontend
```bash
cd frontend
npm run dev
# Disponible sur : http://localhost:3000
```

---

## Points d'attention

- **Pas de base de données** : le projet est 100% stateless, chaque réponse est générée à la volée par le LLM.
- **CORS** : configuré en `allow_origins=["*"]` — à restreindre en production.
- **Clé API** : le fichier `.env` ne doit pas être commité en production (déjà dans `.gitignore`).
- **URL hardcodée** : le frontend appelle `http://127.0.0.1:8000` — à externaliser en variable d'environnement pour un déploiement.
