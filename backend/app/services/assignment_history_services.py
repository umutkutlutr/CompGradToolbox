from typing import Optional, Dict, Any
from app.core.database import get_db_connection

def save_assignment_run_from_db(created_by: Optional[str] = None, notes: Optional[str] = None) -> int:
    """
    Snapshot current ta_assignment into history tables.
    Returns run_id.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "INSERT INTO assignment_run (created_by, notes) VALUES (%s, %s)",
            (created_by, notes)
        )
        run_id = int(cursor.lastrowid)

        # ----------------------------
        # 1) Save courses (ONE row per course)
        # Aggregate professors to avoid duplication for multi-prof courses
        # ----------------------------
        cursor.execute("""
            SELECT
              c.course_id,
              c.course_code,
              -- pick a deterministic professor_id (min), and store all names concatenated
              MIN(p.professor_id) AS professor_id,
              GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS professor_name
            FROM ta_assignment a
            JOIN course c ON c.course_id = a.course_id
            LEFT JOIN course_professor cp ON cp.course_id = c.course_id
            LEFT JOIN professor p ON p.professor_id = cp.professor_id
            GROUP BY c.course_id, c.course_code
            ORDER BY c.course_code ASC
        """)
        course_rows = cursor.fetchall() or []

        for r in course_rows:
            cursor.execute("""
                INSERT INTO assignment_run_course
                  (run_id, course_id, course_code, professor_id, professor_name)
                VALUES (%s, %s, %s, %s, %s)
            """, (run_id, r["course_id"], r["course_code"], r["professor_id"], r["professor_name"]))

        # ----------------------------
        # 2) Save TA pairs (NO professor join)
        # One row per (course_code, ta_id)
        # ----------------------------
        cursor.execute("""
            SELECT DISTINCT
              c.course_code,
              t.ta_id,
              t.name AS ta_name
            FROM ta_assignment a
            JOIN course c ON c.course_id = a.course_id
            JOIN ta t ON t.ta_id = a.ta_id
            ORDER BY c.course_code ASC, t.name ASC
        """)
        pairs = cursor.fetchall() or []

        for r in pairs:
            cursor.execute("""
                INSERT IGNORE INTO assignment_run_ta
                  (run_id, course_code, ta_id, ta_name)
                VALUES (%s, %s, %s, %s)
            """, (run_id, r["course_code"], r["ta_id"], r["ta_name"]))

        conn.commit()
        return run_id

    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def list_assignment_runs(limit: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
              r.run_id,
              r.created_at,
              r.created_by,
              r.notes,
              (SELECT COUNT(*) FROM assignment_run_course c WHERE c.run_id = r.run_id) AS courses_count,
              (SELECT COUNT(*) FROM assignment_run_ta t WHERE t.run_id = r.run_id) AS pairs_count
            FROM assignment_run r
            ORDER BY r.run_id DESC
            LIMIT %s;
        """, (limit,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def get_assignment_run(run_id: int) -> Dict[str, Any]:
    """
    Returns the same structure your frontend already uses:
    {
      "run_id": ...,
      "created_at": ...,
      "assignments": { "COMP302": { "professor": "...", "tas": [...] }, ... },
      "workloads": { "TA Name": loadCount, ... }
    }
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM assignment_run WHERE run_id = %s", (run_id,))
        run = cursor.fetchone()
        if not run:
            return {}

        cursor.execute("""
            SELECT course_code, professor_name
            FROM assignment_run_course
            WHERE run_id = %s
            ORDER BY course_code ASC
        """, (run_id,))
        courses = cursor.fetchall()

        cursor.execute("""
            SELECT course_code, ta_name
            FROM assignment_run_ta
            WHERE run_id = %s
            ORDER BY course_code ASC, ta_name ASC
        """, (run_id,))
        pairs = cursor.fetchall()

        assignments = {c["course_code"]: {"professor": c["professor_name"], "tas": []} for c in courses}
        for p in pairs:
            assignments.setdefault(p["course_code"], {"professor": "", "tas": []})
            assignments[p["course_code"]]["tas"].append(p["ta_name"])

        workloads = {}
        for p in pairs:
            workloads[p["ta_name"]] = workloads.get(p["ta_name"], 0) + 1

        return {
            "run_id": run["run_id"],
            "created_at": run["created_at"],
            "created_by": run["created_by"],
            "notes": run["notes"],
            "assignments": assignments,
            "workloads": workloads
        }
    finally:
        cursor.close()
        conn.close()


def apply_run(run_id: int):
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT run_id FROM assignment_run WHERE run_id=%s", (run_id,))
        if not cur.fetchone():
            raise Exception("Run not found")

        cur.execute("SELECT course_id, ta_id FROM assignment_run_item WHERE run_id=%s", (run_id,))
        items = cur.fetchall()
        if not items:
            raise Exception("Run has no saved assignments")

        cur.execute("DELETE FROM ta_assignment")

        cur2 = conn.cursor()
        for it in items:
            cur2.execute(
                "INSERT INTO ta_assignment (ta_id, course_id) VALUES (%s, %s)",
                (it["ta_id"], it["course_id"])
            )

        conn.commit()
        return {"ok": True, "run_id": run_id, "inserted_pairs": len(items)}
    except:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def delete_assignment_run(run_id: int) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM assignment_run WHERE run_id = %s", (run_id,))
        conn.commit()
        return cur.rowcount > 0
    except:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
        

def save_run_items_from_active(run_id: int) -> int:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT ta_id, course_id FROM ta_assignment")
        rows = cur.fetchall()

        cur2 = conn.cursor()
        for r in rows:
            cur2.execute(
                "INSERT INTO assignment_run_item (run_id, course_id, ta_id) VALUES (%s, %s, %s)",
                (run_id, r["course_id"], r["ta_id"])
            )
        conn.commit()
        return len(rows)
    except:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

