export type GeofenceStatus = "inside" | "outside" | "unknown";

export interface GeofenceResult {
    status: GeofenceStatus;
    distance_m: number | null;
    outside_by_m: number | null;
}

function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

export function getDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const earthRadiusMeters = 6371000;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
}

export function checkGeofenceStatus(params: {
    areaLat: number;
    areaLon: number;
    deviceLat: number;
    deviceLon: number;
    radiusMeters: number;
}): GeofenceResult {
    const { areaLat, areaLon, deviceLat, deviceLon, radiusMeters } = params;

    if (
        !Number.isFinite(areaLat) ||
        !Number.isFinite(areaLon) ||
        !Number.isFinite(deviceLat) ||
        !Number.isFinite(deviceLon) ||
        !Number.isFinite(radiusMeters) ||
        radiusMeters <= 0
    ) {
        return {
            status: "unknown",
            distance_m: null,
            outside_by_m: null,
        };
    }

    const distance = getDistanceMeters(areaLat, areaLon, deviceLat, deviceLon);
    const roundedDistance = Math.round(distance);

    if (distance <= radiusMeters) {
        return {
            status: "inside",
            distance_m: roundedDistance,
            outside_by_m: 0,
        };
    }

    return {
        status: "outside",
        distance_m: roundedDistance,
        outside_by_m: Math.round(distance - radiusMeters),
    };
}
