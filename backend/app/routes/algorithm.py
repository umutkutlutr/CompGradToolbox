from fastapi import APIRouter
from app.services.assignmentAlgorithm import run_assignment_algorithm

router = APIRouter()

@router.get("/run-assignment")
def run_assignment():
    """
    Run the TA assignment algorithm and return the assignments & workloads.
    """
    result = run_assignment_algorithm()
    return result


# TO BE REMOVED / REDUNDANT