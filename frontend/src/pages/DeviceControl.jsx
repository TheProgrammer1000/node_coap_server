import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Cpu,
    Database,
    Loader2,
    PlayCircle,
    RefreshCcw,
    ShieldCheck,
    TerminalSquare,
    Wifi,
    Battery,
    BatteryLow,
    BatteryMedium,
    BatteryFull,
    Radio,
    HardDrive,
    History,
    Calendar,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

import Navbar from "../components/Navbar";
import { socket } from "@/lib/socket";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

function isObject(value) {
    return value !== null && typeof value === "object";
}

function getNestedValue(data, keys) {
    for (const key of keys) {
        if (data?.[key] !== undefined && data?.[key] !== null) {
            return data[key];
        }
    }
    return null;
}

function isDuplicateCommandError(error) {
    const data = error?.response?.data;
    const directError = data?.error;

    const code =
        data?.code ||
        data?.errno ||
        directError?.code ||
        directError?.errno ||
        null;

    const message =
        data?.message ||
        data?.sqlMessage ||
        directError?.message ||
        directError?.sqlMessage ||
        "";

    const text = String(message).toLowerCase();

    return (
        code === "ER_DUP_ENTRY" ||
        code === 1062 ||
        text.includes("duplicate") ||
        text.includes("duplicated") ||
        text.includes("unique")
    );
}

function getErrorMessage(error) {
    const data = error?.response?.data;

    if (isDuplicateCommandError(error)) {
        return "Det finns redan ett pågående command för denna device. Vänta tills det är klart innan du skickar ett nytt diagnostic-command.";
    }

    const possibleMessage = getNestedValue(data, [
        "message",
        "error",
        "sqlMessage",
        "details",
    ]);

    if (typeof possibleMessage === "string") {
        return possibleMessage;
    }

    if (isObject(possibleMessage)) {
        const nestedMessage = getNestedValue(possibleMessage, [
            "message",
            "sqlMessage",
            "code",
        ]);

        if (typeof nestedMessage === "string") {
            return nestedMessage;
        }

        return "Backend returnerade ett fel, men svaret var ett object.";
    }

    if (error?.message) {
        return error.message;
    }

    return "Kunde inte lägga diagnostic i firmware queue.";
}

function getErrorDetails(error) {
    const data = error?.response?.data;
    if (data) return data;
    return { message: error?.message ?? "Okänt fel" };
}

function getRsrpDetails(rsrp) {
    if (rsrp === undefined || rsrp === null || Number.isNaN(Number(rsrp))) {
        return {
            text: "Okänd",
            textColor: "text-slate-500",
        };
    }
    const value = Number(rsrp);

    if (value >= -85) {
        return {
            text: "Utmärkt",
            textColor: "text-emerald-600 dark:text-emerald-400",
        };
    } else if (value >= -95) {
        return {
            text: "Bra",
            textColor: "text-green-600 dark:text-green-400",
        };
    } else if (value >= -105) {
        return {
            text: "Okej",
            textColor: "text-amber-600 dark:text-amber-500",
        };
    } else if (value >= -115) {
        return {
            text: "Dålig",
            textColor: "text-orange-600 dark:text-orange-400",
        };
    } else {
        return {
            text: "Extremt dålig",
            textColor: "text-red-600 dark:text-red-400",
        };
    }
}

function getOperatorName(operator) {
    const opStr = String(operator).trim();
    if (opStr === "24001") return "Telia (SE)";
    if (opStr === "24002") return "Tele2 (SE)";
    if (opStr === "24007") return "Telenor (SE)";
    if (opStr === "24008") return "Tre (SE)";
    return opStr || "Okänd";
}

