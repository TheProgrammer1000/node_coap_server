import pytest
import requests
import json 

# Ändra denna till din lokala eller skarpa URL där din Node.js-backend körs

BASE_URL = "http://localhost:3000/api" 



# def test_add_device_gnss_data():
#     # 1. Vi bygger ihop URL-strängen (f-strings i Python fungerar exakt som `...` i JS)
#     url = f"{BASE_URL}/device/gnss/add"
    
#     # 2. Detta är ett "Dictionary" i Python. Det är exakt samma sak som ett JSON-objekt i JS.
#     payload = {
#         "device_ID": 200001,
#         "lat": 59.3293,
#         "lon": 18.0686,
#         "acc": 5
#     }
    
#     # 3. Vi använder biblioteket 'requests' för att göra ett HTTP POST-anrop.
#     # parametern `json=payload` gör att Python automatiskt omvandlar vårt objekt till JSON 
#     # och sätter rätt Headers (Content-Type: application/json), precis som Postman gör.
#     response = requests.post(url, json=payload)
    
#     # 4. Vi kräver att Express-servern skapade datan (201 Created)
#     assert response.status_code == 201
    
#     # 5. Vi gör om Express-serverns JSON-svar till ett Python-objekt så vi kan läsa det
#     data = response.json()
    
#     # Kika på vad servern faktiskt svarar i terminalen!
#     print("\n[DEBUG] Serverns JSON-svar:", data)
    
#     # 6. Vi kräver att din Express-property `success` är True (motsvarar true i JS)
#     assert data["success"] is True


# def test_add_device_event_data():
#     url = f"{BASE_URL}/device/event/add"
    
#     payload = {
#         "device_ID": 200001,
#         "event_type": 'device_cellular_ready',
#         "severity": 'info',
#         "message": 'Device cellular connection and backend communication are ready',
#         "data_transport": 'cellular',
#         "firmware_version": '1.0.0'
#     }
    
    
#     response = requests.post(url, json=payload)
#     assert response.status_code == 201
    
#     data = response.json()
    
#     print("\n[DEBUG] Serverns JSON-scar: ", data)
    



#api/device/firmware/get/all/done
def test_get_device_firmware_que_all_done():
    url = f"{BASE_URL}/device/firmware/get/all/done?user_ID=14&device_ID=200001"
    
    
    
    response = requests.get(url)
    assert response.status_code == 200
    
    data = response.json()
    
    # Gör om JSON-objektet till en snyggt formaterad sträng med indrag
    pretty_json = json.dumps(data, indent=4, ensure_ascii=False)
    
    print(f"\n[DEBUG] Serverns JSON-svar:\n{pretty_json}")

def test_get_arealocation_by_user():
    url = f"{BASE_URL}/device/area-location/get/14"
    
    response = requests.get(url)
    assert response.status_code == 200
    
    data = response.json()
    
    # Gör om JSON-objektet till en snyggt formaterad sträng med indrag
    pretty_json = json.dumps(data, indent=4, ensure_ascii=False)
    print(pretty_json)
    

# def test_add_arealocation_by_user():
#     url = f"{BASE_URL}/device/area-location/add"

#     payload = {
#         "device_ID": 200001,
#         "lon": 18.213,
#         "lat": 8.132,
#         "circle_radius_m": 200,
#         "matchedAddress": "Address testing"
#     }
    
#     response = requests.post(url, json=payload)
#     assert response.status_code == 200
    
#     data = response.json()
    
#     # Gör om JSON-objektet till en snyggt formaterad sträng med indrag
#     pretty_json = json.dumps(data, indent=4, ensure_ascii=False)
#     print(pretty_json)
    
    

  