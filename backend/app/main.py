import os
from pathlib import Path
from fastapi import FastAPI
from app.core.config import settings
from app.core.database import get_db_connection
from app.routes import algorithm
from app.routes import algorithm_excel
from app.routes import assignment
from app.routes import tas
from app.routes import professors
from app.routes import weight
from app.routes import login
from app.routes import course
from app.routes import dashboard
from app.routes import activity_log
from app.routes import auth
from app.routes import ta_onboarding, faculty_onboarding
from app.routes import onboarding
from app.routes import skills
from app.routes import ta_assignments
from app.routes import export_assignment_xlsx
from app.routes import checkers
from app.routes import register_finish
from app.routes import users
from app.routes.assignment_history import router as assignment_history_router
from app.routes import import_excel
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

# Disable automatic slash redirects to prevent 307 redirects
# This ensures /courses returns 200 directly instead of redirecting to /courses/
app = FastAPI(redirect_slashes=False)


def init_database_schema():
    """Initialize database schema on startup. Safe to run multiple times (uses IF NOT EXISTS)."""
    try:
        # Get the path to schema.sql relative to this file
        backend_dir = Path(__file__).parent.parent
        schema_path = backend_dir.parent / "database" / "schema.sql"
        
        if not schema_path.exists():
            print(f"⚠️  Schema file not found at {schema_path}, skipping schema initialization.")
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            with open(schema_path, "r") as f:
                sql_commands = f.read()
            
            # Execute each command (split by semicolon)
            for command in sql_commands.split(";"):
                command = command.strip()
                if command and not command.startswith("--"):
                    try:
                        cursor.execute(command)
                    except Exception as e:
                        # Ignore errors for CREATE DATABASE IF NOT EXISTS if DB already exists
                        if "database exists" not in str(e).lower() and "already exists" not in str(e).lower():
                            print(f"⚠️  SQL execution warning: {e}")
            
            conn.commit()
            print("✓ Database schema initialized successfully.")
        except Exception as e:
            print(f"⚠️  Error initializing schema: {e}")
            conn.rollback()
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        print(f"⚠️  Could not initialize database schema: {e}")
        print("   This is OK if tables already exist. Continuing startup...")


@app.on_event("startup")
async def startup_event():
    """Run database schema initialization on startup."""
    init_database_schema()

# Add ProxyHeadersMiddleware FIRST to handle X-Forwarded-Proto from Railway
# This ensures redirects and URLs use HTTPS instead of HTTP
app.add_middleware(
    ProxyHeadersMiddleware,
    trusted_hosts="*"  # Railway proxy is trusted
)

# Enable CORS for frontend communication
# Must be added BEFORE routers are included
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # From ALLOWED_ORIGINS env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(login.router, prefix="/api", tags=["Login"])
app.include_router(algorithm.router, prefix="/api", tags=["Algorithm"])
app.include_router(algorithm_excel.router, prefix="/api", tags=["Algorithm, Excel"])
app.include_router(assignment.router, prefix="/api", tags=["Assignment"])
app.include_router(tas.router, prefix="/api", tags=["TAs"])
app.include_router(professors.router, prefix="/api", tags=["Professors"])
app.include_router(weight.router, prefix="/api/weights", tags=["Weights"])
# Include courses router under both /courses (backward compatibility) and /api/courses (consistent with other APIs)
app.include_router(course.router, prefix="/courses", tags=["courses"])
app.include_router(course.router, prefix="/api/courses", tags=["courses"])
app.include_router(activity_log.router, prefix="/api", tags=["Logs"])
app.include_router(auth.router, prefix="/api", tags=["Register"])
app.include_router(ta_onboarding.router)
app.include_router(faculty_onboarding.router)
app.include_router(onboarding.router)
app.include_router(skills.router, prefix="/api", tags=["Skills"])
app.include_router(ta_assignments.router, prefix="/api", tags=["Assignment"])
app.include_router(export_assignment_xlsx.router, prefix="/api")
app.include_router(assignment_history_router, prefix="/api")
app.include_router(checkers.router, prefix="/api/checkers", tags=["checkers"])
app.include_router(register_finish.router)
app.include_router(import_excel.router)
app.include_router(users.router, prefix="/api")










@app.get("/")
def root():
    return {"message": "Backend is correct"}

@app.get("/config-check")
def config_check():
    """Health check endpoint that returns configuration info (without sensitive data)."""
    return {
        "status": "ok",
        "allowed_origins": settings.ALLOWED_ORIGINS,
        "db_host": settings.DB_HOST,
        "db_user": settings.DB_USER,
    }
