from fastapi import APIRouter, HTTPException
from app.services.ta_services import get_all_tas

router = APIRouter()

@router.get("/tas")
def fetch_all_tas():
    """
    Return all TAs from the database.
    """
    try:
        tas = get_all_tas()
        return tas
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
