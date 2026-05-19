import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Activity,
    AlertCircle,
    Bluetooth,
    CheckCircle2,
    Clock3,
    Cpu,
    Database,
    Gauge,
    Loader2,
    MapPin,
    PlusCircle,
    Radio,
    RefreshCw,
    Route,
    Satellite,
    Search,
    Server,
    Settings,
    ShieldCheck,
    Signal,
    TerminalSquare,
    Wifi,
    Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Devices() {
    const navigate = useNavigate();

    const storeUser = useAuthStore((state) => state.user);
    const storedUser = localStorage.getItem("user");
    const localUser = storedUser ? JSON.parse(storedUser) : null;
    const user = storeUser || localUser;

    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);
    const [error, setError] = useState("");

    async function fetchUserDevices() {
        setError("");

        if (!user?.user_ID) {
            setError("Ingen inloggad användare hittades. Logga in igen.");
            return;
        }

        try {
            setIsLoadingDevices(true);

            const response = await axios.get(
                `/api/device/get/user/${user.user_ID}`,
            );

            console.log("User devices response:", response.data);

            const fetchedDevices =
                response.data?.devices ||
                response.data?.data ||
                response.data?.result ||
                response.data ||
                [];

            const normalizedDevices = Array.isArray(fetchedDevices)
                ? fetchedDevices.map((device) => ({
                      device_ID: device.device_ID,
                      device_name: device.device_name,
                      data_transport:
                          device.data_transport?.toLowerCase?.() || "cellular",
                  }))
                : [];

            setDevices(normalizedDevices);

            if (normalizedDevices.length > 0) {
                setSelectedDevice((currentSelectedDevice) => {
                    if (!currentSelectedDevice) {
                        return normalizedDevices[0];
                    }

                    const stillExists = normalizedDevices.find(
                        (device) =>
                            String(device.device_ID) ===
                            String(currentSelectedDevice.device_ID),
                    );

                    return stillExists || normalizedDevices[0];
                });
            } else {
                setSelectedDevice(null);
            }
        } catch (error) {
            console.error("Failed to fetch user devices:", error);

            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Kunde inte hämta dina devices.";

            setError(message);
        } finally {
            setIsLoadingDevices(false);
        }
    }

    useEffect(() => {
        fetchUserDevices();
    }, [user?.user_ID]);

    const filteredDevices = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return devices;
        }

        return devices.filter((device) => {
            const name = device.device_name?.toLowerCase() || "";
            const id = String(device.device_ID || "").toLowerCase();
            const transport = device.data_transport?.toLowerCase() || "";

            return (
                name.includes(query) ||
                id.includes(query) ||
                transport.includes(query)
            );
        });
    }, [devices, searchQuery]);

    const cellularCount = devices.filter(
        (device) => device.data_transport === "cellular",
    ).length;

    const bleCount = devices.filter(
        (device) => device.data_transport === "ble",
    ).length;

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(124,58,237,0.10),_transparent_34%),#f8fafc] px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
            <section className="mx-auto w-full max-w-7xl">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                            <Zap className="h-3.5 w-3.5" />
                            Device operations
                        </div>

                        <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                            Dina devices
                        </h1>

                        <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-400">
                            Välj en device för att visa rätt verktyg. Cellular
                            visar remote commands och GNSS. BLE visar live
                            motion och sessioner.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={fetchUserDevices}
                            disabled={isLoadingDevices}
                            className="h-12 rounded-2xl border-slate-300 font-bold hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700"
                        >
                            {isLoadingDevices ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-5 w-5" />
                            )}
                            Uppdatera
                        </Button>

                        <Button
                            type="button"
                            onClick={() => navigate("/register-device")}
                            className="h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700"
                        >
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Lägg till device
                        </Button>
                    </div>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                    <OverviewCard
                        icon={Cpu}
                        title="Totalt"
                        value={devices.length}
                        description="Registrerade devices"
                    />

                    <OverviewCard
                        icon={Radio}
                        title="Cellular"
                        value={cellularCount}
                        description="CoAP / LTE-M / NB-IoT"
                    />

                    <OverviewCard
                        icon={Bluetooth}
                        title="BLE"
                        value={bleCount}
                        description="Live motion / WebSocket"
                    />
                </div>

                {error && (
                    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-700 dark:text-red-300">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
                    <Card className="border-slate-200 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/20">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">
                                Device-lista
                            </CardTitle>

                            <CardDescription>
                                Klicka på en device för att byta verktygsvy.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="relative mb-4">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                <Input
                                    value={searchQuery}
                                    onChange={(event) =>
                                        setSearchQuery(event.target.value)
                                    }
                                    placeholder="Sök device..."
                                    className="h-12 rounded-2xl pl-10 focus-visible:ring-blue-500"
                                />
                            </div>

                            {isLoadingDevices ? (
                                <DeviceListLoading />
                            ) : filteredDevices.length === 0 ? (
                                <EmptyDeviceList
                                    hasDevices={devices.length > 0}
                                    onAddDevice={() =>
                                        navigate("/register-device")
                                    }
                                />
                            ) : (
                                <div className="space-y-3">
                                    {filteredDevices.map((device) => (
                                        <DeviceListItem
                                            key={device.device_ID}
                                            device={device}
                                            isSelected={
                                                String(
                                                    selectedDevice?.device_ID,
                                                ) === String(device.device_ID)
                                            }
                                            onClick={() =>
                                                setSelectedDevice(device)
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <section className="min-w-0">
                        {!selectedDevice ? (
                            <NoSelectedDevice
                                onAddDevice={() => navigate("/register-device")}
                            />
                        ) : (
                            <DeviceWorkspace device={selectedDevice} />
                        )}
                    </section>
                </div>
            </section>
        </main>
    );
}

function DeviceWorkspace({ device }) {
    const isBle = device.data_transport === "ble";

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border-slate-200 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/20">
                <CardContent className="p-0">
                    <div className="border-b border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${
                                        isBle
                                            ? "bg-violet-600 shadow-violet-500/25"
                                            : "bg-blue-600 shadow-blue-500/25"
                                    }`}
                                >
                                    {isBle ? (
                                        <Bluetooth className="h-7 w-7" />
                                    ) : (
                                        <Radio className="h-7 w-7" />
                                    )}
                                </div>

                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-2xl font-black">
                                            {device.device_name ||
                                                "Unnamed device"}
                                        </h2>

                                        <TransportBadge
                                            transport={device.data_transport}
                                        />
                                    </div>

                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Device ID: {device.device_ID}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" />
                                Registered
                            </div>
                        </div>
                    </div>

                    <div className="p-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <InfoTile
                                icon={Cpu}
                                title="Device"
                                value={device.device_name || "Unnamed"}
                            />

                            <InfoTile
                                icon={Signal}
                                title="Transport"
                                value={isBle ? "BLE" : "Cellular"}
                            />

                            <InfoTile
                                icon={Database}
                                title="Data mode"
                                value={
                                    isBle ? "Live motion" : "Remote commands"
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isBle ? (
                <BleDevicePanel device={device} />
            ) : (
                <CellularDevicePanel device={device} />
            )}
        </div>
    );
}

function CellularDevicePanel({ device }) {
    return (
        <Card className="border-slate-200 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/20">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
                        <TerminalSquare className="h-5 w-5" />
                    </div>

                    <div>
                        <CardTitle>Cellular tools</CardTitle>
                        <CardDescription>
                            Remote commands, GNSS och diagnostics för cellular
                            devices.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <ActionCard
                        icon={Gauge}
                        title="Check status"
                        description="Hämta batteri, firmware, uptime och last seen."
                    />

                    <ActionCard
                        icon={Satellite}
                        title="GNSS status"
                        description="Visa position, satellitstatus och senaste fix."
                    />

                    <ActionCard
                        icon={TerminalSquare}
                        title="Command queue"
                        description="Köa kommando som device hämtar vid wakeup."
                    />

                    <ActionCard
                        icon={Settings}
                        title="Config"
                        description="Läs eller uppdatera device-konfiguration."
                    />

                    <ActionCard
                        icon={Signal}
                        title="Cellular signal"
                        description="Visa RSRP, RSRQ och nätverksstatus."
                    />

                    <ActionCard
                        icon={ShieldCheck}
                        title="Diagnostics"
                        description="Kör remote health check på device."
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function BleDevicePanel({ device }) {
    return (
        <Card className="border-slate-200 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/20">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/25">
                        <Activity className="h-5 w-5" />
                    </div>

                    <div>
                        <CardTitle>BLE live motion</CardTitle>
                        <CardDescription>
                            Live motion, BNO055 orientation och sessions för BLE
                            devices.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <ActionCard
                        icon={Bluetooth}
                        title="Connect BLE"
                        description="Anslut till BLE-device från browser eller gateway."
                    />

                    <ActionCard
                        icon={Activity}
                        title="Start live motion"
                        description="Streama yaw, pitch och roll i realtid."
                    />

                    <ActionCard
                        icon={Gauge}
                        title="Calibration"
                        description="Kontrollera BNO055 calibration-status."
                    />

                    <ActionCard
                        icon={Clock3}
                        title="Session recording"
                        description="Spara live motion som session för replay."
                    />

                    <ActionCard
                        icon={Route}
                        title="Session replay"
                        description="Spela upp tidigare motion-sessioner."
                    />

                    <ActionCard
                        icon={Wifi}
                        title="WebSocket stream"
                        description="Visa live-data direkt i UI:t."
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function DeviceListItem({ device, isSelected, onClick }) {
    const isBle = device.data_transport === "ble";

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-3xl border p-4 text-left transition ${
                isSelected
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            }`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${
                        isBle ? "bg-violet-600" : "bg-blue-600"
                    }`}
                >
                    {isBle ? (
                        <Bluetooth className="h-5 w-5" />
                    ) : (
                        <Radio className="h-5 w-5" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-black">
                            {device.device_name || "Unnamed device"}
                        </p>

                        <TransportBadge transport={device.data_transport} />
                    </div>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        ID: {device.device_ID}
                    </p>
                </div>
            </div>
        </button>
    );
}

function TransportBadge({ transport }) {
    const isBle = transport === "ble";

    return (
        <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                isBle
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
            }`}
        >
            {isBle ? "BLE" : "Cellular"}
        </span>
    );
}

function OverviewCard({ icon: Icon, title, value, description }) {
    return (
        <Card className="border-slate-200 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                        <Icon className="h-5 w-5" />
                    </div>

                    <div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            {title}
                        </p>
                        <p className="text-2xl font-black">{value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {description}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function InfoTile({ icon: Icon, title, value }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                <Icon className="h-5 w-5" />
            </div>

            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {title}
            </p>

            <p className="mt-1 truncate text-base font-black">{value}</p>
        </div>
    );
}

function ActionCard({ icon: Icon, title, description }) {
    return (
        <button
            type="button"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-blue-700 dark:hover:bg-slate-900"
        >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                <Icon className="h-5 w-5" />
            </div>

            <p className="font-black">{title}</p>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </button>
    );
}

function DeviceListLoading() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((item) => (
                <div
                    key={item}
                    className="h-20 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800"
                />
            ))}
        </div>
    );
}

function EmptyDeviceList({ hasDevices, onAddDevice }) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950/60">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Cpu className="h-6 w-6" />
            </div>

            <p className="font-black">
                {hasDevices ? "Inga träffar" : "Inga devices ännu"}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {hasDevices
                    ? "Testa att söka på annat namn, ID eller transport."
                    : "Lägg till din första device för att komma igång."}
            </p>

            {!hasDevices && (
                <Button
                    type="button"
                    onClick={onAddDevice}
                    className="mt-4 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700"
                >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Lägg till device
                </Button>
            )}
        </div>
    );
}

function NoSelectedDevice({ onAddDevice }) {
    return (
        <Card className="border-slate-200 bg-white/95 shadow-xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/20">
            <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Cpu className="h-7 w-7" />
                </div>

                <h2 className="text-2xl font-black">Välj en device</h2>

                <p className="mx-auto mt-2 max-w-md text-slate-500 dark:text-slate-400">
                    När du väljer en device visas bara de funktioner som hör
                    till dess data transport.
                </p>

                <Button
                    type="button"
                    onClick={onAddDevice}
                    className="mt-5 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700"
                >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Lägg till device
                </Button>
            </CardContent>
        </Card>
    );
}
