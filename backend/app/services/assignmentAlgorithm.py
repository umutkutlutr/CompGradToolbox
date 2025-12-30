# backend/app/services/assignmentAlgorithm.py
# Course-based + professor-based hybrid assignment with "same professor cap" (2 by default)
# Python 3.9 compatible (NO `|` union types)

from itertools import product
from typing import Dict, List, Any, Tuple, Optional

from app.core.database import get_db_connection
from .ta_services import get_all_tas
from .professors_services import get_all_professors
from .weight_services import get_weights


# ----------------------------
# Helpers
# ----------------------------

def rank_to_score(rank: int, max_rank: int) -> float:
    """Higher preference (lower rank) => higher score. Safe for max_rank=0."""
    if max_rank <= 0:
        return 0.0
    if rank < 0:
        rank = 0
    if rank > max_rank:
        rank = max_rank
    return float(max_rank - rank) / float(max_rank)


def interest_to_score(interest: Optional[str]) -> float:
    if interest == "High":
        return 1.0
    if interest == "Medium":
        return 0.6
    if interest == "Low":
        return 0.2
    return 0.0


def safe_avg(xs: List[float]) -> float:
    return (sum(xs) / float(len(xs))) if xs else 0.0


# ----------------------------
# DB Fetchers (keep routes/services style; these are internal helpers)
# ----------------------------

def fetch_course_data() -> Dict[int, Dict[str, Any]]:
    """
    Returns courses keyed by course_id:
      courses[course_id] = {
        "course_id": int,
        "course_code": str,
        "num_tas_requested": int,
        "professors": [ {"professor_id": int, "name": str}, ... ],
        "skills": [str, ...],
      }
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT course_id, course_code, COALESCE(num_tas_requested, 0) AS num_tas_requested
        FROM course
        ORDER BY course_code ASC
    """)
    courses = cursor.fetchall() or []

    course_map: Dict[int, Dict[str, Any]] = {}
    for c in courses:
        cid = int(c["course_id"])
        course_map[cid] = {
            "course_id": cid,
            "course_code": c["course_code"],
            "num_tas_requested": int(c.get("num_tas_requested") or 0),
            "professors": [],
            "skills": [],
        }

    if not course_map:
        cursor.close()
        conn.close()
        return {}

    course_ids = list(course_map.keys())

    # professors per course
    cursor.execute(f"""
        SELECT cp.course_id, p.professor_id, p.name
        FROM course_professor cp
        JOIN professor p ON p.professor_id = cp.professor_id
        WHERE cp.course_id IN ({",".join(["%s"] * len(course_ids))})
    """, course_ids)
    for r in (cursor.fetchall() or []):
        cid = int(r["course_id"])
        if cid in course_map:
            course_map[cid]["professors"].append({
                "professor_id": int(r["professor_id"]),
                "name": r["name"],
            })

    # skills per course
    cursor.execute(f"""
        SELECT course_id, skill
        FROM course_skill
        WHERE course_id IN ({",".join(["%s"] * len(course_ids))})
    """, course_ids)
    for r in (cursor.fetchall() or []):
        cid = int(r["course_id"])
        if cid in course_map:
            course_map[cid]["skills"].append(r["skill"])

    cursor.close()
    conn.close()
    return course_map


def fetch_ta_skills() -> Dict[int, List[str]]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT ta_id, skill FROM ta_skill")
    rows = cursor.fetchall() or []
    cursor.close()
    conn.close()

    m: Dict[int, List[str]] = {}
    for r in rows:
        m.setdefault(int(r["ta_id"]), []).append(r["skill"])
    return m


def fetch_ta_course_interests() -> Dict[Tuple[int, int], str]:
    """
    Returns mapping (ta_id, course_id) -> interest_level
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT ta_id, course_id, interest_level
        FROM ta_preferred_course
    """)
    rows = cursor.fetchall() or []
    cursor.close()
    conn.close()

    m: Dict[Tuple[int, int], str] = {}
    for r in rows:
        m[(int(r["ta_id"]), int(r["course_id"]))] = r["interest_level"]
    return m


# ----------------------------
# Scoring
# ----------------------------

