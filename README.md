# NodeCore IT - IoT Device Platform

NodeCore IT är en IoT-plattform där uppkopplade devices kan skicka positionsdata, status och rörelsedata till en backend. Informationen visas sedan i en webbplattform med karta, historik, geofence, live-status och BLE motion sessions.

Projektet är utvecklat som examensarbete för utbildningen **Systemutvecklare inbyggda system (IoT)** på Stockholms Tekniska Institut.

---

## Syfte

Syftet med projektet är att bygga ett komplett IoT-system från device till dashboard.

Projektet visar hur embedded devices kan kommunicera med en backend, hur data sparas i databas och hur användaren kan följa devices och analysera data i ett webbgränssnitt.

---

## Vad systemet gör

Plattformen har stöd för två typer av devices:

- **Cellular devices** som skickar GNSS-positioner och device-status
- **BLE devices** som kan skicka rörelsedata från motion sessions

Systemet kan bland annat:

- registrera devices till en användare
- ta emot och spara GNSS-positioner
- visa senaste position på karta
- visa positionshistorik
- visa online/offline-status
- visa batterinivå och firmware-version
- skapa arbetsområden/geofence
- visa om en device är innanför eller utanför ett område
- visa live-uppdateringar med Socket.IO
- spela upp sparade BLE motion sessions i 3D
- använda mockdata för att testa cellular och BLE-flöden

---

## Ingående delar

### Embedded / IoT device

Device-delen representerar uppkopplade IoT-enheter.

Cellular-devices skickar exempelvis:

- device ID
- latitud och longitud
- accuracy
- battery percent
- firmware version
- last seen

BLE-devices används för motion sessions där rörelsedata kan sparas och spelas upp.

---

### Backend

Backend är byggd med **Node.js** och hanterar kommunikationen mellan devices, databas och frontend.

Backend ansvarar för att:

- ta emot GNSS-data
- ta emot device-status
- hantera BLE motion sessions
- spara data i MySQL
- skicka data till frontend via REST API
- skicka live events med Socket.IO
- hantera geofence-logik

---

### Databas

Projektet använder **MySQL** för att spara strukturerad data.

Exempel på data som sparas:

- användare
- devices
- GNSS-positioner
- device-status
- arbetsområden
- geofence alerts
- BLE motion sessions

---

### Frontend

Frontend är byggd med **React**.

Webbplattformen innehåller:

- dashboard för cellular devices
- karta med senaste position
- positionshistorik
- arbetsområden/geofence
- device-status
- mock cellular route
- BLE session live motion
- 3D playback av sparade BLE motion sessions

Målet med frontend var att göra systemet tydligt och användarvänligt även för en person som inte är tekniskt insatt.

---

## BLE Motion Sessions

En del av projektet är stöd för BLE-devices och motion sessions.

Tanken är att en BLE-device kan samla in rörelsedata, exempelvis quaternion-data från en IMU-sensor. Datan kan sedan sparas som en session och visas i webbplattformen.

I frontend kan användaren:

- välja BLE-device
- kontrollera om det finns sparade sessions
- spela upp rörelsen i 3D
- se sparad motion data från databasen

Detta visar hur BLE-data kan användas för mer än bara live-visning, eftersom rörelsen också kan sparas och analyseras i efterhand.

---

## Tekniker

Projektet använder bland annat:

- C / Zephyr för embedded-relaterad utveckling
- BLE för motion data
- GNSS för positionering
- CoAP för IoT-kommunikation
- Node.js och Express för backend
- MySQL för databas
- Socket.IO för realtidsuppdateringar
- React för frontend
- React Leaflet och OpenStreetMap för karta
- Three.js / 3D-vy för motion playback
- Git och GitHub för versionshantering

---

## Hur systemet fungerar

1. En device skickar data till backend.
2. Backend validerar och sparar datan i databasen.
3. Frontend hämtar data via REST API.
4. Socket.IO används för live-uppdateringar.
5. Användaren kan se position, status, historik, geofence och motion sessions i webbplattformen.

---

## Testning

Projektet har testats med både riktig data och mockdata.

Mockdata används för att simulera:

- GNSS-positioner från cellular devices
- device-status
- BLE motion sessions

Det gör det enklare att testa dashboard, karta, historik och 3D playback utan att alltid behöva köra fysisk hårdvara.

---

## Resultat

Resultatet är en fungerande IoT-plattform som visar hela kedjan från device till dashboard.

Projektet visar:

- hur embedded/IoT-data skickas till backend
- hur data sparas i databas
- hur data visas i frontend
- hur live-status och historik kan hanteras
- hur geofence kan användas för arbetsområden
- hur BLE motion data kan sparas och spelas upp i 3D

---

## Reflektion

Det viktigaste lärandet i projektet har varit att förstå helheten i ett IoT-system. Det räcker inte att bara skicka data från en device. Datan måste också tas emot, sparas, struktureras och visas på ett sätt som skapar värde för användaren.

Projektet har också visat vikten av tydlig uppdelning mellan embedded, backend, databas och frontend. Varje del behöver fungera självständigt, men också passa ihop med resten av systemet.

---

## Möjliga förbättringar

Projektet kan vidareutvecklas med:

- sparade offline-alerts i databasen
- SMS eller e-post vid geofence-alert
- bättre analys av motion sessions
- roller och behörigheter för företag
- fler automatiserade tester
- Docker för enklare deployment

---

## Koppling till kursmålen

Projektet kopplar till kursmålen genom att det använder flera delar från utbildningen:

- Programmering inbyggda system
- Datakommunikation
- Programmering i C/C++

Projektet har genomförts från idé till fungerande lösning och innehåller både teknisk implementation, reflektion och möjliga förbättringar.
