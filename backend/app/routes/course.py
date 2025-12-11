from fastapi import APIRouter, Query, HTTPException
from typing import List
from app.models import Course
from app.services.course_services import get_courses, get_courses_by_professor_username, CourseUpdate, update_course_in_db
from app.services.activity_log_service import add_log
from app.core.database import get_db_connection

router = APIRouter()

@router.get("/", response_model=list[Course])
def read_courses():
    return get_courses()


@router.get("/by-professor", response_model=List[Course])
def read_courses_by_professor(username: str = Query(..., description="Professor's username")):
    """
    Get all courses for a given professor by username.
    """
    return get_courses_by_professor_username(username)

@router.put("/update")
def update_course_route(data: CourseUpdate, user: str = Query(..., description="User performing the update")):
    """
    Updates TA count and skills for a course.
    """
    try:
        result = update_course_in_db(data)

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT course_code FROM course WHERE course_id = %s",
            (data.course_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        course_name = row["course_code"] if row else f"ID {data.course_id}"

        log_message = (
            f"Updated course {course_name}: "
            f"TA requested = {data.num_tas_requested}, "
            f"Skills = {', '.join(data.skills)}"
        )
        add_log(action=log_message, user=user, type="info")

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))