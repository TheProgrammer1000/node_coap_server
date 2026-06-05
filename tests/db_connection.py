import os
import pytest
import requests
import json 
import mysql.connector # <-- Importera MySQL-drivern

from dotenv import load_dotenv # <-- Importera load_dotenv
# Läs in .env-filen (gör detta i toppen av filen)
load_dotenv()

db_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="iot_pool",
    pool_size=10, # Motsvarar connectionLimit: 10
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME", "IoT_sensor_test")
)

def get_connection():
    """Hämtar en anslutning från poolen"""
    return db_pool.get_connection()