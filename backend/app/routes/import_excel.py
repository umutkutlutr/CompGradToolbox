from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.excel_import_service import import_comp_excel

router = APIRouter()

@router.post("/api/import/excel")
async def import_excel(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Please upload a .xlsx file")

    content = await file.read()
    try:
        result = import_comp_excel(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
