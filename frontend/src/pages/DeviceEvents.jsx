import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    AlertCircle,
    Bell,
    Bluetooth,
    CalendarClock,
    Cpu,
    Database,
    Eye,
    Info,
    Loader2,
    Radio,
    RefreshCw,
    Search,
    Server,
    Smartphone,
    TerminalSquare,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LIMIT_OPTIONS = [2, 5, 10, 20, 50, 100];
const SELECTED_TRANSPORT_STORAGE_KEY = "selected_data_transport";

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
    return normalizeRows(result)
        .filter((device) => {
            const deviceId = Number(device?.device_ID);
            return Number.isFinite(deviceId);
        })
        .map((device) => {
            const deviceId = Number(device.device_ID);

            return {
                device_ID: deviceId,
                device_name:
                    device.device_name || device.name || `Device ${deviceId}`,
                data_transport: normalizeTransport(device.data_transport),
                battery_percent: device.battery_percent ?? null,
                firmware_version: device.firmware_version ?? null,
                last_seen: device.last_seen ?? device.lastSeen ?? null,
                connection_status:
                    device.connection_status ?? device.status ?? null,
            };
        });
}

function normalizeBleDevicesResponse(result) {
    return normalizeRows(result)
        .filter((device) => {
            const deviceId = Number(device?.device_ID);
            return Number.isFinite(deviceId);
        })
        .map((device) => {
            const deviceId = Number(device.device_ID);

            return {
                device_ID: deviceId,
                device_name:
                    device.device_name || device.name || `Device ${deviceId}`,
                data_transport: "ble",
                battery_percent: device.battery_percent ?? null,
                firmware_version: device.firmware_version ?? null,
                last_seen: device.last_seen ?? device.lastSeen ?? null,
                connection_status:
                    device.connection_status ?? device.status ?? null,
            };
        });
}

