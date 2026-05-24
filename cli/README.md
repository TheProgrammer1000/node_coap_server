# NodeCore CLI

NodeCore CLI är ett terminalverktyg för **NodeCore IoT Platform**.

CLI:t gör det möjligt att läsa och skicka device-data direkt från terminalen utan att öppna webbgränssnittet. Det används främst som ett developer tool för att testa backend, devices, GNSS-data, status, historik och alerts.

CLI:t kan användas både mot lokal backend och mot live-server.

---

## Vad CLI:t gör

Med NodeCore CLI kan du:

- Lista devices för en användare
- Visa status för en specifik device
- Visa senaste GNSS-position
- Visa GNSS-historik
- Visa alerts för en device
- Skicka statusdata till backend
- Skicka GNSS-position till backend

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

## Kör under utveckling

Under utveckling körs kommandon med:

```bash
npm run dev -- <command>
```

Exempel:

```bash
npm run dev -- devices list -u 12
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
nodecore devices list -u 12
```

Skillnaden är:

```bash
npm run dev -- devices list -u 12
```

blir efter `npm link`:

```bash
nodecore devices list -u 12
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

Exempel på resultat:

```text
0.0.1
```

---

## Lista devices för en användare

### Dev

```bash
npm run dev -- devices list -u 12
```

### Efter npm link

```bash
nodecore devices list -u 12
```

Detta hämtar alla devices som är kopplade till användaren.

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

Detta kommando används för att snabbt se vilka devices en användare har registrerade i plattformen.

---

## Visa status för en device

### Dev

```bash
npm run dev -- device status -u 12 -d 200005
```

### Efter npm link

```bash
nodecore device status -u 12 -d 200005
```

Detta visar aktuell status för en specifik device.

### Exempel på resultat

```text
ID          Name              Transport     Battery     Firmware      Last seen           Status
----------  ----------------  ------------  ----------  ------------  ------------------  ----------
200005      my_cella          cellular      85%         1.0.1         2026-05-21 22:12    offline
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
npm run dev -- device position -u 12 -d 200005
```

### Efter npm link

```bash
nodecore device position -u 12 -d 200005
```

Detta visar senaste kända GNSS-position för en device.

### Exempel på resultat

```text
device_ID   lat               lon           acc           data_timestamp  device_name
----------  ----------------  ------------  ------------  --------------  ------------
200005      59.2944120        17.9323460    4.90          2026-05-21      my_cella
```

### Vad detta används till

Detta kommando används för att snabbt kontrollera om en device har skickat GNSS-data och vilken senaste positionen är.

---

## Visa positionshistorik

### Dev

```bash
npm run dev -- device history -u 12 -d 200005 --limit 10
```

### Efter npm link

```bash
nodecore device history -u 12 -d 200005 --limit 10
```

Detta visar senaste sparade GNSS-positionerna för vald device.

`--limit` styr hur många positioner som visas.

### Exempel med fler positioner

```bash
nodecore device history -u 12 -d 200005 --limit 40
```

### Exempel på resultat

```text
device_ID   lat               lon           acc           data_timestamp  device_name
----------  ----------------  ------------  ------------  --------------  ------------
200005      59.2944120        17.9323460    4.90          2026-05-21      my_cella
200005      59.2956710        17.9340760    9.30          2026-05-21      my_cella
200005      59.2942250        17.9355370    12.10         2026-05-21      my_cella
```

### Vad detta används till

Detta kommando används för att kontrollera att GNSS-data sparas korrekt över tid.

Det är användbart för att felsöka:

- Om positioner sparas i databasen
- Om en device har skickat flera positioner
- Om historiken visas korrekt
- Om mockdata eller riktig firmware skickar rätt data

---

## Visa alerts för en device

### Dev

```bash
npm run dev -- device alerts -u 12 -d 200005
```

### Efter npm link

```bash
nodecore device alerts -u 12 -d 200005
```

Detta visar sparade alerts för en device.

Just nu används det främst för geofence-alerts.

### Exempel på resultat

```text
ID        Device      Name              Transport     Type                From        To          Value       Reason                        Created
--------  ----------  ----------------  ------------  ------------------  ----------  ----------  ----------  ----------------------------  ------------------
4         200005      my_cella          cellular      geofence            outside     inside      366.00      Coming from outside to insi…  2026-05-21 20:30
5         200005      my_cella          cellular      geofence            inside      outside     3548.00     Coming from inside to outsi…  2026-05-21 21:12
```

### Vad detta används till

Detta kommando används för att verifiera att alerts sparas korrekt i databasen.

Exempel:

- Device går utanför ett arbetsområde
- Device går tillbaka in i ett arbetsområde
- Geofence-status ändras
- Alert-historiken ska kontrolleras utan att öppna webben

---

# Skicka testdata från CLI

Dessa kommandon skickar data till backend.

De används för att simulera device-data utan fysisk hårdvara.

Det betyder att du kan testa plattformen utan nRF, ESP32, SIM-kort eller firmware.

---

## Skicka device-status

### Dev

```bash
npm run dev -- send status -d 200005 --battery 85 --firmware 1.0.1
```

### Efter npm link

```bash
nodecore send status -d 200005 --battery 85 --firmware 1.0.1
```

Detta skickar statusdata till backend för vald device.

Payloaden motsvarar ungefär:

```json
{
    "device_ID": 200005,
    "battery_percent": 85,
    "firmware_version": "1.0.1"
}
```

### Exempel på resultat

```text
Successfully added status to the device: 200005!!
```

### Vad detta testar

Detta testar att:

- Backend tar emot statusdata
- Databasen uppdateras
- Battery percent uppdateras
- Firmware version uppdateras
- Last seen uppdateras
- Dashboard kan visa ny status
- Plattformen kan simulera heartbeat/status utan fysisk device

---

## Skicka GNSS-position

### Dev

```bash
npm run dev -- send gnss -d 200005 --lat 59.3293 --lon 18.0686 --acc 9.2
```

### Efter npm link

```bash
nodecore send gnss -d 200005 --lat 59.3293 --lon 18.0686 --acc 9.2
```

Detta skickar en GNSS-position till backend för vald device.

Payloaden motsvarar ungefär:

```json
{
    "device_ID": 200005,
    "lat": 59.3293,
    "lon": 18.0686,
    "acc": 9.2
}
```

### Exempel på resultat

```text
Successfully added gnss data to device 200005
```

### Vad detta testar

Detta testar att:

- Backend tar emot GNSS-data
- Positionen sparas i databasen
- Senaste position kan hämtas
- Positionshistorik uppdateras
- Dashboard/karta kan visa ny position
- Geofence-logik kan köras om backend använder det flödet
- Plattformen kan simulera positionsdata utan fysisk device

---

# Snabbtest

Efter `npm link` kan du testa hela CLI-flödet med:

```bash
nodecore devices list -u 12
nodecore send status -d 200005 --battery 85 --firmware 1.0.1
nodecore send gnss -d 200005 --lat 59.3293 --lon 18.0686 --acc 9.2
nodecore device status -u 12 -d 200005
nodecore device position -u 12 -d 200005
nodecore device history -u 12 -d 200005 --limit 10
nodecore device alerts -u 12 -d 200005
```

Detta testar:

```text
1. Att CLI:t kan prata med backend
2. Att devices kan hämtas
3. Att statusdata kan skickas
4. Att GNSS-data kan skickas
5. Att status kan läsas tillbaka
6. Att position kan läsas tillbaka
7. Att historik kan visas
8. Att alerts kan visas
```

---

# Skillnad mellan read-kommandon och send-kommandon

## Read-kommandon

Dessa hämtar data från backend:

```bash
nodecore devices list -u 12
nodecore device status -u 12 -d 200005
nodecore device position -u 12 -d 200005
nodecore device history -u 12 -d 200005 --limit 10
nodecore device alerts -u 12 -d 200005
```

## Send-kommandon

Dessa skickar testdata till backend:

```bash
nodecore send status -d 200005 --battery 85 --firmware 1.0.1
nodecore send gnss -d 200005 --lat 59.3293 --lon 18.0686 --acc 9.2
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

Exempel:

```bash
nodecore devices list -u 12
```

Då skickar CLI:t requests till lokal backend.

## Live-server

Använd:

```env
NODECORE_API_URL=https://nodecore.it.com
```

Exempel:

```bash
nodecore devices list -u 12
```

Då skickar CLI:t requests till live-servern.

---

# Vanliga fel

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

## Fel user ID eller device ID

Om du inte får data, kontrollera först vilka devices användaren har:

```bash
nodecore devices list -u 12
```

Använd sedan ett device ID från listan.

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

- Lista devices
- Visa device-status
- Visa senaste GNSS-position
- Visa positionshistorik
- Visa alerts
- Skicka statusdata
- Skicka GNSS-data

Det gör CLI:t användbart för utveckling, test och demo utan att alltid behöva fysisk IoT-hårdvara.

Med CLI:t kan man testa hela vägen:

```text
Terminal → Backend API → Databas → Dashboard / historik / alerts
```

Det gör NodeCore mer än bara en webbplattform. Det blir också ett praktiskt developer tool för IoT-utveckling.
