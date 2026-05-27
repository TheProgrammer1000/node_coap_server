# NodeCore CLI

NodeCore CLI är ett terminalverktyg för **NodeCore IoT Platform**.

CLI:t används för att läsa, testa och skicka device-data direkt från terminalen utan att öppna webbgränssnittet.

Det används främst som ett developer tool för att testa:

- login och sparad session
- registrerade devices
- device status
- senaste GNSS-position
- GNSS-historik
- geofence-alerts
- testdata till backend
- firmware/device events

CLI:t kan användas både mot lokal backend och mot live-server.

---

## Vad CLI:t gör

Med NodeCore CLI kan du:

- logga in en användare
- spara login-session lokalt
- visa vem som är inloggad
- logga ut
- lista devices för inloggad användare
- visa status för en specifik device
- visa senaste GNSS-position
- visa GNSS-historik
- visa alerts för en device
- skicka test-status till backend
- skicka test-GNSS-position till backend
- testa firmware-events via CoAP-servern

Det gör att du kan testa flödet:

```text
CLI → Backend API → Databas → Dashboard / historik / alerts
```

CLI:t är användbart för att testa plattformen utan fysisk IoT-hårdvara, till exempel utan nRF-device, SIM-kort eller firmware.

---

## Installation

Gå till CLI-mappen:

```bash
cd cli
npm install
```

---

## Miljövariabler

Skapa en `.env`-fil i `cli/`:

```env
NODECORE_API_URL=http://127.0.0.1:3000
```

För live-server kan du använda:

```env
NODECORE_API_URL=https://nodecore.it.com
```

Skapa gärna också en `.env.example` som kan pushas till GitHub:

```env
NODECORE_API_URL=http://127.0.0.1:3000
```

`.env` ska normalt inte pushas.

---

## Login-session

CLI:t sparar login-sessionen lokalt efter lyckad login.

Sessionen sparas i:

```text
~/.nodecore/config.json
```

På Mac blir det exempelvis:

```text
/Users/denniskarlsson/.nodecore/config.json
```

Den filen innehåller exempelvis:

```json
{
    "user_ID": 1,
    "username": "dennis",
    "token": "jwt-token"
}
```

Det betyder att du inte längre behöver skriva `--user` i read-kommandon.

Förr:

```bash
nodecore device status --user 1 --device 456789
```

Nu:

```bash
nodecore device status --device 456789
```

---

## Kör under utveckling

Under utveckling körs kommandon med:

```bash
npm run dev -- <command>
```

Exempel:

```bash
npm run dev -- user login --username dennis --password kalleanka9
```

Viktigt: använd `--` efter `npm run dev`.

Rätt:

```bash
npm run dev -- user login --username dennis --password kalleanka9
```

Fel:

```bash
npm run dev user login --username dennis --password kalleanka9
```

---

## Bygg CLI

Bygg TypeScript till JavaScript:

```bash
npm run build
```

---

## Kör som riktigt terminalkommando

Efter build kan CLI:t länkas lokalt med:

```bash
npm run build
npm link
```

Då kan du köra CLI:t direkt med `nodecore`.

Exempel:

```bash
nodecore user login --username dennis --password kalleanka9
nodecore devices list
nodecore device status --device 456789
```

Skillnaden är:

```bash
npm run dev -- devices list
```

blir efter `npm link`:

```bash
nodecore devices list
```

---

# Kommandon

## Visa version

### Dev

```bash
npm run dev -- --version
```

### Efter npm link

```bash
nodecore --version
```

Exempel:

```text
0.0.1
```

---

# User-kommandon

## Logga in

### Dev

```bash
npm run dev -- user login --username dennis --password kalleanka9
```

### Efter npm link

```bash
nodecore user login --username dennis --password kalleanka9
```

Detta loggar in användaren och sparar sessionen lokalt.

### Exempel på resultat

```text
Login successful
user_ID: 1
Session saved to: /Users/denniskarlsson/.nodecore/config.json
```

### Vad detta används till

Efter login kan CLI:t automatiskt använda `user_ID` från sessionen.

Det betyder att du kan skriva:

