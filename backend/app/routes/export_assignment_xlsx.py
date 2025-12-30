# app/routes/export_routes.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from io import BytesIO
from openpyxl import Workbook

from app.core.database import get_db_connection

router = APIRouter()

@router.get("/export-assignments-xlsx")
def export_assignments_xlsx():
    """
    Exports current assignments into a real .xlsx with 2 sheets:
    1) Courses: Course, Professor, Assigned TAs
    2) TAs: TA, Load, Courses
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Pull assignments from DB (ta_assignment + course + course_professor + professor + ta)
    cursor.execute("""
        SELECT
          c.course_code,
          p.name AS professor_name,
          t.name AS ta_name
        FROM ta_assignment a
        JOIN course c ON a.course_id = c.course_id
        LEFT JOIN course_professor cp ON cp.course_id = c.course_id
        LEFT JOIN professor p ON p.professor_id = cp.professor_id
        JOIN ta t ON t.ta_id = a.ta_id
        ORDER BY c.course_code ASC, p.name ASC, t.name ASC;
    """)
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    # Build maps
    course_map = {}   # course_code -> {professor, tas[]}
    ta_map = {}       # ta_name -> set(courses)

    for r in rows:
        course = r["course_code"]
        prof = r["professor_name"] or ""
        ta = r["ta_name"]

        if course not in course_map:
            course_map[course] = {"professor": prof, "tas": []}
        # If multiple professors exist for a course, keep first non-empty
        if not course_map[course]["professor"] and prof:
            course_map[course]["professor"] = prof

        course_map[course]["tas"].append(ta)

        ta_map.setdefault(ta, set()).add(course)

    # Create workbook
    wb = Workbook()

    # Sheet 1: Courses
    ws1 = wb.active
    ws1.title = "Courses"
    ws1.append(["Course", "Professor", "Assigned TAs", "#TAs"])

    for course_code in sorted(course_map.keys()):
        prof = course_map[course_code]["professor"]
        tas = course_map[course_code]["tas"]
        ws1.append([course_code, prof, "; ".join(tas), len(tas)])

    # Sheet 2: TAs
    ws2 = wb.create_sheet("TAs")
    ws2.append(["TA", "Courses", "#Courses"])

    for ta_name in sorted(ta_map.keys()):
        courses = sorted(list(ta_map[ta_name]))
        ws2.append([ta_name, "; ".join(courses), len(courses)])

    # Stream as file
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="ta_assignments.xlsx"'},
    )
