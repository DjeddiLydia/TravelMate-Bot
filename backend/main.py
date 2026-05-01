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
    reset_link = f"http://localhost:3000/reset?token={token}"
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