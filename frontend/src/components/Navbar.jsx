import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    AlertCircle,
    Bell,
    Box,
    CheckCircle2,
    CirclePlus,
    Home,
    LogOut,
    MapPinned,
    Menu,
    Moon,
    Radar,
    Sun,
    X,
} from "lucide-react";

import { socket } from "@/lib/socket";
import { useAuthStore } from "../store/authStore";
import logo from "../assets/img/mobil-logo.png";

import { Button } from "@/components/ui/button";

function getAlertToStatus(alert) {
    return alert.to_status ?? alert.toStatus ?? alert.status ?? "unknown";
}

function getAlertFromStatus(alert) {
    return alert.from_status ?? alert.fromStatus ?? "unknown";
}

function getAlertTime(alert) {
    return alert.data_timestamp ?? alert.created_at ?? alert.createdAt ?? null;
}

function getAlertTitle(alert) {
    const toStatus = getAlertToStatus(alert);

    if (toStatus === "outside") return "Device lämnade zonen";
    if (toStatus === "inside") return "Device är tillbaka i zonen";

    return "Geofence-status ändrades";
}

function getAlertDistanceText(alert) {
    const toStatus = getAlertToStatus(alert);
    const distance = alert.device_area_distance_m;

    if (distance === null || distance === undefined) {
        return "Avstånd saknas";
    }

    if (toStatus === "outside") {
        return `Utanför gränsen: ${distance} m`;
    }

    if (toStatus === "inside") {
        return `Kvar till gräns: ${distance} m`;
    }

    return `Avstånd: ${distance} m`;
}

