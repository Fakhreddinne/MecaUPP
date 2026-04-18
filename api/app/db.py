from __future__ import annotations

from pymongo import MongoClient
from pymongo.database import Database

from config import settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
    return _client


def get_database() -> Database:
    return get_client()[settings.mongodb_db]


def ping_mongodb() -> bool:
    get_client().admin.command("ping")
    return True


def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
