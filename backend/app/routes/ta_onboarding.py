from fastapi import APIRouter, HTTPException
from app.models import TAOnboardingRequest
from app.services.ta_onboarding_service import onboard_ta

router = APIRouter(prefix="/api/ta", tags=["TA Onboarding"])


@router.post("/onboard")
def onboard_ta_route(data: TAOnboardingRequest):
    """
    Create a fully-valid TA and link it to the user.
    """
    try:
        ta_id = onboard_ta(data)
        return {
            "message": "TA onboarding completed successfully",
            "ta_id": ta_id
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception:
        raise HTTPException(status_code=500, detail="TA onboarding failed")
