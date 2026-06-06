import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    AlertCircle,
    Bell,
    Bluetooth,
    Box,
    CheckCircle2,
    ChevronDown,
    CirclePlus,
    LogOut,
    MapPinned,
    Menu,
    Moon,
    Radar,
    Radio,
    Route as RouteIcon,
    Sun,
    X,
    MapPinHouse,
    UserCircle2,
    TerminalSquare,
    Cpu,
    Activity, // <-- Finns redan i din lista
    RefreshCw, // <-- Lägg till om du vill ha kretslopps-loopen
} from "lucide-react";

import { socket } from "@/lib/socket";
import { useAuthStore } from "../store/authStore";
import logo from "../assets/img/mobil-logo.png";

import { Button } from "@/components/ui/button";

const SELECTED_TRANSPORT_STORAGE_KEY = "selected_data_transport";

const PUBLIC_PROTECTED_PATHS = [
    "/landing-page",
    "/register-device",
    "/account",
];

const DEVICE_REQUIRED_PATHS = ["/device-events"];
const DEVICE_REQUIRED_PATH_PREFIXES = ["/devices/"];

const CELLULAR_ONLY_PATHS = [
    "/dashboard",
    "/work-areas",
    "/geofence",
    "/mock-cellular-route",
    "/device-control",
];

const BLE_ONLY_PATHS = ["/motion-live", "/mock-motion-session"];

function isExactPath(pathname, paths) {
    return paths.includes(pathname);
}

function startsWithAny(pathname, prefixes) {
    return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function isPublicProtectedPath(pathname) {
    return isExactPath(pathname, PUBLIC_PROTECTED_PATHS);
}

function isDeviceRequiredPath(pathname) {
    return (
        isExactPath(pathname, DEVICE_REQUIRED_PATHS) ||
        startsWithAny(pathname, DEVICE_REQUIRED_PATH_PREFIXES)
    );
}

function isCellularOnlyPath(pathname) {
    return isExactPath(pathname, CELLULAR_ONLY_PATHS);
}

function isBleOnlyPath(pathname) {
    return isExactPath(pathname, BLE_ONLY_PATHS);
}

function isAllowedProtectedPath(pathname, deviceGroups) {
    if (isPublicProtectedPath(pathname)) {
        return true;
    }

    if (!deviceGroups.totalCount) {
        return false;
    }

    if (isDeviceRequiredPath(pathname)) {
        return true;
    }

    if (isCellularOnlyPath(pathname)) {
        return deviceGroups.hasCellular;
    }

    if (isBleOnlyPath(pathname)) {
        return deviceGroups.hasBle;
    }

    return true;
}

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);
    } catch (error) {
        console.warn("Could not parse stored user:", error);
        return null;
    }
}

function normalizeTransport(value) {
    const transport = String(value || "cellular").toLowerCase();

    if (transport === "ble") return "ble";
    return "cellular";
}

function getRows(responseData) {
    if (Array.isArray(responseData)) {
        return responseData;
    }

    if (
        Array.isArray(responseData?.data) &&
        Array.isArray(responseData.data[0])
    ) {
        return responseData.data[0];
    }

    if (Array.isArray(responseData?.data)) {
        return responseData.data;
    }

    if (Array.isArray(responseData?.data?.data)) {
        return responseData.data.data;
    }

    if (Array.isArray(responseData?.result)) {
        return responseData.result;
    }

    if (Array.isArray(responseData?.devices)) {
        return responseData.devices;
    }

    return [];
}

function normalizeDevicesResponse(responseData) {
    return getRows(responseData)
        .filter((device) => device && device.device_ID !== undefined)
        .map((device) => ({
            device_ID: Number(device.device_ID),
            device_name:
                device.device_name ||
                device.name ||
                `Device ${device.device_ID}`,
            data_transport: normalizeTransport(device.data_transport),
            last_seen: device.last_seen ?? null,
            battery_percent: device.battery_percent ?? null,
            firmware_version: device.firmware_version ?? null,
            connection_status: device.connection_status ?? null,
        }));
}

