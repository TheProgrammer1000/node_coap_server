import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Activity,
    Database,
    MapPinned,
    Radio,
    RadioTower,
    UserPlus,
} from "lucide-react";

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
import ThemeToggle from "@/components/ThemeToggle";

const GOOGLE_AUTH_URL = "/api/auth/google";

function InfoTile({ icon, title, text }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="mb-4">{icon}</div>

            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {title}
            </p>

            <p className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
        </div>
    );
}

function GmailButton({ onClick, disabled, text }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
        >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white">
                G
            </span>

            {text}
        </button>
    );
}

export default function Register() {
    const navigate = useNavigate();

    const [showUsername, setShowUsername] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [gmailLoading, setGmailLoading] = useState(false);
    const [error, setError] = useState("");

    function handleGmailRegister() {
        setError("");
        setGmailLoading(true);
        window.location.href = GOOGLE_AUTH_URL;
    }

    async function handleRegister(e) {
        e.preventDefault();

        setError("");
        setLoading(true);

        const trimmedShowUsername = showUsername.trim();
        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedShowUsername) {
            setError("Fyll i visningsnamn");
            setLoading(false);
            return;
        }

        if (!trimmedUsername) {
            setError("Fyll i användarnamn");
            setLoading(false);
            return;
        }

        if (!trimmedEmail) {
            setError("Fyll i email");
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError("Lösenordet måste vara minst 8 tecken");
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("Lösenorden matchar inte");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/user/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    show_username: trimmedShowUsername,
                    username: trimmedUsername,
                    email: trimmedEmail,
                    password,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(
                    data.message || data.error || "Kunde inte skapa användare",
                );
            }

            navigate("/login", { replace: true });
        } catch (err) {
            console.error("Register failed:", err);
            setError(err.message || "Kunde inte skapa konto");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
            <div className="grid min-h-screen lg:grid-cols-2">
                <section className="relative hidden flex-col justify-between border-r border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-10 dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-blue-950 lg:flex">
                    <div className="absolute right-6 top-6">
                        <ThemeToggle fullText />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-500/15 p-3 dark:bg-blue-500/20">
                            <RadioTower className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div>
                            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                                Nodecore IT
                            </h1>

                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                End-to-end IoT platform
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
                                Create access
                            </p>

                            <h2 className="max-w-xl text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                                Skapa konto och koppla flera devices till samma
                                användare.
                            </h2>

                            <p className="mt-5 max-w-lg text-slate-600 dark:text-slate-300">
                                Plattformen är byggd för att en användare ska
                                kunna ha flera devices: cellular trackers ute på
                                fältet, BLE-sensorer via mobil gateway och fler
                                datatyper över tid.
                            </p>
                        </div>

                        <div className="grid max-w-xl grid-cols-2 gap-4">
                            <InfoTile
                                icon={
                                    <MapPinned className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                }
                                title="Position"
                                text="Karta, GNSS och geofence"
                            />

                            <InfoTile
                                icon={
                                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                }
                                title="Alerts"
                                text="Händelser och status"
                            />

                            <InfoTile
                                icon={
                                    <Radio className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                }
                                title="BLE"
                                text="Motion sessions och sensordata"
                            />

                            <InfoTile
                                icon={
                                    <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                }
                                title="Historik"
                                text="Sparad data per device"
                            />
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        En användare. Flera devices. Samlad IoT-data i webben.
                    </p>
                </section>

                <section className="relative flex items-center justify-center px-6 py-12">
                    <div className="absolute right-6 top-6 lg:hidden">
                        <ThemeToggle fullText={false} />
                    </div>

                    <Card className="w-full max-w-md border-slate-200 bg-white/90 text-slate-950 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-white">
                        <CardHeader className="space-y-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 dark:bg-blue-500/20">
                                <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>

                            <div>
                                <CardTitle className="text-2xl text-slate-900 dark:text-white">
                                    Skapa konto
                                </CardTitle>

                                <CardDescription className="text-slate-600 dark:text-slate-400">
                                    Registrera en användare för åtkomst till
                                    dashboard, devices och sensorhistorik.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-3">
                                <GmailButton
                                    text="Registrera med Gmail"
                                    onClick={handleGmailRegister}
                                    disabled={loading || gmailLoading}
                                />
                            </div>

                            <div className="my-6 flex items-center gap-3">
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    eller
                                </span>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                            </div>

                            <form
                                onSubmit={handleRegister}
                                className="space-y-5"
                            >
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="showUsername"
                                        className="text-slate-800 dark:text-slate-200"
                                    >
                                        Visningsnamn
                                    </Label>

                                    <Input
                                        id="showUsername"
                                        type="text"
                                        placeholder="Dennis"
                                        value={showUsername}
                                        onChange={(e) =>
                                            setShowUsername(e.target.value)
                                        }
                                        required
                                        autoComplete="name"
                                        className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="username"
                                        className="text-slate-800 dark:text-slate-200"
                                    >
                                        Användarnamn
                                    </Label>

                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="dennis"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        required
                                        autoComplete="username"
                                        className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-slate-800 dark:text-slate-200"
                                    >
                                        Email
                                    </Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="dennis@gmail.com"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        required
                                        autoComplete="email"
                                        className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-slate-800 dark:text-slate-200"
                                    >
                                        Lösenord
                                    </Label>

                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Minst 8 tecken"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        required
                                        autoComplete="new-password"
                                        className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="confirmPassword"
                                        className="text-slate-800 dark:text-slate-200"
                                    >
                                        Bekräfta lösenord
                                    </Label>

                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Upprepa lösenord"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        required
                                        autoComplete="new-password"
                                        className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                                    />
                                </div>

                                {error && (
                                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                                        {error}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading || gmailLoading}
                                >
                                    {loading
                                        ? "Skapar konto..."
                                        : "Skapa konto"}
                                </Button>
                            </form>

                            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                                Har du redan konto?{" "}
                                <Link
                                    to="/login"
                                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                    Logga in
                                </Link>
                            </p>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    );
}
