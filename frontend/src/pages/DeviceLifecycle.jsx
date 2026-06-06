import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import {
    AlertCircle,
    Battery,
    Clock,
    Compass,
    Cpu,
    Database,
    Gauge,
    Loader2,
    RefreshCw,
    Server,
    TerminalSquare,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.warn("Could not parse stored user:", error);
        return null;
    }
}

// Formaterar exakt klockslag och datum samt relativ tid
function formatTimestamp(value) {
    if (!value) return "Ingen tid";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Ingen tid";

    const timeString = date.toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    const dateString = date.toLocaleDateString("sv-SE");

    const diffMs = Date.now() - date.getTime();
    const seconds = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    let relative = "";
    if (seconds < 60) relative = "Nyss";
    else if (minutes < 60) relative = `${minutes} min sedan`;
    else if (hours < 24) relative = `${hours} h sedan`;
    else relative = dateString;

    return `${dateString} kl. ${timeString} (${relative})`;
}

export default function DeviceLifecycle() {
    const navigate = useNavigate();
    const user = getStoredUser();
    const userId = user?.user_ID || null;

    // States
    const [cellularDevices, setCellularDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");

    // Sparar hela historiken som en array från databasen
    const [lifecycleHistory, setLifecycleHistory] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSocketConnected, setIsSocketConnected] = useState(false);

    // Hitta det valda enhetsnamnet för listraderna
    const selectedDeviceName =
        cellularDevices.find(
            (d) => Number(d.device_ID) === Number(selectedDeviceId),
        )?.device_name || "Okänd enhet";

    // Hämta de senaste fasta parametrarna från det nyaste indexet i historiken
    const latestConfig = lifecycleHistory[0] || {
        firmware_version: "—",
        gnss_periodic_timeout: "—",
        gnss_periodic_interval: "—",
    };

    // 1. Hämta alla enheter för användaren och filtrera ut "cellular"
    useEffect(() => {
        async function fetchUserDevices() {
            if (!userId) return;
            try {
                setIsLoading(true);
                const response = await axios.get(
                    `/api/device/get/all/${userId}`,
                );

                if (response.data && response.data.success) {
                    const allDevices = response.data.data || [];
                    const cellularOnly = allDevices.filter(
                        (d) => d.data_transport === "cellular",
                    );

                    setCellularDevices(cellularOnly);

                    if (cellularOnly.length > 0) {
                        setSelectedDeviceId(cellularOnly[0].device_ID);
                    }
                }
            } catch (error) {
                console.error("Kunde inte hämta användarens enheter:", error);
                setErrorMessage("Kunde inte hämta dina enheter.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchUserDevices();
    }, [userId]);

    // 2. Hämta ALL livscykelhistorik för den valda enheten
    async function fetchLifecycleData(deviceId) {
        if (!userId || !deviceId) return;

        try {
            setIsLoading(true);
            setErrorMessage("");

            const response = await axios.get(
                `/api/device/lifecycle/get/all/${userId}/${deviceId}`,
            );

            if (response.data && response.data.success) {
                const rows = response.data.db_response || [];

                // Mappa upp och spara hela arrayen i state
                const mappedHistory = rows.map((row) => ({
                    lifecycle_ID: row.lifecycle_ID,
                    device_ID: Number(row.device_ID),
                    battery_percent: row.battery_percent ?? 0,
                    gnss_periodic_timeout: row.gnss_periodic_timeout ?? 0,
                    gnss_periodic_interval: row.gnss_periodic_interval ?? 0,
                    firmware_version: row.firmware_version || "0.0.0",
                    created_at:
                        row.created_at ||
                        row.updated_at ||
                        new Date().toISOString(),
                }));

                setLifecycleHistory(mappedHistory);
            } else {
                setLifecycleHistory([]);
            }
        } catch (error) {
            console.error(
                `Kunde inte hämta lifecycle-historik för ${deviceId}:`,
                error,
            );
            setErrorMessage("Kunde inte ladda historik för vald enhet.");
            setLifecycleHistory([]);
        } finally {
            setIsLoading(false);
        }
    }

    // Lyssna på när användaren byter enhet i dropdown
    useEffect(() => {
        if (userId && selectedDeviceId) {
            fetchLifecycleData(selectedDeviceId);
        }
    }, [userId, selectedDeviceId]);

    // 3. Socket.IO för live-uppdateringar i realtid
    useEffect(() => {
        if (!userId) return;

        const socket = io({
            transports: ["websocket"],
        });

        socket.on("connect", () => {
            setIsSocketConnected(true);
            socket.emit("join_room", `user:${userId}`);
        });

        socket.on("disconnect", () => {
            setIsSocketConnected(false);
        });

        socket.on("device:lifecycle", (liveData) => {
            if (!liveData || !liveData.device_ID) return;

            // Om det är den valda enheten som skickar data, lägg till den ÖVERST i listan
            if (Number(liveData.device_ID) === Number(selectedDeviceId)) {
                const newLogEntry = {
                    lifecycle_ID: liveData.lifecycle_ID || Date.now(),
                    device_ID: Number(liveData.device_ID),
                    battery_percent: liveData.battery_percent ?? 100,
                    gnss_periodic_timeout:
                        liveData.gnss_periodic_timeout ?? 120,
                    gnss_periodic_interval:
                        liveData.gnss_periodic_interval ?? 15,
                    firmware_version: liveData.firmware_version || "1.0.0",
                    created_at: new Date().toISOString(),
                };

                setLifecycleHistory((prevHistory) => [
                    newLogEntry,
                    ...prevHistory,
                ]);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [userId, selectedDeviceId]);

    // Beräknar färg på batteristatus-badgen dynamiskt för varje historikrad
    const getBatteryBadgeClass = (percent) => {
        if (percent > 50)
            return "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400";
        if (percent > 20)
            return "bg-orange-500/10 border-orange-500/30 text-orange-500 dark:text-orange-400";
        return "bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400";
    };

    return (
        <section className="mx-auto w-full max-w-[1700px] px-3 py-4 sm:px-5 lg:px-8">
            {/* TOPPEN: Huvudrubrik och anslutningsstatus */}
            <div className="mb-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300">
                        <TerminalSquare className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                            Live Telemetry Historik
                        </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                        Device Lifecycle Log
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                        Spåra batteriförbrukning och enhetsstatus över tid via
                        CoAP och WebSockets.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-start xl:self-auto">
                    <div
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black bg-white dark:bg-slate-900 ${
                            isSocketConnected
                                ? "border-emerald-500/30 text-emerald-500"
                                : "border-red-500/30 text-red-500"
                        }`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${isSocketConnected ? "bg-emerald-500" : "bg-red-500 animate-ping"}`}
                        />
                        {isSocketConnected
                            ? "LIVE-STRÖM AKTIV"
                            : "WS FRÅNKOPPLAD"}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fetchLifecycleData(selectedDeviceId)}
                        disabled={isLoading}
                        className="h-12 rounded-2xl border-slate-300 font-black dark:border-slate-700"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <RefreshCw className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            {errorMessage && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{errorMessage}</p>
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start">
                {/* VÄNSTER SIDA: Enhetsväljare */}
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="p-4 sm:p-5">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Database className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <span>Välj Hårdvarunod</span>
                        </CardTitle>
                        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Välj nod för att hämta dess fullständiga
                            historiklogg från databasen.
                        </p>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                        {cellularDevices.length === 0 && !isLoading ? (
                            <div className="rounded-2xl border border-dashed p-8 text-center text-sm font-medium text-slate-500">
                                Inga Cellular-enheter hittades.
                            </div>
                        ) : (
                            <div className="relative">
                                <select
                                    value={selectedDeviceId}
                                    onChange={(e) =>
                                        setSelectedDeviceId(e.target.value)
                                    }
                                    className="w-full h-12 appearance-none rounded-2xl border border-slate-300 bg-slate-50 px-4 pr-10 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                >
                                    {cellularDevices.map((device) => (
                                        <option
                                            key={device.device_ID}
                                            value={device.device_ID}
                                        >
                                            {device.device_name} (ID:{" "}
                                            {device.device_ID})
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                                    <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* HÖGER SIDA: Fasta parametrar och historiklistan */}
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="p-4 sm:p-5">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Server className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <span>Mätningar och Batterihistorik</span>
                        </CardTitle>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {selectedDeviceId
                                ? `Historiklogg för hårdvaru-ID: ${selectedDeviceId} (${lifecycleHistory.length} mätpunkter)`
                                : "Välj en enhet till vänster för att läsa in historik."}
                        </p>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                        {isLoading && lifecycleHistory.length === 0 ? (
                            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-500">
                                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                                <span className="text-sm font-bold">
                                    Läser in historikdata...
                                </span>
                            </div>
                        ) : lifecycleHistory.length === 0 ? (
                            <div className="rounded-2xl border border-dashed p-12 text-center text-slate-400">
                                Det finns ingen sparad livscykeldata för enhet{" "}
                                {selectedDeviceId} i databasen.
                            </div>
                        ) : (
                            <>
                                {/* FASTA PARAMETRAR: Visas högst upp i en ren 3-kolumns layout */}
                                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-5">
                                    {/* Programvara */}
                                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-950/40 flex items-center gap-3 shadow-sm">
                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <Cpu className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">
                                                Programvara
                                            </p>
                                            <p className="text-base font-black text-slate-900 dark:text-white">
                                                {latestConfig.firmware_version !==
                                                "—"
                                                    ? `v${latestConfig.firmware_version}`
                                                    : "—"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* GNSS Söktimeout */}
                                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-950/40 flex items-center gap-3 shadow-sm">
                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <Compass className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">
                                                GNSS Timeout
                                            </p>
                                            <p className="text-base font-black text-slate-900 dark:text-white">
                                                {
                                                    latestConfig.gnss_periodic_timeout
                                                }
                                                {latestConfig.gnss_periodic_timeout !==
                                                "—"
                                                    ? "s"
                                                    : ""}
                                            </p>
                                        </div>
                                    </div>

                                    {/* GNSS Sökintervall */}
                                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-950/40 flex items-center gap-3 shadow-sm">
                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <Gauge className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">
                                                GNSS Interval
                                            </p>
                                            <p className="text-base font-black text-slate-900 dark:text-white">
                                                {
                                                    latestConfig.gnss_periodic_interval
                                                }
                                                {latestConfig.gnss_periodic_interval !==
                                                "—"
                                                    ? " min"
                                                    : ""}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* HISTORIKFLÖDE: Nu helt rensad från de fasta parametrarna på varje rad */}
                                <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {lifecycleHistory.map((log, index) => (
                                        <div
                                            key={log.lifecycle_ID || index}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/40 dark:border-slate-800/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-all shadow-sm"
                                        >
                                            {/* Vänster: Logg-info & Tidpunkt */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400 mb-1">
                                                    <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md text-[10px] tracking-wider font-extrabold">
                                                        LOGG #{log.lifecycle_ID}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="text-slate-400">
                                                        CELLULAR
                                                    </span>
                                                </div>

                                                <h3 className="text-base font-black tracking-tight text-slate-950 dark:text-white truncate">
                                                    {selectedDeviceName}{" "}
                                                    <span className="text-slate-400 font-medium text-sm">
                                                        (ID: {log.device_ID})
                                                    </span>
                                                </h3>

                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                                                    <span className="font-semibold">
                                                        {formatTimestamp(
                                                            log.created_at,
                                                        )}
                                                    </span>
                                                </p>
                                            </div>

                                            {/* Höger: Endast renodlad batteristatus */}
                                            <div className="flex items-center shrink-0 self-end sm:self-center">
                                                <div
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black shadow-sm ${getBatteryBadgeClass(log.battery_percent)}`}
                                                >
                                                    <Battery className="h-4 w-4" />
                                                    <span>
                                                        {log.battery_percent}%
                                                        Batteri
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}

// Inbyggd ikon för select-rutan
function ChevronDownIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}
