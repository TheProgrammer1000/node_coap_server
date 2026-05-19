import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";

function normalizeOAuthUser(rawUser) {
    if (!rawUser) {
        throw new Error("OAuth login saknar användardata.");
    }

    const userId = rawUser.user_ID ?? rawUser.user_id ?? rawUser.id ?? null;

    if (!userId) {
        throw new Error("OAuth login saknar user_ID.");
    }

    return {
        user_ID: Number(userId),
        show_username:
            typeof rawUser.show_username === "string"
                ? rawUser.show_username
                : (rawUser.username ?? rawUser.email ?? ""),
        username: rawUser.username ?? "",
        email: rawUser.email ?? "",
        auth_provider: rawUser.auth_provider ?? "google",
    };
}

export default function OAuthCallback() {
    const navigate = useNavigate();

    const hasHandledCallback = useRef(false);

    const [error, setError] = useState("");

    useEffect(() => {
        if (hasHandledCallback.current) {
            return;
        }

        hasHandledCallback.current = true;

        try {
            const params = new URLSearchParams(window.location.search);

            const encodedUser = params.get("user");
            const token = params.get("token");
            const oauthError = params.get("oauth_error");

            if (oauthError) {
                throw new Error(`OAuth misslyckades: ${oauthError}`);
            }

            if (!encodedUser) {
                throw new Error("OAuth login saknar användardata.");
            }

            if (!token) {
                throw new Error("OAuth login saknar JWT-token.");
            }

            const rawUser = JSON.parse(decodeURIComponent(encodedUser));
            const normalizedUser = normalizeOAuthUser(rawUser);

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(normalizedUser));
            localStorage.setItem("isLoggedIn", "true");

            console.log("OAuth logged in user:", normalizedUser);

            navigate("/landing-page", { replace: true });
        } catch (error) {
            console.error("OAuth callback failed:", error);
            setError(error.message || "OAuth login misslyckades.");
        }
    }, [navigate]);

    return (
        <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
            <div className="absolute right-6 top-6">
                <ThemeToggle fullText={false} />
            </div>

            <section className="flex min-h-screen items-center justify-center px-6 py-12">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-6 text-center shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    {!error ? (
                        <>
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 dark:bg-blue-500/20">
                                <Loader2 className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400" />
                            </div>

                            <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">
                                Loggar in...
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                Google-kontot är verifierat. Vi sparar din
                                session och skickar dig vidare till plattformen.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
                                <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
                            </div>

                            <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">
                                Kunde inte logga in
                            </h1>

                            <p className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                                {error}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/login", { replace: true })
                                }
                                className="mt-5 h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
                            >
                                Till login
                            </button>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}