function normalizeBleDevicesResponse(responseData) {
    return getRows(responseData)
        .filter((device) => device && device.device_ID !== undefined)
        .map((device) => ({
            device_ID: Number(device.device_ID),
            device_name:
                device.device_name ||
                device.name ||
                `Device ${device.device_ID}`,
            data_transport: "ble",
            last_seen: device.last_seen ?? null,
            battery_percent: device.battery_percent ?? null,
            firmware_version: device.firmware_version ?? null,
            connection_status: device.connection_status ?? null,
        }));
}

function mergeDevices(...deviceLists) {
    const map = new Map();

    deviceLists.flat().forEach((device) => {
        if (!device || !Number.isFinite(Number(device.device_ID))) return;

        const key = String(device.device_ID);
        const existing = map.get(key) || {};

        map.set(key, {
            ...existing,
            ...device,
            device_ID: Number(device.device_ID),
            device_name:
                device.device_name ||
                existing.device_name ||
                `Device ${device.device_ID}`,
            data_transport:
                device.data_transport || existing.data_transport || "cellular",
            last_seen: device.last_seen ?? existing.last_seen ?? null,
            battery_percent:
                device.battery_percent ?? existing.battery_percent ?? null,
            firmware_version:
                device.firmware_version ?? existing.firmware_version ?? null,
            connection_status:
                device.connection_status ?? existing.connection_status ?? null,
        });
    });

    return Array.from(map.values()).sort((a, b) => {
        if (a.data_transport !== b.data_transport) {
            return a.data_transport.localeCompare(b.data_transport);
        }

        return Number(a.device_ID) - Number(b.device_ID);
    });
}

