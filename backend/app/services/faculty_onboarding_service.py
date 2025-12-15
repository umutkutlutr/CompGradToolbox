from app.core.database import get_db_connection

from app.models import FacultyOnboardingRequest
from app.core.database import get_db_connection

def onboard_faculty(data: FacultyOnboardingRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1️⃣ Validate user
        cursor.execute(
            """
            SELECT user_id FROM `user`
            WHERE user_id=%s
              AND user_type='faculty'
              AND professor_id IS NULL
            """,
            (data.user_id,)
        )
        if not cursor.fetchone():
            raise ValueError("Invalid or already-onboarded faculty user")

        # 2️⃣ Create professor
        cursor.execute(
            "INSERT INTO professor (name) VALUES (%s)",
            (data.name,)
        )
        professor_id = cursor.lastrowid

        # 3️⃣ Preferred TAs
        for ta_id in data.preferred_tas:
            cursor.execute(
                """
                INSERT INTO professor_preferred_ta (professor_id, ta_id)
                VALUES (%s,%s)
                """,
                (professor_id, ta_id)
            )

        # 4️⃣ Link professor to user
        cursor.execute(
            "UPDATE `user` SET professor_id=%s WHERE user_id=%s",
            (professor_id, data.user_id)
        )

        conn.commit()
        return professor_id

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()
