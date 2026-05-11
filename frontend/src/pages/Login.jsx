import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, MapPinned, RadioTower, Sun, Moon } from "lucide-react";

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

function normalizeLoginUser(responseData) {
    const rawUser = Array.isArray(responseData?.data)
        ? responseData.data[0]
        : (responseData?.data ?? responseData?.user ?? null);

    if (!rawUser) {
        throw new Error("Kunde inte läsa användardata från servern");
    }

    const userId = rawUser.user_ID ?? rawUser.user_id ?? rawUser.id ?? null;

    if (!userId) {
        console.error("Login user saknar user_ID:", rawUser);

        throw new Error(
            "Servern skickade inte user_ID. Kontrollera login-responsen från backend.",
        );
    }

    return {
        user_ID: Number(userId),
        show_username:
            typeof rawUser.show_username === "string"
                ? rawUser.show_username
                : (rawUser.username ?? ""),
        username: rawUser.username ?? "",
    };
}

export default function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");

        if (savedTheme === "dark" || savedTheme === "light") {
            setTheme(savedTheme);
            return;
        }

        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches;

        setTheme(prefersDark ? "dark" : "light");
    }, []);

    useEffect(() => {
        const root = document.documentElement;

        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }

        localStorage.setItem("theme", theme);
    }, [theme]);

    function toggleTheme() {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }

    async function handleLogin(e) {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/user/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username.trim(),
                    password,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(
                    data.message ||
                        data.error ||
                        "Fel användarnamn eller lösenord",
                );
            }

            const normalizedUser = normalizeLoginUser(data);

            localStorage.setItem("token", String(normalizedUser.user_ID));
            localStorage.setItem("user", JSON.stringify(normalizedUser));
            localStorage.setItem("isLoggedIn", "true");

            console.log("Logged in user:", normalizedUser);

            navigate("/landing-page", { replace: true });
        } catch (err) {
            console.error("Login failed:", err);
            setError(err.message || "Kunde inte logga in");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
            <div className="grid min-h-screen lg:grid-cols-2">
                <section className="relative hidden flex-col justify-between border-r border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-10 dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-emerald-950 lg:flex">
                    <div className="absolute right-6 top-6">
                        <button
                            onClick={toggleTheme}
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                            {theme === "dark" ? (
                                <>
                                    <Sun className="h-4 w-4" />
                                    Light mode
                                </>
                            ) : (
                                <>
                                    <Moon className="h-4 w-4" />
                                    Dark mode
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-500/15 p-3 dark:bg-emerald-500/20">
                            <RadioTower className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>

                        <div>
                            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                                nRF Cellular Dashboard
                            </h1>

                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Live GPS tracking via CoAP
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
                                Device telemetry
                            </p>

                            <h2 className="max-w-xl text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Följ dina IoT-enheter i realtid.
                            </h2>

                            <p className="mt-5 max-w-lg text-slate-600 dark:text-slate-300">
                                Positioner från dina nRF Cellular-enheter sparas
                                i databasen och visas i din Leaflet-karta.
                            </p>
                        </div>

                        <div className="grid max-w-xl grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                                <MapPinned className="mb-4 h-6 w-6 text-emerald-600 dark:text-emerald-400" />

                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Live
                                </p>

                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    GPS-positioner
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                                <Activity className="mb-4 h-6 w-6 text-emerald-600 dark:text-emerald-400" />

                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    CoAP
                                </p>

                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Device ingestion
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        Secure dashboard access for operators and admins.
                    </p>
                </section>

                <section className="relative flex items-center justify-center px-6 py-12">
                    <div className="absolute right-6 top-6 lg:hidden">
                        <button
                            onClick={toggleTheme}
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            {theme === "dark" ? (
                                <>
                                    <Sun className="h-4 w-4" />
                                    Light
                                </>
                            ) : (
                                <>
                                    <Moon className="h-4 w-4" />
                                    Dark
                                </>
                            )}
                        </button>
                    </div>

                    <Card className="w-full max-w-md border-slate-200 bg-white/90 text-slate-950 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-white">
                        <CardHeader>
                            <CardTitle className="text-2xl text-slate-900 dark:text-white">
                                Logga in
                            </CardTitle>

                            <CardDescription className="text-slate-600 dark:text-slate-400">
                                Öppna din IoT-dashboard och se senaste
                                positionerna.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleLogin} className="space-y-5">
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
                                        htmlFor="password"
                                        className="text-slate-800 dark:text-slate-200"
                                    >
                                        Lösenord
                                    </Label>

                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        required
                                        autoComplete="current-password"
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
                                    disabled={loading}
                                >
                                    {loading ? "Loggar in..." : "Logga in"}
                                </Button>
                            </form>

                            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                                Har du inget konto?{" "}
                                <Link
                                    to="/register"
                                    className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                                >
                                    Skapa konto
                                </Link>
                            </p>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    );
}
