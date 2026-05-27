import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    Battery,
    Bell,
    Bluetooth,
    CalendarClock,
    Clock3,
    Cpu,
    Database,
    History,
    Loader2,
    MapPin,
    Radio,
    RefreshCw,
    Route,
    Satellite,
    Server,
    ShieldAlert,
    Smartphone,
    TerminalSquare,
    Wifi,
    WifiOff,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GNSS_HISTORY_LIMIT = 100;
const EVENT_LIMIT = 50;

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.warn("Could not parse stored user:", error);
        return null;
    }
}

function normalizeTransport(value) {
    const transport = String(value || "cellular").toLowerCase();

    if (transport === "ble") return "ble";
    return "cellular";
}

function normalizeRows(result) {
    const data = result?.data;

    if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0];
    }

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(result)) {
        return result;
    }

    return [];
}

function normalizeDevicesResponse(result) {
    const rows = normalizeRows(result);

    return rows
        .filter((device) => device && device.device_ID !== undefined)
        .map((device) => ({
            device_ID: Number(device.device_ID),
            device_name:
                device.device_name ||
                device.name ||
                `Device ${device.device_ID}`,
            data_transport: normalizeTransport(device.data_transport),
            battery_percent: device.battery_percent ?? null,
            firmware_version: device.firmware_version ?? null,
            last_seen: device.last_seen ?? device.lastSeen ?? null,
            connection_status:
                device.connection_status ?? device.status ?? null,
            lat: device.lat ?? null,
            lon: device.lon ?? null,
            acc: device.acc ?? null,
            data_timestamp: device.data_timestamp ?? device.created_at ?? null,
        }));
}

function normalizeBleDevicesResponse(result) {
    const rows = normalizeRows(result);

    return rows
        .filter((device) => device && device.device_ID !== undefined)
        .map((device) => ({
            device_ID: Number(device.device_ID),
            device_name:
                device.device_name ||
                device.name ||
                `Device ${device.device_ID}`,
            data_transport: "ble",
            battery_percent: device.battery_percent ?? null,
            firmware_version: device.firmware_version ?? null,
            last_seen: device.last_seen ?? device.lastSeen ?? null,
            connection_status:
                device.connection_status ?? device.status ?? null,
            lat: null,
            lon: null,
            acc: null,
            data_timestamp: null,
        }));
}

function mergeDevices(...deviceLists) {
    const map = new Map();

    deviceLists.flat().forEach((device) => {
        if (!device?.device_ID) return;

        const key = String(device.device_ID);
        const existing = map.get(key) || {};

        map.set(key, {
            ...existing,
            ...device,
            device_name:
                device.device_name ||
                existing.device_name ||
                `Device ${device.device_ID}`,
            data_transport:
                device.data_transport || existing.data_transport || "cellular",
            battery_percent:
                device.battery_percent ?? existing.battery_percent ?? null,
            firmware_version:
                device.firmware_version ?? existing.firmware_version ?? null,
            last_seen: device.last_seen ?? existing.last_seen ?? null,
            connection_status:
                device.connection_status ?? existing.connection_status ?? null,
        });
    });

    return Array.from(map.values());
}

