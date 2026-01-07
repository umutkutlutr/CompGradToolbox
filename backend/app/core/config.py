import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PORT: int = int(os.getenv("PORT", 3306))

    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "Khalil2003")
    DB_NAME: str = os.getenv("DB_NAME", "TA_Assignment_System")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecret")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    
    # CORS allowed origins - comma-separated list
    # Defaults for local dev, production should set via ALLOWED_ORIGINS env var
    _allowed_origins_str: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    )
    
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Parse comma-separated origins string into a list, stripping whitespace."""
        return [origin.strip() for origin in self._allowed_origins_str.split(",") if origin.strip()]


settings = Settings()
