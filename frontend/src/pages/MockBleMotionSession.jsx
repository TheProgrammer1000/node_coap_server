import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
    Activity,
    AlertCircle,
    Bluetooth,
    CheckCircle2,
    Play,
    RefreshCw,
    Send,
    Shuffle,
    Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const SESSION_ADD_URL = "/api/device/ble/motion/session/add";
const MOTION_DATA_ADD_URL = "/api/device/ble/motion/data/add";
const SESSION_UPDATE_URL = "/api/device/ble/motion/session/update";

const DEG_TO_RAD = Math.PI / 180;

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);
    } catch (error) {
        console.warn("Could not parse stored user:", error);
        return null;
    }
}

function normalizeBleDevicesResponse(responseData) {
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
            user_ID: device.user_ID,
            device_name:
                device.device_name ||
                device.name ||
                `BLE device ${device.device_ID}`,
            data_transport: String(
                device.data_transport || "ble",
            ).toLowerCase(),
        }))
        .filter((device) => device.data_transport === "ble");
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function roundQuat(value) {
    return Number(value.toFixed(2));
}

function normalizeQuaternion(quat) {
    const length = Math.sqrt(
        quat.quat_x * quat.quat_x +
            quat.quat_y * quat.quat_y +
            quat.quat_z * quat.quat_z +
            quat.quat_w * quat.quat_w,
    );

    if (!Number.isFinite(length) || length === 0) {
        return {
            quat_x: 0,
            quat_y: 0,
            quat_z: 0,
            quat_w: 1,
        };
    }

    return {
        quat_x: quat.quat_x / length,
        quat_y: quat.quat_y / length,
        quat_z: quat.quat_z / length,
        quat_w: quat.quat_w / length,
    };
}

function eulerToQuaternion(rollRad, pitchRad, yawRad) {
    const cy = Math.cos(yawRad * 0.5);
    const sy = Math.sin(yawRad * 0.5);
    const cp = Math.cos(pitchRad * 0.5);
    const sp = Math.sin(pitchRad * 0.5);
    const cr = Math.cos(rollRad * 0.5);
    const sr = Math.sin(rollRad * 0.5);

    const quat_w = cr * cp * cy + sr * sp * sy;
    const quat_x = sr * cp * cy - cr * sp * sy;
    const quat_y = cr * sp * cy + sr * cp * sy;
    const quat_z = cr * cp * sy - sr * sp * cy;

    return normalizeQuaternion({
        quat_x,
        quat_y,
        quat_z,
        quat_w,
    });
}

function createMotionProfile(type = "realistic") {
    const baseProfile = {
        type,
        seed: Math.random() * 1000,
        rollOffset: randomBetween(-8, 8),
        pitchOffset: randomBetween(-8, 8),
        yawOffset: randomBetween(-20, 20),
        rollPhase: randomBetween(0, Math.PI * 2),
        pitchPhase: randomBetween(0, Math.PI * 2),
        yawPhase: randomBetween(0, Math.PI * 2),
        driftDirection: randomBetween(-1, 1) >= 0 ? 1 : -1,
        noiseAmount: randomBetween(0.2, 1.2),
    };

    if (type === "handheld") {
        return {
            ...baseProfile,
            rollAmplitude: randomBetween(10, 22),
            pitchAmplitude: randomBetween(6, 16),
            yawAmplitude: randomBetween(8, 20),
            rollSpeed: randomBetween(0.09, 0.16),
            pitchSpeed: randomBetween(0.06, 0.13),
            yawSpeed: randomBetween(0.035, 0.08),
            drift: randomBetween(0.03, 0.09),
            microShake: randomBetween(0.5, 1.5),
        };
    }

    if (type === "slow_rotation") {
        return {
            ...baseProfile,
            rollAmplitude: randomBetween(6, 14),
            pitchAmplitude: randomBetween(4, 10),
            yawAmplitude: randomBetween(20, 45),
            rollSpeed: randomBetween(0.025, 0.06),
            pitchSpeed: randomBetween(0.02, 0.05),
            yawSpeed: randomBetween(0.08, 0.15),
            drift: randomBetween(0.08, 0.18),
            microShake: randomBetween(0.1, 0.5),
        };
    }

    if (type === "shake") {
        return {
            ...baseProfile,
            rollAmplitude: randomBetween(18, 34),
            pitchAmplitude: randomBetween(14, 28),
            yawAmplitude: randomBetween(12, 30),
            rollSpeed: randomBetween(0.18, 0.32),
            pitchSpeed: randomBetween(0.15, 0.28),
            yawSpeed: randomBetween(0.1, 0.22),
            drift: randomBetween(0.02, 0.06),
            microShake: randomBetween(2.0, 4.2),
        };
    }

    return {
        ...baseProfile,
        rollAmplitude: randomBetween(8, 24),
        pitchAmplitude: randomBetween(6, 18),
        yawAmplitude: randomBetween(10, 35),
        rollSpeed: randomBetween(0.055, 0.14),
        pitchSpeed: randomBetween(0.045, 0.11),
        yawSpeed: randomBetween(0.035, 0.1),
        drift: randomBetween(0.04, 0.12),
        microShake: randomBetween(0.4, 2.0),
    };
}