function parseDate(value) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function formatDate(value) {
    const date = parseDate(value);

    if (!date) return "N/A";

    return new Intl.DateTimeFormat("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(date);
}

function formatAge(value) {
    const date = parseDate(value);

    if (!date) return "Aldrig";

    const diffMs = Date.now() - date.getTime();
    const seconds = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Nyss";
    if (minutes < 60) return `${minutes} min sedan`;
    if (hours < 24) return `${hours} h sedan`;

    return `${days} dagar sedan`;
}

function getDeviceStatus(device) {
    const status = String(
        device?.connection_status || device?.status || "",
    ).toLowerCase();

    if (status === "online") return "online";

    return "offline";
}

function getStatusLabel(status) {
    return status === "online" ? "Online" : "Offline";
}

function getStatusClasses(status) {
    if (status === "online") {
        return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    }

    return "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}

function getBatteryStyles(batteryPercent) {
    const value = Number(batteryPercent);

    if (!Number.isFinite(value)) {
        return {
            value: null,
            label: "Ingen batteridata",
            fillClass: "bg-slate-500",
            textClass: "text-slate-400",
            borderClass: "border-slate-500/50",
        };
    }

    const safeValue = Math.max(0, Math.min(100, Math.round(value)));

    if (safeValue <= 20) {
        return {
            value: safeValue,
            label: "Kritiskt låg",
            fillClass: "bg-red-500",
            textClass: "text-red-300",
            borderClass: "border-red-500/60",
        };
    }

    if (safeValue <= 40) {
        return {
            value: safeValue,
            label: "Låg nivå",
            fillClass: "bg-orange-500",
            textClass: "text-orange-300",
            borderClass: "border-orange-500/60",
        };
    }

    if (safeValue <= 60) {
        return {
            value: safeValue,
            label: "Medel nivå",
            fillClass: "bg-yellow-400",
            textClass: "text-yellow-300",
            borderClass: "border-yellow-400/60",
        };
    }

    return {
        value: safeValue,
        label: "Bra nivå",
        fillClass: "bg-emerald-500",
        textClass: "text-emerald-300",
        borderClass: "border-emerald-500/60",
    };
}

function getSeverityClasses(severity) {
    const value = String(severity || "").toLowerCase();

    if (value === "error" || value === "critical") {
        return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    }

    if (value === "warning" || value === "warn") {
        return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300";
    }

    if (value === "success" || value === "ok") {
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }

    return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

function getAlertClasses(alert) {
    const toStatus = String(alert?.to_status || "").toLowerCase();

    if (toStatus === "outside") {
        return "border-red-500/30 bg-red-500/10";
    }

    if (toStatus === "inside") {
        return "border-emerald-500/30 bg-emerald-500/10";
    }

    return "border-slate-500/30 bg-slate-500/10";
}

function getTransportLabel(transport) {
    return normalizeTransport(transport) === "ble" ? "BLE" : "Cellular";
}

function getTransportIcon(transport) {
    return normalizeTransport(transport) === "ble" ? Bluetooth : Radio;
}

function hasValidPosition(row) {
    const lat = Number(row?.lat);
    const lon = Number(row?.lon);

    return Number.isFinite(lat) && Number.isFinite(lon);
}

function sortNewest(rows, dateKey = "created_at") {
    return [...rows].sort((a, b) => {
        const aTime = parseDate(a?.[dateKey])?.getTime() || 0;
        const bTime = parseDate(b?.[dateKey])?.getTime() || 0;

        return bTime - aTime;
    });
}

function normalizeBleSessionRows(result, userId) {
    const rows = normalizeRows(result);

    return rows
        .filter((row) => row && row.device_ID !== undefined)
        .map((row, index) => ({
            ...row,
            id:
                row.session_ID ??
                row.session_id ??
                row.sessionId ??
                row.id ??
                index + 1,
            device_ID: Number(row.device_ID),
            user_ID: Number(row.user_ID || userId),
            session_status:
                row.session_status ?? row.status ?? row.state ?? "unknown",
            started_at:
                row.started_at ??
                row.start_time ??
                row.session_started_at ??
                row.created_at ??
                null,
            ended_at:
                row.ended_at ??
                row.end_time ??
                row.session_ended_at ??
                row.updated_at ??
                null,
            samples_count:
                row.samples_count ??
                row.sample_count ??
                row.total_samples ??
                row.data_packet_count ??
                row.packet_count ??
                null,
            firmware_version: row.firmware_version ?? "N/A",
            quat_x: row.quat_x ?? null,
            quat_y: row.quat_y ?? null,
            quat_z: row.quat_z ?? null,
            quat_w: row.quat_w ?? null,
            data_packet: row.data_packet ?? null,
        }));
}

function getSessionTime(session) {
    return (
        session.started_at ||
        session.created_at ||
        session.updated_at ||
        session.ended_at ||
        null
    );
}

export default function DeviceDetails() {
    const navigate = useNavigate();
    const params = useParams();

    const deviceId = Number(params.device_ID);
    const user = getStoredUser();
    const userId = user?.user_ID || null;

    const [device, setDevice] = useState(null);
    const [gnssHistory, setGnssHistory] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [events, setEvents] = useState([]);
    const [bleSessions, setBleSessions] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const status = getDeviceStatus(device);
    const isBle = device?.data_transport === "ble";
    const isCellular = device?.data_transport === "cellular";
    const TransportIcon = getTransportIcon(device?.data_transport);

    const latestGnss = useMemo(() => {
        return sortNewest(gnssHistory, "data_timestamp")[0] || null;
    }, [gnssHistory]);

    const latestBleSession = useMemo(() => {
        return (
            [...bleSessions].sort((a, b) => {
                const aTime = parseDate(getSessionTime(a))?.getTime() || 0;
                const bTime = parseDate(getSessionTime(b))?.getTime() || 0;

                return bTime - aTime;
            })[0] || null
        );
    }, [bleSessions]);

    const stats = useMemo(() => {
        return {
            alerts: alerts.length,
            events: events.length,
            gnssPositions: gnssHistory.length,
            bleSessions: bleSessions.length,
        };
    }, [alerts, events, gnssHistory, bleSessions]);

    async function fetchDeviceDetails({ silent = false } = {}) {
        if (!userId) {
            setErrorMessage("Ingen inloggad användare hittades.");
            setIsLoading(false);
            return;
        }

        if (!Number.isFinite(deviceId)) {
            setErrorMessage("Ogiltigt device_ID.");
            setIsLoading(false);
            return;
        }

        try {
            if (silent) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            setErrorMessage("");

            const [statusDevicesResult, bleDevicesResult] =
                await Promise.allSettled([
                    axios.get(`/api/device/status/get/all/${userId}`),
                    axios.get(`/api/device/ble/get/all/${userId}`),
                ]);

            const statusDevices =
                statusDevicesResult.status === "fulfilled"
                    ? normalizeDevicesResponse(statusDevicesResult.value.data)
                    : [];

            const bleDevices =
                bleDevicesResult.status === "fulfilled"
                    ? normalizeBleDevicesResponse(bleDevicesResult.value.data)
                    : [];

            const allDevices = mergeDevices(statusDevices, bleDevices);

            const selectedDevice = allDevices.find(
                (item) => Number(item.device_ID) === Number(deviceId),
            );

            if (!selectedDevice) {
                setDevice(null);
                setGnssHistory([]);
                setAlerts([]);
                setEvents([]);
                setBleSessions([]);
                setErrorMessage(
                    "Kunde inte hitta denna device för användaren.",
                );
                return;
            }

            const transport = normalizeTransport(selectedDevice.data_transport);

            const [gnssResult, alertsResult, eventsResult, bleSessionsResult] =
                await Promise.allSettled([
                    transport === "cellular"
                        ? axios.get(
                              `/api/device/gnss/user/history/${userId}?limit=${GNSS_HISTORY_LIMIT}`,
                          )
                        : Promise.resolve({
                              data: { success: true, data: [] },
                          }),

                    transport === "cellular"
                        ? axios.get(
                              `/api/device/alert/${deviceId}?status_type=geofence`,
                          )
                        : Promise.resolve({
                              data: { success: true, data: [] },
                          }),

                    axios.get(
                        `/api/device/event/get/${userId}?data_transport=${encodeURIComponent(
                            transport,
                        )}&limit=${EVENT_LIMIT}`,
                    ),

                    transport === "ble"
                        ? axios.get(
                              `/api/device/ble/get/motion/sessions/data/${userId}`,
                          )
                        : Promise.resolve({
                              data: { success: true, data: [] },
                          }),
                ]);

            const normalizedHistory =
                gnssResult.status === "fulfilled"
                    ? normalizeRows(gnssResult.value.data)
                          .filter(
                              (row) =>
                                  Number(row.device_ID) === Number(deviceId) &&
                                  hasValidPosition(row),
                          )
                          .map((row) => ({
                              ...row,
                              device_ID: Number(row.device_ID),
                              lat: Number(row.lat),
                              lon: Number(row.lon),
                              acc:
                                  row.acc === null || row.acc === undefined
                                      ? null
                                      : Number(row.acc),
                              data_timestamp:
                                  row.data_timestamp || row.created_at || null,
                          }))
                    : [];

            const normalizedAlerts =
                alertsResult.status === "fulfilled"
                    ? normalizeRows(alertsResult.value.data)
                          .filter(
                              (row) =>
                                  Number(row.device_ID) === Number(deviceId),
                          )
                          .map((row) => ({
                              ...row,
                              id: Number(row.id),
                              device_ID: Number(row.device_ID),
                              status_type: row.status_type || "geofence",
                              from_status: row.from_status || null,
                              to_status: row.to_status || "unknown",
                              status_value: row.status_value ?? null,
                              reason: row.reason || null,
                              created_at: row.created_at || null,
                          }))
                    : [];

            const normalizedEvents =
                eventsResult.status === "fulfilled" &&
                eventsResult.value.data?.success !== false
                    ? normalizeRows(eventsResult.value.data)
                          .filter(
                              (row) =>
                                  Number(row.device_ID) === Number(deviceId),
                          )
                          .map((row) => ({
                              ...row,
                              id: Number(row.id),
                              device_ID: Number(row.device_ID),
                              data_transport: normalizeTransport(
                                  row.data_transport || transport,
                              ),
                              event_type: row.event_type || "unknown_event",
                              severity: row.severity || "info",
                              message: row.message || "No message",
                              firmware_version: row.firmware_version || "N/A",
                              created_at: row.created_at || null,
                          }))
                    : [];

            const normalizedBleSessions =
                bleSessionsResult.status === "fulfilled"
                    ? normalizeBleSessionRows(
                          bleSessionsResult.value.data,
                          userId,
                      ).filter(
                          (row) => Number(row.device_ID) === Number(deviceId),
                      )
                    : [];

            const sortedHistory = sortNewest(
                normalizedHistory,
                "data_timestamp",
            );

            const newestGnss = sortedHistory[0] || null;

            setDevice({
                ...selectedDevice,
                lat: selectedDevice.lat ?? newestGnss?.lat ?? null,
                lon: selectedDevice.lon ?? newestGnss?.lon ?? null,
                acc: selectedDevice.acc ?? newestGnss?.acc ?? null,
            });

            setGnssHistory(sortedHistory);
            setAlerts(sortNewest(normalizedAlerts, "created_at"));
            setEvents(sortNewest(normalizedEvents, "created_at"));
            setBleSessions(
                [...normalizedBleSessions].sort((a, b) => {
                    const aTime = parseDate(getSessionTime(a))?.getTime() || 0;
                    const bTime = parseDate(getSessionTime(b))?.getTime() || 0;

                    return bTime - aTime;
                }),
            );
        } catch (error) {
            console.error("Failed to fetch device details:", error);

            setErrorMessage(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Kunde inte hämta device-detaljer.",
            );
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }

    useEffect(() => {
        fetchDeviceDetails();
    }, [userId, deviceId]);

    if (isLoading) {
        return (
            <section className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-center">
                        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
                        <p className="font-bold text-slate-950 dark:text-white">
                            Laddar device...
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    if (errorMessage && !device) {
        return (
            <section className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="mb-5 rounded-2xl"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka
                </Button>

                <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-700 dark:text-red-300">
                    <AlertCircle className="mx-auto mb-4 h-10 w-10" />
                    <h1 className="text-2xl font-black">
                        Device hittades inte
                    </h1>
                    <p className="mt-2">{errorMessage}</p>
                </div>
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-[1700px] px-3 py-4 sm:px-5 lg:px-8">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="mb-4 rounded-2xl"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tillbaka
                    </Button>

                    <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-700 dark:text-blue-300">
                        <Smartphone className="h-4 w-4 shrink-0" />
                        Device detail
                    </div>

                    <h1 className="break-words text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                        {device.device_name}
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                        Device ID {device.device_ID} ·{" "}
                        {getTransportLabel(device.data_transport)}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <span
                        className={`inline-flex h-12 items-center justify-center rounded-2xl border px-5 text-sm font-black ${getStatusClasses(
                            status,
                        )}`}
                    >
                        {status === "online" ? (
                            <Wifi className="mr-2 h-5 w-5" />
                        ) : (
                            <WifiOff className="mr-2 h-5 w-5" />
                        )}
                        {getStatusLabel(status)}
                    </span>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fetchDeviceDetails({ silent: true })}
                        disabled={isRefreshing}
                        className="h-12 rounded-2xl border-slate-300 font-black dark:border-slate-700"
                    >
                        {isRefreshing ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-5 w-5" />
                        )}
                        Uppdatera
                    </Button>
                </div>
            </div>

            {errorMessage && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{errorMessage}</p>
                </div>
            )}

            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={Battery}
                    label="Battery"
                    value={
                        device.battery_percent !== null &&
                        device.battery_percent !== undefined
                            ? `${device.battery_percent}%`
                            : "N/A"
                    }
                    text="Senaste rapporterade nivå"
                />

                <StatCard
                    icon={Clock3}
                    label="Last seen"
                    value={formatAge(device.last_seen)}
                    text={formatDate(device.last_seen)}
                />

                <StatCard
                    icon={isBle ? Activity : Bell}
                    label={isBle ? "BLE sessions" : "Alerts"}
                    value={isBle ? stats.bleSessions : stats.alerts}
                    text={isBle ? "Motion sessions" : "Geofence-alerts"}
                />

                <StatCard
                    icon={TerminalSquare}
                    label="Events"
                    value={stats.events}
                    text="Tekniska device events"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="space-y-5">
                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardContent className="p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                <div
                                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-white ${
                                        isBle ? "bg-violet-600" : "bg-blue-600"
                                    }`}
                                >
                                    <TransportIcon className="h-8 w-8" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="break-words text-2xl font-black text-slate-950 dark:text-white">
                                            {device.device_name}
                                        </h2>

                                        <TransportBadge
                                            transport={device.data_transport}
                                        />
                                    </div>

                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        ID {device.device_ID}
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Firmware:{" "}
                                        <span className="font-black text-slate-700 dark:text-slate-200">
                                            {device.firmware_version || "N/A"}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3">
                                <InfoTile
                                    icon={Cpu}
                                    label="Transport"
                                    value={getTransportLabel(
                                        device.data_transport,
                                    )}
                                />

                                <InfoTile
                                    icon={Database}
                                    label="Connection"
                                    value={getStatusLabel(status)}
                                />

                                <InfoTile
                                    icon={CalendarClock}
                                    label="Last seen"
                                    value={formatAge(device.last_seen)}
                                />
                            </div>

                            <div className="mt-5">
                                <BatteryLevelBar
                                    batteryPercent={device.battery_percent}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {isCellular ? (
                        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <CardHeader className="p-5">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Satellite className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    Senaste GNSS
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-5 pt-0">
                                {!latestGnss ? (
                                    <EmptySmall
                                        icon={MapPin}
                                        title="Ingen GNSS-position ännu"
                                        text="När devicen skickar sin första position visas den här."
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        <MiniInfo
                                            label="Latitude"
                                            value={latestGnss.lat}
                                        />
                                        <MiniInfo
                                            label="Longitude"
                                            value={latestGnss.lon}
                                        />
                                        <MiniInfo
                                            label="Accuracy"
                                            value={
                                                latestGnss.acc !== null
                                                    ? `${latestGnss.acc} m`
                                                    : "N/A"
                                            }
                                        />
                                        <MiniInfo
                                            label="Tid"
                                            value={formatDate(
                                                latestGnss.data_timestamp,
                                            )}
                                        />

                                        <Link
                                            to="/dashboard"
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm font-black text-slate-950 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                                        >
                                            <MapPin className="mr-2 h-4 w-4" />
                                            Visa på dashboard
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <CardHeader className="p-5">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Activity className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                    Senaste BLE session
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-5 pt-0">
                                {!latestBleSession ? (
                                    <EmptySmall
                                        icon={Bluetooth}
                                        title="Ingen BLE-session ännu"
                                        text="När devicen har sparade motion sessions visas senaste sessionen här."
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        <MiniInfo
                                            label="Session"
                                            value={latestBleSession.id}
                                        />
                                        <MiniInfo
                                            label="Status"
                                            value={
                                                latestBleSession.session_status
                                            }
                                        />
                                        <MiniInfo
                                            label="Samples"
                                            value={
                                                latestBleSession.samples_count ??
                                                latestBleSession.data_packet ??
                                                "N/A"
                                            }
                                        />
                                        <MiniInfo
                                            label="Startad"
                                            value={formatDate(
                                                latestBleSession.started_at,
                                            )}
                                        />

                                        <Link
                                            to="/motion-live"
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm font-black text-slate-950 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                                        >
                                            <Activity className="mr-2 h-4 w-4" />
                                            Öppna BLE motion
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="grid gap-5 2xl:grid-cols-2">
                    {isCellular ? (
                        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <CardHeader className="p-5">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    Alerts
                                </CardTitle>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Senaste geofence-alerts för denna device.
                                </p>
                            </CardHeader>

                            <CardContent className="p-5 pt-0">
                                {alerts.length === 0 ? (
                                    <EmptySmall
                                        icon={ShieldAlert}
                                        title="Inga alerts ännu"
                                        text="När devicen går in eller ut ur ett arbetsområde visas alerts här."
                                    />
                                ) : (
                                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                                        {alerts.map((alert, index) => (
                                            <AlertRow
                                                key={alert.id || index}
                                                alert={alert}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <CardHeader className="p-5">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Activity className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                    BLE sessions
                                </CardTitle>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Sparade motion sessions och samples för
                                    denna BLE-device.
                                </p>
                            </CardHeader>

                            <CardContent className="p-5 pt-0">
                                {bleSessions.length === 0 ? (
                                    <EmptySmall
                                        icon={Bluetooth}
                                        title="Inga BLE sessions ännu"
                                        text="När en BLE-session sparas kommer den visas här."
                                    />
                                ) : (
                                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                                        {bleSessions
                                            .slice(0, 20)
                                            .map((session, index) => (
                                                <BleSessionRow
                                                    key={
                                                        session.id ||
                                                        `${session.device_ID}-${index}`
                                                    }
                                                    session={session}
                                                />
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="p-5">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <TerminalSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                Events
                            </CardTitle>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Tekniska events från device och backend.
                            </p>
                        </CardHeader>

                        <CardContent className="p-5 pt-0">
                            {events.length === 0 ? (
                                <EmptySmall
                                    icon={Server}
                                    title="Inga events ännu"
                                    text="När devicen loggar tekniska events visas de här."
                                />
                            ) : (
                                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                                    {events.map((event, index) => (
                                        <EventRow
                                            key={event.id || index}
                                            event={event}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {isCellular && (
                        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 2xl:col-span-2">
                            <CardHeader className="p-5">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Route className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    GNSS-historik
                                </CardTitle>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Senaste sparade positioner för denna device.
                                </p>
                            </CardHeader>

                            <CardContent className="p-5 pt-0">
                                {gnssHistory.length === 0 ? (
                                    <EmptySmall
                                        icon={History}
                                        title="Ingen positionshistorik"
                                        text="När devicen skickar GNSS-positioner visas historiken här."
                                    />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {gnssHistory
                                            .slice(0, 9)
                                            .map((point, index) => (
                                                <PositionRow
                                                    key={`${point.device_ID}-${point.data_timestamp}-${index}`}
                                                    point={point}
                                                    index={index}
                                                />
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </section>
    );
}

function StatCard({ icon: Icon, label, value, text }) {
    return (
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                        <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            {label}
                        </p>

                        <p className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">
                            {value}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {text}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function InfoTile({ icon: Icon, label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                <Icon className="h-5 w-5" />
            </div>

            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-lg font-black text-slate-950 dark:text-white">
                {value === null || value === undefined || value === ""
                    ? "N/A"
                    : value}
            </p>
        </div>
    );
}

function BatteryLevelBar({ batteryPercent }) {
    const battery = getBatteryStyles(batteryPercent);

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        Batterinivå
                    </p>

                    <p
                        className={`mt-1 text-lg font-black ${battery.textClass}`}
                    >
                        {battery.value !== null
                            ? `${battery.value}%`
                            : battery.label}
                    </p>
                </div>

                {battery.value !== null && (
                    <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${battery.borderClass} ${battery.textClass}`}
                    >
                        {battery.label}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <div
                    className={`relative h-9 flex-1 overflow-hidden rounded-xl border-2 bg-slate-950 p-1 ${battery.borderClass}`}
                >
                    <div
                        className={`h-full rounded-lg transition-all duration-500 ${battery.fillClass}`}
                        style={{
                            width:
                                battery.value !== null
                                    ? `${battery.value}%`
                                    : "0%",
                        }}
                    />
                </div>

                <div
                    className={`h-5 w-2 rounded-r-sm ${
                        battery.value !== null
                            ? battery.fillClass
                            : "bg-slate-500"
                    }`}
                />
            </div>
        </div>
    );
}

function AlertRow({ alert }) {
    return (
        <div className={`rounded-3xl border p-4 ${getAlertClasses(alert)}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950 dark:text-white">
                            {alert.status_type || "alert"}
                        </p>

                        <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs font-black text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                            {alert.from_status || "unknown"} →{" "}
                            {alert.to_status || "unknown"}
                        </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {alert.reason || "Ingen reason sparad."}
                    </p>
                </div>

                <p className="w-fit shrink-0 rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                    {formatAge(alert.created_at)}
                </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <MiniInfo label="Värde" value={alert.status_value ?? "N/A"} />
                <MiniInfo label="Tid" value={formatDate(alert.created_at)} />
            </div>
        </div>
    );
}

function EventRow({ event }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-black text-slate-950 dark:text-white">
                            {event.event_type}
                        </p>

                        <SeverityBadge severity={event.severity} />
                    </div>

                    <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {event.message}
                    </p>
                </div>

                <p className="w-fit shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {formatAge(event.created_at)}
                </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <MiniInfo label="Firmware" value={event.firmware_version} />
                <MiniInfo
                    label="Created"
                    value={formatDate(event.created_at)}
                />
                <MiniInfo label="Transport" value={event.data_transport} />
            </div>
        </div>
    );
}

function BleSessionRow({ session }) {
    return (
        <div className="rounded-3xl border border-violet-500/30 bg-violet-500/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-black text-slate-950 dark:text-white">
                            BLE session {session.id}
                        </p>

                        <span className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-black uppercase text-white">
                            {session.session_status}
                        </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Motion-data från BLE-device. Visar sessioninformation
                        och senaste kända sample-data om det finns.
                    </p>
                </div>

                <p className="w-fit shrink-0 rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                    {formatAge(getSessionTime(session))}
                </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <MiniInfo
                    label="Samples"
                    value={session.samples_count ?? "N/A"}
                />
                <MiniInfo
                    label="Data packet"
                    value={session.data_packet ?? "N/A"}
                />
                <MiniInfo label="Firmware" value={session.firmware_version} />
                <MiniInfo
                    label="Startad"
                    value={formatDate(session.started_at)}
                />
                <MiniInfo
                    label="Avslutad"
                    value={formatDate(session.ended_at)}
                />
                <MiniInfo
                    label="Quaternion"
                    value={
                        session.quat_w !== null
                            ? `w:${session.quat_w} x:${session.quat_x} y:${session.quat_y} z:${session.quat_z}`
                            : "N/A"
                    }
                />
            </div>
        </div>
    );
}

function PositionRow({ point, index }) {
    return (
        <div
            className={`rounded-3xl border p-4 ${
                index === 0
                    ? "border-blue-500/40 bg-blue-500/10"
                    : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
            }`}
        >
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-black text-slate-950 dark:text-white">
                    {index === 0 ? "Senaste position" : `Position ${index + 1}`}
                </p>

                {index === 0 && (
                    <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-black text-white">
                        Latest
                    </span>
                )}
            </div>

            <div className="grid gap-2">
                <MiniInfo label="Lat" value={point.lat} />
                <MiniInfo label="Lon" value={point.lon} />
                <MiniInfo
                    label="Accuracy"
                    value={point.acc !== null ? `${point.acc} m` : "N/A"}
                />
                <MiniInfo
                    label="Tid"
                    value={formatDate(point.data_timestamp)}
                />
            </div>
        </div>
    );
}

function MiniInfo({ label, value }) {
    return (
        <div className="min-w-0 rounded-2xl bg-white px-3 py-2 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-black text-slate-950 dark:text-white">
                {value === null || value === undefined || value === ""
                    ? "N/A"
                    : value}
            </p>
        </div>
    );
}

function SeverityBadge({ severity }) {
    return (
        <span
            className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-wide ${getSeverityClasses(
                severity,
            )}`}
        >
            {severity || "info"}
        </span>
    );
}

function TransportBadge({ transport }) {
    const isBle = normalizeTransport(transport) === "ble";

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
                isBle
                    ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
            }`}
        >
            {isBle ? (
                <Bluetooth className="h-4 w-4" />
            ) : (
                <Radio className="h-4 w-4" />
            )}
            {isBle ? "BLE" : "Cellular"}
        </span>
    );
}

function EmptySmall({ icon: Icon, title, text }) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
            <Icon className="mx-auto mb-3 h-8 w-8 text-slate-400" />

            <p className="font-black text-slate-950 dark:text-white">{title}</p>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {text}
            </p>
        </div>
    );
}
