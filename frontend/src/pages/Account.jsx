import { useMemo, useState } from "react";
import axios from "axios";
import {
    AlertCircle,
    CheckCircle2,
    KeyRound,
    Loader2,
    Lock,
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
            setErrorMessage("Lösenordet måste vara minst 8 tecken.");
            return;
        }

        try {
            setIsSaving(true);

            const response = await axios.post("/api/user/change-password", {
                user_ID: user.user_ID,
                password,
            });

            if (!response.data?.success) {
                setErrorMessage(
                    response.data?.message || "Kunde inte ändra lösenord.",
                );
                return;
            }

            setPassword("");
            setConfirmPassword("");
            setSuccessMessage("Ditt lösenord har ändrats!");
        } catch (error) {
            setErrorMessage(
                error?.response?.data?.message || "Kunde inte ändra lösenord.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-6 text-center">
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Account
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    Välj ett starkt lösenord för att skydda ditt konto.
                </p>
            </div>

            <Card className="border-slate-800 bg-slate-900/95 shadow-xl shadow-black/30">
                <CardContent className="p-6 sm:p-8">
                    <div className="mb-6 flex items-center gap-4 border-b border-slate-800 pb-5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-300">
                            <Lock className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">
                                Ändra lösenord
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-sm font-black text-slate-200">
                                Nytt lösenord
                            </label>
                            <div className="relative mt-2">
                                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Minst 8 tecken"
                                    className="h-13 w-full rounded-2xl border border-slate-700 bg-slate-950 px-12 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>

                            <div className="mt-3">
                                <div className="mb-1 flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-500">Styrka</span>
                                    <span className={`font-black ${passwordStrength.textClass}`}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${passwordStrength.className}`}
                                        style={{ width: `${passwordStrength.value}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-black text-slate-200">
                                Bekräfta lösenord
                            </label>
                            <div className="relative mt-2">
                                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Upprepa ditt nya lösenord"
                                    className="h-13 w-full rounded-2xl border border-slate-700 bg-slate-950 px-12 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>

                            {confirmPassword && password !== confirmPassword && (
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
                                "Spara nytt lösenord"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}