function getAlertClass(alert) {
    const toStatus = getAlertToStatus(alert);

    if (toStatus === "outside") {
        return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    }

    if (toStatus === "inside") {
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }

    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const logout = useAuthStore((state) => state.logout);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [liveAlerts, setLiveAlerts] = useState([]);
    const [unreadAlertCount, setUnreadAlertCount] = useState(0);
    const [alertsOpen, setAlertsOpen] = useState(false);

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_ID || null;

    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("theme");

        if (savedTheme === "dark" || savedTheme === "light") {
            return savedTheme;
        }

        return "light";
    });

    useEffect(() => {
        const root = document.documentElement;

        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }

        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        if (!userId) return;

        function handleConnect() {
            socket.emit("join-user-room", userId);
        }

        function handleGeofenceAlert(alert) {
            console.log("Navbar geofence alert:", alert);

            setLiveAlerts((prevAlerts) => {
                return [alert, ...prevAlerts].slice(0, 10);
            });

            if (!alertsOpen) {
                setUnreadAlertCount((prevCount) => prevCount + 1);
            }
        }

        socket.on("connect", handleConnect);
        socket.on("geofence:alert", handleGeofenceAlert);

        if (!socket.connected) {
            socket.connect();
        } else {
            handleConnect();
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("geofence:alert", handleGeofenceAlert);
        };
    }, [userId, alertsOpen]);

    function toggleTheme() {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }

    function toggleAlerts() {
        setAlertsOpen((prev) => {
            const nextOpen = !prev;

            if (nextOpen) {
                setUnreadAlertCount(0);
            }

            return nextOpen;
        });

        setMobileMenuOpen(false);
    }

    function closeAlerts() {
        setAlertsOpen(false);
    }

    function clearAlerts() {
        setLiveAlerts([]);
        setUnreadAlertCount(0);
        setAlertsOpen(false);
    }

    function handleLogout() {
        if (userId) {
            socket.emit("leave-user-room", userId);
        }

        if (socket.connected) {
            socket.disconnect();
        }

        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("theme");

        if (logout) {
            logout();
        }

        navigate("/login", { replace: true });
    }

    function isActive(path) {
        return location.pathname === path;
    }

    function navButtonClass(path) {
        return isActive(path)
            ? "rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg hover:from-blue-600 hover:to-violet-600"
            : "rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
    }

    const navLinks = [
        {
            to: "/home",
            label: "Dashboard",
            icon: Home,
        },
        {
            to: "/product",
            label: "Platform",
            icon: Box,
        },
        {
            to: "/register-device",
            label: "Add Device",
            icon: CirclePlus,
        },
        {
            to: "/work-areas",
            label: "Work Areas",
            icon: MapPinned,
        },
        {
            to: "/geofence",
            label: "Geofence",
            icon: Radar,
        },
    ];

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
                    <div className="flex items-center justify-between gap-4">
                        <Link
                            to="/home"
                            className="flex w-[190px] shrink-0 items-center gap-3 2xl:w-[230px]"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                                <img
                                    src={logo}
                                    alt="GeoNode logo"
                                    className="h-10 w-10 object-contain"
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                                    GeoNode
                                </p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    IoT GNSS Tracking Platform
                                </p>
                            </div>
                        </Link>

                        <nav className="hidden flex-1 items-center justify-center gap-2 xl:flex">
                            {navLinks.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <Button
                                        key={item.to}
                                        asChild
                                        variant="ghost"
                                        className={`h-11 px-4 text-sm font-semibold ${navButtonClass(
                                            item.to,
                                        )}`}
                                    >
                                        <Link to={item.to}>
                                            <Icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </Button>
                                );
                            })}
                        </nav>

                        <div className="hidden shrink-0 items-center gap-2 xl:flex">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={toggleAlerts}
                                className="relative h-11 rounded-2xl border-slate-200 bg-white px-4 text-sm font-semibold dark:border-slate-800 dark:bg-slate-900"
                            >
                                <Bell className="mr-2 h-4 w-4" />
                                Alerts
                                {unreadAlertCount > 0 && (
                                    <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white shadow">
                                        {unreadAlertCount}
                                    </span>
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={toggleTheme}
                                className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-sm font-semibold dark:border-slate-800 dark:bg-slate-900"
                            >
                                {theme === "dark" ? (
                                    <>
                                        <Sun className="mr-2 h-4 w-4" />
                                        Light
                                    </>
                                ) : (
                                    <>
                                        <Moon className="mr-2 h-4 w-4" />
                                        Dark
                                    </>
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleLogout}
                                className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-sm font-semibold dark:border-slate-800 dark:bg-slate-900"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logga ut
                            </Button>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMobileMenuOpen((prev) => !prev)}
                            className="relative h-11 w-11 shrink-0 rounded-2xl border-slate-200 bg-white p-0 xl:hidden dark:border-slate-800 dark:bg-slate-900"
                        >
                            {mobileMenuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}

                            {unreadAlertCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow">
                                    {unreadAlertCount}
                                </span>
                            )}
                        </Button>
                    </div>

                    {mobileMenuOpen && (
                        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 xl:hidden dark:border-slate-800">
                            <div className="grid gap-3">
                                {navLinks.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <Button
                                            key={item.to}
                                            asChild
                                            variant="ghost"
                                            className={`h-12 w-full justify-start rounded-2xl px-4 text-base font-semibold ${navButtonClass(
                                                item.to,
                                            )}`}
                                        >
                                            <Link
                                                to={item.to}
                                                onClick={() =>
                                                    setMobileMenuOpen(false)
                                                }
                                            >
                                                <Icon className="mr-2 h-5 w-5" />
                                                {item.label}
                                            </Link>
                                        </Button>
                                    );
                                })}
                            </div>

                            <div className="grid gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={toggleAlerts}
                                    className="relative h-12 w-full justify-start rounded-2xl border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <Bell className="mr-2 h-5 w-5" />
                                    Alerts
                                    {unreadAlertCount > 0 && (
                                        <span className="absolute right-4 top-1/2 flex h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white shadow">
                                            {unreadAlertCount}
                                        </span>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={toggleTheme}
                                    className="h-12 w-full justify-start rounded-2xl border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    {theme === "dark" ? (
                                        <>
                                            <Sun className="mr-2 h-5 w-5" />
                                            Byt till light mode
                                        </>
                                    ) : (
                                        <>
                                            <Moon className="mr-2 h-5 w-5" />
                                            Byt till dark mode
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleLogout}
                                    className="h-12 w-full justify-start rounded-2xl border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <LogOut className="mr-2 h-5 w-5" />
                                    Logga ut
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {alertsOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Stäng alerts"
                        onClick={closeAlerts}
                        className="fixed inset-0 z-[80] bg-slate-950/30 backdrop-blur-[1px]"
                    />

                    <aside className="fixed right-0 top-0 z-[90] flex h-dvh w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:right-4 sm:top-4 sm:h-[calc(100dvh-2rem)] sm:rounded-3xl sm:border">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <div>
                                <p className="text-lg font-bold text-slate-950 dark:text-white">
                                    Live alerts
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Senaste geofence-händelserna
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeAlerts}
                                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {liveAlerts.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    Inga alerts ännu.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {liveAlerts.map((alert, index) => {
                                        const toStatus =
                                            getAlertToStatus(alert);
                                        const isOutside =
                                            toStatus === "outside";

                                        return (
                                            <div
                                                key={`${alert.device_ID}-${getAlertTime(alert) ?? index}-${index}`}
                                                className={`rounded-2xl border p-4 text-sm ${getAlertClass(
                                                    alert,
                                                )}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="rounded-xl bg-white/70 p-2 dark:bg-slate-950/40">
                                                        {isOutside ? (
                                                            <AlertCircle className="h-5 w-5" />
                                                        ) : (
                                                            <CheckCircle2 className="h-5 w-5" />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold">
                                                            {getAlertTitle(
                                                                alert,
                                                            )}
                                                        </p>

                                                        <p className="mt-1">
                                                            Device{" "}
                                                            <span className="font-semibold">
                                                                {
                                                                    alert.device_ID
                                                                }
                                                            </span>{" "}
                                                            gick från{" "}
                                                            <span className="font-semibold">
                                                                {getAlertFromStatus(
                                                                    alert,
                                                                )}
                                                            </span>{" "}
                                                            till{" "}
                                                            <span className="font-semibold">
                                                                {getAlertToStatus(
                                                                    alert,
                                                                )}
                                                            </span>
                                                            .
                                                        </p>

                                                        <p className="mt-1 font-semibold">
                                                            {getAlertDistanceText(
                                                                alert,
                                                            )}
                                                        </p>

                                                        {alert.matchedAddress && (
                                                            <p className="mt-1 line-clamp-2 opacity-80">
                                                                Zon:{" "}
                                                                {
                                                                    alert.matchedAddress
                                                                }
                                                            </p>
                                                        )}

                                                        <p className="mt-2 text-xs opacity-70">
                                                            Tid:{" "}
                                                            {getAlertTime(
                                                                alert,
                                                            ) ?? "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {liveAlerts.length > 0 && (
                            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={clearAlerts}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    Rensa alerts
                                </button>
                            </div>
                        )}
                    </aside>
                </>
            )}
        </>
    );
}
