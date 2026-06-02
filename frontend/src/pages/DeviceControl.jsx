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
    Info,
    Loader2,
    PlayCircle,
    RefreshCcw,
    ShieldCheck,
    TerminalSquare,
    Wifi,
} from "lucide-react";

import Navbar from "../components/Navbar";

// Importera socket-instansen på samma sätt som i din Dashboard
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

function safeStringify(value) {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
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

        return "Backend returnerade ett fel, men svaret var ett object. Se teknisk information nedan.";
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

export default function DeviceControl() {
    const navigate = useNavigate();

    // Hämta user_ID från localStorage precis som på din Dashboard-sida
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_ID || null;

    const [deviceId, setDeviceId] = useState("200001");
    const [isLoading, setIsLoading] = useState(false);

    // NYTT: State för realtidslyssning och vänteläge på hårdvaran
    const [isWaitingForDevice, setIsWaitingForDevice] = useState(false);
    const [liveDeviceData, setLiveDeviceData] = useState(null);

    const [notice, setNotice] = useState(null);
    const [responseData, setResponseData] = useState(null);
    const [technicalDetails, setTechnicalDetails] = useState(null);

    // Validera att strängen bara innehåller siffror innan vi skickar
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

    // --- NYTT: Hantera anslutning till rum och lyssna på WebSocket ---
    useEffect(() => {
        if (!userId || !socket) return;

        // Se till att socket är ansluten och gå med i användarrummet (om backend kräver det via event)
        if (socket.disconnected) {
            socket.connect();
        }

        // Rummet på backend är byggt som `user:${userId}`
        const roomName = `user:${userId}`;
        socket.emit("join-room", roomName); // Justera eventnamn om din backend lyssnar på något annat för att joina rum

        function handleLiveFirmwareQueue(queData) {
            console.log(
                "Mottog live-data via WebSocket (device:firmware_que):",
                queData,
            );

            // Säkerställ att inkommande data är för den enhet vi kollar på just nu
            const currentUIId = isValidId ? Number(deviceId.trim()) : deviceId;
            const incomingId = Number(queData?.device_ID);

            if (incomingId === currentUIId) {
                setLiveDeviceData(queData);
                setIsWaitingForDevice(false); // Avbryt laddningssymbolen när hårdvaran svarat!

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

        // Starta lyssnaren
        socket.on("device:firmware_que", handleLiveFirmwareQueue);

        // Städa upp när komponenten avmonteras eller om enhets-ID ändras
        return () => {
            socket.off("device:firmware_que", handleLiveFirmwareQueue);
        };
    }, [userId, deviceId, isValidId]);

    function resetResult() {
        setNotice(null);
        setResponseData(null);
        setTechnicalDetails(null);
        setLiveDeviceData(null);
        setIsWaitingForDevice(false);
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

            console.log("Diagnostic queued successfully:", response.data);

            setResponseData(response.data);
            setTechnicalDetails(null);

            // Sätt igång vänteläget för hårdvaran (CoAP -> WebSocket-flödet)
            setIsWaitingForDevice(true);

            setNotice({
                type: "warning",
                title: "Kommandot köat",
                message:
                    "Väntar på att cellular-enheten ska hämta kommandot via CoAP och skicka svar...",
            });
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

    function getNoticeIcon(type) {
        if (type === "success")
            return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />;
        if (type === "warning")
            return <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />;
        return <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />;
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 dark:text-white">
            <Navbar />

            <section className="mx-auto max-w-6xl px-6 py-10 xl:ml-72">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-700 dark:text-blue-300">
                            <Cpu className="h-4 w-4" />
                            Device Control
                        </div>

                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                            Firmware diagnostic
                        </h1>

                        <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
                            Skicka ett diagnostic-command till cellular-devicen.
                            Commandet läggs i firmware queue och hämtas sedan av
                            devicen.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/dashboard")}
                        className="h-12 rounded-2xl border-slate-300 bg-white/70 px-6 font-bold hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Tillbaka
                    </Button>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-3">
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

                    <Card className="border-slate-200 bg-white/90 shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
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

                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <Card className="overflow-hidden border-slate-200 bg-white/90 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white dark:border-slate-800">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                                <TerminalSquare className="h-9 w-9" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl">
                                    Kör diagnostic
                                </CardTitle>
                                <CardDescription className="text-base text-blue-100">
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

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                                <p className="mb-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                                    Body som skickas
                                </p>
                                <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-white">
                                    {safeStringify(requestBody)}
                                </pre>
                            </div>

                            <Button
                                type="button"
                                onClick={runDiagnostic}
                                disabled={isLoading || isWaitingForDevice}
                                className="h-16 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-lg font-black text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                        Köar i databas...
                                    </>
                                ) : isWaitingForDevice ? (
                                    <>
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                        Väntar på modemsvar via socket...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="mr-2 h-6 w-6" />
                                        Kör diagnostic
                                    </>
                                )}
                            </Button>

                            {notice && (
                                <div
                                    className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${getNoticeClass(
                                        notice.type,
                                    )}`}
                                >
                                    {getNoticeIcon(notice.type)}
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

                    <Card className="border-slate-200 bg-white/90 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                                Resultat
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
                                        Inget aktivt diagnostic-kommando.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Laddningsindikator för hårdvaran */}
                                    {isWaitingForDevice && (
                                        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-700 dark:text-orange-300 flex items-center gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                                                    Status
                                                </p>
                                                <p className="text-xl font-black">
                                                    Väntar på hårdvaran...
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Slutgiltig status från hårdvaran via WebSocket */}
                                    {liveDeviceData && (
                                        <div
                                            className={`rounded-2xl border p-4 ${
                                                liveDeviceData.command_status ===
                                                "success"
                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                                    : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                                            }`}
                                        >
                                            <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                                                Hårdvarustatus
                                            </p>
                                            <p className="text-xl font-black">
                                                {liveDeviceData.command_status ===
                                                "success"
                                                    ? "Slutförd"
                                                    : "Misslyckades"}
                                            </p>
                                        </div>
                                    )}

                                    {/* JSON-fönster för att visa data */}
                                    <div className="rounded-2xl bg-slate-950 p-4 text-white">
                                        <p className="mb-2 text-sm font-bold text-slate-400">
                                            {liveDeviceData
                                                ? "Mottagen hårdvarudata (Från WebSocket)"
                                                : "Kö-bekräftelse (Från API)"}
                                        </p>
                                        <pre className="max-h-96 overflow-auto text-sm font-mono">
                                            {safeStringify(
                                                liveDeviceData ??
                                                    responseData ??
                                                    technicalDetails,
                                            )}
                                        </pre>
                                    </div>
                                </>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetResult}
                                className="h-12 w-full rounded-2xl font-bold"
                            >
                                <RefreshCcw className="mr-2 h-5 w-5" />
                                Rensa resultat
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </main>
    );
}
