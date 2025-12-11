# app/services/assignment_services.py
from fastapi import HTTPException
from app.core.database import get_db_connection
from app.services.activity_log_service import add_log


def get_saved_assignments():
    """
    Fetch TA assignments from DB and compute workloads.
    Workload = number of courses assigned to each TA.
    """

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            c.course_code,
            t.name AS ta_name,
            p.name AS professor_name
        FROM ta_assignment ta
        JOIN ta t ON t.ta_id = ta.ta_id
        JOIN course c ON c.course_id = ta.course_id
        JOIN course_professor cp ON cp.course_id = c.course_id
        JOIN professor p ON p.professor_id = cp.professor_id
    """)
    rows = cursor.fetchall()

    if not rows:
        cursor.close()
        conn.close()
        return {
            "assignments": {},
            "workloads": {}
        }

    assignments = {}

    for row in rows:
        course = row["course_code"]
        ta = row["ta_name"]
        prof = row["professor_name"]

        if course not in assignments:
            assignments[course] = {
                "professor": prof,
                "tas": []
            }

        assignments[course]["tas"].append(ta)
    workloads = {}

    for row in rows:
        ta = row["ta_name"]
        workloads[ta] = workloads.get(ta, 0) + 1

    cursor.close()
    conn.close()


    return {
        "assignments": assignments,
        "workloads": workloads
    }

def override_assignment(payload: dict):
    course_code = payload["course_code"]
    remove_tas = payload.get("remove_tas", [])
    add_tas = payload.get("add_tas", [])

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Get course_id
    cursor.execute("SELECT course_id FROM course WHERE course_code = %s", (course_code,))
    course_row = cursor.fetchone()
    if not course_row:
        raise HTTPException(status_code=404, detail="Course not found")

    course_id = course_row["course_id"]

    # Remove selected TAs
    for ta_name in remove_tas:
        cursor.execute("""
            DELETE ta_assignment
            FROM ta_assignment
            JOIN ta ON ta.ta_id = ta_assignment.ta_id
            WHERE ta.name = %s AND ta_assignment.course_id = %s
        """, (ta_name, course_id))

    # Add selected TAs
    for ta_name in add_tas:
        cursor.execute("SELECT ta_id FROM ta WHERE name = %s", (ta_name,))
        ta = cursor.fetchone()
        if not ta:
            continue  # skip missing TA

        cursor.execute("""
            INSERT IGNORE INTO ta_assignment (ta_id, course_id)
            VALUES (%s, %s)
        """, (ta["ta_id"], course_id))

    conn.commit()
    cursor.close()
    conn.close()

    # Log the override event
    added = ", ".join(add_tas) if add_tas else "none"
    removed = ", ".join(remove_tas) if remove_tas else "none"

    add_log(
        action=f"Override applied for course {course_code} (removed: {removed}, added: {added})",
        user=payload.get("user", "System"),  
        type="warning"
    )

    return {"message": "Override saved successfully"}
