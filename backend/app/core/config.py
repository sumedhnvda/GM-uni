from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cropic"
    API_V1_STR: str = "/api/v1"
    
    # Google Auth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    
    # Gemini
    GEMINI_API_KEY: str = ""
    
    # Twilio (set via environment variables)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_MESSAGING_SERVICE_SID: str = ""
    
    # Weather
    WEATHER_API_KEY: str = "your_weather_api_key" # Placeholder
    
    # Sarvam
    SARVAM_API_KEY: str
    
    # Database & AI
    MONGODB_URL: str
    OPENAI_API_KEY: str

    # Security
    SECRET_KEY: str = "your_secret_key" # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
