from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.services.ta_services import get_all_tas, get_ta_by_id, update_ta

router = APIRouter()

class TAUpdateModel(BaseModel):
    skills: List[str]
    max_hours: int
    course_interests: Dict[str, Optional[str]]  # e.g., {"COMP302": "High", "COMP421": None}

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
    
@router.get("/tas/{ta_id}")
def fetch_ta(ta_id: int):
    """
    Return a single TA by ID
    """
    try:
        ta = get_ta_by_id(ta_id)
        if not ta:
            raise HTTPException(status_code=404, detail="TA not found")
        return ta
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tas/{ta_id}")
def update_ta_profile(ta_id: int, payload: TAUpdateModel):
    """
    Update a TA profile: skills, max hours, and course interests.
    """
    try:
        existing_ta = get_ta_by_id(ta_id)
        if not existing_ta:
            raise HTTPException(status_code=404, detail="TA not found")

        update_ta(
            ta_id=ta_id,
            skills=payload.skills,
            max_hours=payload.max_hours,
            course_interests=payload.course_interests
        )

        updated_ta = get_ta_by_id(ta_id)
        return updated_ta
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
