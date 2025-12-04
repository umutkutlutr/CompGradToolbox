from fastapi import APIRouter, HTTPException
from app.services.professors_services import get_all_professors

router = APIRouter()

@router.get("/professors")
def fetch_all_professors():
    """
    Return all professors from the database.
    """
    try:
        professors = get_all_professors()
        return professors
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
