from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from jose import JWTError, jwt
from passlib.context import CryptContext
from database import SessionLocal, User, History, PasswordResetToken
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
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
    niveau_budget: Optional[str] = "moyen"
    preferences: Optional[list[str]] = []
    ville_depart: Optional[str] = None

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
    if not user:
        return {"message": "Si cet email existe, un lien a été envoyé."}

    # Supprimer les anciens tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == body.email
    ).delete()

    # Générer un token unique valable 15 minutes
    token = secrets.token_urlsafe(32)
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    reset = PasswordResetToken(email=body.email, token=token, expires_at=expires)
    db.add(reset)
    db.commit()

    # Envoyer l'email via Brevo
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset?token={token}"

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = os.getenv("BREVO_API_KEY")
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": body.email}],
        sender={"name": "TravelMate Bot", "email": os.getenv("MAIL_USERNAME")},
        subject="🔑 Réinitialisation de votre mot de passe TravelMate",
        html_content=f"""
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
            Si vous n'avez pas fait cette demande, ignorez cet email.
          </p>
        </div>
        """
    )
    api_instance.send_transac_email(send_smtp_email)

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

    user = db.query(User).filter(User.email == reset.email).first()
    user.hashed_password = pwd_context.hash(body.new_password[:72])
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
        "Adapte chaque journée pour intégrer ces centres d'intérêt."
        if preferences else
        "Propose un programme équilibré et varié."
    )

    contexte_vol = (
        f"L'utilisateur part de '{req.ville_depart}'. "
        f"Inclus une estimation réaliste du prix du vol aller-retour depuis {req.ville_depart} "
        f"vers la destination, pour {req.nb_personnes} personne(s)."
        if req.ville_depart else ""
    )

    instruction_noms_reels = """
RÈGLES OBLIGATOIRES :
1. Utilise TOUJOURS des noms réels et précis pour chaque lieu.
2. Inclus le prix réel indicatif pour chaque lieu.
3. Le tableau "lieux" de chaque jour est OBLIGATOIRE.
"""

    if req.ville_depart:
        vol_field = (
            f'"vol_estime": {{"fourchette": "ex: 89€ - 180€ par personne depuis {req.ville_depart}", '
            f'"type_vol": "low-cost ou régulier", "duree_estimee": "ex: 2h30"}},'
        )
    else:
        vol_field = '"vol_estime": null,'

    descriptions_niveau = {
        "réduit": "budget serré, auberges de jeunesse, transports en commun, restaurants locaux bon marché",
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
        Propose un TOP 3 de destinations. Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
        {{
          "type": "suggestions",
          "niveau_budget": "{niveau}",
          "suggestions": [
            {{
              "destination": "Nom de la ville",
              "pays": "Nom du pays",
              "emoji": "🏛️",
              "atouts": ["atout 1", "atout 2", "atout 3"],
              "budget_estime": "X euros par personne",
              {vol_field}
            }}
          ]
        }}
        """

    elif not req.budget:
        prompt = f"""
        Tu es un expert en voyage. Génère 3 variantes d'itinéraire pour {req.destination}
        du {req.date_debut} au {req.date_fin} pour {req.nb_personnes} personne(s) de catégorie "{req.categorie}".
        {contexte_prefs}
        {contexte_vol}
        {instruction_noms_reels}
        Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
        {{
          "type": "variantes",
          "destination": "{req.destination}",
          "niveau_budget": "{niveau}",
          {vol_field}
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
                  "matin": "activités du matin",
                  "apresmidi": "activités de l'après-midi",
                  "soir": "activités du soir",
                  "lieux": [
                    {{"nom": "Nom réel lieu", "type": "musée", "moment": "matin", "prix": "17€"}}
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
        Niveau de voyage : "{niveau}" ({contexte_niveau}).
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
          {vol_field}
          "hebergement": "Nom réel hôtel + adresse + prix/nuit",
          "jours": [
            {{
              "numero": 1,
              "date": "YYYY-MM-DD",
              "titre": "Titre court du jour",
              "matin": "activités du matin avec prix",
              "apresmidi": "activités de l'après-midi avec prix",
              "soir": "dîner et soirée avec prix",
              "lieux": [
                {{"nom": "Nom réel lieu", "type": "musée", "moment": "matin", "prix": "17€"}}
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
          "conseils": ["conseil 1", "conseil 2", "conseil 3"]
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

    # Sauvegarde dans l'historique si connecté
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