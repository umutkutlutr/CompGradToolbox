from fastapi import APIRouter, HTTPException
from app.services.onboarding_services import complete_onboarding

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


@router.post("/complete")
def complete_onboarding_route(payload: dict):
    """
    Unified onboarding endpoint.
    Dispatches to TA or Faculty onboarding based on role.
    """
    try:
        result = complete_onboarding(
            user_id=payload["user_id"],
            role=payload["role"],
            data=payload["data"]
        )
        return {
            "message": "Onboarding completed successfully",
            "result": result
        }

    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid onboarding payload")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception:
        raise HTTPException(status_code=500, detail="Onboarding failed")
