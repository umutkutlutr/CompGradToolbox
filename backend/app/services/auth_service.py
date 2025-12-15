from app.core.database import get_db_connection
from app.core.security import hash_password

def register_user(name, username, password, role):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT user_id FROM `user` WHERE username=%s",
            (username,)
        )
        if cursor.fetchone():
            raise ValueError("Username already exists")

        hashed_pw = hash_password(password)

        cursor.execute(
            """
            INSERT INTO `user` (username, password, user_type)
            VALUES (%s, %s, %s)
            """,
            (username, hashed_pw, role)
        )

        conn.commit()
        return cursor.lastrowid

    finally:
        cursor.close()
        conn.close()
