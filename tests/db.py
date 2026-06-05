from db_connection import get_connection

def delete_device_lifecycle(lifecycle_ID: int):
    """Raderar en specifik rad baserat på dess lifecycle_ID"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Använd %s som placeholder, precis som ? i Node.js
        query = "DELETE FROM device_lifecycle WHERE lifecycle_ID = %s"
        
        # Kör frågan (kom ihåg kommatecknet för att göra det till en tuple)
        cursor.execute(query, (lifecycle_ID,))
        conn.commit()
        
        # Returnerar antalet rader som påverkades (motsvarar affectedRows)
        return cursor.rowcount 
        
    finally:
        cursor.close()
        conn.close()

# Här kan du fylla på med fler funktioner om du behöver i framtiden:
# def get_latest_lifecycle(device_ID: int):
#     ...