```bash
nodecore devices list
nodecore device status --device 456789
nodecore device position --device 456789
```

utan att skriva `--user`.

---

## Visa inloggad användare

### Dev

```bash
npm run dev -- user me
```

### Efter npm link

```bash
nodecore user me
```

### Exempel

```text
Logged in:
user_ID: 1
username: dennis
token: saved
session: /Users/denniskarlsson/.nodecore/config.json
```

### Vad detta används till

Detta används för att kontrollera att CLI:t har en sparad session.

---

## Logga ut

### Dev

```bash
npm run dev -- user logout
```

### Efter npm link

```bash
nodecore user logout
```

Detta tar bort den sparade sessionen från:

```text
~/.nodecore/config.json
```

Efter logout måste användaren logga in igen.

---

# Device-kommandon

## Lista devices för inloggad användare

### Dev

```bash
npm run dev -- devices list
```

### Efter npm link

```bash
nodecore devices list
```

Detta hämtar alla devices som är kopplade till den inloggade användaren.

### Exempel på resultat

```text
ID          Name              Transport
----------  ----------------  ------------
200001      my_tracka         cellular
200003      mytrackaaa        cellular
200005      my_cella          cellular
300004      my_tha_BLE        ble
```

### Vad detta används till

Detta kommando används för att snabbt se vilka devices den inloggade användaren har registrerade i plattformen.

---

## Visa status för en device

### Dev

```bash
npm run dev -- device status --device 456789
```

eller kortare:

```bash
npm run dev -- device status -d 456789
```

### Efter npm link

```bash
nodecore device status --device 456789
```

Detta visar aktuell status för en specifik device.

### Exempel på resultat

```text
ID          Name              Transport     Battery     Firmware      Last seen           Status
----------  ----------------  ------------  ----------  ------------  ------------------  ----------
456789      Cellular          cellular      75%         1.0.0         2026-05-26 13:15    online
```

### Fält som visas

- Device ID
- Device name
- Transport
- Battery percent
- Firmware version
- Last seen
- Connection status

### Vad detta används till

Detta kommando används för att kontrollera om en device är online/offline och när den senast skickade statusdata.

---

## Visa senaste GNSS-position

### Dev

```bash
npm run dev -- device position --device 456789
```

eller:

```bash
npm run dev -- device position -d 456789
```

### Efter npm link

```bash
nodecore device position --device 456789
```

Detta visar senaste kända GNSS-position för en device.

### Exempel på resultat

```text
Device      Name              Lat             Lon             Acc         Time
----------  ----------------  --------------  --------------  ----------  ------------------
456789      Cellular          59.4593000      18.4686000      9.90 m      2026-05-26 13:06
```

### Vad detta används till

Detta kommando används för att snabbt kontrollera om en device har skickat GNSS-data och vilken senaste positionen är.

---

## Visa positionshistorik

### Dev

```bash
npm run dev -- device history --device 456789 --limit 10
```

eller:

```bash
npm run dev -- device history -d 456789 -l 10
```

### Efter npm link

```bash
nodecore device history --device 456789 --limit 10
```

Detta visar senaste sparade GNSS-positionerna för vald device.

`--limit` styr hur många positioner som visas.

### Exempel med fler positioner

```bash
nodecore device history --device 456789 --limit 40
```

### Exempel på resultat

```text
Device      Name              Lat             Lon             Acc         Time
----------  ----------------  --------------  --------------  ----------  ------------------
456789      Cellular          59.4593000      18.4686000      9.90 m      2026-05-26 13:06
456789      Cellular          59.3130000      18.0230000      6.50 m      2026-05-18 11:28
```

### Vad detta används till

Detta kommando används för att kontrollera att GNSS-data sparas korrekt över tid.

Det är användbart för att felsöka:

- om positioner sparas i databasen
- om en device har skickat flera positioner
- om historiken visas korrekt
- om mockdata eller riktig firmware skickar rätt data

---

## Visa alerts för en device

### Dev

```bash
npm run dev -- device alerts --device 456789
```

eller:

```bash
npm run dev -- device alerts -d 456789
```