def compute_course_pair_score(
    ta: Dict[str, Any],
    course: Dict[str, Any],
    ta_pref_map: Dict[str, List[str]],
    prof_pref_map: Dict[str, List[str]],
    ta_skills_map: Dict[int, List[str]],
    ta_course_interest_map: Dict[Tuple[int, int], str],
    current_workload: float,
    avg_workload: float,
) -> float:
    """
    Hybrid score for (TA, Course):
      - course_pref: course interest + skill match
      - ta_pref: TA prefers professor(s) of the course
      - prof_pref: professor(s) prefer TA
      - workload_balance: avoid overloading
    """
    weights = get_weights()

    ta_id = int(ta["ta_id"])
    ta_name = ta["name"]
    ta_max_hours = max(int(ta.get("max_hours") or 1), 1)

    course_id = int(course["course_id"])
    course_profs = course.get("professors", []) or []
    course_skills = course.get("skills", []) or []

    # ---- course interest ----
    interest_level = ta_course_interest_map.get((ta_id, course_id))
    interest_score = interest_to_score(interest_level)

    # ---- skill match ----
    ta_skills = set(ta_skills_map.get(ta_id, []) or [])
    required = course_skills
    if len(required) == 0:
        skill_score = 1.0
    else:
        matched = sum(1 for s in required if s in ta_skills)
        skill_score = matched / float(len(required))

    # combine into one course_pref signal (tune if you want)
    course_pref_score = 0.6 * interest_score + 0.4 * skill_score

    # ---- professor preference (avg across course professors) ----
    if not course_profs:
        ta_prof_score = 0.0
        prof_ta_score = 0.0
    else:
        ta_scores: List[float] = []
        prof_scores: List[float] = []
        for p in course_profs:
            prof_name = p["name"]

            ta_list = ta_pref_map.get(ta_name, []) or []
            prof_list = prof_pref_map.get(prof_name, []) or []

            ta_rank = ta_list.index(prof_name) if prof_name in ta_list else len(ta_list)
            prof_rank = prof_list.index(ta_name) if ta_name in prof_list else len(prof_list)

            ta_scores.append(rank_to_score(ta_rank, len(ta_list)))
            prof_scores.append(rank_to_score(prof_rank, len(prof_list)))

        ta_prof_score = safe_avg(ta_scores)
        prof_ta_score = safe_avg(prof_scores)

    # ---- workload balance ----
    workload_diff = abs(current_workload - avg_workload)
    workload_score = max(0.0, 1.0 - (workload_diff / float(ta_max_hours)))

    total = (
        float(weights.course_pref) * course_pref_score +
        float(weights.ta_pref) * ta_prof_score +
        float(weights.prof_pref) * prof_ta_score +
        float(weights.workload_balance) * workload_score
    )
    return total


# ----------------------------
# Main algorithm (course-based)
# ----------------------------

def run_assignment_algorithm(max_same_prof: int = 2):
    # ---- Load TAs (names + IDs + preferred professors) ----
    tas_db = get_all_tas()
    if not tas_db:
        return {"assignments": {}, "workloads": {}}

    tas: List[Dict[str, Any]] = []
    for t in tas_db:
        tas.append({
            "ta_id": int(t["ta_id"]),
            "name": t["name"],
            "max_hours": int(t.get("max_hours") or 1),
            "preferred_professors": [p["name"] for p in (t.get("preferred_professors") or [])],
        })

    # ---- Load professors (name -> preferred TA names) ----
    profs_db = get_all_professors()
    prof_pref_map: Dict[str, List[str]] = {}
    for p in (profs_db or []):
        prof_pref_map[p["name"]] = [ta["name"] for ta in (p.get("preferred_tas") or [])]

    # TA preference map by TA name
    ta_pref_map: Dict[str, List[str]] = {t["name"]: (t.get("preferred_professors") or []) for t in tas}

    # ---- Load courses + skills + professors ----
    courses_map = fetch_course_data()
    courses = list(courses_map.values())
    if not courses:
        return {"assignments": {}, "workloads": {t["name"]: 0 for t in tas}}

    # ---- Extra signals ----
    ta_skills_map = fetch_ta_skills()
    ta_course_interest_map = fetch_ta_course_interests()

    # ---- Tracking structures ----
    # course_id -> [ta_id...]
    assigned_by_course: Dict[int, List[int]] = {c["course_id"]: [] for c in courses}
    # course_id -> remaining slots
    remaining_need: Dict[int, int] = {c["course_id"]: int(c.get("num_tas_requested") or 0) for c in courses}
    # TA workloads (course-count units)
    ta_workload: Dict[int, int] = {t["ta_id"]: 0 for t in tas}
    # TA capacity (course-count units)
    ta_capacity: Dict[int, int] = {t["ta_id"]: max(int(t.get("max_hours") or 1), 1) for t in tas}

    # course_id -> [professor_id...]
    course_prof_ids: Dict[int, List[int]] = {
        c["course_id"]: [int(p["professor_id"]) for p in (c.get("professors") or [])]
        for c in courses
    }

    # (ta_id, professor_id) -> how many courses already assigned together
    ta_prof_count: Dict[Tuple[int, int], int] = {}

    def can_assign_with_cap(ta_id: int, course_id: int) -> bool:
        pids = course_prof_ids.get(course_id, []) or []
        if not pids:
            return True
        # If ANY professor on that course already hit the cap with this TA, block in pass 1
        for pid in pids:
            if ta_prof_count.get((ta_id, pid), 0) >= max_same_prof:
                return False
        return True

    def apply_prof_count(ta_id: int, course_id: int) -> None:
        for pid in (course_prof_ids.get(course_id, []) or []):
            key = (ta_id, pid)
            ta_prof_count[key] = ta_prof_count.get(key, 0) + 1

    # ---- Precompute avg workload target ----
    total_slots = sum(max(0, int(c.get("num_tas_requested") or 0)) for c in courses)
    avg_workload = float(total_slots) / float(len(tas)) if len(tas) > 0 else 0.0

    # ---- Build candidate list (score, ta_id, course_id) ----
    candidates: List[Tuple[float, int, int]] = []
    for c in courses:
        need = int(c.get("num_tas_requested") or 0)
        if need <= 0:
            continue
        for t in tas:
            s = compute_course_pair_score(
                ta=t,
                course=c,
                ta_pref_map=ta_pref_map,
                prof_pref_map=prof_pref_map,
                ta_skills_map=ta_skills_map,
                ta_course_interest_map=ta_course_interest_map,
                current_workload=float(ta_workload[t["ta_id"]]),
                avg_workload=avg_workload,
            )
            candidates.append((s, t["ta_id"], c["course_id"]))

    candidates.sort(key=lambda x: x[0], reverse=True)

    def try_assign(pass_enforce_cap: bool) -> None:
        # Greedy over the same sorted candidates list
        for score, ta_id, course_id in candidates:
            if remaining_need.get(course_id, 0) <= 0:
                continue
            if ta_workload.get(ta_id, 0) >= ta_capacity.get(ta_id, 1):
                continue
            if ta_id in assigned_by_course[course_id]:
                continue

            if pass_enforce_cap and not can_assign_with_cap(ta_id, course_id):
                continue

            assigned_by_course[course_id].append(ta_id)
            remaining_need[course_id] -= 1
            ta_workload[ta_id] += 1
            apply_prof_count(ta_id, course_id)

    # PASS 1: strict cap (your request)
    try_assign(pass_enforce_cap=True)

    # PASS 2: relax cap only if needed (avoid leaving courses unfilled)
    if any(v > 0 for v in remaining_need.values()):
        try_assign(pass_enforce_cap=False)

    # ---- Build UI-friendly output keyed by course_code ----
    ta_id_to_name = {t["ta_id"]: t["name"] for t in tas}

    out_assignments: Dict[str, Dict[str, Any]] = {}
    for c in courses:
        cid = c["course_id"]
        code = c["course_code"]

        # show first professor name (or "—")
        prof_names = [p["name"] for p in (c.get("professors") or [])]
        display_prof = prof_names[0] if prof_names else "—"

        out_assignments[code] = {
            "professor": display_prof,
            "tas": [ta_id_to_name[tid] for tid in assigned_by_course.get(cid, [])],
            "required_skills": c.get("skills", []) or [],
        }

    workloads_by_name = {ta_id_to_name[tid]: cnt for tid, cnt in ta_workload.items()}

    return {"assignments": out_assignments, "workloads": workloads_by_name}


