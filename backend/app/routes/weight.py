from fastapi import APIRouter
from app.models import Weights
from app.services.weight_services import get_weights, update_weights

router = APIRouter()

# Register both / and "" to handle requests with or without trailing slash
@router.get("/", response_model=Weights)
@router.get("", response_model=Weights)
def read_weights():
    return get_weights()

@router.post("/", response_model=dict)
@router.post("", response_model=dict)
def save_weights(weights: Weights):
    update_weights(weights)
    return {"success": True}