### Efter npm link

```bash
nodecore device alerts --device 456789
```

Detta visar sparade alerts för en device.

Just nu används det främst för geofence-alerts.

### Exempel på resultat

```text
ID        Device      Name              Transport     Type                From        To          Value       Reason                        Created
--------  ----------  ----------------  ------------  ------------------  ----------  ----------  ----------  ----------------------------  ------------------
4         456789      Cellular          cellular      geofence            outside     inside      366.00      Coming from outside to insi…  2026-05-21 20:30
5         456789      Cellular          cellular      geofence            inside      outside     3548.00     Coming from inside to outsi…  2026-05-21 21:12
```

### Vad detta används till

Detta kommando används för att verifiera att alerts sparas korrekt i databasen.

Exempel:

- device går utanför ett arbetsområde
- device går tillbaka in i ett arbetsområde
- geofence-status ändras
- alert-historiken ska kontrolleras utan att öppna webben

---

# Firmware events / Device events

NodeCore kan även ta emot firmware-events från device via CoAP.

Firmware skickar exempelvis:

```json
{
    "device_ID": 456789,
    "event_type": "device_cellular_ready",
    "severity": "info",
    "message": "Device cellular connection and backend communication are ready",
    "firmware_version": "1.0.0"
}
```

Detta sparas i tabellen:

```text
device_event
```

Det används för att få en online-tidslinje över vad som händer i firmware.

Exempel på events:

```text
device_cellular_ready
gnss_init_success
gnss_init_failed
gnss_post_failed
coap_empty_response
coap_invalid_response
coap_response_receive_failed
```

## Vad device_event används till

`device_event` används för remote debugging och DeviceOps.

Det hjälper dig se:

- startade devicen korrekt?
- fick den cellular/backend-kommunikation?
- startade GNSS?
- misslyckades GNSS?
- kunde devicen skicka position?
- fick den tomt eller ogiltigt CoAP-svar?
- vilken firmware-version kördes när felet hände?

Detta gör att du kan felsöka en device utan att ha serial monitor inkopplad.

---

## Testa device_event lokalt med CoAP Client

Om du testar lokalt på Macen:

```text
CoAP Client på Mac → lokal Node.js CoAP-server → MySQL
```

Starta backend lokalt.

I backend `.env` kan du använda:

```env
COAP_HOST_NAME=127.0.0.1
COAP_PORT=5683
```

eller om du vill lyssna på hela nätverket:

```env
COAP_HOST_NAME=0.0.0.0
COAP_PORT=5683
```

Starta backend:

```bash
cd backend
npm run dev
```

Skicka sedan POST till:

```text
coap://localhost/device/event
```

Body:

```json
{
    "device_ID": 456789,
    "event_type": "device_cellular_ready",
    "severity": "info",
    "message": "Device cellular connection and backend communication are ready",
    "firmware_version": "1.0.0"
}
```

Kolla sedan MySQL:

```sql
SELECT *
FROM device_event
WHERE device_ID = 456789
ORDER BY created_at DESC
LIMIT 10;
```

## Viktigt om nRF9151DK och lokal Mac

Om nRF9151DK kör över LTE kan den normalt inte nå din Macs lokala IP, till exempel:

```text
192.168.0.14
```

Det är en privat WiFi/LAN-adress.

Detta fungerar lokalt:

```text
CoAP Client på Mac → localhost
```

Men detta fungerar normalt inte:

```text
nRF9151DK över LTE → 192.168.0.14
```

För riktig firmware-test över LTE bör CoAP-servern köras på en publik server eller Linux-server med öppen UDP-port 5683.

---

# Skicka testdata från CLI

Dessa kommandon skickar data till backend.

De används för att simulera device-data utan fysisk hårdvara.

Det betyder att du kan testa plattformen utan nRF, ESP32, SIM-kort eller firmware.

---

## Skicka device-status

### Dev

```bash
npm run dev -- send status --device 456789 --battery 85 --firmware 1.0.1
```

eller:

```bash
npm run dev -- send status -d 456789 -b 85 -f 1.0.1
```

### Efter npm link