function createRealisticMockQuaternion(packetNumber, profile) {
    const t = packetNumber;
    const slowT = packetNumber * 0.025;

    const drift =
        profile.driftDirection * profile.drift * packetNumber +
        Math.sin(slowT + profile.seed) * 3;

    const naturalPause =
        Math.sin(packetNumber * 0.015 + profile.seed) > 0.82 ? 0.35 : 1;

    const microShakeRoll =
        Math.sin(packetNumber * 0.73 + profile.rollPhase) *
        profile.microShake *
        naturalPause;

    const microShakePitch =
        Math.cos(packetNumber * 0.67 + profile.pitchPhase) *
        profile.microShake *
        0.8 *
        naturalPause;

    const microShakeYaw =
        Math.sin(packetNumber * 0.49 + profile.yawPhase) *
        profile.microShake *
        0.55 *
        naturalPause;

    const randomNoise =
        Math.sin(packetNumber * 1.37 + profile.seed) * profile.noiseAmount;

    let rollDeg =
        profile.rollOffset +
        Math.sin(t * profile.rollSpeed + profile.rollPhase) *
            profile.rollAmplitude *
            naturalPause +
        Math.sin(t * profile.rollSpeed * 0.37 + profile.seed) *
            profile.rollAmplitude *
            0.25 +
        microShakeRoll +
        randomNoise * 0.35;

    let pitchDeg =
        profile.pitchOffset +
        Math.cos(t * profile.pitchSpeed + profile.pitchPhase) *
            profile.pitchAmplitude *
            naturalPause +
        Math.sin(t * profile.pitchSpeed * 0.48 + profile.seed) *
            profile.pitchAmplitude *
            0.2 +
        microShakePitch +
        randomNoise * 0.25;

    let yawDeg =
        profile.yawOffset +
        drift +
        Math.sin(t * profile.yawSpeed + profile.yawPhase) *
            profile.yawAmplitude *
            naturalPause +
        microShakeYaw +
        randomNoise * 0.2;

    if (profile.type === "shake") {
        rollDeg += Math.sin(t * 0.91 + profile.seed) * 8;
        pitchDeg += Math.cos(t * 0.83 + profile.seed) * 7;
        yawDeg += Math.sin(t * 0.59 + profile.seed) * 6;
    }

    rollDeg = clamp(rollDeg, -65, 65);
    pitchDeg = clamp(pitchDeg, -55, 55);
    yawDeg = clamp(yawDeg, -180, 180);

    const quaternion = eulerToQuaternion(
        rollDeg * DEG_TO_RAD,
        pitchDeg * DEG_TO_RAD,
        yawDeg * DEG_TO_RAD,
    );

    return {
        quat_x: roundQuat(quaternion.quat_x),
        quat_y: roundQuat(quaternion.quat_y),
        quat_z: roundQuat(quaternion.quat_z),
        quat_w: roundQuat(quaternion.quat_w),
        debug_roll: Number(rollDeg.toFixed(1)),
        debug_pitch: Number(pitchDeg.toFixed(1)),
        debug_yaw: Number(yawDeg.toFixed(1)),
    };
}

