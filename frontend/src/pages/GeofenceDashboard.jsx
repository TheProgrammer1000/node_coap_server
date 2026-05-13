import { Fragment, useEffect, useMemo, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    Polyline,
    useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import {
    AlertCircle,
    CheckCircle2,
    History,
    Info,
    Loader2,
    MapPinned,
    Radar,
    Wifi,
    WifiOff,
    X,
} from "lucide-react";

import { socket } from "@/lib/socket";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch {
        return null;
    }
}

function parseTimestamp(value) {
    if (!value) return 0;

    const normalized = String(value).includes("T")
        ? String(value)
        : String(value).replace(" ", "T");

    const time = Date.parse(normalized);

    return Number.isFinite(time) ? time : 0;
}

function normalizeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function getGeofenceRowKey(row) {
    return [
        row.device_ID,
        row.area_location_id ?? row.area_location_lat,
        row.area_location_lon,
        row.area_location_radius_m,
    ].join("-");
}

function getAreaKeyFromWorkArea(area) {
    if (area.id) return `id-${area.id}`;

    return [
        "fallback",
        area.device_ID,
        area.lat,
        area.lon,
        area.circle_radius_m,
    ].join("-");
}

function getAreaKeyFromGeofenceRow(row) {
    if (row.area_location_id) return `id-${row.area_location_id}`;

    return [
        "fallback",
        row.device_ID,
        row.area_location_lat,
        row.area_location_lon,
        row.area_location_radius_m,
    ].join("-");
}

function getLatestGeofenceRows(rows) {
    const latestByDeviceArea = new Map();

    for (const row of rows) {
        const key = getGeofenceRowKey(row);
        const existing = latestByDeviceArea.get(key);

        if (
            !existing ||
            parseTimestamp(row.data_timestamp) >
                parseTimestamp(existing.data_timestamp)
        ) {
            latestByDeviceArea.set(key, row);
        }
    }

    return Array.from(latestByDeviceArea.values());
}

function getAlertKey(alert) {
    return String(
        alert.id ??
            `${alert.device_ID}-${alert.from_status}-${alert.to_status}-${alert.created_at}`,
    );
}

function isEmptyGeofenceResponse(result) {
    const message = String(result?.msg || result?.message || "").toLowerCase();

    return (
        message.includes("no userid with gnss data for area locations") ||
        message.includes("no gnss data") ||
        message.includes("no data") ||
        message.includes("not found") ||
        message.includes("ingen geofence-data") ||
        message.includes("ingen gnss")
    );
}

function isEmptyWorkAreaResponse(result) {
    const message = String(result?.msg || result?.message || "").toLowerCase();

    return (
        message.includes("no userid attach to area locations") ||
        message.includes("no user attach to area locations") ||
        message.includes("no area locations") ||
        message.includes("no location areas") ||
        message.includes("inga arbetsområden") ||
        message.includes("inga områden") ||
        message.includes("not found")
    );
}

