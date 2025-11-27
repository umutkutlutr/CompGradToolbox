from fastapi import APIRouter
from app.services.assignment_excel import generate_ta_assignments

router = APIRouter()

@router.get("/run-assignment-excel")
def run_assignment():
    """
    Run the TA assignment algorithm and return the assignments & workloads.
    """
    result = generate_ta_assignments("COMP_2025_Spring(1).xlsx")
    return result