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
import L from "leaflet";
import axios from "axios";
import {
    AlertCircle,
    CheckCircle2,
    History,
    Loader2,
    Radar,
    Wifi,
    WifiOff,
    X,
} from "lucide-react";

import { socket } from "@/lib/socket";
import Navbar from "../components/Navbar";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function parseTimestamp(value) {
    if (!value) return 0;

    const normalized = String(value).includes("T")
        ? String(value)
        : String(value).replace(" ", "T");

    const time = Date.parse(normalized);

    return Number.isFinite(time) ? time : 0;
}

function getGeofenceRowKey(row) {
    return [
        row.device_ID,
        row.area_location_id ?? row.area_location_lat,
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

function FitMapToGeofences({ rows }) {
    const map = useMap();

    useEffect(() => {
        if (!rows || rows.length === 0) return;

        const points = [];

        rows.forEach((row) => {
            const deviceLat = Number(row.device_now_lat);
            const deviceLon = Number(row.device_now_lon);
            const areaLat = Number(row.area_location_lat);
            const areaLon = Number(row.area_location_lon);

            if (Number.isFinite(deviceLat) && Number.isFinite(deviceLon)) {
                points.push([deviceLat, deviceLon]);
            }

            if (Number.isFinite(areaLat) && Number.isFinite(areaLon)) {
                points.push([areaLat, areaLon]);
            }
        });

        if (points.length === 0) return;

        map.fitBounds(L.latLngBounds(points), {
            padding: [60, 60],
            maxZoom: 13,
        });
    }, [rows, map]);

    return null;
}

function getStatusText(status) {
    if (status === "inside") return "Inom området";
    if (status === "outside") return "Utanför området";
    return "Okänd";
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

export default function GeofenceDashboard() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [socketStatus, setSocketStatus] = useState("disconnected");
    const [lastLiveUpdate, setLastLiveUpdate] = useState(null);

    const [alertHistoryOpen, setAlertHistoryOpen] = useState(false);
    const [alertHistoryLoading, setAlertHistoryLoading] = useState(false);
    const [alertHistoryError, setAlertHistoryError] = useState("");
    const [alertHistoryRows, setAlertHistoryRows] = useState([]);
    const [selectedAlertDeviceId, setSelectedAlertDeviceId] = useState(null);

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_ID || null;

    const latestRows = useMemo(() => {
        return getLatestGeofenceRows(rows);
    }, [rows]);

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
                setError(result.msg || "Kunde inte hämta geofence-data.");
                return;
            }

            setRows(Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            console.error("Failed to load geofence data:", err);
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

    function closeAlertHistory() {
        setAlertHistoryOpen(false);
    }

    useEffect(() => {
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
        <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
            <section className="mx-auto max-w-7xl px-6 py-10">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                            Geofence Status
                        </h1>

                        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
                            Se om dina enheter är inom eller utanför sina
                            tillåtna arbetsområden i realtid.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                Senaste live-update:{" "}
                                <span className="font-semibold">
                                    {lastLiveUpdate}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
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
                                    {loading
                                        ? "Laddar..."
                                        : `${latestRows.length} geofence-status`}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {loading ? (
                                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    Hämtar geofence-data...
                                </p>
                            ) : latestRows.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    Ingen geofence-data hittades.
                                </p>
                            ) : (
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
                                                                {
                                                                    row.outside_by_m
                                                                }{" "}
                                                                m
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
                                                        Tid:{" "}
                                                        {row.data_timestamp}
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
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="h-[720px] w-full">
                            <MapContainer
                                center={[59.3293, 18.0686]}
                                zoom={9}
                                className="h-full w-full"
                            >
                                <TileLayer
                                    attribution="&copy; OpenStreetMap contributors"
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                <FitMapToGeofences rows={latestRows} />

                                {latestRows.map((row, index) => {
                                    const deviceLat = Number(
                                        row.device_now_lat,
                                    );
                                    const deviceLon = Number(
                                        row.device_now_lon,
                                    );
                                    const areaLat = Number(
                                        row.area_location_lat,
                                    );
                                    const areaLon = Number(
                                        row.area_location_lon,
                                    );
                                    const radiusMeters = Number(
                                        row.area_location_radius_m,
                                    );

                                    if (
                                        !Number.isFinite(deviceLat) ||
                                        !Number.isFinite(deviceLon) ||
                                        !Number.isFinite(areaLat) ||
                                        !Number.isFinite(areaLon)
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
                                            <Circle
                                                center={[areaLat, areaLon]}
                                                radius={radiusMeters || 100}
                                                pathOptions={{
                                                    color,
                                                    fillColor: color,
                                                    fillOpacity: 0.16,
                                                    opacity: 0.95,
                                                    weight: 3,
                                                }}
                                            >
                                                <Popup>
                                                    <div>
                                                        <p className="font-medium">
                                                            Tillåtet område
                                                        </p>

                                                        {row.matchedAddress && (
                                                            <p>
                                                                {
                                                                    row.matchedAddress
                                                                }
                                                            </p>
                                                        )}

                                                        <p>
                                                            Device:{" "}
                                                            {row.device_ID}
                                                        </p>

                                                        <p>
                                                            Radie:{" "}
                                                            {radiusMeters} m
                                                        </p>

                                                        <p>
                                                            Status:{" "}
                                                            {getStatusText(
                                                                row.geofence_status,
                                                            )}
                                                        </p>
                                                    </div>
                                                </Popup>
                                            </Circle>

                                            <Marker
                                                position={[
                                                    deviceLat,
                                                    deviceLon,
                                                ]}
                                            >
                                                <Popup>
                                                    <div>
                                                        <p className="font-medium">
                                                            Device{" "}
                                                            {row.device_ID}
                                                        </p>

                                                        <p>
                                                            Status:{" "}
                                                            {getStatusText(
                                                                row.geofence_status,
                                                            )}
                                                        </p>

                                                        <p>
                                                            Avstånd från
                                                            centrum:{" "}
                                                            {row.distance_m} m
                                                        </p>

                                                        {row.geofence_status ===
                                                            "outside" && (
                                                            <p>
                                                                Utanför gränsen:{" "}
                                                                {
                                                                    row.outside_by_m
                                                                }{" "}
                                                                m
                                                            </p>
                                                        )}

                                                        {row.geofence_status ===
                                                            "inside" && (
                                                            <p>
                                                                Kvar till gräns:{" "}
                                                                {Math.max(
                                                                    0,
                                                                    radiusMeters -
                                                                        Number(
                                                                            row.distance_m,
                                                                        ),
                                                                )}{" "}
                                                                m
                                                            </p>
                                                        )}

                                                        <p>
                                                            Accuracy: {row.acc}{" "}
                                                            m
                                                        </p>

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

                <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 md:grid-cols-3">
                    <div>
                        <span className="font-semibold text-slate-950 dark:text-white">
                            Blå marker:
                        </span>{" "}
                        device-position
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
            </section>

            {alertHistoryOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Stäng alert-historik"
                        onClick={closeAlertHistory}
                        className="fixed inset-0 z-[80] bg-slate-950/30 backdrop-blur-[1px]"
                    />

                    <aside className="fixed right-0 top-0 z-[90] flex h-dvh w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:right-4 sm:top-4 sm:h-[calc(100dvh-2rem)] sm:rounded-3xl sm:border">
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

                                        return (
                                            <div
                                                key={alert.id}
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
        </main>
    );
}
