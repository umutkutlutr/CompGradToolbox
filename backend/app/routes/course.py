from fastapi import APIRouter, Query, HTTPException
from typing import List
from app.models import Course, CourseCreate, CourseDetails
from app.services.course_services import get_courses, get_courses_by_professor_username, CourseUpdate, update_course_in_db, create_course_with_professor, remove_course_from_professor_and_delete_if_orphan, get_course_details, get_courses_by_ta_username
from app.services.activity_log_service import add_log
from app.core.database import get_db_connection

router = APIRouter()

# Register both / and "" to handle requests with or without trailing slash
# This prevents 307 redirects when redirect_slashes=False
@router.get("/", response_model=list[Course])
@router.get("", response_model=list[Course])
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
    
def get_professor_display_name(username: str) -> str:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT p.name AS name
        FROM user u
        JOIN professor p ON u.professor_id = p.professor_id
        WHERE u.username = %s
    """, (username,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row["name"] if row and row.get("name") else username

@router.post("/add")
def create_course(
    data: CourseCreate,
    username: str = Query(...)
):
    try:
        course_id = create_course_with_professor(
            data.course_code,
            username,
            data.num_tas_requested or 0,
            data.skills or []
        )

        display_user = get_professor_display_name(username)
        add_log(
            action=f"Added course {data.course_code}",
            user=display_user,
            type="success"
        )

        return {"course_id": course_id}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    
@router.delete("/{course_id}/professor")
def delete_course_from_professor(
    course_id: int,
    username: str = Query(..., description="Professor's username")
):
    try:
        result = remove_course_from_professor_and_delete_if_orphan(course_id, username)

        display_user = get_professor_display_name(username)

        if result.get("deleted_course"):
            add_log(
                action=f"Removed course {result['course_code']} (deleted from system)",
                user=display_user,
                type="warning"
            )
        else:
            add_log(
                action=f"Removed course {result['course_code']} from professor profile",
                user=display_user,
                type="warning"
            )

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/{course_id}/details", response_model=CourseDetails)
def read_course_details(course_id: int):
    data = get_course_details(course_id)
    if not data:
        raise HTTPException(status_code=404, detail="Course not found")
    return data

@router.get("/by-ta", response_model=List[Course])
def read_courses_by_ta(username: str = Query(..., description="TA username")):
    return get_courses_by_ta_username(username)

