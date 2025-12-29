from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict

from app.services.ta_services import get_all_tas, get_ta_by_id, update_ta

router = APIRouter()

class TAUpdateModel(BaseModel):
    name: Optional[str] = None
    skills: List[str] = []
    max_hours: Optional[int] = None
    course_interests: Dict[str, Optional[str]] = {}   # {"COMP302":"High", "COMP421":None}
    preferred_professor_ids: List[int] = []          # [1,5,9]

@router.get("/tas")
def fetch_all_tas():
    try:
        return get_all_tas()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tas/{ta_id}")
def fetch_ta(ta_id: int):
    try:
        ta = get_ta_by_id(ta_id)
        if not ta:
            raise HTTPException(status_code=404, detail="TA not found")
        return ta
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tas/{ta_id}")
def update_ta_profile(ta_id: int, payload: TAUpdateModel):
    try:
        existing_ta = get_ta_by_id(ta_id)
        if not existing_ta:
            raise HTTPException(status_code=404, detail="TA not found")

        update_ta(
            ta_id=ta_id,
            name=payload.name,
            skills=payload.skills,
            max_hours=payload.max_hours,
            course_interests=payload.course_interests,
            preferred_professor_ids=payload.preferred_professor_ids,
        )

        return get_ta_by_id(ta_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
