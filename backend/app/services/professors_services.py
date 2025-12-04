from app.core.database import get_db_connection

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

    cursor.close()
    conn.close()

    return professors
