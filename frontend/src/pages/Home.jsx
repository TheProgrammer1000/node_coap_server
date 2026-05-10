import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    AlertCircle,
    ArrowRight,
    Clock3,
    MapPinned,
    PlusCircle,
    Smartphone,
    Wifi,
    WifiOff,
} from "lucide-react";

import { socket } from "@/lib/socket";
import { Card, CardContent } from "@/components/ui/card";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ONLINE_THRESHOLD_MS = 7 * 60 * 1000;
const WEAK_ACCURACY_THRESHOLD = 50;

function getPointDeviceId(point) {
    return point?.device_ID ?? point?.device_id ?? null;
}

function getDeviceLastSeen(device) {
    return (
        device?.last_seen ??
        device?.lastSeen ??
        device?.device_status_last_seen ??
        null
    );
}

function getDeviceName(device) {
    const deviceId = getPointDeviceId(device);

    return (
        device?.device_name ??
        device?.deviceName ??
        device?.name ??
        (deviceId ? `Device ${deviceId}` : "Okänd device")
    );
}

function parseTimestamp(timestamp) {
    if (!timestamp) return null;

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function getAgeMs(timestamp) {
    const date = parseTimestamp(timestamp);

    if (!date) return null;

    return Date.now() - date.getTime();
}

function getDeviceStatus(point) {
    const lastSeen = getDeviceLastSeen(point);
    const ageMs = getAgeMs(lastSeen);

    if (ageMs === null) {
        return "unknown";
    }

    if (ageMs <= ONLINE_THRESHOLD_MS) {
        return "online";
    }

    return "offline";
}

function hasWeakAccuracy(point) {
    const acc =
        point?.acc === null || point?.acc === undefined
            ? null
            : Number(point.acc);

    return acc !== null && !Number.isNaN(acc) && acc > WEAK_ACCURACY_THRESHOLD;
}

function getStatusLabel(status) {
    if (status === "online") return "Online";
    if (status === "offline") return "Offline";
    return "Okänd";
}

function getStatusClasses(status) {
    if (status === "online") {
        return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800";
    }

    if (status === "offline") {
        return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
    }

    return "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700";
}

function getAccuracyWarningClasses() {
    return "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800";
}

function getMarkerIcon(status, selected) {
    let color = "#64748b";

    if (status === "online") color = "#2563eb";
    if (status === "offline") color = "#64748b";

    const size = selected ? 24 : 18;
    const border = selected ? 4 : 3;

    return L.divIcon({
        className: "",
        html: `
            <div style="
                width:${size}px;
                height:${size}px;
                border-radius:9999px;
                background:${color};
                border:${border}px solid white;
                box-shadow:0 8px 22px rgba(15, 23, 42, 0.35);
            "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
}

function formatTimestamp(timestamp) {
    const date = parseTimestamp(timestamp);

    if (!date) return "N/A";

    return new Intl.DateTimeFormat("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function formatAge(timestamp) {
    const ageMs = getAgeMs(timestamp);

    if (ageMs === null) return "Okänd tid";

    const seconds = Math.max(0, Math.floor(ageMs / 1000));

    if (seconds < 60) return "<1 min sedan";

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes} min sedan`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours} h sedan`;

    const days = Math.floor(hours / 24);

    return `${days} dagar sedan`;
}

function normalizeGnssResponse(result) {
    const data = result?.data;

    if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0];
    }

    if (Array.isArray(data)) {
        return data;
    }

    return [];
}

function normalizeDeviceStatusResponse(result) {
    if (Array.isArray(result) && Array.isArray(result[0])) {
        return result[0];
    }

    if (Array.isArray(result)) {
        return result;
    }

    const data = result?.data;

    if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0];
    }

    if (Array.isArray(data)) {
        return data;
    }

    return [];
}

function getSortTimestamp(device) {
    return (
        getDeviceLastSeen(device) ??
        device?.data_timestamp ??
        device?.created_at ??
        null
    );
}

function sortByNewest(points) {
    return [...points].sort((a, b) => {
        const aTime = parseTimestamp(getSortTimestamp(a))?.getTime() ?? 0;
        const bTime = parseTimestamp(getSortTimestamp(b))?.getTime() ?? 0;

        return bTime - aTime;
    });
}

function mergeDeviceStatuses(devices, statuses) {
    const statusByDeviceId = new Map();

    statuses.forEach((statusRow) => {
        const deviceId = getPointDeviceId(statusRow);

        if (!deviceId) return;

        statusByDeviceId.set(String(deviceId), statusRow);
    });

    const existingDeviceIds = new Set();

    const mergedDevices = devices.map((device) => {
        const deviceId = getPointDeviceId(device);

        if (!deviceId) {
            return device;
        }

        existingDeviceIds.add(String(deviceId));

        const statusRow = statusByDeviceId.get(String(deviceId));

        if (!statusRow) {
            return device;
        }

        return {
            ...device,
            last_seen: statusRow.last_seen ?? device.last_seen ?? null,
        };
    });

    statuses.forEach((statusRow) => {
        const deviceId = getPointDeviceId(statusRow);

        if (!deviceId || existingDeviceIds.has(String(deviceId))) {
            return;
        }

        mergedDevices.push({
            device_ID: deviceId,
            last_seen: statusRow.last_seen ?? null,
        });
    });

    return mergedDevices;
}

function upsertLatestDevicePosition(previousPoints, newPoint) {
    const deviceId = getPointDeviceId(newPoint);

    const pointWithLastSeen = {
        ...newPoint,
        last_seen: newPoint.last_seen ?? new Date().toISOString(),
    };

    if (!deviceId) {
        return sortByNewest([pointWithLastSeen, ...previousPoints]);
    }

    const existingPoint = previousPoints.find(
        (point) => String(getPointDeviceId(point)) === String(deviceId),
    );

    const mergedPoint = {
        ...(existingPoint ?? {}),
        ...pointWithLastSeen,
    };

    const filteredPoints = previousPoints.filter(
        (point) => String(getPointDeviceId(point)) !== String(deviceId),
    );

    return sortByNewest([mergedPoint, ...filteredPoints]);
}

function upsertDeviceStatus(previousDevices, statusUpdate) {
    const deviceId = getPointDeviceId(statusUpdate);

    if (!deviceId) {
        return previousDevices;
    }

    const lastSeen = statusUpdate.last_seen ?? new Date().toISOString();

    let foundDevice = false;

    const updatedDevices = previousDevices.map((device) => {
        if (String(getPointDeviceId(device)) !== String(deviceId)) {
            return device;
        }

        foundDevice = true;

        return {
            ...device,
            last_seen: lastSeen,
        };
    });

    if (foundDevice) {
        return sortByNewest(updatedDevices);
    }

    return sortByNewest([
        {
            device_ID: Number(deviceId),
            last_seen: lastSeen,
        },
        ...previousDevices,
    ]);
}

function getLatestLastSeen(devices) {
    return devices.reduce((latestTimestamp, device) => {
        const timestamp = getDeviceLastSeen(device);
        const time = parseTimestamp(timestamp)?.getTime() ?? 0;
        const latestTime = parseTimestamp(latestTimestamp)?.getTime() ?? 0;

        return time > latestTime ? timestamp : latestTimestamp;
    }, null);
}

function ResizeMap() {
    const map = useMap();

    useEffect(() => {
        const timer = window.setTimeout(() => {
            map.invalidateSize();
        }, 150);

        function handleResize() {
            map.invalidateSize();
        }

        window.addEventListener("resize", handleResize);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("resize", handleResize);
        };
    }, [map]);

    return null;
}

function FitMapToDevices({ devices }) {
    const map = useMap();
    const hasFittedMap = useRef(false);

    useEffect(() => {
        if (hasFittedMap.current || devices.length === 0) {
            return;
        }

        const validPositions = devices
            .map((device) => {
                const lat = Number(device.lat);
                const lon = Number(device.lon);

                if (Number.isNaN(lat) || Number.isNaN(lon)) {
                    return null;
                }

                return [lat, lon];
            })
            .filter(Boolean);

        if (validPositions.length === 0) {
            return;
        }

        window.setTimeout(() => {
            map.invalidateSize();

            if (validPositions.length === 1) {
                map.setView(validPositions[0], 14);
            } else {
                map.fitBounds(validPositions, {
                    padding: [45, 45],
                    maxZoom: 14,
                });
            }

            hasFittedMap.current = true;
        }, 150);
    }, [devices, map]);

    return null;
}

export default function Home() {
    const navigate = useNavigate();

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_ID || null;

    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const [socketStatus, setSocketStatus] = useState("disconnected");
    const [lastLiveUpdate, setLastLiveUpdate] = useState(null);
    const [nowTick, setNowTick] = useState(Date.now());

    const sortedDevices = useMemo(() => sortByNewest(devices), [devices]);

    const selectedDevice = useMemo(() => {
        if (!selectedDeviceId) return sortedDevices[0] ?? null;

        return (
            sortedDevices.find(
                (device) =>
                    String(getPointDeviceId(device)) ===
                    String(selectedDeviceId),
            ) ??
            sortedDevices[0] ??
            null
        );
    }, [selectedDeviceId, sortedDevices]);

    const dashboardStats = useMemo(() => {
        const total = sortedDevices.length;

        const online = sortedDevices.filter(
            (device) => getDeviceStatus(device) === "online",
        ).length;

        const offline = sortedDevices.filter(
            (device) => getDeviceStatus(device) === "offline",
        ).length;

        const weakAccuracy = sortedDevices.filter((device) =>
            hasWeakAccuracy(device),
        ).length;

        const latestTimestamp = getLatestLastSeen(sortedDevices);

        return {
            total,
            online,
            offline,
            weakAccuracy,
            latestTimestamp,
        };
    }, [sortedDevices, nowTick]);

    async function loadDashboardData() {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const [gnssResponse, statusResponse] = await Promise.all([
                axios.get(`/api/device/gnss/user/${userId}`),
                axios.get(`/api/device/get/status/${userId}`),
            ]);

            const gnssResult = gnssResponse.data;
            const gnssRows =
                gnssResult.success === false
                    ? []
                    : normalizeGnssResponse(gnssResult);

            const statusRows = normalizeDeviceStatusResponse(
                statusResponse.data,
            );

            const mergedRows = mergeDeviceStatuses(gnssRows, statusRows);
            const sortedRows = sortByNewest(mergedRows);

            setDevices(sortedRows);

            setSelectedDeviceId((currentSelectedId) => {
                if (currentSelectedId) return currentSelectedId;

                return getPointDeviceId(sortedRows[0]) ?? null;
            });

            setErrorMessage("");
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            setErrorMessage("Failed to load device data");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true });
            return;
        }

        loadDashboardData();
    }, [userId]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNowTick(Date.now());
        }, 15000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (!userId) {
            setSocketStatus("disconnected");

            if (socket.connected) {
                socket.disconnect();
            }

            return;
        }

        setSocketStatus("connecting");

        function handleConnect() {
            console.log("Socket connected:", socket.id);

            setSocketStatus("connected");
            socket.emit("join-user-room", userId);
        }

        function handleDisconnect() {
            console.log("Socket disconnected");

            setSocketStatus("disconnected");
        }

        function handleConnectError(error) {
            console.error("Socket connection error:", error);

            setSocketStatus("disconnected");
        }

        function handleJoined(payload) {
            console.log("Joined socket room:", payload);
        }

        function handleNewPosition(newPoint) {
            console.log("Live GNSS position:", newPoint);

            setDevices((previousDevices) =>
                upsertLatestDevicePosition(previousDevices, newPoint),
            );

            setSelectedDeviceId((currentSelectedId) => {
                if (currentSelectedId) return currentSelectedId;

                return getPointDeviceId(newPoint) ?? null;
            });

            setLastLiveUpdate(
                new Date().toLocaleTimeString("sv-SE", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            );
        }

        function handleDeviceStatus(statusUpdate) {
            console.log("Live device status:", statusUpdate);

            setDevices((previousDevices) =>
                upsertDeviceStatus(previousDevices, statusUpdate),
            );

            setLastLiveUpdate(
                new Date().toLocaleTimeString("sv-SE", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            );
        }

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);
        socket.on("socket:joined", handleJoined);
        socket.on("gnss:new-position", handleNewPosition);
        socket.on("device:status", handleDeviceStatus);

        if (!socket.connected) {
            socket.connect();
        } else {
            handleConnect();
        }

        return () => {
            socket.emit("leave-user-room", userId);

            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
            socket.off("socket:joined", handleJoined);
            socket.off("gnss:new-position", handleNewPosition);
            socket.off("device:status", handleDeviceStatus);

            socket.disconnect();
            setSocketStatus("disconnected");
        };
    }, [userId]);

    const hasDevices = sortedDevices.length > 0;

    return (
        <section className="mx-auto max-w-[1700px] px-4 py-6 md:px-6 md:py-8">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Live device overview
                    </h1>

                    <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-400">
                        Se senaste positionen för varje registrerad enhet och
                        följ live-data från dina nRF-devices i realtid.
                    </p>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    {socketStatus === "connected" ? (
                        <>
                            <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-blue-700 dark:text-blue-300">
                                Live connected
                            </span>
                        </>
                    ) : socketStatus === "connecting" ? (
                        <>
                            <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-blue-700 dark:text-blue-300">
                                Ansluter live...
                            </span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="h-4 w-4 text-red-500" />
                            <span className="text-red-500">
                                Live disconnected
                            </span>
                        </>
                    )}
                </div>
            </div>

            {errorMessage && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-700 dark:text-red-300">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">{errorMessage}</p>
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-5">
                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
                                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-xl font-bold">
                                                Senaste status
                                            </h2>

                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                {dashboardStats.total}{" "}
                                                registrerade devices
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                            {dashboardStats.total}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                                            <p className="text-slate-500 dark:text-slate-400">
                                                Online
                                            </p>
                                            <p className="mt-1 text-lg font-bold">
                                                {dashboardStats.online}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                                            <p className="text-slate-500 dark:text-slate-400">
                                                Offline
                                            </p>
                                            <p className="mt-1 text-lg font-bold">
                                                {dashboardStats.offline}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                                            <p className="text-slate-500 dark:text-slate-400">
                                                Accuracy
                                            </p>
                                            <p className="mt-1 text-lg font-bold">
                                                {dashboardStats.weakAccuracy}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock3 className="h-4 w-4 text-slate-500" />
                                            <span className="font-semibold">
                                                Senaste heartbeat:
                                            </span>
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {dashboardStats.latestTimestamp
                                                    ? formatAge(
                                                          dashboardStats.latestTimestamp,
                                                      )
                                                    : "Ingen status ännu"}
                                            </span>
                                        </div>

                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {lastLiveUpdate
                                                ? `Senaste live-update ${lastLiveUpdate}`
                                                : "Väntar på live-data från Socket.IO"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardContent className="p-0">
                            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold">
                                            Devices
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            Senaste kända status och position
                                            per enhet.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        {dashboardStats.total}
                                    </div>
                                </div>
                            </div>

                            <div className="max-h-[calc(100dvh-500px)] min-h-[230px] overflow-y-auto p-4">
                                {loading ? (
                                    <p className="px-2 py-6 text-center text-sm text-slate-500">
                                        Laddar devices...
                                    </p>
                                ) : !hasDevices ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950">
                                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                                            <Smartphone className="h-6 w-6 text-slate-500" />
                                        </div>

                                        <p className="font-bold">
                                            Ingen device registrerad
                                        </p>

                                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                            Lägg till din första nRF-device för
                                            att börja ta emot GNSS-data via CoAP
                                            och visa positioner på kartan.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate("/register-device")
                                            }
                                            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                                        >
                                            <PlusCircle className="h-4 w-4" />
                                            Registrera device
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sortedDevices.map((device) => {
                                            const deviceId =
                                                getPointDeviceId(device);
                                            const deviceName =
                                                getDeviceName(device);
                                            const status =
                                                getDeviceStatus(device);
                                            const weakAccuracy =
                                                hasWeakAccuracy(device);
                                            const lastSeen =
                                                getDeviceLastSeen(device);
                                            const isSelected =
                                                String(deviceId) ===
                                                String(
                                                    getPointDeviceId(
                                                        selectedDevice,
                                                    ),
                                                );

                                            return (
                                                <button
                                                    key={`${deviceId ?? "device"}`}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedDeviceId(
                                                            deviceId,
                                                        )
                                                    }
                                                    className={`w-full rounded-2xl border p-4 text-left transition ${
                                                        isSelected
                                                            ? "border-blue-300 bg-blue-50 shadow-sm dark:border-blue-800 dark:bg-blue-950/30"
                                                            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                                                            <Smartphone className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="truncate font-bold text-slate-950 dark:text-white">
                                                                        {
                                                                            deviceName
                                                                        }
                                                                    </p>

                                                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                                        ID{" "}
                                                                        {deviceId ??
                                                                            "N/A"}
                                                                    </p>

                                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                        Status:{" "}
                                                                        {formatAge(
                                                                            lastSeen,
                                                                        )}
                                                                    </p>
                                                                </div>

                                                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                                    <span
                                                                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${getStatusClasses(
                                                                            status,
                                                                        )}`}
                                                                    >
                                                                        {getStatusLabel(
                                                                            status,
                                                                        )}
                                                                    </span>

                                                                    {weakAccuracy && (
                                                                        <span
                                                                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${getAccuracyWarningClasses()}`}
                                                                        >
                                                                            Svag
                                                                            accuracy
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                                <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
                                                                    <p className="text-slate-500 dark:text-slate-400">
                                                                        Accuracy
                                                                    </p>

                                                                    <p className="font-bold">
                                                                        {device.acc ??
                                                                            "N/A"}{" "}
                                                                        m
                                                                    </p>
                                                                </div>

                                                                <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
                                                                    <p className="text-slate-500 dark:text-slate-400">
                                                                        Senast
                                                                        status
                                                                    </p>

                                                                    <p className="truncate font-bold">
                                                                        {formatTimestamp(
                                                                            lastSeen,
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="overflow-hidden border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex h-[calc(100dvh-230px)] min-h-[650px] items-center justify-center">
                                <p className="text-slate-500">
                                    Laddar GPS-data...
                                </p>
                            </div>
                        ) : !hasDevices ? (
                            <div className="flex h-[calc(100dvh-230px)] min-h-[650px] flex-col items-center justify-center px-6 text-center">
                                <div className="mb-4 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                                    <MapPinned className="h-8 w-8 text-slate-500" />
                                </div>

                                <h3 className="text-xl font-bold">
                                    Kartan är redo
                                </h3>

                                <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
                                    När du registrerar en device och den skickar
                                    GNSS-positioner via CoAP kommer senaste
                                    positionen visas här i realtid.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => navigate("/register-device")}
                                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                                >
                                    <PlusCircle className="h-4 w-4" />
                                    Lägg till device
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="h-[calc(100dvh-230px)] min-h-[650px] w-full">
                                <MapContainer
                                    center={[59.33, 18.06]}
                                    zoom={13}
                                    className="h-full w-full"
                                >
                                    <ResizeMap />

                                    <TileLayer
                                        maxZoom={19}
                                        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />

                                    <FitMapToDevices devices={sortedDevices} />

                                    {sortedDevices.map((device, index) => {
                                        const lat = Number(device.lat);
                                        const lon = Number(device.lon);
                                        const acc =
                                            device.acc === null ||
                                            device.acc === undefined
                                                ? null
                                                : Number(device.acc);
                                        const deviceId =
                                            getPointDeviceId(device);
                                        const deviceName =
                                            getDeviceName(device);
                                        const status = getDeviceStatus(device);
                                        const weakAccuracy =
                                            hasWeakAccuracy(device);
                                        const lastSeen =
                                            getDeviceLastSeen(device);
                                        const isSelected =
                                            String(deviceId) ===
                                            String(
                                                getPointDeviceId(
                                                    selectedDevice,
                                                ),
                                            );

                                        if (
                                            Number.isNaN(lat) ||
                                            Number.isNaN(lon)
                                        ) {
                                            return null;
                                        }

                                        return (
                                            <Fragment
                                                key={`${deviceId ?? "device"}-${index}`}
                                            >
                                                <Marker
                                                    position={[lat, lon]}
                                                    icon={getMarkerIcon(
                                                        status,
                                                        isSelected,
                                                    )}
                                                    eventHandlers={{
                                                        click: () =>
                                                            setSelectedDeviceId(
                                                                deviceId,
                                                            ),
                                                    }}
                                                >
                                                    <Popup
                                                        maxWidth={230}
                                                        minWidth={185}
                                                    >
                                                        <div className="text-xs leading-tight text-slate-950">
                                                            <p className="text-sm font-bold">
                                                                {deviceName}
                                                            </p>

                                                            <p className="mb-2 mt-0.5 text-[11px] text-slate-500">
                                                                ID{" "}
                                                                {deviceId ??
                                                                    "N/A"}
                                                            </p>

                                                            <div className="space-y-1.5">
                                                                <div className="flex justify-between gap-2">
                                                                    <span className="text-slate-500">
                                                                        Status
                                                                    </span>

                                                                    <span className="font-semibold">
                                                                        {getStatusLabel(
                                                                            status,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                {weakAccuracy && (
                                                                    <div className="rounded-md bg-orange-50 px-2 py-1 font-semibold text-orange-700">
                                                                        Svag
                                                                        GNSS
                                                                        accuracy
                                                                    </div>
                                                                )}

                                                                <div className="flex justify-between gap-2 rounded-md bg-blue-50 px-2 py-1">
                                                                    <span className="font-medium text-blue-700">
                                                                        Accuracy
                                                                    </span>

                                                                    <span className="font-bold text-blue-700">
                                                                        {device.acc ??
                                                                            "N/A"}{" "}
                                                                        m
                                                                    </span>
                                                                </div>

                                                                <div className="pt-1">
                                                                    <p className="text-[10px] text-slate-500">
                                                                        Senaste
                                                                        status
                                                                    </p>

                                                                    <p className="text-[11px] font-semibold">
                                                                        {formatTimestamp(
                                                                            lastSeen,
                                                                        )}
                                                                    </p>
                                                                </div>

                                                                <div className="pt-1">
                                                                    <p className="text-[10px] text-slate-500">
                                                                        Senaste
                                                                        GNSS
                                                                    </p>

                                                                    <p className="text-[11px] font-semibold">
                                                                        {formatTimestamp(
                                                                            device.data_timestamp,
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Marker>

                                                {acc !== null &&
                                                    !Number.isNaN(acc) && (
                                                        <Circle
                                                            center={[lat, lon]}
                                                            radius={Math.min(
                                                                Math.max(
                                                                    acc,
                                                                    3,
                                                                ),
                                                                250,
                                                            )}
                                                            pathOptions={{
                                                                color: weakAccuracy
                                                                    ? "#f97316"
                                                                    : status ===
                                                                        "offline"
                                                                      ? "#64748b"
                                                                      : "#2563eb",
                                                                fillColor:
                                                                    weakAccuracy
                                                                        ? "#fb923c"
                                                                        : status ===
                                                                            "offline"
                                                                          ? "#94a3b8"
                                                                          : "#3b82f6",
                                                                fillOpacity: 0.12,
                                                                weight: 1,
                                                            }}
                                                        />
                                                    )}
                                            </Fragment>
                                        );
                                    })}
                                </MapContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:grid-cols-3">
                <p>
                    <span className="font-bold text-slate-950 dark:text-white">
                        Blå marker:
                    </span>{" "}
                    online device
                </p>

                <p>
                    <span className="font-bold text-slate-950 dark:text-white">
                        Grå marker:
                    </span>{" "}
                    offline device
                </p>

                <p>
                    <span className="font-bold text-slate-950 dark:text-white">
                        Orange cirkel:
                    </span>{" "}
                    svag GNSS accuracy
                </p>
            </div>
        </section>
    );
}
