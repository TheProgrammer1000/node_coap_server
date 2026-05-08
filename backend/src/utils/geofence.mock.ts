import { checkGeofenceStatus } from "./geofence.js";

interface MockAreaLocation {
    id: number;
    user_ID: number;
    device_ID: number;
    lon: string;
    lat: string;
    circle_radius_m: number;
    matchedAddress: string;
    active: number;
}

interface MockGnssData {
    device_ID: number;
    lat: string;
    lon: string;
    acc: string;
    data_timestamp: string;
    received_at: string;
}

const mockAreaLocations: MockAreaLocation[] = [
    {
        id: 1,
        user_ID: 1,
        device_ID: 123456,
        lon: "12.6915345",
        lat: "56.0464773",
        circle_radius_m: 40,
        matchedAddress: "Drottninggatan 3, 252 21 Helsingborg, Sverige",
        active: 1,
    },
    {
        id: 2,
        user_ID: 1,
        device_ID: 456789,
        lon: "18.0633155",
        lat: "59.3321111",
        circle_radius_m: 200,
        matchedAddress: "Drottninggatan 40, 111 57 Stockholm, Sverige",
        active: 1,
    },
];

const mockGnssData: MockGnssData[] = [
    // Device 123456 - position nära området
    {
        device_ID: 123456,
        lat: "56.0465000",
        lon: "12.6915500",
        acc: "5.20",
        data_timestamp: "2026-05-06 14:10:00",
        received_at: "2026-05-06 14:10:05",
    },
    {
        device_ID: 123456,
        lat: "56.0466000",
        lon: "12.6917000",
        acc: "5.70",
        data_timestamp: "2026-05-06 14:11:00",
        received_at: "2026-05-06 14:11:05",
    },
    {
        device_ID: 123456,
        lat: "56.0472000",
        lon: "12.6926000",
        acc: "5.90",
        data_timestamp: "2026-05-06 14:12:00",
        received_at: "2026-05-06 14:12:05",
    },

    // Device 456789 - position först nära, sedan längre bort
    {
        device_ID: 456789,
        lat: "59.3322000",
        lon: "18.0635000",
        acc: "4.80",
        data_timestamp: "2026-05-06 14:10:00",
        received_at: "2026-05-06 14:10:04",
    },
    {
        device_ID: 456789,
        lat: "59.3335000",
        lon: "18.0670000",
        acc: "5.40",
        data_timestamp: "2026-05-06 14:11:00",
        received_at: "2026-05-06 14:11:04",
    },
    {
        device_ID: 456789,
        lat: "59.3342000",
        lon: "18.0710000",
        acc: "5.80",
        data_timestamp: "2026-05-06 14:12:00",
        received_at: "2026-05-06 14:12:04",
    },
];

function getLatestPositionsForDevice(
    device_ID: number,
    limit = 3,
): MockGnssData[] {
    return mockGnssData
        .filter((position) => position.device_ID === device_ID)
        .sort((a, b) => {
            return (
                new Date(b.data_timestamp).getTime() -
                new Date(a.data_timestamp).getTime()
            );
        })
        .slice(0, limit);
}

function runGeofenceMockTest() {
    const results = mockAreaLocations.map((area) => {
        const latestPositions = getLatestPositionsForDevice(area.device_ID, 3);
        const latestPosition = latestPositions[0];

        if (!latestPosition) {
            return {
                area_id: area.id,
                device_ID: area.device_ID,
                matchedAddress: area.matchedAddress,
                circle_radius_m: area.circle_radius_m,
                latest_position: null,
                geofence: {
                    status: "unknown",
                    distance_m: null,
                    outside_by_m: null,
                },
            };
        }

        const geofence = checkGeofenceStatus({
            areaLat: Number(area.lat),
            areaLon: Number(area.lon),
            deviceLat: Number(latestPosition.lat),
            deviceLon: Number(latestPosition.lon),
            radiusMeters: Number(area.circle_radius_m),
        });

        return {
            area_id: area.id,
            device_ID: area.device_ID,
            matchedAddress: area.matchedAddress,
            circle_radius_m: area.circle_radius_m,
            latest_position: {
                lat: latestPosition.lat,
                lon: latestPosition.lon,
                acc: latestPosition.acc,
                data_timestamp: latestPosition.data_timestamp,
            },
            geofence,
            latest_3_positions: latestPositions.map((position) => {
                const positionStatus = checkGeofenceStatus({
                    areaLat: Number(area.lat),
                    areaLon: Number(area.lon),
                    deviceLat: Number(position.lat),
                    deviceLon: Number(position.lon),
                    radiusMeters: Number(area.circle_radius_m),
                });

                return {
                    lat: position.lat,
                    lon: position.lon,
                    data_timestamp: position.data_timestamp,
                    geofence: positionStatus,
                };
            }),
        };
    });

    console.log(JSON.stringify(results, null, 2));
}

runGeofenceMockTest();
