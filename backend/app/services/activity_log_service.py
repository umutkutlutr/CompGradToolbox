from app.core.database import get_db_connection

def add_log(action: str, user: str, type: str = "info"):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO activity_log (action, user, type)
        VALUES (%s, %s, %s)
    """, (action, user, type))

    conn.commit()
    cursor.close()
    conn.close()


def get_recent_logs(limit: int = 10):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT action, user, type, 
               TIMESTAMPDIFF(MINUTE, timestamp, NOW()) AS minutes_ago
        FROM activity_log
        ORDER BY timestamp DESC
        LIMIT %s
    """, (limit,))

    logs = cursor.fetchall()

    cursor.close()
    conn.close()

    return logs
