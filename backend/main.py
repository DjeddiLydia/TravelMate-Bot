from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import os
import json
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TravelRequest(BaseModel):
    destination: Optional[str] = None
    date_debut: str
    date_fin: str
    budget: Optional[float] = None
    nb_personnes: int
    categorie: str

@app.post("/itineraire")
async def generer_itineraire(req: TravelRequest):

    if not req.destination:
        prompt = f"""
        Tu es un expert en voyage. Un utilisateur de catégorie "{req.categorie}" 
        voyage du {req.date_debut} au {req.date_fin} avec un budget de {req.budget or "non défini"} euros 
        pour {req.nb_personnes} personne(s).
        
        Propose un TOP 3 de destinations. Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
        {{
          "type": "suggestions",
          "suggestions": [
            {{
              "destination": "Nom de la ville",
              "pays": "Nom du pays",
              "emoji": "🏛️",
              "atouts": ["atout 1", "atout 2", "atout 3"],
              "budget_estime": "X euros par personne"
            }}
          ]
        }}
        """

    elif not req.budget:
        prompt = f"""
        Tu es un expert en voyage. Génère 3 variantes d'itinéraire pour {req.destination}
        du {req.date_debut} au {req.date_fin} pour {req.nb_personnes} personne(s) de catégorie "{req.categorie}".
        
        Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
        {{
          "type": "variantes",
          "destination": "{req.destination}",
          "variantes": [
            {{
              "niveau": "Serré",
              "emoji": "💰",
              "budget_total": "X euros",
              "description": "description courte",
              "jours": [
                {{
                  "numero": 1,
                  "date": "YYYY-MM-DD",
                  "titre": "Titre du jour",
                  "matin": "activités du matin",
                  "apresmidi": "activités de l'après-midi",
                  "soir": "activités du soir"
                }}
              ]
            }}
          ]
        }}
        """

    else:
        prompt = f"""
        Tu es un expert en voyage. Génère un itinéraire détaillé pour {req.destination}
        du {req.date_debut} au {req.date_fin} pour {req.nb_personnes} personne(s)
        de catégorie "{req.categorie}" avec un budget de {req.budget} euros.
        
        Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
        {{
          "type": "itineraire",
          "destination": "{req.destination}",
          "budget_total": {req.budget},
          "nb_personnes": {req.nb_personnes},
          "categorie": "{req.categorie}",
          "jours": [
            {{
              "numero": 1,
              "date": "YYYY-MM-DD",
              "titre": "Titre court du jour",
              "matin": "description des activités du matin avec prix",
              "apresmidi": "description des activités de l'après-midi avec prix",
              "soir": "description du dîner et soirée avec prix"
            }}
          ],
          "budget_detail": {{
            "hebergement": "X euros",
            "transport": "X euros",
            "nourriture": "X euros",
            "activites": "X euros",
            "total": "X euros"
          }},
          "conseils": ["conseil 1", "conseil 2", "conseil 3"]
        }}
        """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    
    text = response.choices[0].message.content
    # Nettoyer le JSON si l'IA ajoute des backticks
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    
    data = json.loads(text)
    return data

@app.get("/")
def root():
    return {"message": "TravelMate API is running 🚀"}