from app.core.database import get_db_connection
from app.core.security import verify_password, hash_password
from typing import Optional, Dict

def authenticate_user(username: str, password: str) -> Optional[Dict]:
    """
    Authenticate user with support for:
    - legacy plaintext passwords
    - bcrypt-hashed passwords
    Automatically upgrades plaintext passwords to hashed.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT user_id, username, password, user_type, ta_id, professor_id
            FROM `user`
            WHERE username=%s
            """,
            (username,)
        )
        user = cursor.fetchone()

        if not user:
            cursor.close()
            return None

        stored_password = user["password"]
        password_ok = False

        # 2️⃣ Check hashed vs plaintext
        if stored_password.startswith("$2"):
            password_ok = verify_password(password, stored_password)
        else:
            password_ok = password == stored_password

            if password_ok:
                new_hash = hash_password(password)
                cursor.execute(
                    "UPDATE `user` SET password=%s WHERE user_id=%s",
                    (new_hash, user["user_id"])
                )
                conn.commit()

        if not password_ok:
            cursor.close()
            return None

        # 3️⃣ Resolve display name
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
        onboarding_required = False

        if user["user_type"] == "student" and user.get("ta_id") is None:
            onboarding_required = True

        if user["user_type"] == "faculty" and user.get("professor_id") is None:
            onboarding_required = True

        return {
            "user_id": user["user_id"],
            "username": user["username"],
            "user_type": user["user_type"],
            "name": name,
            "ta_id": user.get("ta_id"),
            "professor_id": user.get("professor_id"),
            "onboarding_required": onboarding_required
        }

