from app.core.database import get_db_connection

def onboard_ta(data):
    """
    Creates a fully-valid TA and links it to the user.
    No partial TA rows are ever created.
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT user_id FROM `user`
            WHERE user_id=%s
              AND user_type='student'
              AND ta_id IS NULL
            """,
            (data.user_id,)
        )
        if not cursor.fetchone():
            raise ValueError("Invalid user or TA already onboarded")

        cursor.execute(
            """
            INSERT INTO ta
            (name, program, level, background, admit_term, standing, max_hours)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                data.name,
                data.program,
                data.level,
                data.background,
                data.admit_term,
                data.standing,
                data.max_hours
            )
        )
        ta_id = cursor.lastrowid

        for skill in data.skills:
            cursor.execute(
                "INSERT INTO ta_skill (ta_id, skill) VALUES (%s,%s)",
                (ta_id, skill)
            )

        for professor_id in data.preferred_professors:
            cursor.execute(
                """
                INSERT INTO ta_preferred_professor (ta_id, professor_id)
                VALUES (%s,%s)
                """,
                (ta_id, professor_id)
            )

        cursor.execute(
            "UPDATE `user` SET ta_id=%s WHERE user_id=%s",
            (ta_id, data.user_id)
        )

        conn.commit()
        return ta_id

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()