```bash
nodecore send status --device 456789 --battery 85 --firmware 1.0.1
```

Detta skickar statusdata till backend för vald device.

Payloaden motsvarar ungefär:

```json
{
    "device_ID": 456789,
    "battery_percent": 85,
    "firmware_version": "1.0.1"
}
```

### Exempel på resultat

```text
Status updated for device 456789.
```

### Vad detta testar

Detta testar att:

- backend tar emot statusdata
- databasen uppdateras
- battery percent uppdateras
- firmware version uppdateras
- last seen uppdateras
- dashboard kan visa ny status
- plattformen kan simulera heartbeat/status utan fysisk device

---

## Skicka GNSS-position

### Dev

```bash
npm run dev -- send gnss --device 456789 --lat 59.3293 --lon 18.0686 --acc 9.2
```

eller:

```bash
npm run dev -- send gnss -d 456789 --lat 59.3293 --lon 18.0686 --acc 9.2
```

### Efter npm link

```bash
nodecore send gnss --device 456789 --lat 59.3293 --lon 18.0686 --acc 9.2
```

Detta skickar en GNSS-position till backend för vald device.

Payloaden motsvarar ungefär:

```json
{
    "device_ID": 456789,
    "lat": 59.3293,
    "lon": 18.0686,
    "acc": 9.2
}
```

### Exempel på resultat

```text
GNSS data added for device 456789.
```

### Vad detta testar

Detta testar att:

- backend tar emot GNSS-data
- positionen sparas i databasen
- senaste position kan hämtas
- positionshistorik uppdateras
- dashboard/karta kan visa ny position
- geofence-logik kan köras om backend använder det flödet
- plattformen kan simulera positionsdata utan fysisk device

---

# Snabbtest

## Dev-läge

```bash
npm run dev -- user login --username dennis --password kalleanka9
npm run dev -- user me
npm run dev -- devices list
npm run dev -- send status --device 456789 --battery 85 --firmware 1.0.1
npm run dev -- send gnss --device 456789 --lat 59.3293 --lon 18.0686 --acc 9.2
npm run dev -- device status --device 456789
npm run dev -- device position --device 456789
npm run dev -- device history --device 456789 --limit 10
npm run dev -- device alerts --device 456789
```

## Efter npm link

```bash
nodecore user login --username dennis --password kalleanka9
nodecore user me
nodecore devices list
nodecore send status --device 456789 --battery 85 --firmware 1.0.1
nodecore send gnss --device 456789 --lat 59.3293 --lon 18.0686 --acc 9.2
nodecore device status --device 456789
nodecore device position --device 456789
nodecore device history --device 456789 --limit 10
nodecore device alerts --device 456789
```

Detta testar:

```text
1. Att login fungerar
2. Att session sparas lokalt
3. Att CLI:t kan prata med backend
4. Att devices kan hämtas
5. Att statusdata kan skickas
6. Att GNSS-data kan skickas
7. Att status kan läsas tillbaka
8. Att position kan läsas tillbaka
9. Att historik kan visas
10. Att alerts kan visas
```

---

# Skillnad mellan read-kommandon och send-kommandon

## Read-kommandon

Dessa hämtar data från backend och använder sparad login-session:

```bash
nodecore devices list
nodecore device status --device 456789
nodecore device position --device 456789
nodecore device history --device 456789 --limit 10
nodecore device alerts --device 456789
```

## Send-kommandon

Dessa skickar testdata till backend:

```bash
nodecore send status --device 456789 --battery 85 --firmware 1.0.1
nodecore send gnss --device 456789 --lat 59.3293 --lon 18.0686 --acc 9.2
```

Send-kommandon används för att simulera data från en device.

---

# Lokal backend och live-server

CLI:t kan användas mot både lokal backend och live-server.

## Lokal backend

Använd:

```env
NODECORE_API_URL=http://127.0.0.1:3000
```

Då skickar CLI:t requests till lokal backend.

## Live-server

Använd:

```env
NODECORE_API_URL=https://nodecore.it.com
```

Då skickar CLI:t requests till live-servern.

