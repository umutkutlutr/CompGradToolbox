from app.core.database import get_db_connection
from app.models import Course
from typing import List
from pydantic import BaseModel


class CourseUpdate(BaseModel):
    course_id: int
    num_tas_requested: int
    skills: List[str]


def get_courses() -> list[Course]:
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM course")
        results = cursor.fetchall()

        for course in results:
            cursor.execute(
                "SELECT skill FROM course_skill WHERE course_id = %s",
                (course["course_id"],)
            )
            skill_rows = cursor.fetchall()
            course["skills"] = [row["skill"] for row in skill_rows]

        return results
    
from app.core.database import get_db_connection
from app.models import Course  # assuming Course model exists

def get_courses_by_professor_username(username: str) -> list[dict]:
    """
    Fetch all courses taught by the professor with the given username,
    including assigned TAs and course skills.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Step 1: Get professor_id from username
    cursor.execute(
        "SELECT professor_id FROM user WHERE username = %s AND professor_id IS NOT NULL",
        (username,)
    )
    prof_row = cursor.fetchone()
    if not prof_row:
        cursor.close()
        conn.close()
        return []

    professor_id = prof_row["professor_id"]

    # Step 2: Get courses taught by this professor
    cursor.execute(
        """
        SELECT c.course_id, c.course_code, c.ps_lab_sections, c.enrollment_capacity,
               c.actual_enrollment, c.num_tas_requested, c.assigned_tas_count
        FROM course c
        JOIN course_professor cp ON c.course_id = cp.course_id
        WHERE cp.professor_id = %s
        """,
        (professor_id,)
    )
    courses = cursor.fetchall()

    for course in courses:
        course_id = course["course_id"]

        # Step 3: Assigned TAs
        cursor.execute(
            """
            SELECT ta.ta_id, ta.name
            FROM ta_assignment
            JOIN ta ON ta_assignment.ta_id = ta.ta_id
            WHERE ta_assignment.course_id = %s
            """,
            (course_id,)
        )
        assigned_rows = cursor.fetchall()
        course["assignedTAs"] = [row["name"] for row in assigned_rows]

        # Step 4: Course skills
        cursor.execute(
            "SELECT skill FROM course_skill WHERE course_id = %s",
            (course_id,)
        )
        skill_rows = cursor.fetchall()
        course["skills"] = [row["skill"] for row in skill_rows]

    cursor.close()
    conn.close()
    return courses

def update_course_in_db(data: CourseUpdate):
    """
    Updates:
    - course.num_tas_requested
    - course_skill table (removes old skills, inserts new)
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Update num_tas_requested
        cursor.execute("""
            UPDATE course
            SET num_tas_requested = %s
            WHERE course_id = %s
        """, (data.num_tas_requested, data.course_id))

        # 2. Delete old skills
        cursor.execute("""
            DELETE FROM course_skill
            WHERE course_id = %s
        """, (data.course_id,))

        # 3. Insert new skills
        for skill in data.skills:
            cursor.execute("""
                INSERT INTO course_skill (course_id, skill)
                VALUES (%s, %s)
            """, (data.course_id, skill))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Course updated successfully"}

    except Exception as e:
        print("Error updating course:", e)
        raise