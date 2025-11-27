from fastapi import FastAPI
from app.core.config import settings
from app.routes import algorithm
from app.routes import algorithm_excel
from app.routes import assignment
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(algorithm.router, prefix="/api", tags=["Algorithm"])
app.include_router(algorithm_excel.router, prefix="/api", tags=["Algorithm, Excel"])
app.include_router(assignment.router, prefix="/api", tags=["Assignment"])




@app.get("/")
def root():
    return {"message": "Backend is correct"}

@app.get("/config-check")
def config_check():
    return {
        "db_host": settings.DB_HOST,
        "db_user": settings.DB_USER,
    }