Viktigt: om webbplatsen fungerar lokalt men CLI:t använder live-servern kan login eller devices skilja sig, eftersom det kan vara olika databaser.

---

# Vanliga fel

## Du är inte inloggad

Om du kör ett read-kommando utan login:

```bash
nodecore devices list
```

kan du få:

```text
You are not logged in.
Run: nodecore user login --username <username> --password <password>
```

Logga in:

```bash
nodecore user login --username dennis --password kalleanka9
```

---

## Session-filen syns inte i Finder

Sessionen sparas i:

```text
~/.nodecore/config.json
```

Mappar som börjar med punkt är dolda på Mac/Linux.

Visa i terminalen:

```bash
ls -la ~/.nodecore
cat ~/.nodecore/config.json
```

Öppna mappen i Finder:

```bash
open ~/.nodecore
```

Visa dolda filer i Finder:

```text
Cmd + Shift + .
```

---

## Backend kör inte

Om backend inte körs kan CLI:t inte ansluta.

Starta backend:

```bash
cd backend
npm run dev
```

---

## Fel API-url

Kontrollera att `NODECORE_API_URL` pekar på rätt backend.

Lokal backend:

```env
NODECORE_API_URL=http://127.0.0.1:3000
```

Live-server:

```env
NODECORE_API_URL=https://nodecore.it.com
```

---

## Login fungerar i webben men inte i CLI

Kontrollera att CLI:t använder samma backend som webben.

Exempel: om webben använder lokal backend men CLI:t använder live-servern kan användaren finnas lokalt men inte på live-servern.

Tvinga CLI:t att använda lokal backend:

```bash
NODECORE_API_URL=http://127.0.0.1:3000 npm run dev -- user login --username dennis --password kalleanka9
```

---

## Fel device ID

Om du inte får data, kontrollera först vilka devices den inloggade användaren har:

```bash
nodecore devices list
```

Använd sedan ett device ID från listan.

---

## `send gnss` fungerar men `device position` visar gammal position

Kontrollera backend-queryn för senaste position.

Den ska hämta senaste raden, exempelvis med:

```sql
ORDER BY received_at DESC, id DESC
LIMIT 1
```

eller:

```sql
ORDER BY id DESC
LIMIT 1
```

Om queryn sorterar på `data_timestamp` och nya testdata har `data_timestamp = NULL`, kan en äldre rad visas.

---

## `nodecore` fungerar inte efter npm link

Kontrollera att CLI:t är byggt:

```bash
npm run build
npm link
```

Kontrollera också att `package.json` har en `bin`-sektion som pekar på byggda filen i `dist`.

Exempel:

```json
{
    "bin": {
        "nodecore": "./dist/index.js"
    }
}
```

---

## Terminalen försöker köra JavaScript som shell-script

Om du får fel som:

```text
import: command not found
```

eller:

```text
syntax error near unexpected token
```

kontrollera att första raden i `src/index.ts` är:

```ts
#!/usr/bin/env node
```

Den måste ligga allra högst upp i filen, före alla imports.

Bygg sedan om:

```bash
npm run build
npm link
```

---

# Sammanfattning

NodeCore CLI är ett developer tool för NodeCore IoT Platform.

Det gör det möjligt att testa och felsöka plattformen direkt från terminalen.

CLI:t kan:

- logga in och spara session
- visa inloggad användare
- logga ut
- lista devices
- visa device-status
- visa senaste GNSS-position
- visa positionshistorik
- visa alerts
- skicka statusdata
- skicka GNSS-data
- testa device events via CoAP-servern

Det gör CLI:t användbart för utveckling, test och demo utan att alltid behöva fysisk IoT-hårdvara.

Med CLI:t kan man testa hela vägen:

```text
Terminal → Backend API → Databas → Dashboard / historik / alerts
```

Och med `device_event` kan NodeCore även visa firmware-händelser:

```text
Firmware → CoAP → Backend → device_event → CLI / Dashboard / AI explanation
```

Det gör NodeCore mer än bara en webbplattform. Det blir också ett praktiskt developer tool och början på en DeviceOps-plattform för IoT.
