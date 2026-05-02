import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Activity,
    MapPinned,
    Moon,
    RadioTower,
    Sun,
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

export default function Register() {
    const navigate = useNavigate();

    const [showUsername, setShowUsername] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

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

    async function handleRegister(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

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
                    show_username: showUsername,
                    username,
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
            setError(err.message);
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
                                Create access
                            </p>

                            <h2 className="max-w-xl text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Skapa konto för din IoT-dashboard.
                            </h2>

                            <p className="mt-5 max-w-lg text-slate-600 dark:text-slate-300">
                                Registrera en användare som kan logga in och
                                övervaka GPS-positioner från dina nRF
                                Cellular-enheter.
                            </p>
                        </div>

                        <div className="grid max-w-xl grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                                <MapPinned className="mb-4 h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Map
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Leaflet dashboard
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                                <Activity className="mb-4 h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Users
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Secure access
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        Register operators and admins for dashboard access.
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
                        <CardHeader className="space-y-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20">
                                <UserPlus className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>

                            <div>
                                <CardTitle className="text-2xl text-slate-900 dark:text-white">
                                    Skapa konto
                                </CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400">
                                    Registrera en användare för åtkomst till
                                    dashboarden.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent>
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
                                    {loading
                                        ? "Skapar konto..."
                                        : "Skapa konto"}
                                </Button>
                            </form>

                            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                                Har du redan konto?{" "}
                                <Link
                                    to="/login"
                                    className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
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