function getDeviceGroups(devices) {
    const cellularDevices = devices.filter(
        (device) => device.data_transport === "cellular",
    );

    const bleDevices = devices.filter(
        (device) => device.data_transport === "ble",
    );

    return {
        cellularDevices,
        bleDevices,
        cellularCount: cellularDevices.length,
        bleCount: bleDevices.length,
        totalCount: devices.length,
        hasCellular: cellularDevices.length > 0,
        hasBle: bleDevices.length > 0,
    };
}

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
    const distance = alert.device_area_distance_m ?? alert.status_value;

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

    const [userDevices, setUserDevices] = useState([]);
    const [devicesLoaded, setDevicesLoaded] = useState(false);
    const [transportSelectorOpen, setTransportSelectorOpen] = useState(false);

    const [selectedTransport, setSelectedTransport] = useState(() => {
        const storedTransport = localStorage.getItem(
            SELECTED_TRANSPORT_STORAGE_KEY,
        );

        if (storedTransport === "cellular" || storedTransport === "ble") {
            return storedTransport;
        }

        return "cellular";
    });

    const user = getStoredUser();
    const userId = user?.user_ID || null;

    const deviceGroups = useMemo(
        () => getDeviceGroups(userDevices),
        [userDevices],
    );

    const selectedIsCellular = selectedTransport === "cellular";
    const selectedIsBle = selectedTransport === "ble";

    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("theme");

        if (savedTheme === "dark" || savedTheme === "light") {
            return savedTheme;
        }

        return "light";
    });

    const fetchUserDevices = useCallback(async () => {
        if (!userId) {
            setUserDevices([]);
            setDevicesLoaded(true);
            return;
        }

        try {
            setDevicesLoaded(false);

            const [statusDevicesResult, bleDevicesResult] =
                await Promise.allSettled([
                    axios.get(`/api/device/status/get/all/${userId}`),
                    axios.get(`/api/device/ble/get/all/${userId}`),
                ]);

            if (
                statusDevicesResult.status === "rejected" &&
                bleDevicesResult.status === "rejected"
            ) {
                console.error(
                    "Failed to fetch navbar status devices:",
                    statusDevicesResult.reason,
                );
                console.error(
                    "Failed to fetch navbar BLE devices:",
                    bleDevicesResult.reason,
                );

                setUserDevices([]);
                return;
            }

            const statusDevices =
                statusDevicesResult.status === "fulfilled"
                    ? normalizeDevicesResponse(statusDevicesResult.value.data)
                    : [];

            const bleDevices =
                bleDevicesResult.status === "fulfilled"
                    ? normalizeBleDevicesResponse(bleDevicesResult.value.data)
                    : [];

            const devices = mergeDevices(statusDevices, bleDevices);
            const groups = getDeviceGroups(devices);

            setUserDevices(devices);

            const storedTransport = localStorage.getItem(
                SELECTED_TRANSPORT_STORAGE_KEY,
            );

            let nextTransport = "cellular";

            if (storedTransport === "cellular" && groups.hasCellular) {
                nextTransport = "cellular";
            } else if (storedTransport === "ble" && groups.hasBle) {
                nextTransport = "ble";
            } else if (groups.hasCellular) {
                nextTransport = "cellular";
            } else if (groups.hasBle) {
                nextTransport = "ble";
            }

            setSelectedTransport(nextTransport);
            localStorage.setItem(SELECTED_TRANSPORT_STORAGE_KEY, nextTransport);
        } catch (error) {
            console.error("Failed to fetch navbar devices:", error);
            setUserDevices([]);
        } finally {
            setDevicesLoaded(true);
        }
    }, [userId]);

    useEffect(() => {
        const root = document.documentElement;

        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }

        localStorage.setItem("theme", theme);
        window.dispatchEvent(new Event("theme-change"));
    }, [theme]);

    useEffect(() => {
        fetchUserDevices();
    }, [fetchUserDevices]);

    useEffect(() => {
        function handleDevicesUpdated() {
            fetchUserDevices();
        }

        function handleWindowFocus() {
            fetchUserDevices();
        }

        window.addEventListener("devices-updated", handleDevicesUpdated);
        window.addEventListener("focus", handleWindowFocus);

        return () => {
            window.removeEventListener("devices-updated", handleDevicesUpdated);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, [fetchUserDevices]);

    function selectTransport(transport) {
        if (transport === "cellular" && !deviceGroups.hasCellular) return;
        if (transport === "ble" && !deviceGroups.hasBle) return;

        setSelectedTransport(transport);
        setTransportSelectorOpen(false);
        setMobileMenuOpen(false);

        localStorage.setItem(SELECTED_TRANSPORT_STORAGE_KEY, transport);

        if (transport === "cellular") {
            navigate("/dashboard");
            return;
        }

        if (transport === "ble") {
            navigate("/motion-live");
        }
    }

    const navSections = useMemo(() => {
        const sections = [
            {
                title: "Main",
                items: [
                    {
                        to: "/landing-page",
                        activePaths: ["/", "/landing-page"],
                        label: "Landing Page",
                        icon: Box,
                        show: true,
                    },
                    {
                        to: "/dashboard",
                        activePaths: ["/dashboard"],
                        label: "Dashboard",
                        icon: MapPinHouse,
                        show: selectedIsCellular && deviceGroups.hasCellular,
                    },
                ],
            },
            {
                title: "Devices",
                items: [
                    {
                        to: "/register-device",
                        activePaths: ["/register-device"],
                        label: "Add Device",
                        icon: CirclePlus,
                        show: true,
                    },
                    {
                        to: "/device-control",
                        activePaths: ["/device-control"],
                        label: "Device Control",
                        icon: Cpu,
                        show: selectedIsCellular && deviceGroups.hasCellular,
                    },
                    {
                        to: "/device-events",
                        activePaths: ["/device-events"],
                        activePathPrefixes: ["/devices/"],
                        label: "Device Events",
                        icon: TerminalSquare,
                        show: deviceGroups.totalCount > 0,
                    },
                    {
                        to: "/device-lifecycle",
                        activePaths: ["/device-lifecycle"],
                        label: "Device Lifecycle",
                        icon: Activity,
                        show: selectedIsCellular && deviceGroups.hasCellular,
                    },
                ],
            },
            {
                title: "Cellular",
                items: [
                    {
                        to: "/work-areas",
                        activePaths: ["/work-areas"],
                        label: "Work Areas",
                        icon: MapPinned,
                        show: selectedIsCellular && deviceGroups.hasCellular,
                    },
                    {
                        to: "/geofence",
                        activePaths: ["/geofence"],
                        label: "Geofence",
                        icon: Radar,
                        show: selectedIsCellular && deviceGroups.hasCellular,
                    },
                    {
                        to: "/mock-cellular-route",
                        activePaths: ["/mock-cellular-route"],
                        label: "Mock Cellular Route",
                        icon: RouteIcon,
                        show: selectedIsCellular && deviceGroups.hasCellular,
                    },
                ],
            },
            {
                title: "BLE",
                items: [
                    {
                        to: "/motion-live",
                        activePaths: ["/motion-live"],
                        label: "Session Live Motion",
                        icon: Radio,
                        show: selectedIsBle && deviceGroups.hasBle,
                    },
                    {
                        to: "/mock-motion-session",
                        activePaths: ["/mock-motion-session"],
                        label: "Mock BLE Session",
                        icon: Activity,
                        show: selectedIsBle && deviceGroups.hasBle,
                    },
                ],
            },
            {
                title: "System",
                items: [
                    {
                        to: "/account",
                        activePaths: ["/account"],
                        label: "Account",
                        icon: UserCircle2,
                        show: true,
                    },
                ],
            },
        ];

        const allowedWithoutDevices = [
            "/landing-page",
            "/register-device",
            "/account",
        ];

        return sections
            .map((section) => {
                let items = section.items;

                if (!devicesLoaded || !deviceGroups.totalCount) {
                    items = items.filter((item) =>
                        allowedWithoutDevices.includes(item.to),
                    );
                } else {
                    items = items.filter((item) => item.show);
                }

                return {
                    ...section,
                    items,
                };
            })
            .filter((section) => section.items.length > 0);
    }, [
        devicesLoaded,
        selectedIsCellular,
        selectedIsBle,
        deviceGroups.hasCellular,
        deviceGroups.hasBle,
        deviceGroups.totalCount,
    ]);

    useEffect(() => {
        if (!devicesLoaded) return;

        const pathname = location.pathname;

        if (isAllowedProtectedPath(pathname, deviceGroups)) {
            return;
        }

        if (!deviceGroups.totalCount) {
            navigate("/register-device", { replace: true });
            return;
        }

        if (isCellularOnlyPath(pathname) && !deviceGroups.hasCellular) {
            if (deviceGroups.hasBle) {
                setSelectedTransport("ble");
                localStorage.setItem(SELECTED_TRANSPORT_STORAGE_KEY, "ble");
                navigate("/motion-live", { replace: true });
            }

            return;
        }

        if (isBleOnlyPath(pathname) && !deviceGroups.hasBle) {
            if (deviceGroups.hasCellular) {
                setSelectedTransport("cellular");
                localStorage.setItem(
                    SELECTED_TRANSPORT_STORAGE_KEY,
                    "cellular",
                );
                navigate("/dashboard", { replace: true });
            }

            return;
        }

        if (selectedTransport === "ble" && deviceGroups.hasBle) {
            navigate("/motion-live", { replace: true });
            return;
        }

        if (selectedTransport === "cellular" && deviceGroups.hasCellular) {
            navigate("/dashboard", { replace: true });
            return;
        }

        if (deviceGroups.hasCellular) {
            setSelectedTransport("cellular");
            localStorage.setItem(SELECTED_TRANSPORT_STORAGE_KEY, "cellular");
            navigate("/dashboard", { replace: true });
            return;
        }

        if (deviceGroups.hasBle) {
            setSelectedTransport("ble");
            localStorage.setItem(SELECTED_TRANSPORT_STORAGE_KEY, "ble");
            navigate("/motion-live", { replace: true });
        }
    }, [
        devicesLoaded,
        location.pathname,
        selectedTransport,
        deviceGroups,
        navigate,
    ]);

    useEffect(() => {
        if (!userId) return;
        if (!devicesLoaded) return;

        if (!selectedIsCellular || !deviceGroups.hasCellular) {
            setLiveAlerts([]);
            setUnreadAlertCount(0);
            setAlertsOpen(false);
            return;
        }

        function handleConnect() {
            socket.emit("join-user-room", userId);
        }

        function handleGeofenceAlert(alert) {
            setLiveAlerts((prevAlerts) => [alert, ...prevAlerts].slice(0, 10));

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
    }, [
        userId,
        alertsOpen,
        selectedIsCellular,
        devicesLoaded,
        deviceGroups.hasCellular,
    ]);

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
        localStorage.removeItem(SELECTED_TRANSPORT_STORAGE_KEY);

        if (logout) {
            logout();
        }

        navigate("/login", { replace: true });
    }

    function isActive(item) {
        if (item.activePaths?.includes(location.pathname)) {
            return true;
        }

        if (
            item.activePathPrefixes?.some((prefix) =>
                location.pathname.startsWith(prefix),
            )
        ) {
            return true;
        }

        return location.pathname === item.to;
    }

    return (
        <>
            <aside className="fixed left-0 top-0 z-50 hidden h-dvh w-72 flex-col overflow-hidden border-r border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 xl:flex">
                <Link
                    to="/landing-page"
                    className="mb-4 flex shrink-0 items-center gap-3 rounded-3xl px-2 py-2 transition hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                        <img
                            src={logo}
                            alt="Nodecore IT logo"
                            className="h-10 w-10 object-contain"
                        />
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                            Nodecore IT
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            IoT Device Platform
                        </p>
                    </div>
                </Link>

                <div className="mb-4 shrink-0">
                    <TransportSelector
                        selectedTransport={selectedTransport}
                        isOpen={transportSelectorOpen}
                        setIsOpen={setTransportSelectorOpen}
                        onSelectTransport={selectTransport}
                        deviceGroups={deviceGroups}
                        devicesLoaded={devicesLoaded}
                    />
                </div>

                <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                    {navSections.map((section) => (
                        <NavSection
                            key={section.title}
                            title={section.title}
                            items={section.items}
                            isActive={isActive}
                        />
                    ))}
                </nav>

                <div className="mt-4 shrink-0 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                    {selectedIsCellular && deviceGroups.hasCellular && (
                        <button
                            type="button"
                            onClick={toggleAlerts}
                            className="relative flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                            <Bell className="h-5 w-5 shrink-0" />
                            <span className="truncate">Alerts</span>

                            {unreadAlertCount > 0 && (
                                <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white shadow">
                                    {unreadAlertCount}
                                </span>
                            )}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                        {theme === "dark" ? (
                            <>
                                <Sun className="h-5 w-5 shrink-0" />
                                <span className="truncate">Light mode</span>
                            </>
                        ) : (
                            <>
                                <Moon className="h-5 w-5 shrink-0" />
                                <span className="truncate">Dark mode</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        <span className="truncate">Logga ut</span>
                    </button>
                </div>
            </aside>

            <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 xl:hidden">
                <div className="mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <Link
                            to="/landing-page"
                            className="flex min-w-0 items-center gap-3"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                                <img
                                    src={logo}
                                    alt="Nodecore IT logo"
                                    className="h-9 w-9 object-contain"
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                                    Nodecore IT
                                </p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    IoT Platform
                                </p>
                            </div>
                        </Link>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMobileMenuOpen((prev) => !prev)}
                            className="relative h-11 w-11 shrink-0 rounded-2xl border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900"
                        >
                            {mobileMenuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}

                            {selectedIsCellular &&
                                deviceGroups.hasCellular &&
                                unreadAlertCount > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow">
                                        {unreadAlertCount}
                                    </span>
                                )}
                        </Button>
                    </div>

                    {mobileMenuOpen && (
                        <div className="mt-4 max-h-[calc(100dvh-92px)] space-y-4 overflow-y-auto border-t border-slate-200 pt-4 dark:border-slate-800">
                            <TransportSelector
                                selectedTransport={selectedTransport}
                                isOpen={transportSelectorOpen}
                                setIsOpen={setTransportSelectorOpen}
                                onSelectTransport={selectTransport}
                                deviceGroups={deviceGroups}
                                devicesLoaded={devicesLoaded}
                            />

                            <div className="space-y-5">
                                {navSections.map((section) => (
                                    <NavSection
                                        key={section.title}
                                        title={section.title}
                                        items={section.items}
                                        isActive={isActive}
                                        onNavigate={() =>
                                            setMobileMenuOpen(false)
                                        }
                                        mobile
                                    />
                                ))}
                            </div>

                            <div className="grid gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                                {selectedIsCellular &&
                                    deviceGroups.hasCellular && (
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
                                    )}

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

            {alertsOpen && selectedIsCellular && deviceGroups.hasCellular && (
                <>
                    <button
                        type="button"
                        aria-label="Stäng alerts"
                        onClick={closeAlerts}
                        className="fixed inset-0 z-[9000] bg-slate-950/40 backdrop-blur-[2px]"
                    />

                    <aside className="fixed right-0 top-0 z-[9010] flex h-dvh w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:right-4 sm:top-4 sm:h-[calc(100dvh-2rem)] sm:rounded-3xl sm:border">
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

function NavSection({ title, items, isActive, onNavigate, mobile = false }) {
    return (
        <div className="space-y-2">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {title}
            </p>

            <div className={mobile ? "grid gap-2" : "space-y-1"}>
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);

                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={onNavigate}
                            className={`flex items-center gap-3 rounded-2xl px-4 font-semibold transition ${
                                mobile ? "h-12 text-base" : "h-10 text-sm"
                            } ${
                                active
                                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg"
                                    : mobile
                                      ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                            }`}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function TransportSelector({
    selectedTransport,
    isOpen,
    setIsOpen,
    onSelectTransport,
    deviceGroups,
    devicesLoaded,
}) {
    const {
        cellularCount = 0,
        bleCount = 0,
        totalCount = 0,
        hasCellular = false,
        hasBle = false,
    } = deviceGroups || {};

    if (!devicesLoaded) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                Laddar devices...
            </div>
        );
    }

    if (!totalCount) {
        return (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Ingen device ännu. Lägg till en device.
            </div>
        );
    }

    const selectedIsBle = selectedTransport === "ble";
    const SelectedIcon = selectedIsBle ? Bluetooth : Radio;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
                <div className="flex items-center gap-2.5">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${
                            selectedIsBle ? "bg-violet-600" : "bg-blue-600"
                        }`}
                    >
                        <SelectedIcon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                            {selectedIsBle ? "BLE" : "Cellular"}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            {selectedIsBle
                                ? `${bleCount} BLE device${bleCount === 1 ? "" : "s"}`
                                : `${cellularCount} cellular device${cellularCount === 1 ? "" : "s"}`}
                        </p>
                    </div>

                    <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                            isOpen ? "rotate-180" : ""
                        }`}
                    />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                    <TransportCountBadge
                        label="Cellular"
                        value={cellularCount}
                        active={selectedTransport === "cellular"}
                        tone="blue"
                    />

                    <TransportCountBadge
                        label="BLE"
                        value={bleCount}
                        active={selectedTransport === "ble"}
                        tone="violet"
                    />
                </div>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[9999] max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-h-[420px]">
                    <TransportOption
                        icon={Radio}
                        title="Cellular"
                        text="Dashboard, work areas, geofence, mock GNSS och alerts för cellular devices."
                        count={cellularCount}
                        disabled={!hasCellular}
                        active={selectedTransport === "cellular"}
                        tone="blue"
                        onClick={() => onSelectTransport("cellular")}
                    />

                    <TransportOption
                        icon={Bluetooth}
                        title="BLE"
                        text="Motion sessions och sensorhistorik. Välj device inne på BLE-sidan."
                        count={bleCount}
                        disabled={!hasBle}
                        active={selectedTransport === "ble"}
                        tone="violet"
                        onClick={() => onSelectTransport("ble")}
                    />
                </div>
            )}
        </div>
    );
}

function TransportCountBadge({ label, value, active, tone }) {
    const activeClass =
        tone === "violet"
            ? "bg-violet-600 text-white"
            : "bg-blue-600 text-white";

    const idleClass =
        tone === "violet"
            ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
            : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";

    return (
        <div
            className={`rounded-lg px-2 py-1.5 ${
                active ? activeClass : idleClass
            }`}
        >
            <p className="text-[9px] font-bold uppercase leading-none tracking-wide opacity-80">
                {label}
            </p>
            <p className="mt-1 text-sm font-black leading-none">{value}</p>
        </div>
    );
}

function TransportOption({
    icon: Icon,
    title,
    text,
    count,
    disabled,
    active,
    tone,
    onClick,
}) {
    const iconClass = tone === "violet" ? "bg-violet-600" : "bg-blue-600";

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`mb-1 flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition last:mb-0 ${
                active
                    ? "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20 dark:text-blue-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-900"
            } ${
                disabled
                    ? "cursor-not-allowed opacity-45 hover:bg-transparent dark:hover:bg-transparent"
                    : ""
            }`}
        >
            <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${iconClass}`}
            >
                <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                        {title}
                    </p>

                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {count}
                    </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {text}
                </p>
            </div>
        </button>
    );
}
