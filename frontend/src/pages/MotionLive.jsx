import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
    Activity,
    AlertCircle,
    Bluetooth,
    CalendarClock,
    Database,
    Pause,
    Play,
    Radio,
    RefreshCw,
    RotateCcw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function getLoggedInUserId() {
    try {
        const possibleKeys = ["user", "loggedInUser", "authUser"];

        for (const key of possibleKeys) {
            const value = localStorage.getItem(key);
            if (!value) continue;

            const parsed = JSON.parse(value);

            if (parsed?.user_ID) return parsed.user_ID;
            if (parsed?.userId) return parsed.userId;
            if (parsed?.id) return parsed.id;
        }
    } catch (error) {
        console.warn("Could not read logged in user from localStorage", error);
    }

    return null;
}

function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getDateMs(value) {
    if (!value) return 0;

    const date = new Date(value);
    const time = date.getTime();

    return Number.isFinite(time) ? time : 0;
}

function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(date);
}

function formatTime(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(date);
}

function getDurationText(startValue, endValue) {
    if (!startValue || !endValue) return "-";

    const start = new Date(startValue).getTime();
    const end = new Date(endValue).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end)) return "-";

    const seconds = Math.max(0, Math.round((end - start) / 1000));

    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
}

function quaternionToEulerDegrees(qw, qx, qy, qz) {
    const sinrCosp = 2 * (qw * qx + qy * qz);
    const cosrCosp = 1 - 2 * (qx * qx + qy * qy);
    const roll = Math.atan2(sinrCosp, cosrCosp);

    const sinp = 2 * (qw * qy - qz * qx);
    const pitch =
        Math.abs(sinp) >= 1 ? Math.sign(sinp) * (Math.PI / 2) : Math.asin(sinp);

    const sinyCosp = 2 * (qw * qz + qx * qy);
    const cosyCosp = 1 - 2 * (qy * qy + qz * qz);
    const yaw = Math.atan2(sinyCosp, cosyCosp);

    return {
        rollDeg: roll * (180 / Math.PI),
        pitchDeg: pitch * (180 / Math.PI),
        yawDeg: yaw * (180 / Math.PI),
    };
}

function getQuaternionNorm(qw, qx, qy, qz) {
    return Math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz);
}

function normalizeApiRows(result) {
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.sessions)) return result.sessions;
    if (Array.isArray(result)) return result;

    return [];
}

function normalizeBleDevicesResponse(result) {
    const devices = Array.isArray(result?.data) ? result.data : [];

    return devices
        .filter(
            (device) => String(device.data_transport).toLowerCase() === "ble",
        )
        .map((device) => ({
            device_ID: Number(device.device_ID),
            user_ID: Number(device.user_ID),
            device_name: device.device_name || "BLE device",
            data_transport: "ble",
        }));
}

function normalizeMotionRow(row, rowIndex) {
    const qw = toNumber(row.quat_w);
    const qx = toNumber(row.quat_x);
    const qy = toNumber(row.quat_y);
    const qz = toNumber(row.quat_z);

    const euler = quaternionToEulerDegrees(qw, qx, qy, qz);

    return {
        ...row,

        __row_index: rowIndex,

        session_ID: Number(row.session_ID),
        device_ID: Number(row.device_ID),
        user_ID: row.user_ID ? Number(row.user_ID) : null,
        done_status: Number(row.done_status ?? 0),

        quat_w: qw,
        quat_x: qx,
        quat_y: qy,
        quat_z: qz,

        data_packet: Number(row.data_packet ?? 0),
        norm: getQuaternionNorm(qw, qx, qy, qz),

        rollDeg: euler.rollDeg,
        pitchDeg: euler.pitchDeg,
        yawDeg: euler.yawDeg,
    };
}

