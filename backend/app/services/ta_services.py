from app.core.database import get_db_connection

def get_all_tas():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    print("hello")

    query = """
        SELECT 
            ta_id,
            name,
            program,
            level
        FROM ta
        ORDER BY name ASC;
    """

    cursor.execute(query)
    tas = cursor.fetchall()

    cursor.close()
    conn.close()

    print("hey")

    return tas
