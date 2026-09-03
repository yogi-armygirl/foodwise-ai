import sqlite3


def create_database():

    connection = sqlite3.connect("foodwise.db")

    cursor = connection.cursor()

    # Sales table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_item TEXT NOT NULL,
            date TEXT NOT NULL,
            prepared_quantity INTEGER NOT NULL,
            sold_quantity INTEGER NOT NULL
        )
    """)

    # Food list table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS foods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_name TEXT NOT NULL UNIQUE,
            emoji TEXT DEFAULT '🍱',
            active INTEGER DEFAULT 1
        )
    """)

    connection.commit()

    connection.close()


create_database()