export default function MockBleMotionSession() {
    const user = getStoredUser();
    const userId = user?.user_ID || null;

    const [bleDevices, setBleDevices] = useState([]);
    const [devicesLoading, setDevicesLoading] = useState(false);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");

    const [firmwareVersion, setFirmwareVersion] = useState("nrf52-bno055-test");
    const [sendIntervalMs, setSendIntervalMs] = useState(500);
    const [motionType, setMotionType] = useState("realistic");

    const [sessionActive, setSessionActive] = useState(false);
    const [packetCount, setPacketCount] = useState(0);
    const [lastPacket, setLastPacket] = useState(null);
    const [motionProfileLabel, setMotionProfileLabel] =
        useState("Realistisk mix");

    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const intervalRef = useRef(null);
    const packetRef = useRef(0);
    const sessionActiveRef = useRef(false);
    const motionProfileRef = useRef(createMotionProfile("realistic"));

    const selectedDevice = useMemo(() => {
        return bleDevices.find(
            (device) => String(device.device_ID) === String(selectedDeviceId),
        );
    }, [bleDevices, selectedDeviceId]);

    async function fetchBleDevices() {
        if (!userId) {
            setBleDevices([]);
            setSelectedDeviceId("");
            setErrorMessage("Ingen user_ID hittades. Logga in igen.");
            return;
        }

        try {
            setDevicesLoading(true);
            setErrorMessage("");

            const response = await axios.get(
                `/api/device/ble/get/all/${userId}`,
            );
            const normalizedDevices = normalizeBleDevicesResponse(
                response.data,
            );

            setBleDevices(normalizedDevices);

            if (normalizedDevices.length === 0) {
                setSelectedDeviceId("");
                return;
            }

            setSelectedDeviceId((currentDeviceId) => {
                const currentStillExists = normalizedDevices.some(
                    (device) =>
                        String(device.device_ID) === String(currentDeviceId),
                );

                if (currentStillExists) {
                    return currentDeviceId;
                }

                return String(normalizedDevices[0].device_ID);
            });
        } catch (error) {
            console.error("Failed to fetch BLE devices:", error);

            setBleDevices([]);
            setSelectedDeviceId("");
            setErrorMessage(
                error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    "Kunde inte hämta BLE-devices.",
            );
        } finally {
            setDevicesLoading(false);
        }
    }

    function clearMotionInterval() {
        if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }

    function getNumericDeviceId() {
        const numericDeviceId = Number(selectedDeviceId);

        if (!Number.isFinite(numericDeviceId) || numericDeviceId <= 0) {
            return null;
        }

        return numericDeviceId;
    }

    function getMotionTypeLabel(type) {
        if (type === "handheld") return "Handheld tilt";
        if (type === "slow_rotation") return "Slow rotation";
        if (type === "shake") return "Shake test";
        return "Realistisk mix";
    }

    function generateNewMotionProfile(type = motionType) {
        const profile = createMotionProfile(type);

        motionProfileRef.current = profile;
        setMotionProfileLabel(getMotionTypeLabel(type));
        setStatusMessage("Ny realistisk mock-rörelse skapad.");
        setErrorMessage("");
    }

    async function addSession(numericDeviceId) {
        return axios.post(SESSION_ADD_URL, {
            device_ID: numericDeviceId,
        });
    }

    async function addMotionData(numericDeviceId) {
        packetRef.current += 1;

        const quaternion = createRealisticMockQuaternion(
            packetRef.current,
            motionProfileRef.current,
        );

        const payload = {
            device_ID: numericDeviceId,
            quat_x: quaternion.quat_x,
            quat_y: quaternion.quat_y,
            quat_z: quaternion.quat_z,
            quat_w: quaternion.quat_w,
            data_packet: packetRef.current,
            firmware_version: firmwareVersion,
        };

        await axios.post(MOTION_DATA_ADD_URL, payload);

        setPacketCount(packetRef.current);
        setLastPacket({
            ...payload,
            device_name: selectedDevice?.device_name || "BLE device",
            mock_debug: {
                roll_deg: quaternion.debug_roll,
                pitch_deg: quaternion.debug_pitch,
                yaw_deg: quaternion.debug_yaw,
                motion_type: motionProfileRef.current.type,
            },
        });

        setStatusMessage(`Packet ${packetRef.current} skickat.`);
        setErrorMessage("");

        return payload;
    }

    async function updateSession(numericDeviceId) {
        return axios.patch(SESSION_UPDATE_URL, {
            device_ID: numericDeviceId,
        });
    }

    async function sendMockMotionPacket() {
        const numericDeviceId = getNumericDeviceId();

        if (!numericDeviceId) {
            setErrorMessage("Välj en BLE-device först.");
            return;
        }

        if (!sessionActiveRef.current) {
            setErrorMessage("Starta en session innan du skickar motion-data.");
            return;
        }

        try {
            await addMotionData(numericDeviceId);
        } catch (error) {
            console.error("Failed to send mock motion packet:", error);

            setErrorMessage(
                error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    "Kunde inte skicka motion-data.",
            );
        }
    }

    async function handleStartSession() {
        setErrorMessage("");
        setStatusMessage("");

        const numericDeviceId = getNumericDeviceId();

        if (!numericDeviceId) {
            setErrorMessage("Välj en BLE-device först.");
            return;
        }

        if (sessionActiveRef.current) {
            setErrorMessage("Sessionen är redan startad.");
            return;
        }

        try {
            setLoading(true);

            await addSession(numericDeviceId);

            packetRef.current = 0;
            setPacketCount(0);
            setLastPacket(null);

            generateNewMotionProfile(motionType);

            sessionActiveRef.current = true;
            setSessionActive(true);

            setStatusMessage(
                `Session startad för ${selectedDevice?.device_name || "vald BLE-device"}. Skickar realistisk mock-data...`,
            );
            setErrorMessage("");

            await addMotionData(numericDeviceId);

            clearMotionInterval();

            intervalRef.current = window.setInterval(
                () => {
                    if (!sessionActiveRef.current) return;

                    addMotionData(numericDeviceId).catch((error) => {
                        console.error(
                            "Failed to send interval motion packet:",
                            error,
                        );

                        setErrorMessage(
                            error?.response?.data?.error ||
                                error?.response?.data?.message ||
                                "Kunde inte skicka motion-data.",
                        );
                    });
                },
                Number(sendIntervalMs) || 500,
            );
        } catch (error) {
            console.error("Failed to start motion session:", error);

            clearMotionInterval();
            sessionActiveRef.current = false;
            setSessionActive(false);

            setErrorMessage(
                error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    `Kunde inte starta session. Kontrollera endpoint: ${SESSION_ADD_URL}`,
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleStopSession() {
        setErrorMessage("");
        setStatusMessage("");

        const numericDeviceId = getNumericDeviceId();

        if (!numericDeviceId) {
            setErrorMessage("Välj en BLE-device först.");
            return;
        }

        if (!sessionActiveRef.current) {
            setErrorMessage("Ingen aktiv session att stoppa.");
            return;
        }

        try {
            setLoading(true);

            clearMotionInterval();

            sessionActiveRef.current = false;
            setSessionActive(false);

            await updateSession(numericDeviceId);

            setStatusMessage(
                `Session stoppad för ${selectedDevice?.device_name || "vald BLE-device"}. Totalt skickade packets: ${packetRef.current}`,
            );
            setErrorMessage("");
        } catch (error) {
            console.error("Failed to stop motion session:", error);

            setErrorMessage(
                error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    `Kunde inte stoppa session. Kontrollera endpoint: ${SESSION_UPDATE_URL}`,
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleSendSinglePacket() {
        setErrorMessage("");
        setStatusMessage("");

        await sendMockMotionPacket();
    }

    function handleChangeMotionType(nextType) {
        setMotionType(nextType);
        generateNewMotionProfile(nextType);
    }

    function handleChangeSelectedDevice(nextDeviceId) {
        if (sessionActive) return;

        setSelectedDeviceId(nextDeviceId);
        setPacketCount(0);
        setLastPacket(null);
        setStatusMessage("");
        setErrorMessage("");
    }

    useEffect(() => {
        fetchBleDevices();

        function handleDevicesUpdated() {
            fetchBleDevices();
        }

        window.addEventListener("devices-updated", handleDevicesUpdated);

        return () => {
            window.removeEventListener("devices-updated", handleDevicesUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        return () => {
            clearMotionInterval();
            sessionActiveRef.current = false;
        };
    }, []);

    return (
        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300">
                    <Activity className="h-3.5 w-3.5" />
                    BLE motion mock
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Mock BLE Motion Session
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                    Välj en registrerad BLE-device och skapa en mockad
                    motion-session. Datan sparas i samma flöde som riktig
                    BNO055-data och kan spelas upp på Motion Sessions-sidan.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-violet-500/10 p-2">
                            <Activity className="h-5 w-5 text-violet-700 dark:text-violet-300" />
                        </div>

                        <div>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                Session control
                            </h2>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Välj BLE-device, starta session och skicka
                                mockad BNO055-data.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-4">
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                                    BLE device
                                </label>

                                <button
                                    type="button"
                                    onClick={fetchBleDevices}
                                    disabled={devicesLoading || sessionActive}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                                >
                                    <RefreshCw
                                        className={`h-3.5 w-3.5 ${
                                            devicesLoading ? "animate-spin" : ""
                                        }`}
                                    />
                                    Uppdatera
                                </button>
                            </div>

                            <select
                                value={selectedDeviceId}
                                disabled={
                                    sessionActive ||
                                    devicesLoading ||
                                    bleDevices.length === 0
                                }
                                onChange={(event) =>
                                    handleChangeSelectedDevice(
                                        event.target.value,
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-violet-400"
                            >
                                {bleDevices.length === 0 ? (
                                    <option value="">
                                        Ingen BLE-device hittades
                                    </option>
                                ) : (
                                    bleDevices.map((device) => (
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

                            {selectedDevice ? (
                                <div className="mt-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-xl bg-violet-600 p-2 text-white">
                                            <Bluetooth className="h-4 w-4" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="font-black text-violet-800 dark:text-violet-200">
                                                {selectedDevice.device_name}
                                            </p>

                                            <p className="mt-1 text-slate-600 dark:text-slate-400">
                                                Device ID:{" "}
                                                <span className="font-bold text-slate-950 dark:text-white">
                                                    {selectedDevice.device_ID}
                                                </span>{" "}
                                                · BLE
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                    Registrera en BLE-device först för att kunna
                                    skapa mock motion sessions.
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                                Firmware version
                            </label>

                            <input
                                type="text"
                                value={firmwareVersion}
                                disabled={sessionActive}
                                onChange={(event) => {
                                    setFirmwareVersion(event.target.value);
                                    setErrorMessage("");
                                    setStatusMessage("");
                                }}
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-violet-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                                Rörelsetyp
                            </label>

                            <select
                                value={motionType}
                                disabled={sessionActive}
                                onChange={(event) =>
                                    handleChangeMotionType(event.target.value)
                                }
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-violet-400"
                            >
                                <option value="realistic">
                                    Realistisk mix
                                </option>
                                <option value="handheld">Handheld tilt</option>
                                <option value="slow_rotation">
                                    Slow rotation
                                </option>
                                <option value="shake">Shake test</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                                Send interval ms
                            </label>

                            <input
                                type="number"
                                min="100"
                                value={sendIntervalMs}
                                disabled={sessionActive}
                                onChange={(event) => {
                                    setSendIntervalMs(
                                        Number(event.target.value),
                                    );
                                    setErrorMessage("");
                                    setStatusMessage("");
                                }}
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-violet-400"
                            />
                        </div>
                    </div>

                    <div className="mt-5 grid gap-2">
                        {!sessionActive ? (
                            <Button
                                type="button"
                                onClick={handleStartSession}
                                disabled={
                                    loading ||
                                    devicesLoading ||
                                    !selectedDeviceId
                                }
                                className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 font-bold text-white"
                            >
                                <Play className="mr-2 h-4 w-4" />
                                {loading ? "Startar..." : "Start session"}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleStopSession}
                                disabled={loading}
                                variant="destructive"
                                className="h-11 w-full rounded-xl font-bold"
                            >
                                <Square className="mr-2 h-4 w-4" />
                                {loading ? "Stoppar..." : "Stop session"}
                            </Button>
                        )}

                        <Button
                            type="button"
                            onClick={handleSendSinglePacket}
                            disabled={loading || !sessionActive}
                            variant="outline"
                            className="h-11 w-full rounded-xl font-semibold"
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Skicka ett test-paket
                        </Button>

                        <Button
                            type="button"
                            onClick={() => generateNewMotionProfile(motionType)}
                            disabled={loading || sessionActive}
                            variant="outline"
                            className="h-11 w-full rounded-xl font-semibold"
                        >
                            <Shuffle className="mr-2 h-4 w-4" />
                            Slumpa ny rörelse
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

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                Live mock status
                            </h2>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Senaste quaternion-payload som skickades till
                                databasen.
                            </p>
                        </div>

                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                                sessionActive
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    : "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                            }`}
                        >
                            {sessionActive ? "RUNNING" : "STOPPED"}
                        </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatusCard
                            label="Device"
                            value={
                                selectedDevice
                                    ? selectedDevice.device_name
                                    : "Ingen vald"
                            }
                        />

                        <StatusCard
                            label="Device ID"
                            value={selectedDeviceId || "N/A"}
                        />

                        <StatusCard label="Packets sent" value={packetCount} />

                        <StatusCard label="Motion" value={motionProfileLabel} />
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <StatusCard
                            label="Interval"
                            value={`${sendIntervalMs} ms`}
                        />

                        <StatusCard
                            label="Firmware"
                            value={firmwareVersion || "N/A"}
                        />
                    </div>

                    {lastPacket?.mock_debug && (
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <StatusCard
                                label="Roll"
                                value={`${lastPacket.mock_debug.roll_deg}°`}
                            />
                            <StatusCard
                                label="Pitch"
                                value={`${lastPacket.mock_debug.pitch_deg}°`}
                            />
                            <StatusCard
                                label="Yaw"
                                value={`${lastPacket.mock_debug.yaw_deg}°`}
                            />
                        </div>
                    )}

                    <div className="mt-5">
                        <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">
                            Last packet
                        </h3>

                        <pre className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100 dark:border-slate-800">
                            {lastPacket
                                ? JSON.stringify(lastPacket, null, 2)
                                : "No packet sent yet."}
                        </pre>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                        <p className="font-bold text-slate-900 dark:text-white">
                            Endpoints som används
                        </p>

                        <div className="mt-3 space-y-1 font-mono text-xs">
                            <p>GET /api/device/ble/get/all/:user_ID</p>
                            <p>POST {SESSION_ADD_URL}</p>
                            <p>POST {MOTION_DATA_ADD_URL}</p>
                            <p>PATCH {SESSION_UPDATE_URL}</p>
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
            <p className="mt-1 break-words text-lg font-black text-slate-950 dark:text-white">
                {value}
            </p>
        </div>
    );
}
