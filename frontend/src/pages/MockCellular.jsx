import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
    AlertCircle,
    CheckCircle2,
    MapPinned,
    Navigation,
    Radio,
    RefreshCw,
    Route,
    Send,
} from "lucide-react";
import {
    MapContainer,
    TileLayer,
    Circle,
    CircleMarker,
    Polyline,
    Popup,
    useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import LocationSearchCard from "../components/LocationSearchCard";
import { Button } from "@/components/ui/button";

const MOCK_CELLULAR_URL = "/api/device/mockdata/cellular";
const MOCK_CELLULAR_STATUS_URL = "/api/device/mockdata/cellular/add/status";

const DEFAULT_CENTER = {
    lat: 59.329323,
    lng: 18.068581,
    matchedAddress: "Stockholm, Sverige",
};

const ROUTE_OPTIONS = [
    {
        value: "smooth_loop",
        label: "Smart loop",
        description: "Mjuk rutt runt vald adress.",
    },
    {
        value: "delivery_route",
        label: "Delivery route",
        description: "Rutt som rör sig bort från adressen och tillbaka.",
    },
    {
        value: "geofence_crossing",
        label: "Geofence crossing",
        description: "Bra för att testa in/ut ur arbetsområde.",
    },
    {
        value: "random_walk",
        label: "Random walk",
        description: "Små realistiska rörelser runt adressen.",
    },
];

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.warn("Could not parse stored user:", error);
        return null;
    }
}

