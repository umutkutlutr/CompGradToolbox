from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.assignmentAlgorithm import run_assignment_algorithm, updateDB
from app.services.assignment_excel import generate_ta_assignments
from app.services.assignment_service import get_saved_assignments, override_assignment
import tempfile
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/run-assignment-manual")
def run_assignment_manual():
    """
    Run the manual TA assignment algorithm using available TAs and Professors.
    """
    try:
        result = run_assignment_algorithm()
        return {
            "status": "success",
            "method": "manual",
            "data": result
        }
    except Exception as e:
        logger.error(f"Error running manual assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-assignment-excel")
async def run_assignment_excel(file: UploadFile = File(...)):
    """
    Run the TA assignment algorithm using an Excel file.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Run the assignment algorithm
            result = generate_ta_assignments(temp_file_path)
            
            # Check for errors in result
            if "error" in result:
                raise HTTPException(status_code=400, detail=result["error"])
            
            return {
                "status": "success",
                "method": "excel",
                "data": result
            }
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running Excel assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/get-assignments")
def fetch_assignments():
    """
    Returns:
    - assignments by course
    - workloads computed as number of assigned courses
    """

    try:
        result = get_saved_assignments()
        return result

    except Exception as e:
        print("Error fetching assignments:", e)
        raise HTTPException(status_code=500, detail="Failed to fetch assignment results")
    
@router.post("/override-assignment")
def override_assignment_route(payload: dict):
    try:
        result = override_assignment(payload)
        return result
    except Exception as e:
        print("Error overriding assignment:", e)
        raise HTTPException(status_code=500, detail="Failed to override assignment")
