from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./mecaup.db"
    secret_key: str = "dev_secret_change_later"

    class Config:
        env_file = ".env"

settings = Settings()