# ----------------------------
# DB update (accepts either course_code-based output OR course_id-based output)
# ----------------------------

def updateDB(assignments: Dict[str, Any]):
    """
    Supports TWO formats:

    (A) UI-friendly format (what run_assignment_algorithm returns):
        {
          "COMP302": {"professor":"Safadi","tas":["Khalil","abed"], ...},
          ...
        }

    (B) Raw format:
        { course_id: [ta_id, ...], ... }

    Writes into ta_assignment(ta_id, course_id)
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("TRUNCATE TABLE ta_assignment")

        # Build TA name -> id map (for format A)
        tas_db = get_all_tas()
        ta_name_to_id = {t["name"]: int(t["ta_id"]) for t in (tas_db or [])}

        # Build course_code -> id map (for format A)
        cursor.execute("SELECT course_id, course_code FROM course")
        course_rows = cursor.fetchall() or []
        course_code_to_id = {row[1]: int(row[0]) for row in course_rows}  # (course_id, course_code)

        # Detect which format we got
        # If keys look like course codes (strings like "COMP302") and values are dicts with "tas", assume A.
        is_format_a = False
        for k, v in assignments.items():
            if isinstance(k, str) and isinstance(v, dict) and "tas" in v:
                is_format_a = True
            break

        if is_format_a:
            # Format A
            for course_code, payload in assignments.items():
                course_id = course_code_to_id.get(course_code)
                if not course_id:
                    continue

                for ta_name in (payload.get("tas") or []):
                    ta_id = ta_name_to_id.get(ta_name)
                    if not ta_id:
                        continue
                    cursor.execute(
                        "INSERT INTO ta_assignment (ta_id, course_id) VALUES (%s, %s)",
                        (ta_id, course_id)
                    )
        else:
            # Format B
            for course_id, ta_ids in assignments.items():
                cid = int(course_id)
                for ta_id in (ta_ids or []):
                    cursor.execute(
                        "INSERT INTO ta_assignment (ta_id, course_id) VALUES (%s, %s)",
                        (int(ta_id), cid)
                    )

        conn.commit()
        print("All assignments successfully updated in the database.")

    except Exception as e:
        conn.rollback()
        print("Error updating database:", e)
        raise
    finally:
        cursor.close()
        conn.close()
