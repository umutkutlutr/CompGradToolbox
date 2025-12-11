from app.core.database import get_db_connection

def get_dashboard_summary():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Total number of courses this term
    cursor.execute("SELECT COUNT(*) AS total_courses FROM course")
    total_courses = cursor.fetchone()["total_courses"]

    # Total TA assignments (each course-TA pair)
    cursor.execute("SELECT COUNT(*) AS total_assigned FROM ta_assignment")
    total_assigned = cursor.fetchone()["total_assigned"]

    # Total TA positions requested - assigned
    cursor.execute("""
        SELECT 
            SUM(num_tas_requested) AS total_requested
        FROM course
    """)
    total_requested = cursor.fetchone()["total_requested"] or 0

    unassigned_positions = max(total_requested - total_assigned, 0)

    cursor.close()
    conn.close()

    return {
        "courses": total_courses,
        "assigned": total_assigned,
        "unassigned": unassigned_positions,
    }