function mergeDevices(...deviceLists) {
    const map = new Map();

    deviceLists.flat().forEach((device) => {
        if (!Number.isFinite(Number(device?.device_ID))) return;

        const key = String(device.device_ID);
        const existing = map.get(key) || {};

        map.set(key, {
            ...existing,
            ...device,
            device_ID: Number(device.device_ID),
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

    return Array.from(map.values()).sort((a, b) => {
        if (a.data_transport !== b.data_transport) {
            return a.data_transport.localeCompare(b.data_transport);
        }

        return Number(a.device_ID) - Number(b.device_ID);
    });
}

function normalizeEventsResponse(result) {
    return normalizeRows(result);
}

function formatDate(value) {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "N/A";
    }

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
    if (!value) return "Ingen tid";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Ingen tid";
    }

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

function getTransportIcon(transport) {
    return normalizeTransport(transport) === "ble" ? Bluetooth : Radio;
}

function getTransportLabel(transport) {
    return normalizeTransport(transport) === "ble" ? "BLE" : "Cellular";
}

function sortEventsNewest(events) {
    return [...events].sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();

        return bTime - aTime;
    });
}

function attachEventsToDevices(devices, events) {
    const eventsByDeviceId = new Map();

    events.forEach((event) => {
        const key = String(event.device_ID);

        if (!eventsByDeviceId.has(key)) {
            eventsByDeviceId.set(key, []);
        }

        eventsByDeviceId.get(key).push(event);
    });

    return devices.map((device) => {
        const deviceEvents = sortEventsNewest(
            eventsByDeviceId.get(String(device.device_ID)) || [],
        );

        return {
            ...device,
            events: deviceEvents,
            latest_event: deviceEvents[0] || null,
        };
    });
}

function getInitialTransport() {
    const storedTransport = localStorage.getItem(
        SELECTED_TRANSPORT_STORAGE_KEY,
    );

    if (storedTransport === "ble" || storedTransport === "cellular") {
        return storedTransport;
    }

    return "cellular";
}

function getDeviceDetailsPath(device) {
    return `/devices/${Number(device.device_ID)}`;
}

export default function DeviceEvents() {
    const navigate = useNavigate();

    const user = getStoredUser();
    const userId = user?.user_ID || null;

    const [selectedTransport, setSelectedTransport] =
        useState(getInitialTransport);
    const [limit, setLimit] = useState(20);

    const [devices, setDevices] = useState([]);
    const [events, setEvents] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [eventWarningMessage, setEventWarningMessage] = useState("");

    const filteredDevicesByTransport = useMemo(() => {
        return devices.filter(
            (device) => device.data_transport === selectedTransport,
        );
    }, [devices, selectedTransport]);

    const filteredEventsByTransport = useMemo(() => {
        return events.filter(
            (event) => event.data_transport === selectedTransport,
        );
    }, [events, selectedTransport]);

    const devicesWithEvents = useMemo(() => {
        const mergedDevices = attachEventsToDevices(
            filteredDevicesByTransport,
            filteredEventsByTransport,
        );

        const query = searchQuery.trim().toLowerCase();

        if (!query) return mergedDevices;

        return mergedDevices.filter((device) => {
            const deviceId = String(device.device_ID || "").toLowerCase();
            const deviceName = String(device.device_name || "").toLowerCase();
            const transport = String(device.data_transport || "").toLowerCase();
            const firmware = String(
                device.firmware_version || "",
            ).toLowerCase();

            const deviceMatch =
                deviceId.includes(query) ||
                deviceName.includes(query) ||
                transport.includes(query) ||
                firmware.includes(query);

            const eventMatch = device.events.some((event) => {
                const eventType = String(event.event_type || "").toLowerCase();
                const severity = String(event.severity || "").toLowerCase();
                const message = String(event.message || "").toLowerCase();
                const eventFirmware = String(
                    event.firmware_version || "",
                ).toLowerCase();

                return (
                    eventType.includes(query) ||
                    severity.includes(query) ||
                    message.includes(query) ||
                    eventFirmware.includes(query)
                );
            });

            return deviceMatch || eventMatch;
        });
    }, [filteredDevicesByTransport, filteredEventsByTransport, searchQuery]);

    const selectedDevice = useMemo(() => {
        if (!selectedDeviceId) return devicesWithEvents[0] || null;

        return (
            devicesWithEvents.find(
                (device) =>
                    String(device.device_ID) === String(selectedDeviceId),
            ) ||
            devicesWithEvents[0] ||
            null
        );
    }, [devicesWithEvents, selectedDeviceId]);

    const selectedDeviceEvents = selectedDevice?.events || [];

    const stats = useMemo(() => {
        const totalEvents = filteredEventsByTransport.length;
        const totalDevices = filteredDevicesByTransport.length;

        const infoCount = filteredEventsByTransport.filter(
            (event) => String(event.severity).toLowerCase() === "info",
        ).length;

        const warningCount = filteredEventsByTransport.filter((event) => {
            const severity = String(event.severity).toLowerCase();
            return severity === "warning" || severity === "warn";
        }).length;

        const errorCount = filteredEventsByTransport.filter((event) => {
            const severity = String(event.severity).toLowerCase();
            return severity === "error" || severity === "critical";
        }).length;

        const latestEvent = sortEventsNewest(filteredEventsByTransport)[0];

        return {
            totalEvents,
            totalDevices,
            infoCount,
            warningCount,
            errorCount,
            latestEvent,
        };
    }, [filteredEventsByTransport, filteredDevicesByTransport]);

    async function fetchDeviceEvents() {
        if (!userId) {
            setErrorMessage("Ingen inloggad användare hittades.");
            return;
        }

        try {
            setIsLoading(true);
            setErrorMessage("");
            setEventWarningMessage("");

            const [statusDevicesResult, bleDevicesResult, eventsResult] =
                await Promise.allSettled([
                    axios.get(`/api/device/status/get/all/${userId}`),
                    axios.get(`/api/device/ble/get/all/${userId}`),
                    axios.get(
                        `/api/device/event/get/${userId}?data_transport=${encodeURIComponent(
                            selectedTransport,
                        )}&limit=${limit}`,
                    ),
                ]);

            if (
                statusDevicesResult.status === "rejected" &&
                bleDevicesResult.status === "rejected"
            ) {
                console.error(
                    "Failed to fetch status devices:",
                    statusDevicesResult.reason,
                );
                console.error(
                    "Failed to fetch BLE devices:",
                    bleDevicesResult.reason,
                );

                setDevices([]);
                setEvents([]);
                setSelectedDeviceId(null);
                setErrorMessage("Kunde inte hämta dina devices.");
                return;
            }

            const statusDevices =
                statusDevicesResult.status === "fulfilled"
                    ? normalizeDevicesResponse(statusDevicesResult.value.data)
                    : [];

            const bleDevices =
                bleDevicesResult.status === "fulfilled"
                    ? normalizeBleDevicesResponse(bleDevicesResult.value.data)
                    : [];

            const normalizedDevices = mergeDevices(statusDevices, bleDevices);

            const normalizedEvents =
                eventsResult.status === "fulfilled" &&
                eventsResult.value.data?.success !== false
                    ? normalizeEventsResponse(eventsResult.value.data)
                          .filter((event) => {
                              const deviceId = Number(event?.device_ID);
                              return Number.isFinite(deviceId);
                          })
                          .map((event) => ({
                              ...event,
                              id: Number(event.id),
                              device_ID: Number(event.device_ID),
                              user_ID: Number(event.user_ID || userId),
                              device_name:
                                  event.device_name ||
                                  `Device ${event.device_ID}`,
                              data_transport: normalizeTransport(
                                  event.data_transport || selectedTransport,
                              ),
                              event_type: event.event_type || "unknown_event",
                              severity: event.severity || "info",
                              message: event.message || "No message",
                              firmware_version: event.firmware_version || "N/A",
                              created_at: event.created_at || null,
                          }))
                    : [];

            if (eventsResult.status === "rejected") {
                console.error("Failed to fetch events:", eventsResult.reason);
                setEventWarningMessage(
                    "Devices hämtades, men eventloggen kunde inte hämtas just nu.",
                );
            }

            setDevices(normalizedDevices);
            setEvents(sortEventsNewest(normalizedEvents));

            const transportDevices = normalizedDevices.filter(
                (device) => device.data_transport === selectedTransport,
            );

            setSelectedDeviceId((currentDeviceId) => {
                const currentExists = transportDevices.some(
                    (device) =>
                        String(device.device_ID) === String(currentDeviceId),
                );

                if (currentDeviceId && currentExists) {
                    return currentDeviceId;
                }

                return transportDevices[0]?.device_ID || null;
            });
        } catch (error) {
            console.error("Failed to fetch device events page:", error);

            setDevices([]);
            setEvents([]);
            setSelectedDeviceId(null);

            setErrorMessage(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Kunde inte hämta device events.",
            );
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchDeviceEvents();
    }, [userId, selectedTransport, limit]);

    useEffect(() => {
        const selectedExists = devicesWithEvents.some(
            (device) => String(device.device_ID) === String(selectedDeviceId),
        );

        if (!selectedExists) {
            setSelectedDeviceId(devicesWithEvents[0]?.device_ID || null);
        }
    }, [devicesWithEvents, selectedDeviceId]);

    function handleSelectTransport(transport) {
        const nextTransport = normalizeTransport(transport);

        setSelectedTransport(nextTransport);
        setSelectedDeviceId(null);
        setSearchQuery("");

        localStorage.setItem(SELECTED_TRANSPORT_STORAGE_KEY, nextTransport);
    }

    function openDeviceDetails(device) {
        const path = getDeviceDetailsPath(device);

        console.log("Opening device details:", path);

        navigate(path);
    }

    return (
        <section className="mx-auto w-full max-w-[1700px] px-3 py-4 sm:px-5 lg:px-8">
            <div className="mb-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-700 dark:text-blue-300">
                        <TerminalSquare className="h-4 w-4 shrink-0" />
                        <span className="truncate">Device events</span>
                    </div>

                    <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                        Device Events
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                        Se tekniska händelser från dina devices. Alla devices
                        visas för vald transport, även om de ännu inte har några
                        events.
                    </p>
                </div>

                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 xl:flex xl:w-auto xl:items-center xl:justify-end xl:gap-5">
                    <select
                        value={selectedTransport}
                        onChange={(event) =>
                            handleSelectTransport(event.target.value)
                        }
                        className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:min-w-0 xl:h-14 xl:w-[230px] xl:min-w-[230px] xl:text-base"
                    >
                        <option value="cellular">Cellular</option>
                        <option value="ble">BLE</option>
                    </select>

                    <select
                        value={limit}
                        onChange={(event) =>
                            setLimit(Number(event.target.value))
                        }
                        className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:min-w-0 xl:h-14 xl:w-[210px] xl:min-w-[210px] xl:text-base"
                    >
                        {LIMIT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option} events
                            </option>
                        ))}
                    </select>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={fetchDeviceEvents}
                        disabled={isLoading}
                        className="h-12 w-full rounded-2xl border-slate-300 px-5 font-black dark:border-slate-700 xl:h-14 xl:w-[190px] xl:min-w-[190px] xl:text-base"
                    >
                        {isLoading ? (
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

            {eventWarningMessage && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-700 dark:text-orange-300">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{eventWarningMessage}</p>
                </div>
            )}

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                <StatCard
                    icon={Smartphone}
                    label="Devices"
                    value={stats.totalDevices}
                    text={`${getTransportLabel(selectedTransport)} devices`}
                />

                <StatCard
                    icon={Bell}
                    label="Events"
                    value={stats.totalEvents}
                    text={`Senaste ${limit}`}
                />

                <StatCard
                    icon={Info}
                    label="Info"
                    value={stats.infoCount}
                    text="Normala events"
                />

                <StatCard
                    icon={AlertCircle}
                    label="Warnings / errors"
                    value={stats.warningCount + stats.errorCount}
                    text="Behöver kollas"
                />

                <StatCard
                    icon={CalendarClock}
                    label="Senaste event"
                    value={
                        stats.latestEvent
                            ? formatAge(stats.latestEvent.created_at)
                            : "N/A"
                    }
                    text={
                        stats.latestEvent
                            ? stats.latestEvent.event_type
                            : "Inga events ännu"
                    }
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)] xl:items-start">
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="p-4 sm:p-5">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Database className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span>Devices med events</span>
                        </CardTitle>

                        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Välj en device för att se dess eventlogg eller öppna
                            device detail-sidan.
                        </p>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                        <div className="relative mb-4">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                placeholder="Sök device, event eller firmware..."
                                className="h-12 rounded-2xl pl-11"
                            />
                        </div>

                        {isLoading ? (
                            <LoadingState />
                        ) : devicesWithEvents.length === 0 ? (
                            <EmptyState selectedTransport={selectedTransport} />
                        ) : (
                            <div className="space-y-3 xl:max-h-[calc(100dvh-370px)] xl:min-h-[360px] xl:overflow-y-auto xl:pr-1">
                                {devicesWithEvents.map((device) => (
                                    <DeviceEventCard
                                        key={device.device_ID}
                                        device={device}
                                        isSelected={
                                            String(device.device_ID) ===
                                            String(selectedDevice?.device_ID)
                                        }
                                        onSelect={() =>
                                            setSelectedDeviceId(
                                                device.device_ID,
                                            )
                                        }
                                        onOpenDetails={() =>
                                            openDeviceDetails(device)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Server className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                                    <span>Eventlogg</span>
                                </CardTitle>

                                <p className="mt-1 break-words text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    {selectedDevice
                                        ? `${selectedDevice.device_name} · ID ${selectedDevice.device_ID}`
                                        : "Ingen device hittades för vald transport."}
                                </p>
                            </div>

                            {selectedDevice && (
                                <div className="shrink-0">
                                    <TransportBadge
                                        transport={
                                            selectedDevice.data_transport
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                        {!selectedDevice ? (
                            <NoDeviceForTransport
                                selectedTransport={selectedTransport}
                            />
                        ) : selectedDeviceEvents.length === 0 ? (
                            <NoEventsForDevice
                                device={selectedDevice}
                                onOpenDetails={() =>
                                    openDeviceDetails(selectedDevice)
                                }
                            />
                        ) : (
                            <div className="space-y-3 xl:max-h-[calc(100dvh-370px)] xl:min-h-[360px] xl:overflow-y-auto xl:pr-1">
                                {selectedDeviceEvents.map((event, index) => (
                                    <EventRow
                                        key={event.id || index}
                                        event={event}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
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

function DeviceEventCard({ device, isSelected, onSelect, onOpenDetails }) {
    const TransportIcon = getTransportIcon(device.data_transport);
    const latestEvent = device.latest_event;
    const hasEvents = device.events.length > 0;

    return (
        <article
            className={`w-full rounded-3xl border p-4 text-left transition ${
                isSelected
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
            }`}
        >
            <button
                type="button"
                onClick={onSelect}
                className="block w-full text-left"
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${
                            device.data_transport === "ble"
                                ? "bg-violet-600"
                                : "bg-blue-600"
                        }`}
                    >
                        <TransportIcon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="break-words font-black text-slate-950 dark:text-white">
                                    {device.device_name}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    ID {device.device_ID} ·{" "}
                                    {getTransportLabel(device.data_transport)}
                                </p>
                            </div>

                            <span
                                className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                                    hasEvents
                                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                            >
                                {device.events.length} events
                            </span>
                        </div>

                        {latestEvent ? (
                            <div className="mt-3 rounded-2xl bg-white p-3 dark:bg-slate-900">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="break-words text-sm font-bold text-slate-950 dark:text-white">
                                        {latestEvent.event_type}
                                    </p>

                                    <SeverityBadge
                                        severity={latestEvent.severity}
                                    />
                                </div>

                                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    {latestEvent.message}
                                </p>

                                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {formatAge(latestEvent.created_at)}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                                    Inga events ännu
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    Devicen finns registrerad men har inte
                                    loggat några events för{" "}
                                    {getTransportLabel(device.data_transport)}{" "}
                                    ännu.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </button>

            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onOpenDetails();
                }}
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm font-black text-slate-950 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
                <Eye className="mr-2 h-4 w-4" />
                Visa device details
            </button>
        </article>
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

function LoadingState() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((item) => (
                <div
                    key={item}
                    className="h-36 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800"
                />
            ))}
        </div>
    );
}

function EmptyState({ selectedTransport }) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950 sm:p-8">
            <Bell className="mx-auto mb-3 h-8 w-8 text-slate-400" />

            <p className="font-black text-slate-950 dark:text-white">
                Inga {getTransportLabel(selectedTransport)} devices hittades
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Det finns inga registrerade devices för vald transport ännu.
            </p>
        </div>
    );
}

function NoDeviceForTransport({ selectedTransport }) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950 sm:p-8">
            <Cpu className="mx-auto mb-3 h-8 w-8 text-slate-400" />

            <p className="font-black text-slate-950 dark:text-white">
                Ingen device för {getTransportLabel(selectedTransport)}
            </p>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Byt transport eller registrera en ny device.
            </p>
        </div>
    );
}

function NoEventsForDevice({ device, onOpenDetails }) {
    const TransportIcon = getTransportIcon(device.data_transport);

    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950 sm:p-8">
            <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white ${
                    device.data_transport === "ble"
                        ? "bg-violet-600"
                        : "bg-blue-600"
                }`}
            >
                <TransportIcon className="h-7 w-7" />
            </div>

            <p className="break-words text-xl font-black text-slate-950 dark:text-white">
                {device.device_name}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                ID {device.device_ID} ·{" "}
                {getTransportLabel(device.data_transport)}
            </p>

            <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="font-black text-slate-950 dark:text-white">
                    Inga events ännu
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Den här devicen är registrerad, men har ännu inte skapat
                    några tekniska events. När devicen skickar event till
                    backend kommer de visas här.
                </p>

                <button
                    type="button"
                    onClick={onOpenDetails}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm font-black text-slate-950 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                    <Eye className="mr-2 h-4 w-4" />
                    Visa device details
                </button>
            </div>
        </div>
    );
}