function groupRowsIntoSessions(rows) {
    const sessionsMap = new Map();

    rows.forEach((row, rowIndex) => {
        const normalizedRow = normalizeMotionRow(row, rowIndex);
        const sessionId = normalizedRow.session_ID;

        if (!sessionId) return;

        if (!sessionsMap.has(sessionId)) {
            sessionsMap.set(sessionId, {
                session_ID: sessionId,
                device_ID: normalizedRow.device_ID,
                device_name: normalizedRow.device_name ?? "BLE device",
                data_transport: normalizedRow.data_transport ?? "ble",
                done_status: normalizedRow.done_status,
                created_at: normalizedRow.created_at,
                ended_at: normalizedRow.ended_at,
                firmware_version: normalizedRow.firmware_version,
                samples: [],
            });
        }

        const session = sessionsMap.get(sessionId);

        session.samples.push(normalizedRow);

        if (
            !session.created_at ||
            getDateMs(normalizedRow.created_at) < getDateMs(session.created_at)
        ) {
            session.created_at = normalizedRow.created_at;
        }

        if (normalizedRow.ended_at) {
            session.ended_at = normalizedRow.ended_at;
        }

        if (normalizedRow.firmware_version) {
            session.firmware_version = normalizedRow.firmware_version;
        }

        if (normalizedRow.done_status !== undefined) {
            session.done_status = normalizedRow.done_status;
        }
    });

    return Array.from(sessionsMap.values())
        .map((session) => {
            const sortedSamples = [...session.samples].sort((a, b) => {
                const timeDiff =
                    getDateMs(a.created_at) - getDateMs(b.created_at);

                if (timeDiff !== 0) return timeDiff;

                return a.__row_index - b.__row_index;
            });

            return {
                ...session,
                samples: sortedSamples,
                sample_count: sortedSamples.length,
            };
        })
        .sort((a, b) => {
            return getDateMs(b.created_at) - getDateMs(a.created_at);
        });
}

