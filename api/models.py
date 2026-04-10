import secrets
from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base

def new_token() -> str:
    return secrets.token_urlsafe(24)

class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True)
    token = Column(String(128), unique=True, index=True, default=new_token)

    label = Column(String(120), nullable=False)
    plate = Column(String(32), nullable=True)

    services = relationship("ServiceRecord", back_populates="vehicle", cascade="all, delete-orphan")

class ServiceRecord(Base):
    __tablename__ = "service_records"
    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), index=True, nullable=False)

    date = Column(Date, nullable=False)
    km = Column(Integer, nullable=False)

    title = Column(String(120), nullable=False)
    details = Column(Text, nullable=True)

    next_km = Column(Integer, nullable=True)
    next_date = Column(Date, nullable=True)

    vehicle = relationship("Vehicle", back_populates="services")