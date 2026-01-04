# app/services/assignment_services.py
from fastapi import HTTPException
from app.core.database import get_db_connection
from app.services.activity_log_service import add_log
from typing import Dict, Any

def get_saved_assignments():
    """
    Fetch TA assignments from DB and compute workloads.
    Workload = number of courses assigned to each TA.

    Returns:
    {
      "assignments": {
        "COMP132": {
          "professors": ["Attila Gursoy", "Oznur Ozkasap"],
          "professor": "Attila Gursoy",   # kept for backward compatibility
          "tas": ["TA1", "TA2", ...]
        },
        ...
      },
      "workloads": { "TA Name": count, ... }
    }
    """

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # ------------------------------------------------------------
        # 1) Professors per course (as a LIST, not a single string)
        # ------------------------------------------------------------
        cursor.execute("""
            SELECT
                c.course_code,
                p.name AS professor_name
            FROM course c
            LEFT JOIN course_professor cp ON cp.course_id = c.course_id
            LEFT JOIN professor p ON p.professor_id = cp.professor_id
            ORDER BY c.course_code ASC, p.name ASC
        """)
        prof_rows = cursor.fetchall() or []

        course_to_profs: Dict[str, list] = {}
        for r in prof_rows:
            cc = r["course_code"]
            pname = r["professor_name"]
            if cc not in course_to_profs:
                course_to_profs[cc] = []
            if pname and pname not in course_to_profs[cc]:
                course_to_profs[cc].append(pname)

        # ------------------------------------------------------------
        # 2) Assignments: one row per (course, ta)
        #    IMPORTANT: no join to course_professor to avoid duplicates
        # ------------------------------------------------------------
        cursor.execute("""
            SELECT DISTINCT
                c.course_code,
                t.name AS ta_name
            FROM ta_assignment a
            JOIN course c ON c.course_id = a.course_id
            JOIN ta t ON t.ta_id = a.ta_id
            ORDER BY c.course_code ASC, t.name ASC
        """)
        rows = cursor.fetchall() or []

        if not rows:
            return {"assignments": {}, "workloads": {}}

        assignments: Dict[str, Dict[str, Any]] = {}
        workloads: Dict[str, int] = {}

        for row in rows:
            course = row["course_code"]
            ta_name = row["ta_name"]

            if course not in assignments:
                prof_list = course_to_profs.get(course, [])
                assignments[course] = {
                    "professors": prof_list,                          # ✅ array
                    "professor": prof_list[0] if prof_list else "—",  # compatibility
                    "tas": []
                }

            assignments[course]["tas"].append(ta_name)
            workloads[ta_name] = workloads.get(ta_name, 0) + 1

        # Optional: ensure courses that have professors but no TAs still appear
        # (uncomment if you want empty courses shown)
        # for cc, prof_list in course_to_profs.items():
        #     assignments.setdefault(cc, {
        #         "professors": prof_list,
        #         "professor": prof_list[0] if prof_list else "—",
        #         "tas": []
        #     })

        return {"assignments": assignments, "workloads": workloads}

    finally:
        cursor.close()
        conn.close()


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