export default function MotionLive() {
    const userId = getLoggedInUserId();

    const playbackTimerRef = useRef(null);

    const [devicesLoading, setDevicesLoading] = useState(true);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [deviceError, setDeviceError] = useState("");
    const [sessionsError, setSessionsError] = useState("");

    const [bleDevices, setBleDevices] = useState([]);
    const [selectedBleDeviceId, setSelectedBleDeviceId] = useState("");

    const [allSessions, setAllSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const [playbackSpeedMs, setPlaybackSpeedMs] = useState(90);

    const selectedBleDevice = useMemo(() => {
        return bleDevices.find(
            (device) =>
                String(device.device_ID) === String(selectedBleDeviceId),
        );
    }, [bleDevices, selectedBleDeviceId]);

    const sessions = useMemo(() => {
        if (!selectedBleDeviceId) return [];

        return allSessions.filter(
            (session) =>
                String(session.device_ID) === String(selectedBleDeviceId),
        );
    }, [allSessions, selectedBleDeviceId]);

    const selectedSession = useMemo(() => {
        return sessions.find(
            (session) =>
                String(session.session_ID) === String(selectedSessionId),
        );
    }, [sessions, selectedSessionId]);

    const currentSample = useMemo(() => {
        if (!selectedSession?.samples?.length) return null;

        return (
            selectedSession.samples[currentIndex] ?? selectedSession.samples[0]
        );
    }, [selectedSession, currentIndex]);

    const progressPercent = useMemo(() => {
        if (!selectedSession?.samples?.length) return 0;

        if (selectedSession.samples.length === 1) return 100;

        return (currentIndex / (selectedSession.samples.length - 1)) * 100;
    }, [selectedSession, currentIndex]);

    const roll = toNumber(currentSample?.rollDeg);
    const pitch = toNumber(currentSample?.pitchDeg);
    const yaw = toNumber(currentSample?.yawDeg);

    const currentSampleNumber = currentSample ? currentIndex + 1 : 0;
    const totalSamples = selectedSession?.sample_count ?? 0;

    const objectTransitionMs = Math.max(70, playbackSpeedMs * 0.95);
    const progressTransitionMs = Math.max(80, playbackSpeedMs * 1.05);

    const selectedDeviceHasNoData =
        !sessionsLoading &&
        selectedBleDevice &&
        selectedBleDeviceId &&
        sessions.length === 0;

    const pageLoading = devicesLoading || sessionsLoading;

    const plateStyle = useMemo(() => {
        return {
            transform: `
                perspective(1000px)
                rotateZ(${yaw}deg)
                rotateX(${-pitch}deg)
                rotateY(${roll}deg)
            `,
            transitionDuration: `${objectTransitionMs}ms`,
        };
    }, [roll, pitch, yaw, objectTransitionMs]);

    async function loadBleDevices() {
        if (!userId) {
            setDevicesLoading(false);
            setDeviceError("Ingen användare hittades.");
            setBleDevices([]);
            setSelectedBleDeviceId("");
            return;
        }

        try {
            setDevicesLoading(true);
            setDeviceError("");

            const response = await axios.get(
                `/api/device/ble/get/all/${userId}`,
            );

            const devices = normalizeBleDevicesResponse(response.data);

            setBleDevices(devices);

            setSelectedBleDeviceId((current) => {
                const currentExists = devices.some(
                    (device) => String(device.device_ID) === String(current),
                );

                if (current && currentExists) return current;

                return devices[0]?.device_ID
                    ? String(devices[0].device_ID)
                    : "";
            });
        } catch (error) {
            console.error("Failed to load BLE devices:", error);

            setBleDevices([]);
            setSelectedBleDeviceId("");

            setDeviceError(
                error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    "Kunde inte hämta BLE-devices.",
            );
        } finally {
            setDevicesLoading(false);
        }
    }

    async function loadSessions() {
        if (!userId) {
            setSessionsLoading(false);
            setSessionsError("Ingen användare hittades.");
            setAllSessions([]);
            setSelectedSessionId(null);
            return;
        }

        try {
            setSessionsLoading(true);
            setSessionsError("");

            const response = await axios.get(
                `/api/device/ble/get/motion/sessions/data/${userId}`,
            );

            const rows = normalizeApiRows(response.data);
            const groupedSessions = groupRowsIntoSessions(rows);

            setAllSessions(groupedSessions);
        } catch (error) {
            console.error("Failed to load BLE motion sessions:", error);

            setAllSessions([]);
            setSelectedSessionId(null);

            setSessionsError(
                error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    "Kunde inte hämta BLE motion sessions.",
            );
        } finally {
            setSessionsLoading(false);
        }
    }

    async function loadPageData() {
        await Promise.all([loadBleDevices(), loadSessions()]);
    }

    useEffect(() => {
        loadPageData();

        return () => {
            if (playbackTimerRef.current) {
                window.clearInterval(playbackTimerRef.current);
            }
        };
    }, [userId]);

    useEffect(() => {
        setSelectedSessionId((current) => {
            const currentExists = sessions.some(
                (session) => String(session.session_ID) === String(current),
            );

            if (current && currentExists) return current;

            return sessions[0]?.session_ID ?? null;
        });

        setCurrentIndex(0);
        setIsPlaying(false);
    }, [selectedBleDeviceId, sessions]);

    useEffect(() => {
        if (playbackTimerRef.current) {
            window.clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
        }

        if (!isPlaying || !selectedSession?.samples?.length) return;

        playbackTimerRef.current = window.setInterval(() => {
            setCurrentIndex((previousIndex) => {
                const lastIndex = selectedSession.samples.length - 1;

                if (previousIndex >= lastIndex) {
                    window.clearInterval(playbackTimerRef.current);
                    playbackTimerRef.current = null;
                    setIsPlaying(false);
                    return lastIndex;
                }

                return previousIndex + 1;
            });
        }, playbackSpeedMs);

        return () => {
            if (playbackTimerRef.current) {
                window.clearInterval(playbackTimerRef.current);
                playbackTimerRef.current = null;
            }
        };
    }, [isPlaying, selectedSession, playbackSpeedMs]);

    function handleSelectBleDevice(deviceId) {
        setSelectedBleDeviceId(String(deviceId));
        setSelectedSessionId(null);
        setCurrentIndex(0);
        setIsPlaying(false);
    }

    function handleSelectSession(sessionId) {
        setSelectedSessionId(sessionId);
        setCurrentIndex(0);
        setIsPlaying(false);
    }

    function handleTogglePlayback() {
        if (!selectedSession?.samples?.length) return;

        if (currentIndex >= selectedSession.samples.length - 1) {
            setCurrentIndex(0);
        }

        setIsPlaying((current) => !current);
    }

    function handleResetPlayback() {
        setIsPlaying(false);
        setCurrentIndex(0);
    }

    function handleStepBackward() {
        setIsPlaying(false);
        setCurrentIndex((current) => Math.max(0, current - 1));
    }

    function handleStepForward() {
        if (!selectedSession?.samples?.length) return;

        setIsPlaying(false);
        setCurrentIndex((current) =>
            Math.min(selectedSession.samples.length - 1, current + 1),
        );
    }

    return (
        <section className="mx-auto max-w-[1800px] px-4 py-5 sm:px-5 md:px-6 md:py-8">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                        Motion Sessions
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                        Välj BLE-device och spela upp sparade motion sessions
                        från databasen. Om en device saknar data visas det
                        tydligt här.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={loadPageData}
                    disabled={pageLoading}
                    className="w-full rounded-xl sm:w-fit"
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                            pageLoading ? "animate-spin" : ""
                        }`}
                    />
                    Ladda om
                </Button>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-3">
                <InfoStep
                    number="1"
                    title="Välj BLE-device"
                    text="Har användaren flera BLE-devices väljer du vilken device som ska analyseras."
                />

                <InfoStep
                    number="2"
                    title="Kontrollera sessions"
                    text="Sidan visar om vald device har sparad motion data eller inte."
                />

                <InfoStep
                    number="3"
                    title="Spela upp rörelsen"
                    text="Finns data spelas quaternion-samples upp som 3D-rörelse i webben."
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="space-y-4">
                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="p-4 sm:p-6">
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                <Bluetooth className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                BLE device
                            </CardTitle>

                            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                                Välj vilken BLE-device du vill se sessions för.
                            </p>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                            {devicesLoading ? (
                                <EmptyState
                                    icon={Bluetooth}
                                    title="Laddar BLE-devices..."
                                    text="Hämtar BLE-devices kopplade till användaren."
                                />
                            ) : deviceError ? (
                                <ErrorState text={deviceError} />
                            ) : bleDevices.length === 0 ? (
                                <EmptyState
                                    icon={Bluetooth}
                                    title="Inga BLE-devices hittades"
                                    text="Lägg till en BLE-device först. När den finns kopplad till användaren visas den här."
                                />
                            ) : (
                                <div className="space-y-3">
                                    <select
                                        value={selectedBleDeviceId}
                                        onChange={(e) =>
                                            handleSelectBleDevice(
                                                e.target.value,
                                            )
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    >
                                        {bleDevices.map((device) => (
                                            <option
                                                key={device.device_ID}
                                                value={device.device_ID}
                                            >
                                                {device.device_name} -{" "}
                                                {device.device_ID}
                                            </option>
                                        ))}
                                    </select>

                                    {selectedBleDevice && (
                                        <div
                                            className={`rounded-2xl border p-4 text-sm ${
                                                selectedDeviceHasNoData
                                                    ? "border-amber-300 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/30"
                                                    : "border-violet-200 bg-violet-50 dark:border-violet-900/70 dark:bg-violet-950/30"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                                        selectedDeviceHasNoData
                                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                                            : "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                                                    }`}
                                                >
                                                    {selectedDeviceHasNoData ? (
                                                        <AlertCircle className="h-5 w-5" />
                                                    ) : (
                                                        <Bluetooth className="h-5 w-5" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p
                                                        className={`font-black ${
                                                            selectedDeviceHasNoData
                                                                ? "text-amber-900 dark:text-amber-200"
                                                                : "text-violet-900 dark:text-violet-200"
                                                        }`}
                                                    >
                                                        {
                                                            selectedBleDevice.device_name
                                                        }
                                                    </p>

                                                    <p
                                                        className={`mt-1 ${
                                                            selectedDeviceHasNoData
                                                                ? "text-amber-800 dark:text-amber-300"
                                                                : "text-violet-800 dark:text-violet-300"
                                                        }`}
                                                    >
                                                        ID:{" "}
                                                        {
                                                            selectedBleDevice.device_ID
                                                        }{" "}
                                                        · BLE
                                                    </p>

                                                    <p
                                                        className={`mt-2 text-xs leading-5 ${
                                                            selectedDeviceHasNoData
                                                                ? "text-amber-800 dark:text-amber-300"
                                                                : "text-violet-800 dark:text-violet-300"
                                                        }`}
                                                    >
                                                        {selectedDeviceHasNoData
                                                            ? "Den här devicen är registrerad, men har inga sparade motion sessions ännu."
                                                            : `${sessions.length} sparade session${sessions.length === 1 ? "" : "er"} hittades för denna device.`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="p-4 sm:p-6">
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                <Radio className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                BLE sessions
                            </CardTitle>

                            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                                Nyaste sessionen visas överst.
                            </p>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                            {sessionsLoading ? (
                                <EmptyState
                                    icon={Database}
                                    title="Laddar BLE-sessioner..."
                                    text="Hämtar sparad motion data från databasen."
                                />
                            ) : sessionsError ? (
                                <ErrorState text={sessionsError} />
                            ) : !selectedBleDeviceId ? (
                                <EmptyState
                                    icon={Bluetooth}
                                    title="Välj en BLE-device"
                                    text="När du valt device visas dess sparade motion sessions här."
                                />
                            ) : sessions.length === 0 ? (
                                <EmptyState
                                    icon={AlertCircle}
                                    title="Ingen motion data för vald device"
                                    text="Den här BLE-devicen har inga sparade sessions ännu. Starta en session i React Native-appen och skicka data till backend."
                                    tone="warning"
                                />
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                                    {sessions.map((session) => {
                                        const isSelected =
                                            String(session.session_ID) ===
                                            String(selectedSessionId);

                                        return (
                                            <button
                                                key={session.session_ID}
                                                type="button"
                                                onClick={() =>
                                                    handleSelectSession(
                                                        session.session_ID,
                                                    )
                                                }
                                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                                    isSelected
                                                        ? "border-blue-500 bg-blue-500/10 shadow-sm ring-2 ring-blue-500/20"
                                                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                                                }`}
                                            >
                                                <div className="mb-2">
                                                    <p className="truncate font-bold text-slate-950 dark:text-white">
                                                        Session #
                                                        {session.session_ID}
                                                    </p>

                                                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                                                        {session.device_name} ·{" "}
                                                        {session.device_ID}
                                                    </p>
                                                </div>

                                                <div className="grid gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                    <p>
                                                        Start:{" "}
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {formatDateTime(
                                                                session.created_at,
                                                            )}
                                                        </span>
                                                    </p>

                                                    <p>
                                                        Slut:{" "}
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {formatDateTime(
                                                                session.ended_at,
                                                            )}
                                                        </span>
                                                    </p>

                                                    <p>
                                                        Samples:{" "}
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {
                                                                session.sample_count
                                                            }
                                                        </span>{" "}
                                                        · Duration:{" "}
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {getDurationText(
                                                                session.created_at,
                                                                session.ended_at,
                                                            )}
                                                        </span>
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-5">
                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="p-4 sm:p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        3D Playback
                                    </CardTitle>

                                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                        Uppspelning av vald session.
                                    </p>
                                </div>

                                {selectedSession && (
                                    <div className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                        Session #{selectedSession.session_ID}
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                            {!selectedSession || !currentSample ? (
                                <PlaybackEmptyState
                                    selectedBleDevice={selectedBleDevice}
                                    selectedDeviceHasNoData={
                                        selectedDeviceHasNoData
                                    }
                                />
                            ) : (
                                <>
                                    <div className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
                                        <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-2xl bg-slate-950 sm:h-[390px] lg:h-[460px]">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.08),transparent_46%)]" />

                                            <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:36px_36px]" />

                                            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-slate-800/90 px-3 py-1 text-xs font-bold text-slate-200 sm:left-4 sm:top-4">
                                                <span
                                                    className={`h-2 w-2 rounded-full ${
                                                        isPlaying
                                                            ? "bg-green-500"
                                                            : "bg-slate-500"
                                                    }`}
                                                />
                                                {isPlaying
                                                    ? "PLAYBACK"
                                                    : "PAUSED"}
                                            </div>

                                            <div className="absolute right-3 top-3 rounded-full bg-slate-800/90 px-3 py-1 text-xs font-bold text-slate-200 sm:right-4 sm:top-4">
                                                Sample {currentSampleNumber} /{" "}
                                                {totalSamples}
                                            </div>

                                            <div className="absolute bottom-3 left-3 rounded-xl bg-slate-900/85 px-3 py-2 text-xs text-slate-300 sm:bottom-4 sm:left-4">
                                                <div>X → Roll</div>
                                                <div>Y → Pitch</div>
                                                <div>Z → Yaw</div>
                                            </div>

                                            <div className="absolute bottom-12 left-1/2 h-10 w-44 -translate-x-1/2 rounded-full bg-blue-500/5 blur-xl sm:w-60" />

                                            <div
                                                className="relative flex h-28 w-48 items-center justify-center rounded-3xl border-4 border-green-200 bg-gradient-to-br from-green-400 to-emerald-600 shadow-[0_18px_60px_rgba(34,197,94,0.25)] transition-transform ease-linear will-change-transform sm:h-36 sm:w-64"
                                                style={plateStyle}
                                            >
                                                <div className="absolute top-3 h-2 w-20 rounded-full bg-green-950/35 sm:top-4 sm:w-24" />

                                                <div className="text-center">
                                                    <p className="text-xl font-black text-green-950 sm:text-2xl">
                                                        BNO055
                                                    </p>
                                                    <p className="text-[10px] font-bold text-green-900 sm:text-xs">
                                                        session playback
                                                    </p>
                                                </div>

                                                <div className="absolute bottom-2 left-3 text-[10px] font-black text-green-950 sm:bottom-3 sm:left-4 sm:text-xs">
                                                    X →
                                                </div>

                                                <div className="absolute bottom-2 right-3 text-[10px] font-black text-green-950 sm:bottom-3 sm:right-4 sm:text-xs">
                                                    Z ↑
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:content-start">
                                            <ValueBox
                                                label="Sample"
                                                value={`${currentSampleNumber} / ${totalSamples}`}
                                            />

                                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                                                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    <CalendarClock className="h-4 w-4" />
                                                    Sample time
                                                </div>

                                                <p className="break-words font-mono text-sm font-black text-slate-950 dark:text-white">
                                                    {formatDateTime(
                                                        currentSample.created_at,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                            <div
                                                className="h-full rounded-full bg-blue-600 ease-linear will-change-[width]"
                                                style={{
                                                    width: `${progressPercent}%`,
                                                    transitionProperty: "width",
                                                    transitionDuration: `${progressTransitionMs}ms`,
                                                }}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                                                <Button
                                                    type="button"
                                                    onClick={
                                                        handleTogglePlayback
                                                    }
                                                    className="w-full sm:w-auto"
                                                >
                                                    {isPlaying ? (
                                                        <>
                                                            <Pause className="mr-2 h-4 w-4" />
                                                            Pausa
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="mr-2 h-4 w-4" />
                                                            Spela
                                                        </>
                                                    )}
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={
                                                        handleResetPlayback
                                                    }
                                                    className="w-full sm:w-auto"
                                                >
                                                    <RotateCcw className="mr-2 h-4 w-4" />
                                                    Starta om
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleStepBackward}
                                                    className="w-full sm:w-auto"
                                                >
                                                    -1 sample
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleStepForward}
                                                    className="w-full sm:w-auto"
                                                >
                                                    +1 sample
                                                </Button>
                                            </div>

                                            <select
                                                value={playbackSpeedMs}
                                                onChange={(e) =>
                                                    setPlaybackSpeedMs(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-44"
                                            >
                                                <option value={300}>
                                                    Långsam
                                                </option>
                                                <option value={180}>
                                                    Normal
                                                </option>
                                                <option value={90}>
                                                    Snabb
                                                </option>
                                                <option value={40}>
                                                    Väldigt snabb
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {selectedSession && (
                        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="text-lg">
                                    Samples i vald session
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                                <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <table className="w-full min-w-[640px] text-left text-sm">
                                        <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Sample
                                                </th>
                                                <th className="px-4 py-3">
                                                    QW
                                                </th>
                                                <th className="px-4 py-3">
                                                    QX
                                                </th>
                                                <th className="px-4 py-3">
                                                    QY
                                                </th>
                                                <th className="px-4 py-3">
                                                    QZ
                                                </th>
                                                <th className="px-4 py-3">
                                                    Time
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {selectedSession.samples.map(
                                                (row, index) => {
                                                    const active =
                                                        index === currentIndex;

                                                    return (
                                                        <tr
                                                            key={`${row.session_ID}-${row.__row_index}-${index}`}
                                                            onClick={() => {
                                                                setIsPlaying(
                                                                    false,
                                                                );
                                                                setCurrentIndex(
                                                                    index,
                                                                );
                                                            }}
                                                            className={`cursor-pointer border-t border-slate-200 font-mono text-xs dark:border-slate-800 ${
                                                                active
                                                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                                                    : "hover:bg-slate-50 dark:hover:bg-slate-950"
                                                            }`}
                                                        >
                                                            <td className="px-4 py-3 font-bold">
                                                                {index + 1}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {row.quat_w.toFixed(
                                                                    2,
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {row.quat_x.toFixed(
                                                                    2,
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {row.quat_y.toFixed(
                                                                    2,
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {row.quat_z.toFixed(
                                                                    2,
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {formatTime(
                                                                    row.created_at,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                },
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </section>
    );
}

function InfoStep({ number, title, text }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-black text-blue-600 dark:text-blue-400">
                {number}
            </div>

            <p className="font-bold text-slate-950 dark:text-white">{title}</p>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {text}
            </p>
        </div>
    );
}

function EmptyState({ icon: Icon, title, text, tone = "default" }) {
    const isWarning = tone === "warning";

    return (
        <div
            className={`rounded-2xl border border-dashed p-5 text-sm ${
                isWarning
                    ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300"
                    : "border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isWarning
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                    }`}
                >
                    <Icon className="h-5 w-5" />
                </div>

                <div>
                    <p
                        className={`font-black ${
                            isWarning
                                ? "text-amber-900 dark:text-amber-200"
                                : "text-slate-900 dark:text-white"
                        }`}
                    >
                        {title}
                    </p>

                    <p className="mt-1 leading-6">{text}</p>
                </div>
            </div>
        </div>
    );
}

function ErrorState({ text }) {
    return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
            <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{text}</p>
            </div>
        </div>
    );
}

function PlaybackEmptyState({ selectedBleDevice, selectedDeviceHasNoData }) {
    if (selectedDeviceHasNoData && selectedBleDevice) {
        return (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200 sm:p-8">
                <div className="mx-auto max-w-xl text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                        <AlertCircle className="h-7 w-7" />
                    </div>

                    <h3 className="text-lg font-black">
                        Ingen motion data för {selectedBleDevice.device_name}
                    </h3>

                    <p className="mt-2 text-sm leading-6">
                        Devicen är kopplad till användaren, men det finns inga
                        sparade motion sessions ännu. Starta en session i React
                        Native-appen, låt BNO055 skicka quaternion-data och
                        avsluta sessionen. Då visas den här för playback.
                    </p>

                    <div className="mt-4 rounded-2xl bg-white/70 p-4 text-left text-sm dark:bg-slate-950/40">
                        <p className="font-bold">Förväntat flöde:</p>
                        <ol className="mt-2 list-decimal space-y-1 pl-5">
                            <li>Välj BLE-device i React Native-appen.</li>
                            <li>Starta motion session.</li>
                            <li>
                                Skicka BNO055 quaternion-samples till backend.
                            </li>
                            <li>Avsluta sessionen och ladda om denna sida.</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <Activity className="h-7 w-7" />
            </div>

            <p className="font-black text-slate-900 dark:text-white">
                Välj en BLE-device och session
            </p>

            <p className="mx-auto mt-2 max-w-md leading-6">
                När en vald device har sparade sessions kan du spela upp
                rörelsen i 3D här.
            </p>
        </div>
    );
}

function ValueBox({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words font-mono text-lg font-black text-slate-950 dark:text-white">
                {value}
            </p>
        </div>
    );
}
