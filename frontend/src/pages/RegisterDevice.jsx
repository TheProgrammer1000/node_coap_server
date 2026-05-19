import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Bluetooth,
    CheckCircle2,
    Cpu,
    Database,
    Loader2,
    MapPinned,
    PlusCircle,
    Radio,
    Server,
    ShieldCheck,
    Smartphone,
} from "lucide-react";

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
import { Label } from "@/components/ui/label";

const SELECTED_TRANSPORT_STORAGE_KEY = "selected_data_transport";

export default function RegisterDevice() {
    const navigate = useNavigate();

    const storeUser = useAuthStore((state) => state.user);
    const storedUser = localStorage.getItem("user");
    const localUser = storedUser ? JSON.parse(storedUser) : null;
    const user = storeUser || localUser;

    const [deviceSerienumber, setDeviceSerienumber] = useState("");
    const [deviceName, setDeviceName] = useState("");
    const [dataTransport, setDataTransport] = useState("cellular");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!user?.user_ID) {
            setError("Ingen inloggad användare hittades. Logga in igen.");
            return;
        }

        if (!deviceSerienumber.trim()) {
            setError("Fyll i serienummer.");
            return;
        }

        if (!["cellular", "ble"].includes(dataTransport)) {
            setError("Välj en giltig data transport.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post("/api/device/register", {
                user_ID: Number(user.user_ID),
                device_name: deviceName.trim() || null,
                device_serienumber: deviceSerienumber.trim(),
                data_transport: dataTransport,
            });

            console.log("Register device response:", response.data);

            if (response.data?.success === true) {
                setSuccess("Enhet registrerad!");

                localStorage.setItem(
                    SELECTED_TRANSPORT_STORAGE_KEY,
                    dataTransport,
                );

                window.dispatchEvent(
                    new CustomEvent("devices-updated", {
                        detail: {
                            data_transport: dataTransport,
                        },
                    }),
                );

                setTimeout(() => {
                    if (dataTransport === "ble") {
                        navigate("/motion-live", { replace: true });
                        return;
                    }

                    navigate("/dashboard", { replace: true });
                }, 500);

                return;
            }

            setError(response.data?.message ?? "Kunde inte registrera enhet.");
        } catch (error) {
            console.error("Register device failed:", error);

            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Kunde inte registrera enhet. Kontrollera serienumret.";

            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    const selectedTransportInfo =
        dataTransport === "cellular"
            ? {
                  title: "Cellular device",
                  description:
                      "För devices som skickar GNSS-position, status och heartbeat direkt till backend via cellular.",
                  icon: Radio,
                  accent: "blue",
                  bullets: [
                      "GNSS-position på karta",
                      "Geofence och arbetsområden",
                      "Status och historik",
                  ],
              }
            : {
                  title: "BLE device",
                  description:
                      "För sensors som skickar data via BLE till React Native-appen, som sedan fungerar som gateway till backend.",
                  icon: Bluetooth,
                  accent: "violet",
                  bullets: [
                      "React Native som gateway",
                      "Motion sessions",
                      "3D playback i webben",
                  ],
              };

    const SelectedIcon = selectedTransportInfo.icon;

    return (
        <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
            <section className="mx-auto grid min-h-[calc(100dvh-72px)] w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:px-8 lg:py-8 xl:grid-cols-[minmax(0,1fr)_520px]">
                <section className="order-2 lg:order-1">
                    <div className="mx-auto max-w-2xl lg:mx-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300">
                            <PlusCircle className="h-3.5 w-3.5" />
                            Device onboarding
                        </div>

                        <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                            Lägg till en device och koppla den till rätt flöde.
                        </h1>

                        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
                            Välj om enheten skickar data via cellular eller BLE.
                            Plattformen visar sedan rätt vyer för position,
                            geofence, alerts eller motion sessions.
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <SimpleFeatureCard
                                icon={MapPinned}
                                title="Cellular"
                                text="För GNSS-position, status, geofence och arbetsområden."
                                tone="blue"
                            />

                            <SimpleFeatureCard
                                icon={Activity}
                                title="BLE"
                                text="För sensordata, motion sessions och playback i webben."
                                tone="violet"
                            />
                        </div>

                        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-black text-slate-950 dark:text-white">
                                        Så kopplas devicen in
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        En enkel kedja från hårdvara till
                                        dashboard.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                <FlowStep
                                    icon={Cpu}
                                    title="Device"
                                    text="Nordic nRF eller sensor."
                                    tone="blue"
                                />

                                <FlowStep
                                    icon={
                                        dataTransport === "cellular"
                                            ? Radio
                                            : Smartphone
                                    }
                                    title="Transport"
                                    text={
                                        dataTransport === "cellular"
                                            ? "Cellular / CoAP"
                                            : "BLE via mobil"
                                    }
                                    tone={
                                        dataTransport === "cellular"
                                            ? "blue"
                                            : "violet"
                                    }
                                />

                                <FlowStep
                                    icon={Server}
                                    title="Backend"
                                    text="Data sparas och visas i webben."
                                    tone="slate"
                                />
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                <MiniMetric
                                    icon={ShieldCheck}
                                    title="User-bound"
                                />
                                <MiniMetric icon={Database} title="Historik" />
                                <MiniMetric
                                    icon={ArrowRight}
                                    title="Dashboard ready"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <Card className="order-1 w-full border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 lg:order-2">
                    <CardHeader className="space-y-4 pb-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 dark:bg-blue-500/20">
                                <PlusCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>

                            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 sm:text-xs">
                                Register device
                            </div>
                        </div>

                        <div>
                            <CardTitle className="text-2xl sm:text-3xl">
                                Registrera enhet
                            </CardTitle>

                            <CardDescription className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                                Ange serienummer, namn och välj data transport.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="deviceSerienumber">
                                    Serienummer
                                </Label>

                                <Input
                                    id="deviceSerienumber"
                                    value={deviceSerienumber}
                                    onChange={(event) =>
                                        setDeviceSerienumber(event.target.value)
                                    }
                                    placeholder="ex. B2S752T2"
                                    autoComplete="off"
                                    className="h-12 focus-visible:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="deviceName">
                                    Enhetsnamn{" "}
                                    <span className="text-slate-400">
                                        (valfritt)
                                    </span>
                                </Label>

                                <Input
                                    id="deviceName"
                                    value={deviceName}
                                    onChange={(event) =>
                                        setDeviceName(event.target.value)
                                    }
                                    placeholder="ex. Min tracker"
                                    className="h-12 focus-visible:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <Label>Data transport</Label>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Välj typ
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <TransportButton
                                        active={dataTransport === "cellular"}
                                        icon={Radio}
                                        title="Cellular"
                                        subtitle="CoAP / LTE-M / NB-IoT"
                                        onClick={() =>
                                            setDataTransport("cellular")
                                        }
                                    />

                                    <TransportButton
                                        active={dataTransport === "ble"}
                                        icon={Bluetooth}
                                        title="BLE"
                                        subtitle="BLE / React Native gateway"
                                        onClick={() => setDataTransport("ble")}
                                    />
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                                <div className="flex gap-4">
                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${
                                            dataTransport === "cellular"
                                                ? "bg-blue-600 shadow-blue-500/20"
                                                : "bg-violet-600 shadow-violet-500/20"
                                        }`}
                                    >
                                        <SelectedIcon className="h-6 w-6" />
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="font-black">
                                            {selectedTransportInfo.title}
                                        </h3>

                                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                            {selectedTransportInfo.description}
                                        </p>

                                        <div className="mt-3 grid gap-2">
                                            {selectedTransportInfo.bullets.map(
                                                (bullet) => (
                                                    <div
                                                        key={bullet}
                                                        className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                                        {bullet}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-700 dark:text-red-300">
                                    <AlertCircle className="h-5 w-5 shrink-0" />

                                    <p className="text-sm font-medium">
                                        {error}
                                    </p>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-blue-700 dark:text-blue-300">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />

                                    <p className="text-sm font-medium">
                                        {success}
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="h-13 flex-1 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 sm:h-14"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Registrerar...
                                        </>
                                    ) : (
                                        <>
                                            <PlusCircle className="mr-2 h-5 w-5" />
                                            Registrera enhet
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/landing-page")}
                                    className="h-13 rounded-2xl border-slate-300 text-base font-bold hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 sm:h-14"
                                >
                                    <ArrowLeft className="mr-2 h-5 w-5" />
                                    Tillbaka
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}

function TransportButton({ active, icon: Icon, title, subtitle, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex min-h-[72px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                active
                    ? "border-blue-500 bg-blue-500/10 text-blue-700 ring-2 ring-blue-500/20 dark:text-blue-300"
                    : "border-slate-200 bg-white hover:bg-slate-50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            }`}
        >
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    active
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
            >
                <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
                <p className="font-black">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    {subtitle}
                </p>
            </div>
        </button>
    );
}

function SimpleFeatureCard({ icon: Icon, title, text, tone }) {
    const iconClass =
        tone === "violet"
            ? "bg-violet-600 shadow-violet-500/20"
            : "bg-blue-600 shadow-blue-500/20";

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${iconClass}`}
                >
                    <Icon className="h-5 w-5" />
                </div>

                <div>
                    <h3 className="font-black text-slate-950 dark:text-white">
                        {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {text}
                    </p>
                </div>
            </div>
        </div>
    );
}

function FlowStep({ icon: Icon, title, text, tone }) {
    const colorClasses = {
        blue: "bg-blue-600 text-white",
        violet: "bg-violet-600 text-white",
        slate: "bg-slate-900 text-white dark:bg-white dark:text-slate-950",
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${colorClasses[tone]}`}
            >
                <Icon className="h-5 w-5" />
            </div>

            <p className="text-sm font-black text-slate-950 dark:text-white">
                {title}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {text}
            </p>
        </div>
    );
}

function MiniMetric({ icon: Icon, title }) {
    return (
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
            <Icon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            {title}
        </div>
    );
}
