import { Link } from "react-router-dom";
import { Activity, ArrowRight, Cpu, Database, MapPinned } from "lucide-react";

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
            <section className="mx-auto max-w-7xl px-6 py-10">
                <div className="mb-12 max-w-4xl">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white md:text-6xl">
                        Samla in data. Spara den. Visa den tydligt.
                    </h1>

                    <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-400">
                        Plattformen kopplar en fysisk device till en server och
                        visar position, status och viktig information i en
                        dashboard.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Button asChild className="h-12 rounded-2xl px-5">
                            <Link to="/home">
                                <MapPinned className="mr-2 h-4 w-4" />
                                Visa dashboard
                            </Link>
                        </Button>

                        <Button
                            asChild
                            variant="outline"
                            className="h-12 rounded-2xl px-5"
                        >
                            <Link to="/register-device">
                                Lägg till device
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="mb-10 grid gap-4 md:grid-cols-3">
                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <Cpu className="mb-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <CardTitle className="text-lg">
                                1. Device skickar data
                            </CardTitle>
                            <CardDescription>
                                Data börjar i hårdvaran.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Firmware läser in exempelvis position, tid och
                            accuracy och skickar datan vidare.
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <Database className="mb-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <CardTitle className="text-lg">
                                2. Servern sparar datan
                            </CardTitle>
                            <CardDescription>
                                Datan kopplas till rätt device.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Backend tar emot datan, validerar den och sparar den
                            i databasen.
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader>
                            <MapPinned className="mb-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <CardTitle className="text-lg">
                                3. Dashboarden visar resultatet
                            </CardTitle>
                            <CardDescription>
                                Användaren får överblick direkt.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Dashboarden visar devices, senaste position, status
                            och geofence på ett tydligt sätt.
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle>Vad plattformen gör</CardTitle>
                        <CardDescription>
                            En enkel kedja från hårdvara till tydlig överblick.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="grid gap-4 text-sm text-slate-600 dark:text-slate-400 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                            <p className="font-semibold text-slate-950 dark:text-white">
                                Tar emot device-data
                            </p>
                            <p className="mt-1">
                                Positioner och status skickas från device till
                                servern.
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                            <p className="font-semibold text-slate-950 dark:text-white">
                                Sparar datan säkert
                            </p>
                            <p className="mt-1">
                                Varje datapunkt kopplas till rätt device och
                                användare.
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                            <p className="font-semibold text-slate-950 dark:text-white">
                                Visar det viktiga
                            </p>
                            <p className="mt-1">
                                Användaren ser snabbt var en device är och vad
                                som händer.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
