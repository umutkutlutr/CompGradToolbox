from fastapi import APIRouter, HTTPException
from app.services.professors_services import get_all_professors
from pydantic import BaseModel
from typing import List, Optional
from app.services.professors_services import get_professor_by_id, update_professor



class ProfessorUpdateModel(BaseModel):
    name: Optional[str] = None
    preferred_ta_ids: List[int] = []   # list of TA ids

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


@router.get("/professors/{professor_id}")
def fetch_professor(professor_id: int):
    try:
        prof = get_professor_by_id(professor_id)
        if not prof:
            raise HTTPException(status_code=404, detail="Professor not found")
        return prof
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/professors/{professor_id}")
def update_professor_profile(professor_id: int, payload: ProfessorUpdateModel):
    try:
        prof = get_professor_by_id(professor_id)
        if not prof:
            raise HTTPException(status_code=404, detail="Professor not found")

        update_professor(
            professor_id=professor_id,
            name=payload.name,
            preferred_ta_ids=payload.preferred_ta_ids
        )
        return get_professor_by_id(professor_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
