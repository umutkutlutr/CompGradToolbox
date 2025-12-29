from app.core.database import get_db_connection
from typing import Optional, List

def get_all_professors():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            professor_id,
            name
        FROM professor
        ORDER BY name ASC;
    """
    cursor.execute(query)
    professors = cursor.fetchall()

    # Get preferred TAs for each professor
    pref_query = """
        SELECT 
            t.ta_id,
            t.name,
            t.program,
            t.level,
            t.max_hours
        FROM professor_preferred_ta ppt
        JOIN ta t 
            ON ppt.ta_id = t.ta_id
        WHERE ppt.professor_id = %s;
    """

    for prof in professors:
        cursor.execute(pref_query, (prof["professor_id"],))
        preferred_tas = cursor.fetchall()
        prof["preferred_tas"] = preferred_tas

    cursor.close()
    conn.close()

    return professors

def get_professor_by_id(professor_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT professor_id, name FROM professor WHERE professor_id = %s",
        (professor_id,),
    )
    prof = cursor.fetchone()
    if not prof:
        cursor.close()
        conn.close()
        return None

    # preferred TAs
    cursor.execute(
        """
        SELECT t.ta_id, t.name
        FROM professor_preferred_ta ppt
        JOIN ta t ON ppt.ta_id = t.ta_id
        WHERE ppt.professor_id = %s
        """,
        (professor_id,),
    )
    rows = cursor.fetchall()
    prof["preferred_tas"] = [{"ta_id": r["ta_id"], "name": r["name"]} for r in rows]

    cursor.close()
    conn.close()
    return prof


def update_professor(professor_id: int, name: Optional[str], preferred_ta_ids: List[int]):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if name is not None:
            cursor.execute(
                "UPDATE professor SET name = %s WHERE professor_id = %s",
                (name, professor_id),
            )

        cursor.execute(
            "DELETE FROM professor_preferred_ta WHERE professor_id = %s",
            (professor_id,),
        )
        for ta_id in preferred_ta_ids:
            cursor.execute(
                "INSERT INTO professor_preferred_ta (professor_id, ta_id) VALUES (%s, %s)",
                (professor_id, ta_id),
            )

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()
