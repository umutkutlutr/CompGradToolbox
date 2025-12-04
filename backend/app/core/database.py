import mysql.connector
from mysql.connector import Error
from app.core.config import settings


def get_db_connection():
    """
    Creates and returns a new database connection.
    Automatically pulls credentials from settings.py
    """
    try:
        connection = mysql.connector.connect(
            host=settings.DB_HOST,
            user=settings.DB_USER,
            database=settings.DB_NAME,
            password=settings.DB_PASSWORD,
            port=settings.PORT
        )

        if connection.is_connected():
            return connection

    except Error as e:
        print("Database connection error:", e)
        raise e
