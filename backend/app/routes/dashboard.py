from fastapi import APIRouter, HTTPException
from app.services.dashboard_service import get_dashboard_summary

router = APIRouter()

@router.get("/dashboard")
def dashboard_summary():
    try:
        return get_dashboard_summary()
    except Exception as e:
        print("Dashboard summary error:", e)
        raise HTTPException(status_code=500, detail="Failed to load dashboard summary")
