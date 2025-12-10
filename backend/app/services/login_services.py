from app.core.database import get_db_connection
from typing import Optional, Dict

def authenticate_user(username: str, password: str) -> Optional[Dict]:
    """
    Check the user table for matching username/password.
    Return a dict with user info if valid, including actual name from ta or professor tables.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT user_id, username, user_type, ta_id, professor_id
            FROM user
            WHERE username=%s AND password=%s
            """,
            (username, password)
        )
        user = cursor.fetchone()

        if not user:
            cursor.close()
            return None

        name = None
        if user["user_type"] == "student" and user.get("ta_id"):
            cursor.execute(
                "SELECT name FROM ta WHERE ta_id=%s",
                (user["ta_id"],)
            )
            result = cursor.fetchone()
            if result:
                name = result["name"]
        elif user["user_type"] == "faculty" and user.get("professor_id"):
            cursor.execute(
                "SELECT name FROM professor WHERE professor_id=%s",
                (user["professor_id"],)
            )
            result = cursor.fetchone()
            if result:
                name = result["name"]
        elif user["user_type"] == "admin":
            name = "Admin User"

        cursor.close()

    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "user_type": user["user_type"],
        "name": name,
        "ta_id": user.get("ta_id"),
        "professor_id": user.get("professor_id")
    }
