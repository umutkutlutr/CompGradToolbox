from fastapi import APIRouter, HTTPException
from app.services.auth_service import register_user
from app.models import RegisterRequestModel
import traceback

router = APIRouter()

@router.post("/register")
def register(data: RegisterRequestModel):
    try:
        user_id = register_user(
            name=data.name,
            username=data.username,
            password=data.password,
            role=data.role
        )
        return {"message": "User registered successfully",
                "user_id": user_id}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception:
        raise HTTPException(status_code=500, detail="Registration failed")