export default function DeviceControl() {
    const navigate = useNavigate();

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_ID || null;

    const [deviceId, setDeviceId] = useState("200001");
    const [isLoading, setIsLoading] = useState(false);

    const [isWaitingForDevice, setIsWaitingForDevice] = useState(false);
    const [liveDeviceData, setLiveDeviceData] = useState(null);

    const [notice, setNotice] = useState(null);
    const [responseData, setResponseData] = useState(null);
    const [technicalDetails, setTechnicalDetails] = useState(null);

    const [historyList, setHistoryList] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // State för att hålla koll på vilket historiskt ID som är öppet/expanderat
    const [expandedHistoryId, setExpandedHistoryId] = useState(null);

    const isValidId = useMemo(() => {
        const trimmed = deviceId.trim();
        return trimmed !== "" && /^\d+$/.test(trimmed);
    }, [deviceId]);

    const requestBody = useMemo(
        () => ({
            command: "diagnostic",
            device_ID: isValidId ? Number(deviceId.trim()) : deviceId,
        }),
        [isValidId, deviceId],
    );

    const parsedPayload = useMemo(() => {
        if (!liveDeviceData?.payload) return null;
        if (typeof liveDeviceData.payload === "string") {
            try {
                return JSON.parse(liveDeviceData.payload);
            } catch {
                return null;
            }
        }
        return liveDeviceData.payload;
    }, [liveDeviceData]);

    const fetchDiagnosticHistory = async () => {
        if (!userId || !isValidId) return;
        setIsLoadingHistory(true);
        try {
            const currentUIId = Number(deviceId.trim());
            const response = await axios.get(
                `${API_BASE_URL}/api/device/firmware/get/all/done`,
                {
                    params: {
                        user_ID: userId,
                        device_ID: currentUIId,
                    },
                },
            );
            if (response.data && response.data.success) {
                setHistoryList(response.data.data || []);
            }
        } catch (error) {
            console.error("Kunde inte hämta diagnostikhistorik:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // DIREKT SYNCHRONISERING NÄR MAN LANDAR PÅ SIDAN ELLER BYTER ID
    const loadLatestSessionData = async () => {
        if (!userId || !isValidId) return;
        try {
            const currentUIId = Number(deviceId.trim());
            const response = await axios.get(
                `${API_BASE_URL}/api/device/firmware/get/all`,
                {
                    params: {
                        user_ID: userId,
                        device_ID: currentUIId,
                    },
                },
            );

            if (
                response.data &&
                response.data.success &&
                response.data.data?.length > 0
            ) {
                // Sortera så vi garanterat får det absolut nyaste kommandot överst
                const sortedCommands = [...response.data.data].sort((a, b) => {
                    const idA = a.que_ID || 0;
                    const idB = b.que_ID || 0;
                    return idB - idA;
                });

                const latestCommand = sortedCommands[0];

                if (latestCommand && latestCommand.command === "diagnostic") {
                    const status = String(
                        latestCommand.command_status,
                    ).toLowerCase();
                    setResponseData({ restored: true });

                    if (status === "pending" || status === "processing") {
                        setIsWaitingForDevice(true);
                        setLiveDeviceData(null);
                        setNotice(null);
                    } else if (status === "success") {
                        setLiveDeviceData(latestCommand);
                        setIsWaitingForDevice(false);
                        setNotice({
                            type: "success",
                            title: "Senaste resultat laddat",
                            message:
                                latestCommand.msg ||
                                "Hämtade den senaste sparade diagnostic-datan för enheten.",
                        });
                    } else if (status === "failed") {
                        setLiveDeviceData(latestCommand);
                        setIsWaitingForDevice(false);
                        setNotice({
                            type: "error",
                            title: "Senaste kommandot misslyckades",
                            message:
                                latestCommand.msg ||
                                "Det senaste sparade kommandot i kön returnerade ett fel.",
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Kunde inte ladda senaste sessionsdatan:", error);
        }
    };

    useEffect(() => {
        loadLatestSessionData();
    }, [deviceId, userId]);

    useEffect(() => {
        if (showHistory) {
            fetchDiagnosticHistory();
        }
    }, [userId, deviceId, isValidId, showHistory]);

    useEffect(() => {
        if (!userId || !socket) return;

        if (socket.disconnected) {
            socket.connect();
        }

        const roomName = `user:${userId}`;
        socket.emit("join-room", roomName);

        function handleLiveFirmwareQueue(queData) {
            console.log("Mottog live-data via WebSocket:", queData);

            const currentUIId = isValidId ? Number(deviceId.trim()) : deviceId;
            const incomingId = Number(queData?.device_ID);

            if (incomingId === currentUIId) {
                setLiveDeviceData(queData);
                setIsWaitingForDevice(false);

                if (showHistory) {
                    fetchDiagnosticHistory();
                }

                if (queData.command_status === "success") {
                    setNotice({
                        type: "success",
                        title: "Modem svarade med framgång!",
                        message:
                            queData.msg ||
                            "Diagnostikdata har tagits emot och sparats framgångsrikt.",
                    });
                } else {
                    setNotice({
                        type: "error",
                        title: "Fel vid exekvering i hårdvara",
                        message:
                            queData.msg ||
                            "Modemet rapporterade ett fel under diagnostic.",
                    });
                }
            }
        }

        socket.on("device:firmware_que", handleLiveFirmwareQueue);

        return () => {
            socket.off("device:firmware_que", handleLiveFirmwareQueue);
        };
    }, [userId, deviceId, isValidId, showHistory]);

    function resetResult() {
        setNotice(null);
        setResponseData(null);
        setTechnicalDetails(null);
        setLiveDeviceData(null);
        setIsWaitingForDevice(false);
    }

    function toggleHistory() {
        setShowHistory((prev) => !prev);
    }

    function toggleExpandHistoryItem(queId) {
        setExpandedHistoryId((prev) => (prev === queId ? null : queId));
    }

    async function runDiagnostic() {
        resetResult();

        if (!isValidId) {
            setNotice({
                type: "error",
                title: "Fel device ID",
                message:
                    "Device ID måste vara ett giltigt nummer (endast siffror).",
            });
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/device/firmware/add/que`,
                requestBody,
            );

            setResponseData(response.data);
            setTechnicalDetails(null);
            setIsWaitingForDevice(true);
        } catch (error) {
            console.error("Diagnostic failed:", error);

            const duplicate = isDuplicateCommandError(error);
            const message = getErrorMessage(error);
            const details = getErrorDetails(error);

            setResponseData(null);
            setTechnicalDetails(details);
            setIsWaitingForDevice(false);

            setNotice({
                type: duplicate ? "warning" : "error",
                title: duplicate
                    ? "Diagnostic är redan igång"
                    : "Kunde inte skicka command",
                message,
            });
        } finally {
            setIsLoading(false);
        }
    }

    function getNoticeClass(type) {
        if (type === "success")
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
        if (type === "warning")
            return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300";
        return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    }

    function renderBatteryIcon(batteryLevel) {
        const level = Number(batteryLevel);
        if (level === 0)
            return (
                <Battery className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            );
        if (level <= 25)
            return <BatteryLow className="h-5 w-5 text-rose-500" />;
        if (level <= 75)
            return <BatteryMedium className="h-5 w-5 text-amber-500" />;
        return <BatteryFull className="h-5 w-5 text-emerald-500" />;
    }

    function parseHistoryPayload(payload) {
        if (!payload) return null;
        if (typeof payload === "string") {
            try {
                return JSON.parse(payload);
            } catch {
                return null;
            }
        }
        return payload;
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 dark:text-white">
            <Navbar />

            <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10 xl:ml-72">
                {/* HEADLINE-SEKTION */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-bold text-blue-700 dark:text-blue-300">
                            <Cpu className="h-4 w-4" />
                            Device Control
                        </div>

                        <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                            Firmware diagnostic
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-600 dark:text-slate-400">
                            Skicka ett diagnostic-command till cellular-devicen.
                            Commandet läggs i firmware queue och hämtas sedan av
                            devicen.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/dashboard")}
                        className="h-12 w-full sm:w-auto rounded-2xl border-slate-300 bg-white/70 px-6 font-bold hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Tillbaka
                    </Button>
                </div>

                {/* INFO KORT TOPP */}
                <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="border-slate-200 bg-white/90 shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                                <Database className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                    Endpoint
                                </p>
                                <p className="font-black">Firmware queue</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white/90 shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                                <Wifi className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                    Command
                                </p>
                                <p className="font-black">diagnostic</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white/90 shadow-lg dark:border-slate-800 dark:bg-slate-900/90 sm:col-span-2 lg:col-span-1">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                    Device ID
                                </p>
                                <p className="font-black">{deviceId}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* HUVUDPANELER */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
                    {/* VÄNSTER KORT: KÖR DIAGNOSTIC */}
                    <Card className="overflow-hidden border-slate-200 bg-white/90 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white dark:border-slate-800">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                                <TerminalSquare className="h-9 w-9" />
                            </div>
                            <div className="mt-2">
                                <CardTitle className="text-2xl sm:text-3xl">
                                    Kör diagnostic
                                </CardTitle>
                                <CardDescription className="text-sm sm:text-base text-blue-100">
                                    Skickar diagnostic-command till firmware
                                    queue.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6 p-6">
                            <div>
                                <label className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                    Device ID
                                </label>
                                <input
                                    value={deviceId}
                                    onChange={(event) => {
                                        setDeviceId(event.target.value);
                                        resetResult();
                                    }}
                                    className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 font-mono text-sm font-bold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                                    placeholder="200001"
                                />
                            </div>

                            <Button
                                type="button"
                                onClick={runDiagnostic}
                                disabled={isLoading || isWaitingForDevice}
                                className="h-14 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-base font-black text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Köar i databas...
                                    </>
                                ) : isWaitingForDevice ? (
                                    <>Väntar på modemsvar...</>
                                ) : (
                                    <>
                                        <PlayCircle className="mr-2 h-5 w-5" />
                                        Kör diagnostic
                                    </>
                                )}
                            </Button>

                            {notice && (
                                <div
                                    className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${getNoticeClass(notice.type)}`}
                                >
                                    {notice.type === "success" ? (
                                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                                    ) : notice.type === "warning" ? (
                                        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
                                    ) : (
                                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-black">
                                            {notice.title}
                                        </p>
                                        <p className="mt-1 text-sm font-medium">
                                            {String(notice.message)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* HÖGER KORT: REALTIDSSVAR */}
                    <Card className="border-slate-200 bg-white/90 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                                Aktivt Resultat
                            </CardTitle>
                            <CardDescription>
                                Här visas bekräftelse från API samt realtidssvar
                                från modemet via WebSockets.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {!responseData &&
                            !technicalDetails &&
                            !isWaitingForDevice ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
                                    <Activity className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                                    <p className="font-bold text-slate-600 dark:text-slate-400">
                                        Inget aktivt diagnostic-kommando igång
                                        just nu.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {isWaitingForDevice && (
                                        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-700 dark:text-orange-300 flex items-center gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                                                    Status
                                                </p>
                                                <p className="text-lg font-black">
                                                    Kommandot aktivt i kö
                                                </p>
                                                <p className="text-xs opacity-90 mt-0.5">
                                                    Väntar på att
                                                    cellular-enheten ska läsa
                                                    via CoAP och skicka tillbaka
                                                    svar...
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {liveDeviceData && parsedPayload && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                                                            <Radio className="h-4 w-4" />
                                                            <span className="text-xs font-bold uppercase tracking-wider">
                                                                Signalstyrka
                                                            </span>
                                                        </div>
                                                        <p
                                                            className={`text-2xl font-black tracking-tight ${getRsrpDetails(parsedPayload.rsrp).textColor}`}
                                                        >
                                                            {
                                                                getRsrpDetails(
                                                                    parsedPayload.rsrp,
                                                                ).text
                                                            }
                                                        </p>
                                                    </div>
                                                    <p className="text-sm font-mono font-bold mt-3 text-slate-500 dark:text-slate-400">
                                                        Mätvärde:{" "}
                                                        {parsedPayload.rsrp} dBm
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                                        {renderBatteryIcon(
                                                            parsedPayload.battery,
                                                        )}
                                                        <span className="text-xs font-bold uppercase tracking-wider">
                                                            Batteristatus
                                                        </span>
                                                    </div>
                                                    <p className="text-2xl font-black">
                                                        {Number(
                                                            parsedPayload.battery,
                                                        ) === 0
                                                            ? "USB-Drift"
                                                            : `${parsedPayload.battery}%`}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-2 font-medium">
                                                        {Number(
                                                            parsedPayload.battery,
                                                        ) === 0
                                                            ? "Utvecklingskort spänningsmatas via USB"
                                                            : "Körs på batteribackup"}
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                                        Mobilnät
                                                    </span>
                                                    <p className="text-lg font-black truncate">
                                                        {getOperatorName(
                                                            parsedPayload.operator,
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-mono mt-1">
                                                        MCC/MNC:{" "}
                                                        {parsedPayload.operator ||
                                                            "N/A"}
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                                        Aktiv Mast ID
                                                    </span>
                                                    <p className="text-lg font-black font-mono truncate">
                                                        {parsedPayload.cell_id ||
                                                            "Okänd"}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1 font-medium">
                                                        LTE-M Basstation
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70 flex gap-3 items-start">
                                                <HardDrive className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                        Enhetsmeddelande
                                                    </p>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                                                        {liveDeviceData.msg ||
                                                            "Ingen extra text bifogad."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {liveDeviceData &&
                                        liveDeviceData.command_status ===
                                            "failed" && (
                                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 p-4">
                                                <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                                                    Hårdvarustatus
                                                </p>
                                                <p className="text-xl font-black">
                                                    Misslyckades
                                                </p>
                                                <p className="text-sm mt-1">
                                                    {liveDeviceData.msg ||
                                                        "Okänt fel rapporterades från hårdvaran."}
                                                </p>
                                            </div>
                                        )}
                                </>
                            )}

                            {/* KNAPPAR UNDER SVARET */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetResult}
                                    className="h-12 rounded-2xl font-bold border-slate-200 dark:border-slate-800 w-full"
                                >
                                    <RefreshCcw className="mr-2 h-5 w-5" />
                                    Rensa aktivt resultat
                                </Button>

                                <Button
                                    type="button"
                                    variant={
                                        showHistory ? "default" : "secondary"
                                    }
                                    onClick={toggleHistory}
                                    className={`h-12 rounded-2xl font-bold transition-all w-full ${
                                        showHistory
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/15"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
                                    }`}
                                >
                                    <History className="mr-2 h-5 w-5" />
                                    {showHistory
                                        ? "Dölj historik"
                                        : "Visa historik"}
                                    {showHistory ? (
                                        <ChevronUp className="ml-1 h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="ml-1 h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* BRED HISTORIK-PANEL */}
                {showHistory && (
                    <div className="mt-8 animate-in fade-in slide-in-from-top-5 duration-300">
                        <Card className="border-slate-200 bg-white/90 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 w-full">
                            <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-2xl">
                                        <History className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                        Diagnostikhistorik
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        Klicka på en rad för att granska sparad
                                        täckning och enhetsdetaljer.
                                    </CardDescription>
                                </div>
                                <span className="self-start sm:self-center rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    ID {deviceId}
                                </span>
                            </CardHeader>

                            <CardContent className="p-0 max-h-[700px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                                {isLoadingHistory ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
                                        <p className="text-sm font-bold">
                                            Hämtar historik...
                                        </p>
                                    </div>
                                ) : historyList.length === 0 ? (
                                    <div className="p-12 text-center text-slate-500">
                                        <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                                        <p className="text-sm font-bold">
                                            Ingen historik hittades för denna
                                            enhet.
                                        </p>
                                    </div>
                                ) : (
                                    historyList.map((item) => {
                                        const historyPayload =
                                            parseHistoryPayload(item.payload);
                                        const isSuccess =
                                            item.command_status === "success";
                                        const isExpanded =
                                            expandedHistoryId === item.que_ID;

                                        return (
                                            <div
                                                key={item.que_ID}
                                                className="flex flex-col"
                                            >
                                                {/* KLICKBAR RAD */}
                                                <div
                                                    onClick={() =>
                                                        toggleExpandHistoryItem(
                                                            item.que_ID,
                                                        )
                                                    }
                                                    className="p-5 sm:p-6 hover:bg-slate-100/70 dark:hover:bg-slate-950/50 transition-colors flex items-center justify-between gap-4 cursor-pointer select-none"
                                                >
                                                    <div className="space-y-1.5 flex-1 min-w-0">
                                                        <div className="flex items-center gap-2.5 flex-wrap">
                                                            <span
                                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${
                                                                    isSuccess
                                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                                                }`}
                                                            >
                                                                {isSuccess
                                                                    ? "SUCCESS"
                                                                    : "FAILED"}
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-mono">
                                                                Kö-ID: #
                                                                {item.que_ID}
                                                            </span>
                                                            <span className="text-xs font-medium text-slate-400">
                                                                •
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                                {item.data_transport
                                                                    ? String(
                                                                          item.data_transport,
                                                                      ).toUpperCase()
                                                                    : "CELLULAR"}
                                                            </span>
                                                        </div>

                                                        <p className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                                                            {item.msg ||
                                                                (isSuccess
                                                                    ? "Diagnostik genomförd"
                                                                    : "Misslyckades")}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-4 shrink-0">
                                                        {isSuccess &&
                                                            historyPayload &&
                                                            !isExpanded && (
                                                                <div className="hidden md:flex items-center gap-2">
                                                                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                                                        <Radio className="h-3.5 w-3.5 text-blue-500" />
                                                                        <span>
                                                                            {
                                                                                getRsrpDetails(
                                                                                    historyPayload.rsrp,
                                                                                )
                                                                                    .text
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                                                        {renderBatteryIcon(
                                                                            historyPayload.battery,
                                                                        )}
                                                                        <span>
                                                                            {Number(
                                                                                historyPayload.battery,
                                                                            ) ===
                                                                            0
                                                                                ? "USB"
                                                                                : `${historyPayload.battery}%`}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        {isExpanded ? (
                                                            <ChevronUp className="h-5 w-5 text-slate-400" />
                                                        ) : (
                                                            <ChevronDown className="h-5 w-5 text-slate-400" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* DETALJERAD EXPANDERAD VY */}
                                                {isExpanded && (
                                                    <div className="px-5 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-950/20 border-t border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        {isSuccess &&
                                                        historyPayload ? (
                                                            <div className="space-y-4 mt-2">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                                    {/* SIGNALSTYRKA */}
                                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 flex flex-col justify-between shadow-sm">
                                                                        <div>
                                                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                                                                <Radio className="h-4 w-4 text-blue-500" />
                                                                                <span className="text-xs font-bold uppercase tracking-wider">
                                                                                    Signalstyrka
                                                                                </span>
                                                                            </div>
                                                                            <p
                                                                                className={`text-xl font-black ${getRsrpDetails(historyPayload.rsrp).textColor}`}
                                                                            >
                                                                                {
                                                                                    getRsrpDetails(
                                                                                        historyPayload.rsrp,
                                                                                    )
                                                                                        .text
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                        <p className="text-xs font-mono font-bold mt-2 text-slate-400">
                                                                            Värde:{" "}
                                                                            {
                                                                                historyPayload.rsrp
                                                                            }{" "}
                                                                            dBm
                                                                        </p>
                                                                    </div>

                                                                    {/* BATTERI */}
                                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-sm">
                                                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                                                            {renderBatteryIcon(
                                                                                historyPayload.battery,
                                                                            )}
                                                                            <span className="text-xs font-bold uppercase tracking-wider">
                                                                                Batteristatus
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xl font-black">
                                                                            {Number(
                                                                                historyPayload.battery,
                                                                            ) ===
                                                                            0
                                                                                ? "USB-Drift"
                                                                                : `${historyPayload.battery}%`}
                                                                        </p>
                                                                        <p className="text-[11px] text-slate-400 mt-1">
                                                                            {Number(
                                                                                historyPayload.battery,
                                                                            ) ===
                                                                            0
                                                                                ? "Spänningsmatas externt"
                                                                                : "Körs på batteri"}
                                                                        </p>
                                                                    </div>

                                                                    {/* MOBILNÄT */}
                                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-sm">
                                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                                                            Mobilnät
                                                                        </span>
                                                                        <p className="text-lg font-black truncate">
                                                                            {getOperatorName(
                                                                                historyPayload.operator,
                                                                            )}
                                                                        </p>
                                                                        <p className="text-[11px] text-slate-400 font-mono">
                                                                            MCC/MNC:{" "}
                                                                            {historyPayload.operator ||
                                                                                "N/A"}
                                                                        </p>
                                                                    </div>

                                                                    {/* MAST ID */}
                                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-sm">
                                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                                                            Aktiv
                                                                            Mast
                                                                            ID
                                                                        </span>
                                                                        <p className="text-lg font-black font-mono truncate">
                                                                            {historyPayload.cell_id ||
                                                                                "Okänd"}
                                                                        </p>
                                                                        <p className="text-[11px] text-slate-400">
                                                                            LTE-M
                                                                            Basstation
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* LOGG / TEXT FRÅN ENHET */}
                                                                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 flex gap-2 items-start text-xs">
                                                                    <HardDrive className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <span className="font-bold text-slate-400">
                                                                            device
                                                                            svar:
                                                                        </span>
                                                                        <span className="ml-1.5 font-medium text-slate-600 dark:text-slate-300">
                                                                            {item.msg ||
                                                                                "Ingen extra text bifogad."}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-2 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-600 dark:text-red-400">
                                                                Detta kommando
                                                                sparades som
                                                                misslyckat
                                                                (FAILED) eller
                                                                saknar giltig
                                                                JSON-payload i
                                                                databasen.
                                                                Felmeddelande:{" "}
                                                                <strong>
                                                                    {item.msg ||
                                                                        "Okänt fel"}
                                                                </strong>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </section>
        </main>
    );
}