function getWorkAreasFromResponse(result) {
    if (Array.isArray(result?.devices)) return result.devices;
    if (Array.isArray(result?.areas)) return result.areas;
    if (Array.isArray(result?.locations)) return result.locations;
    if (Array.isArray(result?.location_areas)) return result.location_areas;
    if (Array.isArray(result?.data)) return result.data;

    return [];
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

function FitMapToGeofences({ rows, workAreas }) {
    const map = useMap();

    useEffect(() => {
        const points = [];

        rows.forEach((row) => {
            const deviceLat = normalizeNumber(row.device_now_lat);
            const deviceLon = normalizeNumber(row.device_now_lon);
            const areaLat = normalizeNumber(row.area_location_lat);
            const areaLon = normalizeNumber(row.area_location_lon);

            if (deviceLat !== null && deviceLon !== null) {
                points.push([deviceLat, deviceLon]);
            }

            if (areaLat !== null && areaLon !== null) {
                points.push([areaLat, areaLon]);
            }
        });

        workAreas.forEach((area) => {
            const lat = normalizeNumber(area.lat);
            const lon = normalizeNumber(area.lon);

            if (lat !== null && lon !== null) {
                points.push([lat, lon]);
            }
        });

        if (points.length === 0) return;

        const timer = window.setTimeout(() => {
            map.invalidateSize();

            map.fitBounds(L.latLngBounds(points), {
                padding: [60, 60],
                maxZoom: 13,
            });
        }, 150);

        return () => {
            window.clearTimeout(timer);
        };
    }, [rows, workAreas, map]);

    return null;
}

function getStatusText(status) {
    if (status === "inside") return "Inom området";
    if (status === "outside") return "Utanför området";
    return "Ingen GNSS-status ännu";
}

function getStatusColor(status) {
    if (status === "inside") return "#10b981";
    if (status === "outside") return "#ef4444";
    return "#64748b";
}

function getStatusCardClass(status) {
    if (status === "inside") {
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }

    if (status === "outside") {
        return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    }

    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

function getAlertHistoryTitle(alert) {
    if (alert.to_status === "outside") {
        return "Device lämnade zonen";
    }

    if (alert.to_status === "inside") {
        return "Device är tillbaka i zonen";
    }

    return "Geofence-status ändrades";
}

function getAlertHistoryClass(alert) {
    if (alert.to_status === "outside") {
        return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    }

    if (alert.to_status === "inside") {
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }

    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

function getAlertHistoryDistanceText(alert) {
    if (alert.to_status === "outside") {
        return `Utanför gränsen: ${alert.device_area_distance_m} m`;
    }

    if (alert.to_status === "inside") {
        return `Kvar till gräns: ${alert.device_area_distance_m} m`;
    }

    return `Avstånd: ${alert.device_area_distance_m ?? "N/A"} m`;
}

function getGeofenceSummary(rows) {
    const insideCount = rows.filter(
        (row) => row.geofence_status === "inside",
    ).length;

    const outsideCount = rows.filter(
        (row) => row.geofence_status === "outside",
    ).length;

    const unknownCount = rows.length - insideCount - outsideCount;

    const mostDeviatingRow = rows
        .filter((row) => row.geofence_status === "outside")
        .sort((a, b) => Number(b.outside_by_m) - Number(a.outside_by_m))[0];

    return {
        total: rows.length,
        insideCount,
        outsideCount,
        unknownCount,
        mostDeviatingRow,
    };
}

function getAreaDeviceLabel(area) {
    if (area.device_name) {
        return `${area.device_name} - ${area.device_ID}`;
    }

    return `Device ${area.device_ID}`;
}

export default function GeofenceDashboard() {
    const [rows, setRows] = useState([]);
    const [workAreas, setWorkAreas] = useState([]);

    const [loading, setLoading] = useState(true);
    const [workAreasLoading, setWorkAreasLoading] = useState(true);

    const [error, setError] = useState("");
    const [workAreasError, setWorkAreasError] = useState("");

    const [socketStatus, setSocketStatus] = useState("disconnected");
    const [lastLiveUpdate, setLastLiveUpdate] = useState(null);

    const [helpOpen, setHelpOpen] = useState(false);

    const [alertHistoryOpen, setAlertHistoryOpen] = useState(false);
    const [alertHistoryLoading, setAlertHistoryLoading] = useState(false);
    const [alertHistoryError, setAlertHistoryError] = useState("");
    const [alertHistoryRows, setAlertHistoryRows] = useState([]);
    const [selectedAlertDeviceId, setSelectedAlertDeviceId] = useState(null);

    const [explanationByAlertId, setExplanationByAlertId] = useState({});
    const [explanationLoadingByAlertId, setExplanationLoadingByAlertId] =
        useState({});
    const [explanationErrorByAlertId, setExplanationErrorByAlertId] = useState(
        {},
    );

    const user = getStoredUser();
    const userId = user?.user_ID || null;

    const latestRows = useMemo(() => {
        return getLatestGeofenceRows(rows);
    }, [rows]);

    const geofenceSummary = useMemo(() => {
        return getGeofenceSummary(latestRows);
    }, [latestRows]);

    const statusByAreaKey = useMemo(() => {
        const map = new Map();

        latestRows.forEach((row) => {
            map.set(getAreaKeyFromGeofenceRow(row), row);
        });

        return map;
    }, [latestRows]);

    async function loadWorkAreas() {
        if (!userId) {
            setWorkAreas([]);
            setWorkAreasError("Ingen användare hittades.");
            setWorkAreasLoading(false);
            return;
        }

        try {
            setWorkAreasLoading(true);
            setWorkAreasError("");

            const response = await axios.get(
                `/api/device/get/location_areas/${userId}`,
            );

            const result = response.data;

            console.log("Location areas response:", result);

            if (!result.success) {
                setWorkAreas([]);

                if (isEmptyWorkAreaResponse(result)) {
                    setWorkAreasError("");
                    return;
                }

                setWorkAreasError(
                    result.msg ||
                        result.message ||
                        "Kunde inte hämta arbetsområden.",
                );

                return;
            }

            setWorkAreas(getWorkAreasFromResponse(result));
            setWorkAreasError("");
        } catch (err) {
            console.error("Failed to load location areas:", err);

            const apiMessage =
                err?.response?.data?.msg || err?.response?.data?.message || "";

            if (isEmptyWorkAreaResponse({ msg: apiMessage })) {
                setWorkAreas([]);
                setWorkAreasError("");
                return;
            }

            setWorkAreas([]);
            setWorkAreasError("Kunde inte hämta arbetsområden.");
        } finally {
            setWorkAreasLoading(false);
        }
    }

    async function loadGeofenceData() {
        if (!userId) {
            setRows([]);
            setError("Ingen användare hittades.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await axios.get(
                `/api/device/get/gnss/arealocation/${userId}`,
            );

            const result = response.data;

            console.log("Geofence response:", result);

            if (!result.success) {
                setRows([]);

                if (isEmptyGeofenceResponse(result)) {
                    setError("");
                    return;
                }

                setError(result.msg || "Kunde inte hämta geofence-data.");
                return;
            }

            setRows(Array.isArray(result.data) ? result.data : []);
            setError("");
        } catch (err) {
            console.error("Failed to load geofence data:", err);

            const apiMessage =
                err?.response?.data?.msg || err?.response?.data?.message || "";

            if (isEmptyGeofenceResponse({ msg: apiMessage })) {
                setRows([]);
                setError("");
                return;
            }

            setRows([]);
            setError("Kunde inte hämta geofence-data.");
        } finally {
            setLoading(false);
        }
    }

    async function loadAlertHistory(device_ID) {
        if (!device_ID) return;

        try {
            setSelectedAlertDeviceId(device_ID);
            setAlertHistoryOpen(true);
            setAlertHistoryLoading(true);
            setAlertHistoryError("");
            setAlertHistoryRows([]);

            setExplanationByAlertId({});
            setExplanationLoadingByAlertId({});
            setExplanationErrorByAlertId({});

            const response = await axios.get(`/api/zone-alert/${device_ID}`);
            const result = response.data;

            console.log("Alert history response:", result);

            if (!result.success) {
                setAlertHistoryError(
                    result.msg || "Kunde inte hämta alert-historik.",
                );
                return;
            }

            setAlertHistoryRows(Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            console.error("Failed to load alert history:", err);
            setAlertHistoryError("Kunde inte hämta alert-historik.");
        } finally {
            setAlertHistoryLoading(false);
        }
    }

    async function explainAlert(alert) {
        const alertKey = getAlertKey(alert);

        setExplanationLoadingByAlertId((prev) => ({
            ...prev,
            [alertKey]: true,
        }));

        setExplanationErrorByAlertId((prev) => ({
            ...prev,
            [alertKey]: "",
        }));

        try {
            const payload = {
                id: alert.id,
                device_ID: alert.device_ID ?? selectedAlertDeviceId,
                from_status: alert.from_status,
                to_status: alert.to_status,
                device_area_distance_m: alert.device_area_distance_m,
                created_at: alert.created_at,
            };

            const response = await axios.post("/api/ai/explain-alert", payload);
            const result = response.data;

            console.log("Explanation response:", result);

            if (!result.success) {
                throw new Error(result.error || "Kunde inte skapa förklaring.");
            }

            setExplanationByAlertId((prev) => ({
                ...prev,
                [alertKey]: result.explanation,
            }));
        } catch (err) {
            console.error("Failed to explain alert:", err);

            setExplanationErrorByAlertId((prev) => ({
                ...prev,
                [alertKey]:
                    err.response?.data?.error ||
                    err.message ||
                    "Kunde inte skapa förklaring.",
            }));
        } finally {
            setExplanationLoadingByAlertId((prev) => ({
                ...prev,
                [alertKey]: false,
            }));
        }
    }

    function closeAlertHistory() {
        setAlertHistoryOpen(false);
    }

    useEffect(() => {
        loadWorkAreas();
        loadGeofenceData();
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setSocketStatus("disconnected");
            return;
        }

        setSocketStatus("connecting");

        function handleConnect() {
            console.log("Geofence socket connected:", socket.id);

            setSocketStatus("connected");
            socket.emit("join-user-room", userId);
        }

        function handleDisconnect() {
            console.log("Geofence socket disconnected");
            setSocketStatus("disconnected");
        }

        function handleConnectError(error) {
            console.error("Geofence socket connection error:", error);
            setSocketStatus("disconnected");
        }

        function handleJoined(payload) {
            console.log("Joined geofence socket room:", payload);
        }

        function handleNewGeofencePosition(newRow) {
            console.log("Live geofence position:", newRow);

            setRows((prevRows) => {
                const newRowKey = getGeofenceRowKey(newRow);

                const filteredRows = prevRows.filter((row) => {
                    return getGeofenceRowKey(row) !== newRowKey;
                });

                return [newRow, ...filteredRows];
            });

            setLastLiveUpdate(new Date().toLocaleTimeString());
        }

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);
        socket.on("socket:joined", handleJoined);
        socket.on("geofence:new-position", handleNewGeofencePosition);

        if (!socket.connected) {
            socket.connect();
        } else {
            handleConnect();
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
            socket.off("socket:joined", handleJoined);
            socket.off("geofence:new-position", handleNewGeofencePosition);
        };
    }, [userId]);

    return (
        <section className="mx-auto max-w-[1700px] px-4 py-6 md:px-6 md:py-8">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                        Geofence Status
                    </h1>

                    <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-400">
                        Se om dina enheter är inom eller utanför sina tillåtna
                        arbetsområden i realtid.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setHelpOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <Info className="h-4 w-4" />
                        Förstå geofence
                    </button>

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

                    {lastLiveUpdate && (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            Senaste live-update:{" "}
                            <span className="font-semibold">
                                {lastLiveUpdate}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {(error || workAreasError) && (
                <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                    {error || workAreasError}
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-500/10 p-3">
                            <Radar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                                Senaste status
                            </h2>

                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {loading || workAreasLoading
                                    ? "Laddar..."
                                    : `${latestRows.length} geofence-status`}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 max-h-[calc(100dvh-360px)] min-h-[360px] space-y-3 overflow-y-auto pr-1">
                        {loading || workAreasLoading ? (
                            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                Hämtar geofence-data...
                            </p>
                        ) : latestRows.length > 0 ? (
                            latestRows.map((row, index) => {
                                const isOutside =
                                    row.geofence_status === "outside";

                                const distanceToBorder =
                                    Number(row.area_location_radius_m) -
                                    Number(row.distance_m);

                                return (
                                    <div
                                        key={`${getGeofenceRowKey(row)}-${index}`}
                                        className={`rounded-xl border p-4 text-sm ${getStatusCardClass(
                                            row.geofence_status,
                                        )}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-white/70 p-2 dark:bg-slate-950/40">
                                                {isOutside ? (
                                                    <AlertCircle className="h-5 w-5" />
                                                ) : (
                                                    <CheckCircle2 className="h-5 w-5" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold">
                                                    Device {row.device_ID}
                                                </p>

                                                <p className="mt-1">
                                                    Status:{" "}
                                                    <span className="font-semibold">
                                                        {getStatusText(
                                                            row.geofence_status,
                                                        )}
                                                    </span>
                                                </p>

                                                <p>
                                                    Avstånd från centrum:{" "}
                                                    <span className="font-semibold">
                                                        {row.distance_m} m
                                                    </span>
                                                </p>

                                                {isOutside ? (
                                                    <p>
                                                        Utanför gränsen:{" "}
                                                        <span className="font-semibold">
                                                            {row.outside_by_m} m
                                                        </span>
                                                    </p>
                                                ) : (
                                                    <p>
                                                        Kvar till gräns:{" "}
                                                        <span className="font-semibold">
                                                            {Math.max(
                                                                0,
                                                                distanceToBorder,
                                                            )}{" "}
                                                            m
                                                        </span>
                                                    </p>
                                                )}

                                                <p>
                                                    Tillåten radie:{" "}
                                                    <span className="font-semibold">
                                                        {
                                                            row.area_location_radius_m
                                                        }{" "}
                                                        m
                                                    </span>
                                                </p>

                                                <p>
                                                    Accuracy:{" "}
                                                    <span className="font-semibold">
                                                        {row.acc} m
                                                    </span>
                                                </p>

                                                <p className="mt-2 text-xs opacity-80">
                                                    Tid: {row.data_timestamp}
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        loadAlertHistory(
                                                            row.device_ID,
                                                        )
                                                    }
                                                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-current/20 bg-white/60 px-3 py-2 text-xs font-semibold transition hover:bg-white/90 dark:bg-slate-950/30 dark:hover:bg-slate-950/50"
                                                >
                                                    <History className="h-4 w-4" />
                                                    Visa alert-historik
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : workAreas.length > 0 ? (
                            <>
                                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    Arbetsområden finns, men ingen GNSS-data har
                                    kommit in ännu.
                                </p>

                                {workAreas.map((area) => (
                                    <div
                                        key={getAreaKeyFromWorkArea(area)}
                                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-emerald-500/10 p-2">
                                                <MapPinned className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-950 dark:text-white">
                                                    {area.matchedAddress ||
                                                        "Sparat arbetsområde"}
                                                </p>

                                                <p className="mt-2">
                                                    Device:{" "}
                                                    <span className="font-semibold">
                                                        {getAreaDeviceLabel(
                                                            area,
                                                        )}
                                                    </span>
                                                </p>

                                                <p>
                                                    Radie:{" "}
                                                    <span className="font-semibold">
                                                        {area.circle_radius_m} m
                                                    </span>
                                                </p>

                                                <p>
                                                    Status:{" "}
                                                    <span className="font-semibold text-slate-500">
                                                        Väntar på GNSS-data
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                Inga arbetsområden eller geofence-data hittades.
                            </p>
                        )}
                    </div>
                </div>

                <div className="relative z-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="relative z-0 h-[calc(100dvh-270px)] min-h-[560px] w-full">
                        <MapContainer
                            center={[59.3293, 18.0686]}
                            zoom={9}
                            className="z-0 h-full w-full"
                        >
                            <ResizeMap />

                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <FitMapToGeofences
                                rows={latestRows}
                                workAreas={workAreas}
                            />

                            {workAreas.map((area) => {
                                const areaLat = normalizeNumber(area.lat);
                                const areaLon = normalizeNumber(area.lon);
                                const radiusMeters = normalizeNumber(
                                    area.circle_radius_m,
                                );

                                if (areaLat === null || areaLon === null) {
                                    return null;
                                }

                                const statusRow = statusByAreaKey.get(
                                    getAreaKeyFromWorkArea(area),
                                );

                                const color = getStatusColor(
                                    statusRow?.geofence_status,
                                );

                                return (
                                    <Fragment
                                        key={getAreaKeyFromWorkArea(area)}
                                    >
                                        <Circle
                                            center={[areaLat, areaLon]}
                                            radius={radiusMeters || 100}
                                            pathOptions={{
                                                color,
                                                fillColor: color,
                                                fillOpacity: 0.14,
                                                opacity: 0.95,
                                                weight: 3,
                                            }}
                                        >
                                            <Popup>
                                                <div>
                                                    <p className="font-medium">
                                                        {area.matchedAddress ||
                                                            "Tillåtet område"}
                                                    </p>

                                                    <p>
                                                        Device:{" "}
                                                        {getAreaDeviceLabel(
                                                            area,
                                                        )}
                                                    </p>

                                                    <p>
                                                        Radie:{" "}
                                                        {radiusMeters || 100} m
                                                    </p>

                                                    <p>
                                                        Status:{" "}
                                                        {getStatusText(
                                                            statusRow?.geofence_status,
                                                        )}
                                                    </p>
                                                </div>
                                            </Popup>
                                        </Circle>
                                    </Fragment>
                                );
                            })}

                            {latestRows.map((row, index) => {
                                const deviceLat = normalizeNumber(
                                    row.device_now_lat,
                                );
                                const deviceLon = normalizeNumber(
                                    row.device_now_lon,
                                );
                                const areaLat = normalizeNumber(
                                    row.area_location_lat,
                                );
                                const areaLon = normalizeNumber(
                                    row.area_location_lon,
                                );
                                const radiusMeters = normalizeNumber(
                                    row.area_location_radius_m,
                                );

                                if (
                                    deviceLat === null ||
                                    deviceLon === null ||
                                    areaLat === null ||
                                    areaLon === null
                                ) {
                                    return null;
                                }

                                const color = getStatusColor(
                                    row.geofence_status,
                                );

                                return (
                                    <Fragment
                                        key={`${getGeofenceRowKey(row)}-${index}`}
                                    >
                                        <Marker
                                            position={[deviceLat, deviceLon]}
                                        >
                                            <Popup>
                                                <div>
                                                    <p className="font-medium">
                                                        Device {row.device_ID}
                                                    </p>

                                                    <p>
                                                        Status:{" "}
                                                        {getStatusText(
                                                            row.geofence_status,
                                                        )}
                                                    </p>

                                                    <p>
                                                        Avstånd från centrum:{" "}
                                                        {row.distance_m} m
                                                    </p>

                                                    {row.geofence_status ===
                                                        "outside" && (
                                                        <p>
                                                            Utanför gränsen:{" "}
                                                            {row.outside_by_m} m
                                                        </p>
                                                    )}

                                                    {row.geofence_status ===
                                                        "inside" && (
                                                        <p>
                                                            Kvar till gräns:{" "}
                                                            {Math.max(
                                                                0,
                                                                Number(
                                                                    radiusMeters,
                                                                ) -
                                                                    Number(
                                                                        row.distance_m,
                                                                    ),
                                                            )}{" "}
                                                            m
                                                        </p>
                                                    )}

                                                    <p>Accuracy: {row.acc} m</p>

                                                    <p>
                                                        Tid:{" "}
                                                        {row.data_timestamp}
                                                    </p>
                                                </div>
                                            </Popup>
                                        </Marker>

                                        <Polyline
                                            positions={[
                                                [areaLat, areaLon],
                                                [deviceLat, deviceLon],
                                            ]}
                                            pathOptions={{
                                                color,
                                                weight: 3,
                                                dashArray: "8 8",
                                                opacity: 0.8,
                                            }}
                                        />
                                    </Fragment>
                                );
                            })}
                        </MapContainer>
                    </div>
                </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:grid-cols-3">
                <div>
                    <span className="font-semibold text-slate-950 dark:text-white">
                        Marker:
                    </span>{" "}
                    device-position från GNSS
                </div>

                <div>
                    <span className="font-semibold text-slate-950 dark:text-white">
                        Transparent cirkel:
                    </span>{" "}
                    tillåten geofence-zon
                </div>

                <div>
                    <span className="font-semibold text-slate-950 dark:text-white">
                        Streckad linje:
                    </span>{" "}
                    avstånd från zonens centrum till device
                </div>
            </div>

            {helpOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Stäng geofence-hjälp"
                        onClick={() => setHelpOpen(false)}
                        className="fixed inset-0 z-[9200] bg-slate-950/40 backdrop-blur-[2px]"
                    />

                    <div className="fixed left-1/2 top-1/2 z-[9210] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                                    Geofence
                                </h2>

                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    En enkel överblick över vad kartan visar.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setHelpOpen(false)}
                                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 p-6">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                    Vad är geofence?
                                </p>

                                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                    Ett geofence är ett digitalt arbetsområde på
                                    kartan. Om en device lämnar området skapas
                                    ett larm.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                    Status just nu
                                </p>

                                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                    Du har{" "}
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {geofenceSummary.insideCount} inom
                                        området
                                    </span>
                                    ,{" "}
                                    <span className="font-bold text-red-600 dark:text-red-400">
                                        {geofenceSummary.outsideCount} utanför
                                        området
                                    </span>
                                    {geofenceSummary.unknownCount > 0 && (
                                        <>
                                            {" "}
                                            och{" "}
                                            <span className="font-bold text-slate-600 dark:text-slate-300">
                                                {geofenceSummary.unknownCount}{" "}
                                                med okänd status
                                            </span>
                                        </>
                                    )}
                                    .
                                </p>

                                {latestRows.length === 0 &&
                                    workAreas.length > 0 && (
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                            Det finns{" "}
                                            <span className="font-bold">
                                                {workAreas.length}
                                            </span>{" "}
                                            sparade arbetsområden, men ingen
                                            GNSS-status har kommit in ännu.
                                        </p>
                                    )}
                            </div>

                            {geofenceSummary.mostDeviatingRow ? (
                                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-700 dark:text-red-300">
                                    <p className="text-sm font-bold">
                                        Exempel på avvikelse
                                    </p>

                                    <p className="mt-2 text-sm leading-relaxed">
                                        Device{" "}
                                        <span className="font-bold">
                                            {
                                                geofenceSummary.mostDeviatingRow
                                                    .device_ID
                                            }
                                        </span>{" "}
                                        är utanför sitt arbetsområde med cirka{" "}
                                        <span className="font-bold">
                                            {
                                                geofenceSummary.mostDeviatingRow
                                                    .outside_by_m
                                            }{" "}
                                            m
                                        </span>
                                        .
                                    </p>

                                    <p className="mt-2 text-sm leading-relaxed">
                                        Öppna alert-historiken för att se när
                                        devicen lämnade zonen och om det har
                                        hänt flera gånger.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
                                    <p className="text-sm font-bold">
                                        Inga avvikelser just nu
                                    </p>

                                    <p className="mt-2 text-sm leading-relaxed">
                                        Ingen device är markerad som utanför sin
                                        zon just nu.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {alertHistoryOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Stäng alert-historik"
                        onClick={closeAlertHistory}
                        className="fixed inset-0 z-[9000] bg-slate-950/40 backdrop-blur-[2px]"
                    />

                    <aside className="fixed right-0 top-0 z-[9010] flex h-dvh w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:right-4 sm:top-4 sm:h-[calc(100dvh-2rem)] sm:rounded-3xl sm:border">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <div>
                                <p className="text-lg font-bold text-slate-950 dark:text-white">
                                    Alert-historik
                                </p>

                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Device {selectedAlertDeviceId}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeAlertHistory}
                                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {alertHistoryLoading ? (
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Hämtar alert-historik...
                                </div>
                            ) : alertHistoryError ? (
                                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                                    {alertHistoryError}
                                </div>
                            ) : alertHistoryRows.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    Inga alerts hittades för denna device.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {alertHistoryRows.map((alert) => {
                                        const isOutside =
                                            alert.to_status === "outside";

                                        const alertKey = getAlertKey(alert);
                                        const explanationLoading = Boolean(
                                            explanationLoadingByAlertId[
                                                alertKey
                                            ],
                                        );
                                        const explanationError =
                                            explanationErrorByAlertId[alertKey];
                                        const explanation =
                                            explanationByAlertId[alertKey];

                                        return (
                                            <div
                                                key={alertKey}
                                                className={`rounded-2xl border p-4 text-sm ${getAlertHistoryClass(
                                                    alert,
                                                )}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="rounded-xl bg-white/70 p-2 dark:bg-slate-950/40">
                                                        {isOutside ? (
                                                            <AlertCircle className="h-5 w-5" />
                                                        ) : (
                                                            <CheckCircle2 className="h-5 w-5" />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold">
                                                            {getAlertHistoryTitle(
                                                                alert,
                                                            )}
                                                        </p>

                                                        <p className="mt-1">
                                                            Från{" "}
                                                            <span className="font-semibold">
                                                                {
                                                                    alert.from_status
                                                                }
                                                            </span>{" "}
                                                            till{" "}
                                                            <span className="font-semibold">
                                                                {
                                                                    alert.to_status
                                                                }
                                                            </span>
                                                            .
                                                        </p>

                                                        <p className="mt-1 font-semibold">
                                                            {getAlertHistoryDistanceText(
                                                                alert,
                                                            )}
                                                        </p>

                                                        <p className="mt-2 text-xs opacity-70">
                                                            Tid:{" "}
                                                            {alert.created_at}
                                                        </p>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                explainAlert(
                                                                    alert,
                                                                )
                                                            }
                                                            disabled={
                                                                explanationLoading
                                                            }
                                                            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-current/20 bg-white/70 px-3 py-2 text-xs font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950/30 dark:hover:bg-slate-950/50"
                                                        >
                                                            {explanationLoading ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Info className="h-4 w-4" />
                                                            )}

                                                            {explanationLoading
                                                                ? "Skapar förklaring..."
                                                                : "Förklara larm"}
                                                        </button>

                                                        {explanationError && (
                                                            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                                                                {
                                                                    explanationError
                                                                }
                                                            </div>
                                                        )}

                                                        {explanation && (
                                                            <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                                                                <div className="mb-2 flex items-center gap-2 font-bold text-slate-950 dark:text-white">
                                                                    <Info className="h-4 w-4" />
                                                                    Förklaring
                                                                </div>

                                                                <p className="whitespace-pre-line">
                                                                    {
                                                                        explanation
                                                                    }
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </aside>
                </>
            )}
        </section>
    );
}
