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
    niveau_budget: Optional[str] = "moyen"  # réduit | moyen | premium
    preferences: Optional[list[str]] = []   # nature | gastronomie | culture | shopping | nightlife | aventure | detente | photo
    ville_depart: Optional[str] = None      # ville de départ pour estimation vol

@app.post("/itineraire")
async def generer_itineraire(req: TravelRequest):

    niveau = req.niveau_budget or "moyen"
    preferences = req.preferences or []
    contexte_prefs = (
        f"L'utilisateur a les préférences suivantes : {', '.join(preferences)}. "
        "Adapte chaque journée pour intégrer ces centres d'intérêt : "
        "nature→parcs/jardins/randonnées, gastronomie→meilleurs restaurants/marchés locaux/spécialités, "
        "culture→musées/monuments/sites historiques, shopping→marchés/boutiques locales, "
        "nightlife→bars/clubs/rooftops, aventure→sports/kayak/vélo, "
        "detente→spas/plages/thermes, photo→spots panoramiques/couchers de soleil."
        if preferences else
        "Propose un programme équilibré et varié."
    )

    contexte_vol = (
        f"L'utilisateur part de '{req.ville_depart}'. "
        f"Inclus une estimation réaliste du prix du vol aller-retour depuis {req.ville_depart} "
        f"vers la destination, pour {req.nb_personnes} personne(s), "
        f"aux dates {req.date_debut} → {req.date_fin}, niveau budget '{niveau}'. "
        "Fournis une fourchette de prix (ex: 120€ - 200€ par personne) et le type de vol probable (low-cost, régulier, correspondance)."
        if req.ville_depart else
        ""
    )

    instruction_noms_reels = """
RÈGLES OBLIGATOIRES :
1. Utilise TOUJOURS des noms réels et précis pour chaque lieu (restaurant, musée, parc, bar, marché, monument).
   Exemples : "Musée d'Orsay", "Restaurant Chez Paul", "Jardin du Luxembourg", "Bar Le Perchoir".
2. Inclus le prix réel indicatif pour chaque lieu (ex: "entrée 15€", "menu 25€", "gratuit").
3. Le tableau "lieux" de chaque jour est OBLIGATOIRE et doit lister TOUS les lieux mentionnés dans matin/apresmidi/soir.
   Exemple de tableau lieux correct :
   "lieux": [
     {"nom": "Musée du Louvre", "type": "musée", "moment": "matin", "prix": "17€"},
     {"nom": "Café de Flore", "type": "restaurant", "moment": "apresmidi", "prix": "20€"},
     {"nom": "Bar Le Perchoir", "type": "bar", "moment": "soir", "prix": "entrée libre"}
   ]
   Les valeurs de "type" autorisées : musée, restaurant, parc, bar, monument, marché, spa, hôtel, autre.
   Les valeurs de "moment" autorisées : matin, apresmidi, soir.
"""

    # Champ vol_estime à injecter dans le JSON selon si ville_depart est fournie
    if req.ville_depart:
        vol_field_suggestion = (
            f'"vol_estime": {{'
            f'"fourchette": "mets ici la fourchette réelle ex: 89€ - 180€ par personne depuis {req.ville_depart}", '
            f'"type_vol": "mets ici low-cost ou régulier ou correspondance", '
            f'"duree_estimee": "mets ici la durée réelle ex: 2h30"'
            f'}},'
        )
        vol_field_multi = (
            f'"vol_estime": {{'
            f'"fourchette": "mets ici la fourchette réelle ex: 89€ - 180€ par personne depuis {req.ville_depart}", '
            f'"type_vol": "mets ici low-cost ou régulier ou correspondance", '
            f'"duree_estimee": "mets ici la durée réelle ex: 2h30", '
            f'"total_personnes": "mets ici le total pour {req.nb_personnes} personne(s) ex: 178€ - 360€ au total"'
            f'}},'
        )
    else:
        vol_field_suggestion = '"vol_estime": null,'
        vol_field_multi = '"vol_estime": null,'

    descriptions_niveau = {
        "réduit": "budget serré, privilégier les auberges de jeunesse, transports en commun, restaurants locaux bon marché",
        "moyen": "confort standard, hôtels 3 étoiles, transports mixtes, restaurants mid-range",
        "premium": "voyage haut de gamme, hôtels 4-5 étoiles, taxis/vols, restaurants gastronomiques"
    }
    contexte_niveau = descriptions_niveau.get(niveau, descriptions_niveau["moyen"])

    if not req.destination:
        prompt = f"""
        Tu es un expert en voyage. Un utilisateur de catégorie "{req.categorie}"
        voyage du {req.date_debut} au {req.date_fin} avec un niveau de budget "{niveau}" ({contexte_niveau})
        pour {req.nb_personnes} personne(s).
        {contexte_prefs}
        {contexte_vol}
        {instruction_noms_reels}

        Propose un TOP 3 de destinations ADAPTÉES à ce niveau de budget ET aux préférences de l'utilisateur. Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
        {{
          "type": "suggestions",
          "niveau_budget": "{niveau}",
          "suggestions": [
            {{
              "destination": "Nom de la ville",
              "pays": "Nom du pays",
              "emoji": "🏛️",
              "atouts": ["atout 1 avec nom réel de lieu", "atout 2 avec nom réel", "atout 3 avec nom réel"],
              "lieux_incontournables": ["Nom réel lieu 1", "Nom réel lieu 2", "Nom réel lieu 3"],
              "restaurant_recommande": "Nom réel du restaurant recommandé + spécialité + prix moyen",
              "budget_estime": "X euros par personne",
              "pourquoi_ce_niveau": "explication courte pourquoi cette ville correspond au niveau {niveau}",
              {vol_field_suggestion}
            }}
          ]
        }}
        """

    elif not req.budget:
        prompt = f"""
        Tu es un expert en voyage. Génère 3 variantes d'itinéraire pour {req.destination}
        du {req.date_debut} au {req.date_fin} pour {req.nb_personnes} personne(s) de catégorie "{req.categorie}".
        L'utilisateur a choisi un niveau de budget "{niveau}" ({contexte_niveau}).
        Les 3 variantes doivent être : Réduit, Moyen, Premium — mais calibrées autour du niveau "{niveau}" choisi.
        {contexte_prefs}
        {contexte_vol}
        {instruction_noms_reels}

        Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
        {{
          "type": "variantes",
          "destination": "{req.destination}",
          "niveau_budget": "{niveau}",
          {vol_field_multi}
          "variantes": [
            {{
              "niveau": "Réduit",
              "emoji": "💰",
              "budget_total": "X euros",
              "description": "description courte",
              "jours": [
                {{
                  "numero": 1,
                  "date": "YYYY-MM-DD",
                  "titre": "Titre du jour",
                  "matin": "Visite de [NOM RÉEL DU LIEU] (prix: X€) + description",
                  "apresmidi": "Déjeuner au [NOM RÉEL RESTAURANT] spécialité locale (X€/pers) puis [NOM RÉEL ACTIVITÉ/LIEU]",
                  "soir": "Dîner au [NOM RÉEL RESTAURANT] (X€/pers) puis [NOM RÉEL BAR/ACTIVITÉ NOCTURNE]",
                  "lieux": [
                    {{"nom": "NOM RÉEL lieu du matin", "type": "musée", "moment": "matin", "prix": "17€"}},
                    {{"nom": "NOM RÉEL restaurant midi", "type": "restaurant", "moment": "apresmidi", "prix": "22€"}},
                    {{"nom": "NOM RÉEL bar/lieu du soir", "type": "bar", "moment": "soir", "prix": "entrée libre"}}
                  ]
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
        Le niveau de voyage choisi est "{niveau}" ({contexte_niveau}).
        Adapte les hébergements, transports, restaurants et activités à ce niveau.
        {contexte_prefs}
        {contexte_vol}
        {instruction_noms_reels}

        Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
        {{
          "type": "itineraire",
          "destination": "{req.destination}",
          "budget_total": {req.budget},
          "nb_personnes": {req.nb_personnes},
          "categorie": "{req.categorie}",
          "niveau_budget": "{niveau}",
          "ville_depart": "{req.ville_depart or ''}",
          {vol_field_multi}
          "hebergement": "Nom réel de l'hôtel/auberge recommandé + adresse courte + prix/nuit",
          "jours": [
            {{
              "numero": 1,
              "date": "YYYY-MM-DD",
              "titre": "Titre court du jour",
              "matin": "Visite de [NOM RÉEL DU LIEU] (prix entrée: X€) — description de l'activité",
              "apresmidi": "Déjeuner au [NOM RÉEL RESTAURANT] — spécialité: [plat] (X€/pers). Puis [NOM RÉEL LIEU/ACTIVITÉ] (X€ ou gratuit)",
              "soir": "Dîner au [NOM RÉEL RESTAURANT] (X€/pers). Soirée: [NOM RÉEL BAR/LIEU] (X€ ou gratuit)",
              "lieux": [
                {{"nom": "NOM RÉEL lieu du matin", "type": "musée", "moment": "matin", "prix": "17€"}},
                {{"nom": "NOM RÉEL restaurant déjeuner", "type": "restaurant", "moment": "apresmidi", "prix": "22€"}},
                {{"nom": "NOM RÉEL lieu après-midi", "type": "parc", "moment": "apresmidi", "prix": "gratuit"}},
                {{"nom": "NOM RÉEL restaurant dîner", "type": "restaurant", "moment": "soir", "prix": "35€"}},
                {{"nom": "NOM RÉEL bar/lieu soirée", "type": "bar", "moment": "soir", "prix": "entrée libre"}}
              ]
            }}
          ],
          "budget_detail": {{
            "hebergement": "X euros",
            "transport": "X euros",
            "nourriture": "X euros",
            "activites": "X euros",
            "total": "X euros"
          }},
          "conseils": ["conseil pratique 1 avec nom réel si pertinent", "conseil 2", "conseil 3"]
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