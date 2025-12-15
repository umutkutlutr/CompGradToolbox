from fastapi import APIRouter, HTTPException
from app.models import FacultyOnboardingRequest
from app.services.faculty_onboarding_service import onboard_faculty
import traceback

router = APIRouter(prefix="/api/faculty", tags=["Faculty Onboarding"])


@router.post("/onboard")
def onboard_faculty_route(data: FacultyOnboardingRequest):
    """
    Create a faculty profile and save TA preferences.
    """
    try:
        professor_id = onboard_faculty(data)
        return {
            "message": "Faculty onboarding completed successfully",
            "professor_id": professor_id
        }

    except ValueError as e:

        raise HTTPException(status_code=400, detail=str(e))

    except Exception:
        traceback.print_exc()   # <<< THIS IS CRITICAL

        raise HTTPException(status_code=500, detail="Faculty onboarding failed")
