import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    PlusCircle,
} from "lucide-react";

import { useAuthStore } from "../store/authStore";
import Navbar from "../components/Navbar";

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

export default function RegisterDevice() {
    const navigate = useNavigate();

    const storeUser = useAuthStore((state) => state.user);
    const storedUser = localStorage.getItem("user");
    const localUser = storedUser ? JSON.parse(storedUser) : null;
    const user = storeUser || localUser;

    const [deviceId, setDeviceId] = useState("");
    const [deviceName, setDeviceName] = useState("");
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

        if (!deviceId.trim()) {
            setError("Fyll i enhets-ID");
            return;
        }

        setIsLoading(true);

        try {
            await axios.post("/api/device/register/", {
                device_ID: deviceId.trim(),
                user_ID: user.user_ID,
                device_name: deviceName.trim() || null,
            });

            setSuccess("Enhet registrerad! Omdirigerar till kartan...");

            setTimeout(() => {
                navigate("/home", { replace: true });
            }, 1200);
        } catch (error) {
            console.error("Register device failed:", error);
            setError("Kunde inte registrera enhet. Kontrollera enhets-ID.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
            <Navbar />

            <section className="mx-auto flex min-h-[calc(100dvh-112px)] max-w-7xl items-center justify-center px-6 py-8">
                <Card className="w-full max-w-xl border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="space-y-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 dark:bg-blue-500/20">
                            <PlusCircle className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div>
                            <CardTitle className="text-3xl">
                                Registrera enhet
                            </CardTitle>
                            <CardDescription className="text-base text-slate-600 dark:text-slate-400">
                                Ange enhets-ID och ett valfritt namn.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="deviceId">Enhets-ID</Label>
                                <Input
                                    id="deviceId"
                                    value={deviceId}
                                    onChange={(e) =>
                                        setDeviceId(e.target.value)
                                    }
                                    placeholder="ex. 123456789"
                                    inputMode="numeric"
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
                                    onChange={(e) =>
                                        setDeviceName(e.target.value)
                                    }
                                    placeholder="ex. Min tracker"
                                    className="h-12 focus-visible:ring-blue-500"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-700 dark:text-red-300">
                                    <AlertCircle className="h-5 w-5" />
                                    <p className="text-sm font-medium">
                                        {error}
                                    </p>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-blue-700 dark:text-blue-300">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <p className="text-sm font-medium">
                                        {success}
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="h-16 flex-1 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-lg font-bold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                            Registrerar...
                                        </>
                                    ) : (
                                        <>
                                            <PlusCircle className="mr-2 h-6 w-6" />
                                            Registrera enhet
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/home")}
                                    className="h-16 rounded-2xl border-slate-300 text-lg font-bold hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                                >
                                    <ArrowLeft className="mr-2 h-6 w-6" />
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
