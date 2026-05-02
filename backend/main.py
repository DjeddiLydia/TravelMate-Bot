from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from database import SessionLocal, User, History, PasswordResetToken
import os
import json
import secrets
import datetime
from dotenv import load_dotenv
 
load_dotenv()
 
# --- Config ---
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
 
mail_config = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_USERNAME"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)
 
app = FastAPI()
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# --- Helpers ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
 
def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="Non authentifié")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
 
# --- Modèles ---
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
 
class UserCreate(BaseModel):
    email: str
    password: str
 
class ForgotPasswordRequest(BaseModel):
    email: str
 
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
 
# --- Routes Auth ---
@app.post("/register")
def register(body: UserCreate, db=Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = User(email=body.email, hashed_password=pwd_context.hash(body.password[:72]))
    db.add(user)
    db.commit()
    return {"message": "Compte créé ✅"}
 
@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not pwd_context.verify(form.password[:72], user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    token = jwt.encode({"sub": user.email}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}
 
@app.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db=Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    # Toujours répondre OK pour ne pas révéler si l'email existe
    if not user:
        return {"message": "Si cet email existe, un lien a été envoyé."}
 
    # Supprimer les anciens tokens de cet email
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == body.email
    ).delete()
 
    # Générer un token unique valable 15 minutes
    token = secrets.token_urlsafe(32)
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    reset = PasswordResetToken(email=body.email, token=token, expires_at=expires)
    db.add(reset)
    db.commit()
 
    # Envoyer l'email
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset?token={token}"
    message = MessageSchema(
        subject="🔑 Réinitialisation de votre mot de passe TravelMate",
        recipients=[body.email],
        body=f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:32px;background:#0f172a;color:#fff;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;">✈️</div>
            <h1 style="color:#60a5fa;margin:8px 0;">TravelMate Bot</h1>
          </div>
          <h2 style="color:#fff;margin-bottom:12px;">Réinitialisation de mot de passe</h2>
          <p style="color:#94a3b8;line-height:1.6;">
            Vous avez demandé à réinitialiser votre mot de passe.<br>
            Cliquez sur le bouton ci-dessous — le lien est valable <strong style="color:#fff;">15 minutes</strong>.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="{reset_link}"
               style="background:linear-gradient(to right,#3b82f6,#6366f1);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
              🔑 Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color:#64748b;font-size:13px;text-align:center;">
            Si vous n'avez pas fait cette demande, ignorez cet email.<br>
            Votre mot de passe ne sera pas modifié.
          </p>
        </div>
        """,
        subtype="html"
    )
    fm = FastMail(mail_config)
    await fm.send_message(message)
 
    return {"message": "Si cet email existe, un lien a été envoyé."}
 
@app.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db=Depends(get_db)):
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == body.token,
        PasswordResetToken.used == "false"
    ).first()
 
    if not reset:
        raise HTTPException(status_code=400, detail="Lien invalide ou déjà utilisé")
 
    if datetime.datetime.utcnow() > reset.expires_at:
        raise HTTPException(status_code=400, detail="Lien expiré, refaites la demande")
 
    # Mettre à jour le mot de passe
    user = db.query(User).filter(User.email == reset.email).first()
    user.hashed_password = pwd_context.hash(body.new_password[:72])
 
    # Marquer le token comme utilisé
    reset.used = "true"
    db.commit()
 
    return {"message": "Mot de passe mis à jour ✅"}
 
@app.get("/history")
def get_history(current_user=Depends(get_current_user), db=Depends(get_db)):
    entries = db.query(History).filter(
        History.user_email == current_user.email
    ).order_by(History.created_at.desc()).all()
    return [
        {
            "id": e.id,
            "date": e.created_at,
            "params": json.loads(e.params),
            "result": json.loads(e.result)
        }
        for e in entries
    ]
 
# --- Route principale ---
@app.post("/itineraire")
async def generer_itineraire(req: TravelRequest, request: Request):

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
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
 
    data = json.loads(text)
 
    # Sauvegarde dans l'historique si l'utilisateur est connecté
    try:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "")
        if token:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            db = SessionLocal()
            entry = History(
                user_email=email,
                params=req.json(),
                result=json.dumps(data)
            )
            db.add(entry)
            db.commit()
            db.close()
    except Exception:
        pass
 
    return data
 
@app.get("/")
def root():
    return {"message": "TravelMate API is running 🚀"}