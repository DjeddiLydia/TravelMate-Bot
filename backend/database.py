from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import os
 
SQLALCHEMY_DATABASE_URL = "sqlite:///./travelmate.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
 
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
 
class History(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    params = Column(Text)
    result = Column(Text)
 
class PasswordResetToken(Base):
    __tablename__ = "reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used = Column(String, default="false")
 
Base.metadata.create_all(bind=engine)