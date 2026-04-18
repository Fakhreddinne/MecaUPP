from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://mecaup:mecaup_password@mongodb:27017/mecaup?authSource=admin"
    mongodb_db: str = "mecaup"
    carimages_api_key: str = ""
    carimages_base_url: str = "https://carimagesapi.com"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
