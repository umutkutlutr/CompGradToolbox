# backend/app/services/excel_import_service.py

from __future__ import annotations
from io import BytesIO
import re
from typing import Any, Dict, List, Tuple, Optional, Set

from openpyxl import load_workbook

from app.core.database import get_db_connection


def _clean_header(x: Any) -> str:
    s = "" if x is None else str(x)
    s = s.replace("\n", " ").replace("\r", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _norm_name(name: str) -> str:
    # For matching (case-insensitive, whitespace-normalized)
    s = (name or "").strip()
    s = re.sub(r"\s+", " ", s)
    return s.casefold()


def _split_people(cell: Any) -> List[str]:
    """
    Split "X1, X2" into ["X1","X2"].
    Also handles ";" and newlines.
    """
    if cell is None:
        return []
    s = str(cell).strip()
    if not s:
        return []
    # split by comma / semicolon / newline
    parts = re.split(r"[,\n;]+", s)
    return [p.strip() for p in parts if p and p.strip()]


def _split_course_code(cell: Any) -> str:
    """
    Normalize course codes like "COMP 100" -> "COMP100"
    Keep slashes like "COMP423/523".
    """
    if cell is None:
        return ""
    s = str(cell).strip()
    s = re.sub(r"\s+", "", s)
    return s


def _to_int(x: Any, default: int = 0) -> int:
    if x is None:
        return default
    try:
        if isinstance(x, str):
            x = x.strip()
            if x == "":
                return default
        return int(float(x))
    except Exception:
        return default


def _to_str(x: Any) -> Optional[str]:
    if x is None:
        return None
    s = str(x).strip()
    return s if s else None


def _sheet_to_dicts(wb, sheet_name: str) -> List[Dict[str, Any]]:
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    headers = [_clean_header(h) for h in rows[0]]
    out: List[Dict[str, Any]] = []

    for r in rows[1:]:
        if r is None:
            continue
        row = {headers[i]: r[i] for i in range(min(len(headers), len(r)))}
        # ignore completely empty rows
        if all(v is None or (isinstance(v, str) and v.strip() == "") for v in row.values()):
            continue
        out.append(row)

    return out


def import_comp_excel(file_bytes: bytes) -> Dict[str, Any]:
    """
    Imports:
      - Courses + faculty + preferred TAs (TA Needs Planning)
      - TAs + thesis advisors (COMP TA List)

    Safe to run multiple times (uses upsert-ish logic + INSERT IGNORE for relation tables).
    """

    wb = load_workbook(BytesIO(file_bytes), data_only=True)

    # Expect these two sheets
    planning_sheet = "TA Needs Planning"
    ta_list_sheet = "COMP TA List"
    if planning_sheet not in wb.sheetnames or ta_list_sheet not in wb.sheetnames:
        raise ValueError(f"Workbook must contain sheets: '{planning_sheet}' and '{ta_list_sheet}'")

    planning_rows = _sheet_to_dicts(wb, planning_sheet)
    ta_rows = _sheet_to_dicts(wb, ta_list_sheet)

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    try:
        # -----------------------
        # Load existing entities
        # -----------------------
        cur.execute("SELECT professor_id, name FROM professor")
        prof_cache: Dict[str, Tuple[int, str]] = {}  # norm -> (id, original_name)
        for r in (cur.fetchall() or []):
            prof_cache[_norm_name(r["name"])] = (int(r["professor_id"]), r["name"])

        cur.execute("SELECT ta_id, name FROM ta")
        ta_cache: Dict[str, Tuple[int, str]] = {}  # norm -> (id, original_name)
        for r in (cur.fetchall() or []):
            ta_cache[_norm_name(r["name"])] = (int(r["ta_id"]), r["name"])

        cur.execute("SELECT course_id, course_code FROM course")
        course_cache: Dict[str, int] = {}
        for r in (cur.fetchall() or []):
            code = _split_course_code(r["course_code"])
            course_cache[code] = int(r["course_id"])

        # -----------------------
        # Helpers: get-or-create
        # -----------------------
        def get_or_create_prof(name: str) -> int:
            n = _norm_name(name)
            if not n:
                raise ValueError("Professor name empty")
            if n in prof_cache:
                return prof_cache[n][0]

            cur.execute("INSERT INTO professor (name) VALUES (%s)", (name.strip(),))
            pid = int(cur.lastrowid)
            prof_cache[n] = (pid, name.strip())
            return pid

        def get_or_create_ta_minimal(name: str) -> int:
            n = _norm_name(name)
            if not n:
                raise ValueError("TA name empty")
            if n in ta_cache:
                return ta_cache[n][0]

            cur.execute("INSERT INTO ta (name) VALUES (%s)", (name.strip(),))
            tid = int(cur.lastrowid)
            ta_cache[n] = (tid, name.strip())
            return tid

        # -----------------------
        # 1) Import COMP TA List
        # -----------------------
        ta_inserted = 0
        ta_updated = 0
        advisor_links = 0
        pref_prof_links = 0
        new_profs_from_advisors = 0

        # Expected column headers (as in your file)
        # ['KUSIS ID','NAME','PROGRAM','MS/PhD','BACKGROUND','ADMIT TERM','STANDING','THESIS ADVISOR','NOTES','BS SCHOOL/PROGRAM','MS SCHOOL/PROGRAM']
        for row in ta_rows:
            name = _to_str(row.get("NAME"))
            if not name:
                continue

            program = _to_str(row.get("PROGRAM"))
            level_raw = _to_str(row.get("MS/PhD")) or "MS"
            level = "PhD" if level_raw.strip().casefold() in ["phd", "ph.d", "ph.d."] else "MS"
            background = _to_str(row.get("BACKGROUND"))
            admit_term = _to_str(row.get("ADMIT TERM"))
            standing = row.get("STANDING")
            notes = _to_str(row.get("NOTES"))
            bs = _to_str(row.get("BS SCHOOL/PROGRAM"))
            ms = _to_str(row.get("MS SCHOOL/PROGRAM"))
            thesis_advisor = _to_str(row.get("THESIS ADVISOR"))

            n = _norm_name(name)
            if n in ta_cache:
                ta_id = ta_cache[n][0]
                # Update existing TA with spreadsheet fields
                cur.execute(
                    """
                    UPDATE ta
                    SET program=%s, level=%s, background=%s, admit_term=%s,
                        standing=%s, notes=%s, bs_school_program=%s, ms_school_program=%s
                    WHERE ta_id=%s
                    """,
                    (
                        program, level, background, admit_term,
                        _to_int(standing, default=0), notes, bs, ms,
                        ta_id
                    )
                )
                ta_updated += 1
            else:
                cur.execute(
                    """
                    INSERT INTO ta
                        (name, program, level, background, admit_term, standing, notes, bs_school_program, ms_school_program)
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        name.strip(), program, level, background, admit_term,
                        _to_int(standing, default=0), notes, bs, ms
                    )
                )
                ta_id = int(cur.lastrowid)
                ta_cache[n] = (ta_id, name.strip())
                ta_inserted += 1

            # Thesis advisor → make sure professor exists, link in both tables
            if thesis_advisor:
                before = len(prof_cache)
                prof_id = get_or_create_prof(thesis_advisor)
                after = len(prof_cache)
                if after > before:
                    new_profs_from_advisors += 1

                # Real advisor relationship
                cur.execute(
                    "INSERT IGNORE INTO ta_thesis_advisor (ta_id, professor_id) VALUES (%s, %s)",
                    (ta_id, prof_id)
                )
                advisor_links += cur.rowcount

                # Also use as "preferred professor"
                cur.execute(
                    "INSERT IGNORE INTO ta_preferred_professor (ta_id, professor_id) VALUES (%s, %s)",
                    (ta_id, prof_id)
                )
                pref_prof_links += cur.rowcount

        # -----------------------
        # 2) Import TA Needs Planning (courses, faculty, prof preferred TAs)
        # -----------------------
        courses_inserted = 0
        courses_updated = 0
        course_prof_links = 0
        prof_pref_ta_links = 0
        new_profs_from_courses = 0

        for row in planning_rows:
            course_code_raw = row.get("Course")
            course_code = _split_course_code(course_code_raw)
            if not course_code:
                continue

            faculty_cell = row.get("Faculty")
            faculty_names = _split_people(faculty_cell)

            ps_lab_sections = _to_str(row.get("PS/Lab Sections"))
            enrollment_capacity = _to_int(row.get("Enrollment Capacity"), default=0)
            actual_enrollment = _to_int(row.get("Actual Enrollment"), default=0)
            num_tas_requested = _to_int(row.get("Number of TAs requested for Spring 2025"), default=0)
            # the header in your file has newlines; handle it too:
            if "Number of TAs requested for Spring 2025" not in row:
                # exact header in your xlsx (with leading newlines) will be cleaned by _clean_header,
                # so this fallback usually won't be needed — but keep it safe:
                num_tas_requested = _to_int(row.get("Number of TAs requested for Spring 2025 "), default=num_tas_requested)

            # Assigned TAs count (optional)
            assigned_tas_count = _to_int(row.get("Assigned TAs for Spring 2025 (number)"), default=0)

            if course_code in course_cache:
                course_id = course_cache[course_code]
                cur.execute(
                    """
                    UPDATE course
                    SET ps_lab_sections=%s,
                        enrollment_capacity=%s,
                        actual_enrollment=%s,
                        num_tas_requested=%s,
                        assigned_tas_count=%s
                    WHERE course_id=%s
                    """,
                    (ps_lab_sections, enrollment_capacity, actual_enrollment, num_tas_requested, assigned_tas_count, course_id)
                )
                courses_updated += 1
            else:
                cur.execute(
                    """
                    INSERT INTO course
                        (course_code, ps_lab_sections, enrollment_capacity, actual_enrollment, num_tas_requested, assigned_tas_count)
                    VALUES
                        (%s, %s, %s, %s, %s, %s)
                    """,
                    (course_code, ps_lab_sections, enrollment_capacity, actual_enrollment, num_tas_requested, assigned_tas_count)
                )
                course_id = int(cur.lastrowid)
                course_cache[course_code] = course_id
                courses_inserted += 1

            # Course professors: ensure split "X1, X2" becomes two professors
            # Replace course_professor links for this course to match Excel
            cur.execute("DELETE FROM course_professor WHERE course_id=%s", (course_id,))

            for prof_name in faculty_names:
                if not prof_name:
                    continue
                before = len(prof_cache)
                prof_id = get_or_create_prof(prof_name)
                after = len(prof_cache)
                if after > before:
                    new_profs_from_courses += 1

                cur.execute(
                    "INSERT INTO course_professor (course_id, professor_id) VALUES (%s, %s)",
                    (course_id, prof_id)
                )
                course_prof_links += 1

            # Preferred TAs column → professor_preferred_ta
            pref_cell = row.get("Preferred TAs (or requirements)")
            if pref_cell is None:
                # header in your xlsx has trailing spaces; safe fallback
                pref_cell = row.get("Preferred TAs (or requirements) ")

            pref_tokens = _split_people(pref_cell)

            # Only link if the token matches an actual TA name (avoid requirement text like "Python")
            if pref_tokens and faculty_names:
                # for each faculty on that course, add the same preferred TAs list
                for prof_name in faculty_names:
                    if not prof_name:
                        continue
                    prof_id = get_or_create_prof(prof_name)

                    for token in pref_tokens:
                        # ignore "+1" like tokens
                        if re.fullmatch(r"\+?\d+", token.strip()):
                            continue

                        tn = _norm_name(token)
                        if tn in ta_cache:
                            ta_id = ta_cache[tn][0]
                        else:
                            # If it's not in TA list, skip (prevents importing "requirements" as TAs)
                            continue

                        cur.execute(
                            "INSERT IGNORE INTO professor_preferred_ta (professor_id, ta_id) VALUES (%s, %s)",
                            (prof_id, ta_id)
                        )
                        prof_pref_ta_links += cur.rowcount

        conn.commit()

        return {
            "ok": True,
            "summary": {
                "tas_inserted": ta_inserted,
                "tas_updated": ta_updated,
                "new_profs_from_advisors": new_profs_from_advisors,
                "advisor_links_added": advisor_links,
                "ta_preferred_prof_links_added": pref_prof_links,
                "courses_inserted": courses_inserted,
                "courses_updated": courses_updated,
                "new_profs_from_courses": new_profs_from_courses,
                "course_professor_links_written": course_prof_links,
                "professor_preferred_ta_links_added": prof_pref_ta_links,
            }
        }

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
