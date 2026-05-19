import { useState } from "react";
import { Search, MapPinned, Loader2, AlertCircle } from "lucide-react";

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

export default function LocationSearchCard({
    onLocationSelected,

    title = "Sök plats",
    description = "Sök en adress och använd platsen i kartan.",
    label = "Adress",
    placeholder = "Drottninggatan 1 Stockholm",

    icon = MapPinned,
    tone = "emerald",

    matchedTitle = "Matchad adress",
    buttonText = "Sök",
    loadingText = "Söker",
}) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [matchedAddress, setMatchedAddress] = useState("");

    const Icon = icon;

    const toneClasses = getToneClasses(tone);

    async function handleSearch(e) {
        e.preventDefault();

        setError("");
        setMatchedAddress("");

        if (!query.trim()) {
            setError("Skriv in en adress.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/geocode", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: query.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Kunde inte hitta adressen");
            }

            const location = {
                lat: Number(data.lat),
                lng: Number(data.lng ?? data.lon),
                matchedAddress: data.matched_address,
                provider: data.provider,
            };

            if (
                Number.isNaN(location.lat) ||
                Number.isNaN(location.lng) ||
                !Number.isFinite(location.lat) ||
                !Number.isFinite(location.lng)
            ) {
                throw new Error("Ogiltiga koordinater från servern");
            }

            setMatchedAddress(location.matchedAddress);
            onLocationSelected?.(location);
        } catch (err) {
            setError(err.message || "Något gick fel vid adressökningen");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full border-slate-200 bg-white/90 text-slate-950 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-white">
            <CardHeader className="space-y-4">
                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses.iconBg}`}
                >
                    <Icon className={`h-6 w-6 ${toneClasses.iconText}`} />
                </div>

                <div>
                    <CardTitle className="text-2xl text-slate-900 dark:text-white">
                        {title}
                    </CardTitle>

                    <CardDescription className="text-slate-600 dark:text-slate-400">
                        {description}
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSearch} className="space-y-5">
                    <div className="space-y-2">
                        <Label
                            htmlFor="location-query"
                            className="text-slate-800 dark:text-slate-200"
                        >
                            {label}
                        </Label>

                        <div className="flex gap-2">
                            <Input
                                id="location-query"
                                type="text"
                                placeholder={placeholder}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                            />

                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {loadingText}
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        {buttonText}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {matchedAddress && (
                        <div
                            className={`rounded-lg border px-3 py-3 text-sm ${toneClasses.successBox}`}
                        >
                            <div className="flex items-start gap-2">
                                <Icon className="mt-0.5 h-4 w-4 shrink-0" />

                                <div>
                                    <p className="font-medium">
                                        {matchedTitle}
                                    </p>
                                    <p className="mt-1">{matchedAddress}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-600 dark:text-red-300">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>{error}</p>
                            </div>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}

function getToneClasses(tone) {
    if (tone === "blue") {
        return {
            iconBg: "bg-blue-500/15 dark:bg-blue-500/20",
            iconText: "text-blue-600 dark:text-blue-400",
            successBox:
                "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        };
    }

    if (tone === "violet") {
        return {
            iconBg: "bg-violet-500/15 dark:bg-violet-500/20",
            iconText: "text-violet-600 dark:text-violet-400",
            successBox:
                "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        };
    }

    return {
        iconBg: "bg-emerald-500/15 dark:bg-emerald-500/20",
        iconText: "text-emerald-600 dark:text-emerald-400",
        successBox:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
}
