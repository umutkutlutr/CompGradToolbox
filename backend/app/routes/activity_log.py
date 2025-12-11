from fastapi import APIRouter
from app.services.activity_log_service import get_recent_logs

router = APIRouter()

@router.get("/logs")
def recent_activity():
    return get_recent_logs(10)
