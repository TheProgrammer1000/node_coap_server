import { Link } from "react-router-dom";
import {
    Activity,
    ArrowRight,
    Cpu,
    LayoutDashboard,
    MapPinned,
    Radio,
    Server,
    Smartphone,
} from "lucide-react";

import heroImage from "../assets/img/hero-image.png";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const flowCards = [
    {
        icon: Cpu,
        title: "Firmware skickar data",
        text: "Nordic nRF-devices kör firmware med nRF Connect SDK och Zephyr RTOS.",
    },
    {
        icon: Smartphone,
        title: "Mobilen kan vara gateway",
        text: "React Native-appen tar emot BLE-data under sessioner och skickar vidare till backend.",
    },
    {
        icon: LayoutDashboard,
        title: "Webben visar resultatet",
        text: "Dashboarden visar position, geofence, alerts, device-status och sparade sessions.",
    },
];

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
            <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div className="order-2 lg:order-1">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300">
                            <Radio className="h-3.5 w-3.5" />
                            End-to-end IoT platform
                        </div>

                        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 dark:text-white sm:text-5xl xl:text-6xl">
                            Från firmware till dashboard.
                        </h1>

                        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                            Nodecore IT tar data från fysisk hårdvara och gör
                            den användbar i webben. Plattformen kopplar Nordic
                            nRF-devices, backend, databas och dashboard till ett
                            tydligt IoT-system.
                        </p>

                        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                            <Button
                                asChild
                                className="h-11 rounded-xl px-5 text-sm font-semibold"
                            >
                                <Link to="/dashboard">
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Visa dashboard
                                </Link>
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                className="h-11 rounded-xl px-5 text-sm font-semibold"
                            >
                                <Link to="/register-device">
                                    Lägg till device
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                className="h-11 rounded-xl px-5 text-sm font-semibold"
                            >
                                <Link to="/motion-live">
                                    <Activity className="mr-2 h-4 w-4" />
                                    Motion sessions
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="relative aspect-[16/9] w-full">
                                <img
                                    src={heroImage}
                                    alt="IoT-flöde från fysisk hårdvara till backend och dashboard"
                                    className="h-full w-full object-cover"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />

                                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4">
                                    <div className="inline-flex max-w-full rounded-2xl border border-white/15 bg-slate-950/65 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur sm:text-sm">
                                        nRF firmware + CoAP + BLE + React Native
                                        gateway + web dashboard
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {flowCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <Card
                                key={card.title}
                                className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                            >
                                <CardHeader className="pb-3">
                                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                                        <Icon className="h-5 w-5" />
                                    </div>

                                    <CardTitle className="text-lg text-slate-950 dark:text-white">
                                        {card.title}
                                    </CardTitle>

                                    <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        {card.text}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        );
                    })}
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
                    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="text-xl text-slate-950 dark:text-white">
                                Byggd för flera devices
                            </CardTitle>

                            <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                                En användare kan ha flera devices kopplade till
                                samma konto.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="grid gap-3 sm:grid-cols-3">
                            <InfoBox
                                title="Cellular"
                                text="GNSS-position, status, heartbeat, geofence och alerts via backend."
                            />

                            <InfoBox
                                title="BLE"
                                text="Sensorvärden skickas via React Native-appen som gateway."
                            />

                            <InfoBox
                                title="Historik"
                                text="Data sparas och kan visas som karta, status eller 3D-playback."
                            />
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="text-xl text-slate-950 dark:text-white">
                                Teknisk grund
                            </CardTitle>

                            <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                                Plattformen är byggd från hårdvara till
                                webbsida.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <UseCase
                                icon={<Cpu className="h-4 w-4" />}
                                title="Nordic nRF + Zephyr"
                                text="Firmware körs på Nordic nRF-devices med nRF Connect SDK och Zephyr RTOS."
                            />

                            <UseCase
                                icon={<Server className="h-4 w-4" />}
                                title="Backend och databas"
                                text="Data skickas via CoAP eller BLE gateway, sparas i databasen och kopplas till rätt user och device."
                            />

                            <UseCase
                                icon={<MapPinned className="h-4 w-4" />}
                                title="Webb och analys"
                                text="Dashboarden visar position, geofence, alerts och sensorhistorik på ett tydligt sätt."
                            />
                        </CardContent>
                    </Card>
                </div>
            </section>
        </main>
    );
}

function InfoBox({ title, text }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm font-bold text-slate-950 dark:text-white">
                {title}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {text}
            </p>
        </div>
    );
}

function UseCase({ icon, title, text }) {
    return (
        <div className="flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                {icon}
            </div>

            <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                    {title}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {text}
                </p>
            </div>
        </div>
    );
}
