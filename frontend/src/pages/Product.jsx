import { Link } from "react-router-dom";
import {
    Activity,
    Cpu,
    Database,
    MapPinned,
    ShieldCheck,
    Smartphone,
    TerminalSquare,
} from "lucide-react";

import Navbar from "../components/Navbar";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function Product() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
            <Navbar />

            <section className="mx-auto max-w-7xl px-6 py-10">
                <div className="mb-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                    <div>
                        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950 dark:text-white md:text-6xl">
                            Spåra enheter med egen firmware, CoAP och
                            live-karta.
                        </h1>

                        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-400">
                            Plattformen samlar in positioner från cellulära
                            IoT-enheter, sparar datan i en backend och visar den
                            tydligt i en webbdashboard.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button asChild className="h-12">
                                <Link to="/home">
                                    <MapPinned className="mr-2 h-4 w-4" />
                                    Visa karta
                                </Link>
                            </Button>

                            <Button asChild variant="outline" className="h-12">
                                <Link to="/register-device">
                                    <Smartphone className="mr-2 h-4 w-4" />
                                    Lägg till enhet
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <Card className="border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                Vad är plattformen?
                            </CardTitle>
                            <CardDescription>
                                En lösning för att samla in, lagra och visa
                                GNSS-positioner.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-5 text-slate-600 dark:text-slate-400">
                            <p className="text-base leading-7">
                                Plattformen är byggd för företag som vill få
                                kontroll över var deras enheter, utrustning
                                eller sensorer befinner sig.
                            </p>

                            <p className="text-base leading-7">
                                Enheten skickar positioner via CoAP till en
                                Node.js-backend. Datan sparas i databasen och
                                visas sedan på karta i dashboarden.
                            </p>

                            <div className="grid gap-3 pt-2 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                                    <p className="font-semibold text-slate-950 dark:text-white">
                                        För företag
                                    </p>
                                    <p className="mt-1 text-sm">
                                        Ger överblick över registrerade enheter,
                                        positioner och insamlad data.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                                    <p className="font-semibold text-slate-950 dark:text-white">
                                        Full kontroll
                                    </p>
                                    <p className="mt-1 text-sm">
                                        Firmware, backend och frontend kan
                                        anpassas efter behov.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="mb-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <Cpu className="mb-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <CardTitle className="text-lg">Firmware</CardTitle>
                            <CardDescription>
                                Egen kod på enheten.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                            nRF-enheten hämtar GNSS-position och skickar data
                            till servern.
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <Activity className="mb-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <CardTitle className="text-lg">CoAP</CardTitle>
                            <CardDescription>
                                Effektiv kommunikation.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                            CoAP används för lättviktig och snabb överföring av
                            device-data.
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <Database className="mb-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <CardTitle className="text-lg">Backend</CardTitle>
                            <CardDescription>API och databas.</CardDescription>
                        </CardHeader>

                        <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                            Servern tar emot positioner och kopplar dem till
                            rätt användare och enhet.
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <MapPinned className="mb-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <CardTitle className="text-lg">Dashboard</CardTitle>
                            <CardDescription>
                                Karta och överblick.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                            Positionerna visas tydligt på karta med Leaflet i
                            frontend.
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TerminalSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                Så fungerar det
                            </CardTitle>
                            <CardDescription>
                                Från fysisk enhet till karta.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                                <p className="font-semibold">
                                    1. Enheten hämtar position
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    Firmware samlar GNSS-data som latitud,
                                    longitud, accuracy och tid.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                                <p className="font-semibold">
                                    2. Data skickas till backend
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    Servern tar emot datan via CoAP och sparar
                                    den i databasen.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                                <p className="font-semibold">
                                    3. Dashboard visar positioner
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    Användaren ser sina registrerade enheter
                                    direkt på kartan.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                Varför använda den?
                            </CardTitle>
                            <CardDescription>
                                För företag som vill ha kontroll över sina
                                uppkopplade enheter.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                            <p>
                                Plattformen ger företag en tydlig överblick över
                                var deras enheter befinner sig och hur datan
                                samlas in.
                            </p>

                            <p>
                                Eftersom systemet bygger på egen firmware och
                                egen backend kan lösningen anpassas efter behov,
                                till exempel trackingintervall, batteritid,
                                datalagring och användaråtkomst.
                            </p>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                                    <Activity className="mb-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <p className="font-semibold text-slate-950 dark:text-white">
                                        Bättre överblick
                                    </p>
                                    <p className="mt-1">
                                        Se positioner och historik från
                                        registrerade enheter.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                                    <Smartphone className="mb-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <p className="font-semibold text-slate-950 dark:text-white">
                                        Anpassningsbar
                                    </p>
                                    <p className="mt-1">
                                        Kan byggas vidare för fler devices,
                                        kunder och användningsområden.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </main>
    );
}
