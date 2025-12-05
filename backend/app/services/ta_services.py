from app.core.database import get_db_connection

def get_all_tas():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Step 1: Get all TAs
    query = """
        SELECT 
            ta_id,
            name,
            program,
            level,
            max_hours
        FROM ta
        ORDER BY name ASC;
    """
    cursor.execute(query)
    tas = cursor.fetchall()

    if not tas:
        cursor.close()
        conn.close()
        return []

    ta_ids = [ta["ta_id"] for ta in tas]

    # Step 2: Get preferred professors for all TAs
    pref_query = f"""
        SELECT 
            tpp.ta_id,
            p.professor_id,
            p.name
        FROM ta_preferred_professor tpp
        JOIN professor p ON tpp.professor_id = p.professor_id
        WHERE tpp.ta_id IN ({','.join(['%s']*len(ta_ids))});
    """
    cursor.execute(pref_query, ta_ids)
    pref_rows = cursor.fetchall()

    # Map preferred professors by TA ID
    pref_map = {}
    for row in pref_rows:
        pref_map.setdefault(row["ta_id"], []).append({
            "professor_id": row["professor_id"],
            "name": row["name"]
        })

    # Step 3: Get all skills for all TAs
    skills_query = f"""
        SELECT ta_id, skill
        FROM ta_skill
        WHERE ta_id IN ({','.join(['%s']*len(ta_ids))});
    """
    cursor.execute(skills_query, ta_ids)
    skill_rows = cursor.fetchall()

    # Map skills by TA ID
    skills_map = {}
    for row in skill_rows:
        skills_map.setdefault(row["ta_id"], []).append(row["skill"])

    # Combine all data
    for ta in tas:
        ta["preferred_professors"] = pref_map.get(ta["ta_id"], [])
        ta["skills"] = skills_map.get(ta["ta_id"], [])

    cursor.close()
    conn.close()

    return tas

def get_ta_by_id(ta_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Step 1: Get the TA basic info
    query = """
        SELECT 
            ta_id,
            name,
            program,
            level,
            max_hours
        FROM ta
        WHERE ta_id = %s;
    """
    cursor.execute(query, (ta_id,))
    ta = cursor.fetchone()

    if not ta:
        cursor.close()
        conn.close()
        return None

    # Step 2: Get preferred professors
    pref_query = """
        SELECT 
            p.professor_id,
            p.name
        FROM ta_preferred_professor tpp
        JOIN professor p ON tpp.professor_id = p.professor_id
        WHERE tpp.ta_id = %s;
    """
    cursor.execute(pref_query, (ta_id,))
    pref_rows = cursor.fetchall()
    ta["preferred_professors"] = [{"professor_id": row["professor_id"], "name": row["name"]} for row in pref_rows]

    # Step 3: Get TA skills
    skills_query = """
        SELECT skill
        FROM ta_skill
        WHERE ta_id = %s;
    """
    cursor.execute(skills_query, (ta_id,))
    skill_rows = cursor.fetchall()
    ta["skills"] = [row["skill"] for row in skill_rows]

    # Step 4: Get course interests
    courses_query = """
        SELECT course_code, interest_level
        FROM ta_preferred_course
        JOIN course ON ta_preferred_course.course_id = course.course_id
        WHERE ta_id = %s;
    """
    cursor.execute(courses_query, (ta_id,))
    course_rows = cursor.fetchall()
    # Convert to { course_code: interest } format
    ta["course_interests"] = {row["course_code"]: row["interest_level"] for row in course_rows}

    cursor.close()
    conn.close()
    return ta

def update_ta(ta_id: int, skills: list[str], max_hours: int, course_interests: dict[str, str]):
    """
    Update TA information: skills, max_hours, and course interests.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Update max_hours
        cursor.execute("UPDATE ta SET max_hours = %s WHERE ta_id = %s", (max_hours, ta_id))

        # 2. Update skills
        cursor.execute("DELETE FROM ta_skill WHERE ta_id = %s", (ta_id,))
        for skill in skills:
            cursor.execute("INSERT INTO ta_skill (ta_id, skill) VALUES (%s, %s)", (ta_id, skill))

        # 3. Update course interests
        for course_code, interest in course_interests.items():
            # Get course_id from course_code
            cursor.execute("SELECT course_id FROM course WHERE course_code = %s", (course_code,))
            row = cursor.fetchone()
            if not row:
                continue  # skip if course not found
            course_id = row[0]

            if interest is not None:
                cursor.execute("""
                    INSERT INTO ta_preferred_course (course_id, ta_id, interest_level)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE interest_level = VALUES(interest_level)
                """, (course_id, ta_id, interest))

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()