function normalizeDevicesResponse(responseData) {
    let devices = [];

    if (Array.isArray(responseData)) {
        devices = responseData;
    } else if (Array.isArray(responseData?.data)) {
        devices = responseData.data;
    } else if (Array.isArray(responseData?.data?.data)) {
        devices = responseData.data.data;
    } else if (Array.isArray(responseData?.devices)) {
        devices = responseData.devices;
    } else if (Array.isArray(responseData?.result)) {
        devices = responseData.result;
    }

    return devices
        .filter((device) => device && device.device_ID !== undefined)
        .map((device) => ({
            device_ID: Number(device.device_ID),
            device_name:
                device.device_name ||
                device.name ||
                `Cellular device ${device.device_ID}`,
            data_transport: String(device.data_transport || "").toLowerCase(),
        }))
        .filter((device) => device.data_transport === "cellular");
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function metersToLat(meters) {
    return meters / 111320;
}

function metersToLon(meters, lat) {
    const safeLat = Number(lat) || DEFAULT_CENTER.lat;
    return meters / (111320 * Math.cos((safeLat * Math.PI) / 180));
}

function movePoint(center, northMeters, eastMeters) {
    return {
        lat: center.lat + metersToLat(northMeters),
        lon: center.lng + metersToLon(eastMeters, center.lat),
    };
}

function roundCoord(value) {
    return Number(value.toFixed(6));
}

function withAccuracy(point, index) {
    return {
        lat: roundCoord(point.lat),
        lon: roundCoord(point.lon),
        acc: Number(randomBetween(4.5, 12.5).toFixed(1)),
        order: index + 1,
    };
}

function formatCoordinate(value) {
    return Number(value).toFixed(6);
}

function buildSmoothLoopRoute(center, pointCount, radiusMeters) {
    const route = [];
    const startAngle = randomBetween(0, Math.PI * 2);
    const radiusNoise = randomBetween(0.78, 1.08);

    for (let i = 0; i < pointCount; i += 1) {
        const progress = i / Math.max(pointCount, 1);
        const angle = startAngle + progress * Math.PI * 2;

        const wave = Math.sin(progress * Math.PI * 4) * radiusMeters * 0.16;
        const localRadius =
            radiusMeters * radiusNoise + wave + randomBetween(-25, 25);

        const east = Math.cos(angle) * localRadius;
        const north = Math.sin(angle) * localRadius;

        route.push(withAccuracy(movePoint(center, north, east), i));
    }

    return route;
}

function buildDeliveryRoute(center, pointCount, radiusMeters) {
    const route = [];
    const mainAngle = randomBetween(0, Math.PI * 2);
    const sideAngle = mainAngle + Math.PI / 2;

    for (let i = 0; i < pointCount; i += 1) {
        const progress = i / Math.max(pointCount - 1, 1);

        const forward =
            Math.sin(progress * Math.PI) * radiusMeters * 1.25 +
            randomBetween(-20, 20);

        const side =
            Math.sin(progress * Math.PI * 2) * radiusMeters * 0.35 +
            randomBetween(-25, 25);

        const east = Math.cos(mainAngle) * forward + Math.cos(sideAngle) * side;
        const north =
            Math.sin(mainAngle) * forward + Math.sin(sideAngle) * side;

        route.push(withAccuracy(movePoint(center, north, east), i));
    }

    return route;
}

function buildGeofenceCrossingRoute(center, pointCount, radiusMeters) {
    const route = [];
    const angle = randomBetween(0, Math.PI * 2);

    for (let i = 0; i < pointCount; i += 1) {
        const progress = i / Math.max(pointCount - 1, 1);

        const distanceFromCenter =
            radiusMeters * 0.25 +
            progress * radiusMeters * 1.65 +
            randomBetween(-18, 18);

        const sideOffset =
            Math.sin(progress * Math.PI * 2) * radiusMeters * 0.18 +
            randomBetween(-12, 12);

        const mainEast = Math.cos(angle) * distanceFromCenter;
        const mainNorth = Math.sin(angle) * distanceFromCenter;

        const sideEast = Math.cos(angle + Math.PI / 2) * sideOffset;
        const sideNorth = Math.sin(angle + Math.PI / 2) * sideOffset;

        route.push(
            withAccuracy(
                movePoint(center, mainNorth + sideNorth, mainEast + sideEast),
                i,
            ),
        );
    }

    return route;
}

function buildRandomWalkRoute(center, pointCount, radiusMeters) {
    const route = [];

    let east = randomBetween(-radiusMeters * 0.2, radiusMeters * 0.2);
    let north = randomBetween(-radiusMeters * 0.2, radiusMeters * 0.2);

    let direction = randomBetween(0, Math.PI * 2);
    const stepBase = clamp(radiusMeters / 4, 35, 140);

    for (let i = 0; i < pointCount; i += 1) {
        direction += randomBetween(-0.75, 0.75);

        east += Math.cos(direction) * randomBetween(stepBase * 0.45, stepBase);
        north += Math.sin(direction) * randomBetween(stepBase * 0.45, stepBase);

        const distance = Math.sqrt(east * east + north * north);

        if (distance > radiusMeters * 1.25) {
            east *= 0.65;
            north *= 0.65;
            direction += Math.PI;
        }

        route.push(withAccuracy(movePoint(center, north, east), i));
    }

    return route;
}

function buildAddressBasedRoute({
    selectedLocation,
    routeType,
    pointCount,
    radiusMeters,
}) {
    const center = {
        lat: Number(selectedLocation?.lat ?? DEFAULT_CENTER.lat),
        lng: Number(selectedLocation?.lng ?? DEFAULT_CENTER.lng),
    };

    const safePointCount = clamp(Number(pointCount) || 8, 3, 40);
    const safeRadiusMeters = clamp(Number(radiusMeters) || 350, 50, 3000);

    if (routeType === "delivery_route") {
        return buildDeliveryRoute(center, safePointCount, safeRadiusMeters);
    }

    if (routeType === "geofence_crossing") {
        return buildGeofenceCrossingRoute(
            center,
            safePointCount,
            safeRadiusMeters,
        );
    }

    if (routeType === "random_walk") {
        return buildRandomWalkRoute(center, safePointCount, safeRadiusMeters);
    }

    return buildSmoothLoopRoute(center, safePointCount, safeRadiusMeters);
}

function getRouteCenter(points, fallbackLocation) {
    if (!points.length) {
        return [fallbackLocation.lat, fallbackLocation.lng];
    }

    const latSum = points.reduce((sum, point) => sum + point.lat, 0);
    const lonSum = points.reduce((sum, point) => sum + point.lon, 0);

    return [latSum / points.length, lonSum / points.length];
}

function MapAutoFit({ points, selectedLocation }) {
    const map = useMap();

    useEffect(() => {
        const mapPoints = [];

        if (selectedLocation) {
            mapPoints.push([selectedLocation.lat, selectedLocation.lng]);
        }

        if (points?.length > 0) {
            points.forEach((point) => {
                mapPoints.push([point.lat, point.lon]);
            });
        }

        if (mapPoints.length === 0) return;

        const timer = window.setTimeout(() => {
            map.invalidateSize();

            if (mapPoints.length === 1) {
                map.setView(mapPoints[0], 15);
                return;
            }

            map.fitBounds(mapPoints, {
                padding: [40, 40],
                maxZoom: 16,
            });
        }, 120);

        return () => window.clearTimeout(timer);
    }, [map, points, selectedLocation]);

    return null;
}

export default function MockCellular() {
    const user = getStoredUser();
    const userId = user?.user_ID || null;

    const [cellularDevices, setCellularDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");

    const [selectedLocation, setSelectedLocation] = useState(DEFAULT_CENTER);
    const [routeType, setRouteType] = useState("smooth_loop");
    const [pointCount, setPointCount] = useState(8);
    const [intervalMs, setIntervalMs] = useState(2000);
    const [radiusMeters, setRadiusMeters] = useState(600);

    const [routeSeed, setRouteSeed] = useState(Date.now());

    const [devicesLoading, setDevicesLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [liveIndex, setLiveIndex] = useState(0);
    const [sentPositions, setSentPositions] = useState([]);

    const liveTimerRef = useRef(null);

    const selectedDevice = useMemo(() => {
        return cellularDevices.find(
            (device) => String(device.device_ID) === String(selectedDeviceId),
        );
    }, [cellularDevices, selectedDeviceId]);

    const selectedRoute = useMemo(() => {
        return (
            ROUTE_OPTIONS.find((route) => route.value === routeType) ||
            ROUTE_OPTIONS[0]
        );
    }, [routeType]);

    const previewRoute = useMemo(() => {
        routeSeed;

        return buildAddressBasedRoute({
            selectedLocation,
            routeType,
            pointCount,
            radiusMeters,
        });
    }, [selectedLocation, routeType, pointCount, radiusMeters, routeSeed]);

    const hasSentPositions = sentPositions.length > 0;

    /*
        previewRoute = planerad rutt innan mocken skickas.
        sentPositions = den faktiska skickade rutten.

        Det viktiga här är att kartan ska följa sentPositions efter att mocken
        har skickats. Annars kan en ny random previewRoute göra att linjen och
        device-markern hamnar på olika platser.
    */
    const visibleRoute = hasSentPositions ? sentPositions : previewRoute;

    const currentLivePoint = hasSentPositions
        ? sentPositions[Math.min(liveIndex, sentPositions.length - 1)] ||
          sentPositions[sentPositions.length - 1]
        : previewRoute[0] || null;

    const routeCenter = getRouteCenter(
        visibleRoute,
        selectedLocation || DEFAULT_CENTER,
    );

    const previewLine = !hasSentPositions
        ? previewRoute.map((point) => [point.lat, point.lon])
        : [];

    const sentLine = sentPositions.map((point) => [point.lat, point.lon]);

    const progressText = `${sentPositions.length}/${previewRoute.length}`;
    const hasSentAll =
        previewRoute.length > 0 && sentPositions.length === previewRoute.length;

    function clearLiveTimer() {
        if (liveTimerRef.current) {
            window.clearInterval(liveTimerRef.current);
            liveTimerRef.current = null;
        }
    }

    function resetRouteUi() {
        setSentPositions([]);
        setLiveIndex(0);
        setStatusMessage("");
        setErrorMessage("");
    }

    async function fetchCellularDevices() {
        if (!userId) {
            setCellularDevices([]);
            setSelectedDeviceId("");
            setErrorMessage("Ingen user_ID hittades. Logga in igen.");
            return;
        }

        try {
            setDevicesLoading(true);
            setErrorMessage("");

            const response = await axios.get(
                `/api/device/get/user/status/${userId}`,
            );

            const devices = normalizeDevicesResponse(response.data);

            setCellularDevices(devices);

            if (devices.length === 0) {
                setSelectedDeviceId("");
                return;
            }

            setSelectedDeviceId((currentDeviceId) => {
                const currentStillExists = devices.some(
                    (device) =>
                        String(device.device_ID) === String(currentDeviceId),
                );

                if (currentStillExists) {
                    return currentDeviceId;
                }

                return String(devices[0].device_ID);
            });
        } catch (error) {
            console.error("Failed to fetch cellular devices:", error);

            setCellularDevices([]);
            setSelectedDeviceId("");

            setErrorMessage(
                error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    "Kunde inte hämta cellular devices.",
            );
        } finally {
            setDevicesLoading(false);
        }
    }

    async function updateMockDeviceStatus(deviceId) {
        const response = await axios.post(MOCK_CELLULAR_STATUS_URL, {
            device_ID: deviceId,
        });

        if (response.data?.success === false) {
            throw new Error(
                response.data?.message ||
                    response.data?.error ||
                    "GNSS-data skickades men device-status kunde inte uppdateras.",
            );
        }

        return response.data;
    }

    function startLocalLivePreview(routeToPlay) {
        clearLiveTimer();

        setLiveIndex(0);
        setSentPositions(routeToPlay.length > 0 ? [routeToPlay[0]] : []);

        if (routeToPlay.length <= 1) return;

        let index = 0;
        const safeInterval = clamp(Number(intervalMs) || 2000, 500, 10000);

        liveTimerRef.current = window.setInterval(() => {
            index += 1;

            if (index >= routeToPlay.length) {
                clearLiveTimer();
                return;
            }

            setLiveIndex(index);
            setSentPositions((prev) => [...prev, routeToPlay[index]]);
        }, safeInterval);
    }

    function handleRandomizeRoute() {
        setRouteSeed(Date.now() + Math.random());
        resetRouteUi();
    }

    async function handleSendMockRoute() {
        setErrorMessage("");
        setStatusMessage("");

        const numericDeviceId = Number(selectedDeviceId);

        if (!Number.isFinite(numericDeviceId) || numericDeviceId <= 0) {
            setErrorMessage("Välj en cellular device först.");
            return;
        }

        if (!selectedLocation?.lat || !selectedLocation?.lng) {
            setErrorMessage("Sök och välj en adress först.");
            return;
        }

        try {
            setSending(true);

            const routeToSend = buildAddressBasedRoute({
                selectedLocation,
                routeType,
                pointCount,
                radiusMeters,
            });

            startLocalLivePreview(routeToSend);

            const response = await axios.post(MOCK_CELLULAR_URL, {
                device_ID: numericDeviceId,
                route: routeToSend,
                route_type: routeType,
                point_count: Number(pointCount),
                interval_ms: Number(intervalMs),
                center: {
                    lat: Number(selectedLocation.lat),
                    lon: Number(selectedLocation.lng),
                    matchedAddress: selectedLocation.matchedAddress,
                },
            });

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                        response.data?.error ||
                        "Kunde inte skicka mock GNSS-data.",
                );
            }

            const resultRoute = Array.isArray(response.data?.data?.route)
                ? response.data.data.route
                : routeToSend;

            await updateMockDeviceStatus(numericDeviceId);

            window.dispatchEvent(new Event("devices-updated"));

            setSentPositions(resultRoute);
            setLiveIndex(Math.max(resultRoute.length - 1, 0));

            setStatusMessage(
                `${resultRoute.length} positioner skickades och status uppdaterades för ${
                    selectedDevice?.device_name || "vald device"
                }.`,
            );

            // Behåll samma rutt efter skickning så karta och device-marker stämmer.
        } catch (error) {
            console.error("Failed to send mock cellular route:", error);

            setErrorMessage(
                error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    error.message ||
                    "Kunde inte skicka mock cellular-data.",
            );
        } finally {
            clearLiveTimer();
            setSending(false);
        }
    }

    useEffect(() => {
        fetchCellularDevices();

        function handleDevicesUpdated() {
            fetchCellularDevices();
        }

        window.addEventListener("devices-updated", handleDevicesUpdated);

        return () => {
            window.removeEventListener("devices-updated", handleDevicesUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        resetRouteUi();
        clearLiveTimer();

        return () => {
            clearLiveTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeType, pointCount, intervalMs, radiusMeters, selectedDeviceId]);

    return (
        <section className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300">
                        <MapPinned className="h-3.5 w-3.5" />
                        Cellular GNSS mock
                    </div>

                    <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                        Mock Cellular Route
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                        Skapa en test-rutt runt en adress och skicka GNSS-data
                        till din backend via mock-flödet.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={fetchCellularDevices}
                    disabled={devicesLoading || sending}
                    className="h-11 w-full rounded-xl font-bold sm:w-fit"
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                            devicesLoading ? "animate-spin" : ""
                        }`}
                    />
                    Ladda devices
                </Button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
                <div className="space-y-5">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                        <LocationSearchCard
                            title="Startadress"
                            description="Sök platsen där mock-rutten ska börja."
                            label="Adress"
                            placeholder="Drottninggatan 1 Stockholm"
                            matchedTitle="Vald adress"
                            tone="blue"
                            icon={MapPinned}
                            onLocationSelected={(location) => {
                                setSelectedLocation({
                                    lat: Number(location.lat),
                                    lng: Number(location.lng),
                                    matchedAddress: location.matchedAddress,
                                    source: "address",
                                });

                                setRouteSeed(Date.now() + Math.random());
                                resetRouteUi();
                            }}
                        />

                        <div className="mt-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm">
                            <p className="font-black text-blue-800 dark:text-blue-200">
                                {selectedLocation.matchedAddress}
                            </p>

                            <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400">
                                {formatCoordinate(selectedLocation.lat)},{" "}
                                {formatCoordinate(selectedLocation.lng)}
                            </p>
                        </div>

                        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-blue-500/10 p-2">
                                    <Radio className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                                </div>

                                <div>
                                    <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                        Ruttinställningar
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Välj device, rutt och radie.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Device
                                    </label>

                                    <select
                                        value={selectedDeviceId}
                                        disabled={
                                            sending ||
                                            devicesLoading ||
                                            cellularDevices.length === 0
                                        }
                                        onChange={(event) => {
                                            setSelectedDeviceId(
                                                event.target.value,
                                            );
                                        }}
                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
                                    >
                                        {cellularDevices.length === 0 ? (
                                            <option value="">
                                                Ingen cellular device hittades
                                            </option>
                                        ) : (
                                            cellularDevices.map((device) => (
                                                <option
                                                    key={device.device_ID}
                                                    value={device.device_ID}
                                                >
                                                    {device.device_name} -{" "}
                                                    {device.device_ID}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Rutt
                                    </label>

                                    <select
                                        value={routeType}
                                        disabled={sending}
                                        onChange={(event) =>
                                            setRouteType(event.target.value)
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
                                    >
                                        {ROUTE_OPTIONS.map((route) => (
                                            <option
                                                key={route.value}
                                                value={route.value}
                                            >
                                                {route.label}
                                            </option>
                                        ))}
                                    </select>

                                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                        {selectedRoute.description}
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                                            Positioner
                                        </label>

                                        <input
                                            type="number"
                                            min="3"
                                            max="40"
                                            value={pointCount}
                                            disabled={sending}
                                            onChange={(event) =>
                                                setPointCount(
                                                    event.target.value,
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                                            Intervall ms
                                        </label>

                                        <input
                                            type="number"
                                            min="500"
                                            max="10000"
                                            step="500"
                                            value={intervalMs}
                                            disabled={sending}
                                            onChange={(event) =>
                                                setIntervalMs(
                                                    event.target.value,
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Radie meter
                                    </label>

                                    <input
                                        type="number"
                                        min="50"
                                        max="3000"
                                        step="50"
                                        value={radiusMeters}
                                        disabled={sending}
                                        onChange={(event) =>
                                            setRadiusMeters(event.target.value)
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
                                    />
                                </div>
                            </div>

                            <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRandomizeRoute}
                                    disabled={sending}
                                    className="h-11 w-full rounded-xl font-bold"
                                >
                                    <Route className="mr-2 h-4 w-4" />
                                    Slumpa rutt
                                </Button>

                                <Button
                                    type="button"
                                    onClick={handleSendMockRoute}
                                    disabled={
                                        sending ||
                                        devicesLoading ||
                                        !selectedDeviceId ||
                                        !selectedLocation
                                    }
                                    className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 font-bold text-white"
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    {sending
                                        ? "Skickar och uppdaterar status..."
                                        : "Skicka"}
                                </Button>
                            </div>

                            {statusMessage && (
                                <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                        <p>{statusMessage}</p>
                                    </div>
                                </div>
                            )}

                            {errorMessage && (
                                <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <p>{errorMessage}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                            <div>
                                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                    Karta
                                </h2>

                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Blå streckad linje är planerad rutt. Grön
                                    linje visas efter skickad mock.
                                </p>
                            </div>

                            <span
                                className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                                    sending
                                        ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                        : hasSentAll
                                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                          : "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                                }`}
                            >
                                {sending
                                    ? "SKICKAR"
                                    : hasSentAll
                                      ? "SKICKAD"
                                      : "READY"}
                            </span>
                        </div>

                        <div className="h-[390px] w-full sm:h-[480px] lg:h-[610px]">
                            <MapContainer
                                center={routeCenter}
                                zoom={13}
                                scrollWheelZoom
                                className="h-full w-full"
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                <MapAutoFit
                                    points={visibleRoute}
                                    selectedLocation={selectedLocation}
                                />

                                {selectedLocation && (
                                    <Circle
                                        center={[
                                            selectedLocation.lat,
                                            selectedLocation.lng,
                                        ]}
                                        radius={Number(radiusMeters) || 600}
                                        pathOptions={{
                                            color: "#7c3aed",
                                            fillColor: "#8b5cf6",
                                            fillOpacity: 0.08,
                                            weight: 2,
                                            dashArray: "8 8",
                                        }}
                                    >
                                        <Popup>
                                            <div>
                                                <strong>Route center</strong>
                                                <br />
                                                {
                                                    selectedLocation.matchedAddress
                                                }
                                                <br />
                                                Radie: {radiusMeters} m
                                            </div>
                                        </Popup>
                                    </Circle>
                                )}

                                {previewLine.length > 1 && (
                                    <Polyline
                                        positions={previewLine}
                                        pathOptions={{
                                            color: "#2563eb",
                                            weight: 4,
                                            opacity: 0.7,
                                            dashArray: "8 8",
                                        }}
                                    />
                                )}

                                {sentLine.length > 1 && (
                                    <Polyline
                                        positions={sentLine}
                                        pathOptions={{
                                            color: "#10b981",
                                            weight: 4,
                                            opacity: 0.85,
                                        }}
                                    />
                                )}

                                {visibleRoute.map((point, index) => {
                                    const isFirst = index === 0;
                                    const isLast =
                                        index === visibleRoute.length - 1;
                                    const isSent =
                                        hasSentPositions &&
                                        index < sentPositions.length;
                                    const isCurrent =
                                        hasSentPositions &&
                                        index ===
                                            Math.min(
                                                liveIndex,
                                                sentPositions.length - 1,
                                            );

                                    return (
                                        <CircleMarker
                                            key={`${point.lat}-${point.lon}-${index}`}
                                            center={[point.lat, point.lon]}
                                            radius={isFirst || isLast ? 7 : 5}
                                            pathOptions={{
                                                color: isCurrent
                                                    ? "#2563eb"
                                                    : isSent
                                                      ? "#64748b"
                                                      : "#2563eb",
                                                fillColor: isCurrent
                                                    ? "#2563eb"
                                                    : isSent
                                                      ? "#64748b"
                                                      : "#2563eb",
                                                fillOpacity: isCurrent
                                                    ? 0.95
                                                    : isSent
                                                      ? 0.85
                                                      : 0.35,
                                                weight: isCurrent ? 4 : 2,
                                            }}
                                        >
                                            <Popup>
                                                <div>
                                                    <strong>
                                                        Punkt {index + 1}
                                                    </strong>
                                                    <br />
                                                    Lat:{" "}
                                                    {formatCoordinate(
                                                        point.lat,
                                                    )}
                                                    <br />
                                                    Lon:{" "}
                                                    {formatCoordinate(
                                                        point.lon,
                                                    )}
                                                    <br />
                                                    Accuracy: {point.acc} m
                                                    <br />
                                                    {isFirst && "Startpunkt"}
                                                    {isLast && "Slutpunkt"}
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    );
                                })}

                                {currentLivePoint && (
                                    <CircleMarker
                                        center={[
                                            currentLivePoint.lat,
                                            currentLivePoint.lon,
                                        ]}
                                        radius={12}
                                        pathOptions={{
                                            color: sending
                                                ? "#f97316"
                                                : "#2563eb",
                                            fillColor: sending
                                                ? "#f97316"
                                                : "#2563eb",
                                            fillOpacity: 0.96,
                                            weight: 4,
                                        }}
                                    >
                                        <Popup>
                                            <div>
                                                <strong>Aktuell punkt</strong>
                                                <br />
                                                Device:{" "}
                                                {selectedDevice?.device_name ||
                                                    "N/A"}
                                                <br />
                                                ID: {selectedDeviceId || "N/A"}
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                )}
                            </MapContainer>
                        </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                        Status
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Viktig information för mock-rutten.
                                    </p>
                                </div>

                                <Navigation className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <StatusCard
                                    label="Device"
                                    value={
                                        selectedDevice
                                            ? selectedDevice.device_name
                                            : "Ingen vald"
                                    }
                                />

                                <StatusCard
                                    label="Route"
                                    value={selectedRoute.label}
                                />

                                <StatusCard
                                    label="Progress"
                                    value={progressText}
                                />

                                <StatusCard
                                    label="Intervall"
                                    value={`${intervalMs} ms`}
                                />
                            </div>

                            {currentLivePoint && (
                                <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm">
                                    <p className="font-bold text-blue-800 dark:text-blue-200">
                                        Senaste punkt
                                    </p>

                                    <p className="mt-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                                        {formatCoordinate(currentLivePoint.lat)}
                                        ,{" "}
                                        {formatCoordinate(currentLivePoint.lon)}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                                    Positioner
                                </h3>

                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    {progressText}
                                </span>
                            </div>

                            <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                                {visibleRoute.map((point, index) => {
                                    const isCurrent =
                                        hasSentPositions &&
                                        index ===
                                            Math.min(
                                                liveIndex,
                                                sentPositions.length - 1,
                                            );
                                    const isSent =
                                        hasSentPositions &&
                                        index < sentPositions.length;

                                    return (
                                        <div
                                            key={`${point.lat}-${point.lon}-${index}`}
                                            className={`rounded-2xl border p-3 text-xs ${
                                                isCurrent
                                                    ? "border-orange-500/40 bg-orange-500/10"
                                                    : isSent
                                                      ? "border-emerald-500/30 bg-emerald-500/10"
                                                      : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="font-black text-slate-950 dark:text-white">
                                                    Punkt {index + 1}
                                                </p>

                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                        isCurrent
                                                            ? "bg-orange-500 text-white"
                                                            : isSent
                                                              ? "bg-emerald-600 text-white"
                                                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                                    }`}
                                                >
                                                    {isCurrent
                                                        ? "LIVE"
                                                        : isSent
                                                          ? "SENT"
                                                          : "WAITING"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function StatusCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-base font-black text-slate-950 dark:text-white">
                {value}
            </p>
        </div>
    );
}
