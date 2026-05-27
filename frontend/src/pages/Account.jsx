import { useMemo, useState } from "react";
import axios from "axios";
import {
    AlertCircle,
    CheckCircle2,
    KeyRound,
    Loader2,
    ShieldCheck,
    TerminalSquare,
    UserCircle2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Failed to parse stored user:", error);
        return null;
    }
}

function getPasswordStrength(password) {
    if (!password) {
        return {
            label: "Tomt",
            value: 0,
            className: "bg-slate-700",
            textClass: "text-slate-400",
        };
    }

    let score = 0;

    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 20;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;

    const value = Math.min(score, 100);

    if (value < 40) {
        return {
            label: "Svagt",
            value,
            className: "bg-red-500",
            textClass: "text-red-300",
        };
    }

    if (value < 70) {
        return {
            label: "Okej",
            value,
            className: "bg-orange-500",
            textClass: "text-orange-300",
        };
    }

    return {
        label: "Starkt",
        value,
        className: "bg-emerald-500",
        textClass: "text-emerald-300",
    };
}

export default function Account() {
    const user = getStoredUser();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const passwordStrength = useMemo(
        () => getPasswordStrength(password),
        [password],
    );

    const canSubmit =
        user?.user_ID &&
        password.length >= 8 &&
        confirmPassword.length >= 8 &&
        password === confirmPassword &&
        !isSaving;

    async function handleSubmit(event) {
        event.preventDefault();

        setSuccessMessage("");
        setErrorMessage("");

        if (!user?.user_ID) {
            setErrorMessage("Ingen inloggad användare hittades.");
            return;
        }

        if (password.length < 8) {
            setErrorMessage("CLI-lösenordet måste vara minst 8 tecken.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Lösenorden matchar inte.");
            return;
        }

        try {
            setIsSaving(true);

            const response = await axios.post("/api/user/set-cli-password", {
                user_ID: user.user_ID,
                password,
            });

            if (!response.data?.success) {
                setErrorMessage(
                    response.data?.message ||
                        response.data?.error ||
                        "Kunde inte skapa CLI-lösenord.",
                );
                return;
            }

            setPassword("");
            setConfirmPassword("");

            setSuccessMessage(
                response.data?.message ||
                    "CLI-lösenordet har skapats. Du kan nu logga in med NodeCore CLI.",
            );
        } catch (error) {
            console.error("Failed to set CLI password:", error);

            setErrorMessage(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Kunde inte skapa CLI-lösenord.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-300">
                    <UserCircle2 className="h-4 w-4" />
                    Account settings
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Konto
                </h1>

                <p className="mt-2 max-w-2xl text-base leading-7 text-slate-400">
                    Hantera ditt konto och skapa ett separat lösenord för att
                    kunna använda NodeCore CLI från terminalen.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
                <Card className="border-slate-800 bg-slate-900/95 shadow-xl shadow-black/20">
                    <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300">
                                <UserCircle2 className="h-7 w-7" />
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-400">
                                    Inloggad användare
                                </p>

                                <h2 className="mt-1 truncate text-2xl font-black text-white">
                                    {user?.display_name ||
                                        user?.username ||
                                        "Okänd användare"}
                                </h2>

                                <p className="mt-1 truncate text-sm text-slate-400">
                                    {user?.email || "Ingen e-post sparad"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            <InfoRow
                                label="User ID"
                                value={user?.user_ID || "N/A"}
                            />

                            <InfoRow
                                label="Username"
                                value={user?.username || "N/A"}
                            />

                            <InfoRow
                                label="CLI login"
                                value={
                                    user?.email || user?.username
                                        ? user.email || user.username
                                        : "N/A"
                                }
                            />
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />

                                <div>
                                    <p className="font-black text-white">
                                        Separat CLI-lösenord
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Google-login fortsätter fungera som
                                        vanligt. CLI-lösenordet används bara i
                                        terminalen.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/95 shadow-xl shadow-black/20">
                    <CardContent className="p-5 sm:p-6">
                        <div className="mb-6 flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300">
                                <TerminalSquare className="h-7 w-7" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-white">
                                    NodeCore CLI-lösenord
                                </h2>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                                    Skapa ett lösenord för att kunna logga in
                                    med CLI även om kontot skapades med Google.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="text-sm font-black text-slate-200">
                                    Nytt CLI-lösenord
                                </label>

                                <div className="relative mt-2">
                                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(event.target.value)
                                        }
                                        placeholder="Minst 8 tecken"
                                        className="h-13 w-full rounded-2xl border border-slate-700 bg-slate-950 px-12 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>

                                <div className="mt-3">
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-500">
                                            Styrka
                                        </span>

                                        <span
                                            className={`font-black ${passwordStrength.textClass}`}
                                        >
                                            {passwordStrength.label}
                                        </span>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${passwordStrength.className}`}
                                            style={{
                                                width: `${passwordStrength.value}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-black text-slate-200">
                                    Bekräfta CLI-lösenord
                                </label>

                                <div className="relative mt-2">
                                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) =>
                                            setConfirmPassword(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Upprepa lösenord"
                                        className="h-13 w-full rounded-2xl border border-slate-700 bg-slate-950 px-12 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>

                                {confirmPassword &&
                                    password !== confirmPassword && (
                                        <p className="mt-2 text-sm font-semibold text-red-300">
                                            Lösenorden matchar inte.
                                        </p>
                                    )}
                            </div>

                            {errorMessage && (
                                <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                    <p>{errorMessage}</p>
                                </div>
                            )}

                            {successMessage && (
                                <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                                    <p>{successMessage}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={!canSubmit}
                                className="h-12 w-full rounded-2xl bg-blue-600 font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Sparar...
                                    </>
                                ) : (
                                    <>
                                        <KeyRound className="mr-2 h-5 w-5" />
                                        Skapa CLI-lösenord
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                            <p className="text-sm font-black text-white">
                                Använd sedan CLI så här:
                            </p>

                            <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-blue-200">
                                <code>
                                    {`nodecore user login --username ${user?.email || user?.username || "din-email"} --password ditt-cli-lösenord

nodecore devices list
nodecore device status -d 200002`}
                                </code>
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
            <span className="text-sm font-bold text-slate-400">{label}</span>
            <span className="truncate text-sm font-black text-white">
                {value}
            </span>
        </div>
    );
}
