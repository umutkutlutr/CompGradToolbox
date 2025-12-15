from fastapi import APIRouter, HTTPException
from app.services.assignmentAlgorithm import run_assignment_algorithm, updateDB
from app.services.activity_log_service import add_log
import traceback

router = APIRouter()

@router.get("/run-assignment")
def run_assignment(user: str = "System"):
    """
    Run the TA assignment algorithm and return the assignments & workloads.
    """
    try:
        # Run algorithm
        result = run_assignment_algorithm()

        # Update DB with assignments
        updateDB(result["assignments"])

        # Log success
        add_log(
            action="TA assignment run completed",
            user=user,
            type="success"
        )

        return result

    except Exception as e:
        traceback.print_exc()   # 🔑 THIS IS CRITICAL

        # Log failure
        add_log(
            action=f"TA assignment run failed: {str(e)}",
            user=user,
            type="warning"
        )

        raise HTTPException(status_code=500, detail=str(e))
