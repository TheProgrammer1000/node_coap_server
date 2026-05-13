import { Fragment, useEffect, useMemo, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    Polyline,
    useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
    Save,
    CheckCircle2,
    AlertCircle,
    MapPinned,
    Smartphone,
    LocateFixed,
    Info,
} from "lucide-react";
import axios from "axios";

import LocationSearchCard from "../components/LocationSearchCard";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function getPointDeviceId(point) {
    return point?.device_ID ?? point?.device_id ?? null;
}

function getWorkAreaKey(area) {
    if (area.id) return `id-${area.id}`;

    return [
        "area",
        area.device_ID,
        area.lat,
        area.lon,
        area.circle_radius_m,
    ].join("-");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function parseTimestamp(value) {
    if (!value) return 0;

    const normalized = String(value).includes("T")
        ? String(value)
        : String(value).replace(" ", "T");

    const time = Date.parse(normalized);

    return Number.isFinite(time) ? time : 0;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return "N/A";

    const normalized = String(timestamp).includes("T")
        ? String(timestamp)
        : String(timestamp).replace(" ", "T");

    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) return "N/A";

    return new Intl.DateTimeFormat("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function normalizeGnssResponse(result) {
    const data = result?.data;

    if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0];
    }

    if (Array.isArray(data)) {
        return data;
    }

    return [];
}

function getLatestDevicePositions(rows) {
    const latestByDevice = new Map();

    for (const row of rows) {
        const deviceId = getPointDeviceId(row);

        if (!deviceId) continue;

        const key = String(deviceId);
        const existing = latestByDevice.get(key);

        const rowTime = parseTimestamp(row.data_timestamp ?? row.created_at);
        const existingTime = parseTimestamp(
            existing?.data_timestamp ?? existing?.created_at,
        );

        if (!existing || rowTime > existingTime) {
            latestByDevice.set(key, row);
        }
    }

    return Array.from(latestByDevice.values()).filter((device) => {
        const lat = Number(device.lat);
        const lon = Number(device.lon);

        return Number.isFinite(lat) && Number.isFinite(lon);
    });
}

function upsertDevicePosition(previousRows, newPoint) {
    const deviceId = getPointDeviceId(newPoint);

    if (!deviceId) {
        return [newPoint, ...previousRows];
    }

    const filteredRows = previousRows.filter((row) => {
        return String(getPointDeviceId(row)) !== String(deviceId);
    });

    return [newPoint, ...filteredRows];
}

function getDeviceMarkerIcon(label) {
    const safeLabel = escapeHtml(label);

    return L.divIcon({
        className: "",
        html: `
            <div style="
                display:flex;
                align-items:center;
                gap:7px;
                white-space:nowrap;
            ">
                <div style="
                    width:18px;
                    height:18px;
                    border-radius:9999px;
                    background:#475569;
                    border:3px solid white;
                    box-shadow:0 8px 20px rgba(15,23,42,0.35);
                    flex-shrink:0;
                "></div>

                <div style="
                    max-width:150px;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    background:rgba(15,23,42,0.9);
                    color:white;
                    border:1px solid rgba(226,232,240,0.35);
                    border-radius:9999px;
                    padding:4px 9px;
                    font-size:11px;
                    font-weight:800;
                    box-shadow:0 8px 20px rgba(15,23,42,0.28);
                ">
                    ${safeLabel}
                </div>
            </div>
        `,
        iconSize: [180, 28],
        iconAnchor: [9, 14],
        popupAnchor: [0, -14],
    });
}

function getWorkAreaMarkerIcon(isSelected = false) {
    const background = isSelected ? "#10b981" : "#64748b";
    const border = isSelected ? "#bbf7d0" : "#e2e8f0";
    const label = isSelected ? "VALT" : "AREA";

    return L.divIcon({
        className: "",
        html: `
            <div style="
                width:${isSelected ? 54 : 46}px;
                height:${isSelected ? 38 : 34}px;
                border-radius:14px 14px 14px 4px;
                background:${background};
                border:4px solid ${border};
                color:white;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:9px;
                font-weight:900;
                letter-spacing:0.4px;
                box-shadow:0 10px 24px rgba(15,23,42,0.35);
                transform:rotate(-8deg);
            ">
                <span style="transform:rotate(8deg);">${label}</span>
            </div>
        `,
        iconSize: [isSelected ? 54 : 46, isSelected ? 38 : 34],
        iconAnchor: [isSelected ? 27 : 23, isSelected ? 19 : 17],
        popupAnchor: [0, -18],
    });
}

function MapLegend() {
    const map = useMap();

    useEffect(() => {
        const legend = L.control({ position: "bottomleft" });

        legend.onAdd = () => {
            const div = L.DomUtil.create("div", "work-area-map-legend");

            div.innerHTML = `
                <div style="
                    background:rgba(15,23,42,0.92);
                    color:white;
                    padding:12px 14px;
                    border-radius:16px;
                    box-shadow:0 12px 30px rgba(15,23,42,0.28);
                    font-size:12px;
                    line-height:1.4;
                    min-width:220px;
                ">
                    <div style="font-weight:800;margin-bottom:8px;">Förklaring</div>

                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <span style="
                            width:18px;height:18px;border-radius:9999px;
                            background:#475569;border:3px solid white;
                            display:inline-block;
                        "></span>
                        <span>Device-position</span>
                    </div>

                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <span style="
                            width:34px;height:24px;border-radius:10px 10px 10px 3px;
                            background:#10b981;border:3px solid #bbf7d0;
                            display:inline-flex;align-items:center;justify-content:center;
                            font-size:7px;font-weight:900;color:white;
                        ">VALT</span>
                        <span>Markerat arbetsområde</span>
                    </div>

                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="
                            width:30px;height:22px;border-radius:10px 10px 10px 3px;
                            background:#64748b;border:3px solid #e2e8f0;
                            display:inline-flex;align-items:center;justify-content:center;
                            font-size:7px;font-weight:900;color:white;
                        ">AREA</span>
                        <span>Annat arbetsområde</span>
                    </div>
                </div>
            `;

            L.DomEvent.disableClickPropagation(div);

            return div;
        };

        legend.addTo(map);

        return () => {
            legend.remove();
        };
    }, [map]);

    return null;
}

function ResizeMap() {
    const map = useMap();

    useEffect(() => {
        const timer = window.setTimeout(() => {
            map.invalidateSize();
        }, 150);

        function handleResize() {
            map.invalidateSize();
        }

        window.addEventListener("resize", handleResize);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("resize", handleResize);
        };
    }, [map]);

    return null;
}

function FlyToLocation({ selectedLocation }) {
    const map = useMap();

    useEffect(() => {
        if (!selectedLocation) return;

        const timer = window.setTimeout(() => {
            map.invalidateSize();

            map.flyTo([selectedLocation.lat, selectedLocation.lng], 16, {
                duration: 1,
            });
        }, 150);

        return () => {
            window.clearTimeout(timer);
        };
    }, [selectedLocation, map]);

    return null;
}

function FlyToDevicePosition({ devicePosition, focusRequest }) {
    const map = useMap();

    useEffect(() => {
        if (!devicePosition || !focusRequest) return;

        const lat = Number(devicePosition.lat);
        const lon = Number(devicePosition.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const timer = window.setTimeout(() => {
            map.invalidateSize();

            map.flyTo([lat, lon], 16, {
                duration: 1,
            });
        }, 150);

        return () => {
            window.clearTimeout(timer);
        };
    }, [devicePosition, focusRequest, map]);

    return null;
}

function FlyToWorkArea({ workArea, focusRequest }) {
    const map = useMap();

    useEffect(() => {
        if (!workArea || !focusRequest) return;

        const lat = Number(workArea.lat);
        const lon = Number(workArea.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const timer = window.setTimeout(() => {
            map.invalidateSize();

            map.flyTo([lat, lon], 15, {
                duration: 1,
            });
        }, 150);

        return () => {
            window.clearTimeout(timer);
        };
    }, [workArea, focusRequest, map]);

    return null;
}

function FitMapToWorkAreas({ workAreas, devicePositions, selectedLocation }) {
    const map = useMap();

    useEffect(() => {
        const points = [];

        if (workAreas && workAreas.length > 0) {
            workAreas.forEach((area) => {
                const lat = Number(area.lat);
                const lon = Number(area.lon);

                if (Number.isFinite(lat) && Number.isFinite(lon)) {
                    points.push([lat, lon]);
                }
            });
        }

        if (devicePositions && devicePositions.length > 0) {
            devicePositions.forEach((device) => {
                const lat = Number(device.lat);
                const lon = Number(device.lon);

                if (Number.isFinite(lat) && Number.isFinite(lon)) {
                    points.push([lat, lon]);
                }
            });
        }

        if (selectedLocation) {
            points.push([selectedLocation.lat, selectedLocation.lng]);
        }

        if (points.length === 0) return;

        const bounds = L.latLngBounds(points);

        const timer = window.setTimeout(() => {
            map.invalidateSize();

            if (points.length === 1) {
                map.setView(points[0], 15);
            } else {
                map.fitBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 14,
                });
            }
        }, 150);

        return () => {
            window.clearTimeout(timer);
        };
    }, [workAreas, devicePositions, selectedLocation, map]);

    return null;
}

function isEmptyWorkAreaResponse(result) {
    const message = String(result?.msg || result?.message || "").toLowerCase();

    return (
        message.includes("no userid attach to area locations") ||
        message.includes("no user attach to area locations") ||
        message.includes("no area locations") ||
        message.includes("no location areas") ||
        message.includes("inga arbetsområden") ||
        message.includes("inga områden") ||
        message.includes("not found")
    );
}

function getWorkAreasFromResponse(result) {
    if (Array.isArray(result?.devices)) return result.devices;
    if (Array.isArray(result?.areas)) return result.areas;
    if (Array.isArray(result?.locations)) return result.locations;
    if (Array.isArray(result?.location_areas)) return result.location_areas;
    if (Array.isArray(result?.data)) return result.data;

    return [];
}

export default function WorkAreas() {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [radius, setRadius] = useState(100);

    const [workAreas, setWorkAreas] = useState([]);
    const [workAreasLoading, setWorkAreasLoading] = useState(true);
    const [workAreasError, setWorkAreasError] = useState("");

    const [selectedWorkAreaKey, setSelectedWorkAreaKey] = useState("");
    const [focusWorkAreaRequest, setFocusWorkAreaRequest] = useState(0);

    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");
    const [deviceLoading, setDeviceLoading] = useState(true);
    const [deviceError, setDeviceError] = useState("");

    const [devicePositions, setDevicePositions] = useState([]);
    const [devicePositionsLoading, setDevicePositionsLoading] = useState(true);

    const [focusDeviceRequest, setFocusDeviceRequest] = useState(0);

    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_ID || null;

    const latestDevicePositions = useMemo(() => {
        return getLatestDevicePositions(devicePositions);
    }, [devicePositions]);

    const selectedDevice = useMemo(() => {
        return devices.find(
            (device) => String(device.device_ID) === String(selectedDeviceId),
        );
    }, [devices, selectedDeviceId]);

    const selectedDevicePosition = useMemo(() => {
        return latestDevicePositions.find(
            (device) =>
                String(getPointDeviceId(device)) === String(selectedDeviceId),
        );
    }, [latestDevicePositions, selectedDeviceId]);

    const selectedWorkArea = useMemo(() => {
        return workAreas.find(
            (area) => getWorkAreaKey(area) === selectedWorkAreaKey,
        );
    }, [workAreas, selectedWorkAreaKey]);

    const selectedWorkAreaDevicePosition = useMemo(() => {
        if (!selectedWorkArea) return null;

        return latestDevicePositions.find(
            (device) =>
                String(getPointDeviceId(device)) ===
                String(selectedWorkArea.device_ID),
        );
    }, [latestDevicePositions, selectedWorkArea]);

    function getAreaDeviceLabel(area) {
        const device = devices.find(
            (row) => String(row.device_ID) === String(area.device_ID),
        );

        if (area.device_name) {
            return `${area.device_name} - ${area.device_ID}`;
        }

        if (device?.device_name) {
            return `${device.device_name} - ${area.device_ID}`;
        }

        return `Device ${area.device_ID}`;
    }

    function getSelectedDeviceLabel() {
        if (selectedDevice?.device_name) {
            return `${selectedDevice.device_name} - ${selectedDevice.device_ID}`;
        }

        return selectedDeviceId ? `Device ${selectedDeviceId}` : "Ej vald";
    }

    function getDeviceLabel(devicePosition) {
        const deviceId = getPointDeviceId(devicePosition);

        const device = devices.find(
            (row) => String(row.device_ID) === String(deviceId),
        );

        if (device?.device_name) {
            return `${device.device_name}`;
        }

        if (devicePosition?.device_name) {
            return `${devicePosition.device_name}`;
        }

        return deviceId ? `Device ${deviceId}` : "Okänd device";
    }

    function getDeviceFullLabel(devicePosition) {
        const deviceId = getPointDeviceId(devicePosition);
        const name = getDeviceLabel(devicePosition);

        return deviceId ? `${name} - ${deviceId}` : name;
    }

    async function loadUserDevices() {
        if (!userId) {
            setDeviceLoading(false);
            setDeviceError("Ingen användare hittades.");
            return;
        }

        try {
            setDeviceLoading(true);
            setDeviceError("");

            const response = await axios.get(`/api/device/all/user/${userId}`);
            const result = response.data;

            console.log("Devices response:", result);

            if (!result.success) {
                setDevices([]);
                setSelectedDeviceId("");
                setDeviceError(
                    result.msg || "Inga registrerade enheter hittades.",
                );
                return;
            }

            const loadedDevices = Array.isArray(result.devices)
                ? result.devices
                : [];

            setDevices(loadedDevices);

            if (loadedDevices.length > 0) {
                setSelectedDeviceId((current) => {
                    const currentExists = loadedDevices.some(
                        (device) =>
                            String(device.device_ID) === String(current),
                    );

                    if (current && currentExists) return current;

                    return String(loadedDevices[0].device_ID);
                });

                setDeviceError("");
            } else {
                setSelectedDeviceId("");
                setDeviceError("Inga registrerade enheter hittades.");
            }
        } catch (error) {
            console.error("Failed to load user devices:", error);
            setDevices([]);
            setSelectedDeviceId("");
            setDeviceError("Kunde inte hämta registrerade enheter.");
        } finally {
            setDeviceLoading(false);
        }
    }

    async function loadDevicePositions() {
        if (!userId) {
            setDevicePositions([]);
            setDevicePositionsLoading(false);
            return;
        }

        try {
            setDevicePositionsLoading(true);

            const response = await axios.get(`/api/device/gnss/user/${userId}`);
            const result = response.data;

            console.log("Device GNSS response:", result);

            if (result?.success === false) {
                setDevicePositions([]);
                return;
            }

            const rows = normalizeGnssResponse(result);

            console.log("Normalized GNSS rows:", rows);

            setDevicePositions(rows);
        } catch (error) {
            console.error("Failed to load device positions:", error);
            setDevicePositions([]);
        } finally {
            setDevicePositionsLoading(false);
        }
    }

    async function loadWorkAreas() {
        if (!userId) {
            setWorkAreas([]);
            setWorkAreasLoading(false);
            setWorkAreasError("Ingen användare hittades.");
            setSelectedWorkAreaKey("");
            return [];
        }

        try {
            setWorkAreasLoading(true);
            setWorkAreasError("");

            const response = await axios.get(
                `/api/device/get/location_areas/${userId}`,
            );

            const result = response.data;

            console.log("Work areas response:", result);

            if (!result.success) {
                setWorkAreas([]);

                if (isEmptyWorkAreaResponse(result)) {
                    setWorkAreasError("");
                    setSelectedWorkAreaKey("");
                    return [];
                }

                setWorkAreasError(
                    result.msg ||
                        result.message ||
                        "Kunde inte hämta arbetsområden.",
                );

                setSelectedWorkAreaKey("");
                return [];
            }

            const loadedWorkAreas = getWorkAreasFromResponse(result);

            setWorkAreas(loadedWorkAreas);
            setWorkAreasError("");

            setSelectedWorkAreaKey((currentKey) => {
                const currentExists = loadedWorkAreas.some(
                    (area) => getWorkAreaKey(area) === currentKey,
                );

                if (currentKey && currentExists) return currentKey;

                return "";
            });

            return loadedWorkAreas;
        } catch (error) {
            console.error("Failed to load work areas:", error);

            const apiMessage =
                error?.response?.data?.msg ||
                error?.response?.data?.message ||
                "";

            if (isEmptyWorkAreaResponse({ msg: apiMessage })) {
                setWorkAreas([]);
                setWorkAreasError("");
                setSelectedWorkAreaKey("");
                return [];
            }

            setWorkAreas([]);
            setWorkAreasError("Kunde inte hämta arbetsområden.");
            setSelectedWorkAreaKey("");
            return [];
        } finally {
            setWorkAreasLoading(false);
        }
    }

    useEffect(() => {
        loadUserDevices();
        loadWorkAreas();
        loadDevicePositions();
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        function handleConnect() {
            socket.emit("join-user-room", userId);
        }

        function handleNewGnssPosition(newPoint) {
            console.log("Live GNSS position on work areas:", newPoint);

            setDevicePositions((previousRows) =>
                upsertDevicePosition(previousRows, newPoint),
            );
        }

        socket.on("connect", handleConnect);
        socket.on("gnss:new-position", handleNewGnssPosition);

        if (!socket.connected) {
            socket.connect();
        } else {
            handleConnect();
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("gnss:new-position", handleNewGnssPosition);
        };
    }, [userId]);

    function handleDeviceChange(newDeviceId) {
        setSelectedDeviceId(newDeviceId);
        setSubmitError("");
        setSubmitSuccess("");

        setSelectedLocation((currentLocation) => {
            if (!currentLocation) return currentLocation;

            if (currentLocation.source === "device") {
                return null;
            }

            return {
                ...currentLocation,
                source: currentLocation.source ?? "address",
            };
        });
    }

    function handleSelectWorkArea(area) {
        setSelectedWorkAreaKey(getWorkAreaKey(area));
        setFocusWorkAreaRequest((current) => current + 1);
    }

    function isSameAreaAsPayload(area, payload) {
        return (
            String(area.device_ID) === String(payload.device_ID) &&
            Math.abs(Number(area.lat) - Number(payload.lat)) < 0.000001 &&
            Math.abs(Number(area.lon) - Number(payload.lon)) < 0.000001 &&
            Number(area.circle_radius_m) === Number(payload.circle_radius_m)
        );
    }

    async function handleSubmitWorkArea() {
        setSubmitError("");
        setSubmitSuccess("");

        if (!userId) {
            setSubmitError("Ingen användare hittades.");
            return;
        }

        if (!selectedLocation) {
            setSubmitError(
                "Sök och välj en plats först, eller använd devicens senaste position.",
            );
            return;
        }

        if (!selectedDeviceId) {
            setSubmitError("Välj en registrerad enhet först.");
            return;
        }

        if (!radius || Number(radius) <= 0) {
            setSubmitError("Radien måste vara större än 0 meter.");
            return;
        }

        const payload = {
            user_ID: userId,
            device_ID: Number(selectedDeviceId),
            lon: Number(selectedLocation.lng),
            lat: Number(selectedLocation.lat),
            circle_radius_m: Number(radius),
            matchedAddress: selectedLocation.matchedAddress,
        };

        console.log("Submitting work area:", payload);

        try {
            setSubmitLoading(true);

            const res = await fetch("/api/device/add/location_area", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(
                    data.message ||
                        data.msg ||
                        "Kunde inte spara arbetsområdet",
                );
            }

            setSubmitSuccess("Arbetsområdet sparades.");
            setSelectedLocation(null);

            const updatedAreas = await loadWorkAreas();

            const savedArea = [...updatedAreas]
                .reverse()
                .find((area) => isSameAreaAsPayload(area, payload));

            if (savedArea) {
                setSelectedWorkAreaKey(getWorkAreaKey(savedArea));
                setFocusWorkAreaRequest((current) => current + 1);
            }
        } catch (err) {
            console.error("Failed to save work area:", err);

            setSubmitError(
                err.message ||
                    "Något gick fel när arbetsområdet skulle sparas.",
            );
        } finally {
            setSubmitLoading(false);
        }
    }

    function handleFocusSelectedDevice() {
        setSubmitError("");
        setSubmitSuccess("");

        if (!selectedDeviceId) {
            setSubmitError("Välj en device först.");
            return;
        }

        if (!selectedDevicePosition) {
            setSubmitError(
                "Vald device har ingen GNSS-position ännu. Du kan ändå skapa ett arbetsområde i förväg genom att söka adress manuellt.",
            );
            return;
        }

        setFocusDeviceRequest((current) => current + 1);
    }

    function handleUseSelectedDevicePosition() {
        setSubmitError("");
        setSubmitSuccess("");

        if (!selectedDeviceId) {
            setSubmitError("Välj en device först.");
            return;
        }

        if (!selectedDevicePosition) {
            setSubmitError(
                "Vald device har ingen GNSS-position ännu. Sök adress manuellt om du vill skapa ett arbetsområde i förväg.",
            );
            return;
        }

        const lat = Number(selectedDevicePosition.lat);
        const lon = Number(selectedDevicePosition.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            setSubmitError("Vald device har ogiltig GNSS-position.");
            return;
        }

        setSelectedLocation({
            lat,
            lng: lon,
            matchedAddress: `Senaste position för ${getSelectedDeviceLabel()}`,
            source: "device",
            sourceDeviceId: selectedDeviceId,
        });

        setFocusDeviceRequest((current) => current + 1);
    }

    const selectedLocationIsDeviceBased = selectedLocation?.source === "device";
    const selectedLocationIsAddressBased =
        selectedLocation && selectedLocation.source !== "device";

    return (
        <section className="mx-auto max-w-[1800px] px-4 py-6 md:px-6 md:py-8">
            <div className="mb-5">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    Work Areas
                </h1>

                <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-400">
                    Skapa zoner där dina registrerade enheter får vara och se
                    tydligt vilket område som tillhör vilken device.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
                <div className="max-h-none space-y-4 lg:max-h-[calc(100dvh-170px)] lg:overflow-y-auto lg:pr-1">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-slate-500/10 p-2">
                                <Smartphone className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                                    Välj device
                                </h2>

                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Device visas som grå punkt med namn på
                                    kartan. Klicka på ett arbetsområde för att
                                    markera det grönt.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200">
                                Device
                            </label>

                            <select
                                value={selectedDeviceId}
                                onChange={(e) =>
                                    handleDeviceChange(e.target.value)
                                }
                                disabled={deviceLoading || devices.length === 0}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white"
                            >
                                {deviceLoading ? (
                                    <option value="">Laddar enheter...</option>
                                ) : devices.length === 0 ? (
                                    <option value="">
                                        Inga enheter hittades
                                    </option>
                                ) : (
                                    devices.map((device) => (
                                        <option
                                            key={device.device_ID}
                                            value={device.device_ID}
                                        >
                                            {device.device_name
                                                ? `${device.device_name} - ${device.device_ID}`
                                                : `Device ${device.device_ID}`}
                                        </option>
                                    ))
                                )}
                            </select>

                            {deviceError && (
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {deviceError}
                                </p>
                            )}
                        </div>

                        <div
                            className={`mt-4 rounded-xl border p-4 text-sm ${
                                selectedDevicePosition
                                    ? "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                    : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                            }`}
                        >
                            {devicePositionsLoading ? (
                                <p>Hämtar senaste GNSS-position...</p>
                            ) : selectedDevicePosition ? (
                                <>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="font-semibold">
                                                Vald device har GNSS-position
                                            </p>
                                            <p className="mt-1 text-xs opacity-80">
                                                På kartan syns den som grå punkt
                                                med namnet{" "}
                                                <span className="font-bold">
                                                    {getDeviceLabel(
                                                        selectedDevicePosition,
                                                    )}
                                                </span>
                                                .
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid gap-1 text-xs">
                                        <p>
                                            Lat:{" "}
                                            <span className="font-medium">
                                                {selectedDevicePosition.lat}
                                            </span>
                                        </p>

                                        <p>
                                            Lon:{" "}
                                            <span className="font-medium">
                                                {selectedDevicePosition.lon}
                                            </span>
                                        </p>

                                        <p>
                                            Accuracy:{" "}
                                            <span className="font-medium">
                                                {selectedDevicePosition.acc ??
                                                    "N/A"}{" "}
                                                m
                                            </span>
                                        </p>

                                        <p>
                                            Tid:{" "}
                                            <span className="font-medium">
                                                {formatTimestamp(
                                                    selectedDevicePosition.data_timestamp ??
                                                        selectedDevicePosition.created_at,
                                                )}
                                            </span>
                                        </p>
                                    </div>

                                    <div className="mt-4 grid gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleFocusSelectedDevice}
                                            className="w-full"
                                        >
                                            <LocateFixed className="mr-2 h-4 w-4" />
                                            Visa device på kartan
                                        </Button>

                                        <Button
                                            type="button"
                                            onClick={
                                                handleUseSelectedDevicePosition
                                            }
                                            className="w-full"
                                        >
                                            <MapPinned className="mr-2 h-4 w-4" />
                                            Använd device-position som område
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="font-semibold">
                                                Vald device saknar GNSS-position
                                            </p>
                                            <p className="mt-1 text-xs opacity-90">
                                                Den här devicen visas inte på
                                                kartan ännu. Du kan ändå skapa
                                                ett område i förväg.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 rounded-lg border border-current/20 bg-white/50 p-3 text-xs dark:bg-slate-950/30">
                                        <div className="flex items-start gap-2">
                                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                            <p>
                                                Sök adress och spara området för{" "}
                                                <span className="font-bold">
                                                    {getSelectedDeviceLabel()}
                                                </span>
                                                .
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <LocationSearchCard
                        onLocationSelected={(location) => {
                            setSelectedLocation({
                                ...location,
                                source: "address",
                            });
                            setSubmitError("");
                            setSubmitSuccess("");
                        }}
                    />

                    {submitSuccess && !selectedLocation && (
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>{submitSuccess}</p>
                            </div>
                        </div>
                    )}

                    {selectedLocation && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-violet-500/10 p-2">
                                    <MapPinned className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                </div>

                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Nytt område att spara
                                    </p>

                                    <p className="mt-1 font-medium text-slate-900 dark:text-white">
                                        {selectedLocation.matchedAddress}
                                    </p>
                                </div>
                            </div>

                            <div
                                className={`mt-4 rounded-xl border px-3 py-3 text-sm ${
                                    selectedLocationIsDeviceBased
                                        ? "border-slate-300 bg-slate-500/10 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                                        : "border-violet-300 bg-violet-500/10 text-violet-700 dark:border-violet-900 dark:text-violet-300"
                                }`}
                            >
                                {selectedLocationIsDeviceBased
                                    ? "Detta område är baserat på devicens senaste GNSS-position."
                                    : "Detta område är valt via adressökning och kan sparas i förväg även om devicen saknar GNSS."}
                            </div>

                            <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                <p>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        Lat:
                                    </span>{" "}
                                    {selectedLocation.lat}
                                </p>

                                <p>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        Lng:
                                    </span>{" "}
                                    {selectedLocation.lng}
                                </p>

                                <p>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        Sparas för:
                                    </span>{" "}
                                    {getSelectedDeviceLabel()}
                                </p>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200">
                                    Radie (meter)
                                </label>

                                <input
                                    type="number"
                                    min="10"
                                    value={radius}
                                    onChange={(e) => {
                                        setRadius(Number(e.target.value));
                                        setSubmitError("");
                                        setSubmitSuccess("");
                                    }}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white"
                                />
                            </div>

                            {submitError && (
                                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-600 dark:text-red-300">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <p>{submitError}</p>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="button"
                                onClick={handleSubmitWorkArea}
                                disabled={
                                    submitLoading ||
                                    !selectedLocation ||
                                    !selectedDeviceId
                                }
                                className="mt-5 w-full"
                            >
                                {submitLoading ? (
                                    "Sparar arbetsområde..."
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Spara område för{" "}
                                        {getSelectedDeviceLabel()}
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="relative z-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="relative z-0 h-[calc(100dvh-270px)] min-h-[640px] w-full">
                        <MapContainer
                            center={[59.3293, 18.0686]}
                            zoom={6}
                            className="z-0 h-full w-full"
                        >
                            <ResizeMap />
                            <MapLegend />

                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <FitMapToWorkAreas
                                workAreas={workAreas}
                                devicePositions={latestDevicePositions}
                                selectedLocation={selectedLocation}
                            />

                            <FlyToLocation
                                selectedLocation={selectedLocation}
                            />

                            <FlyToDevicePosition
                                devicePosition={selectedDevicePosition}
                                focusRequest={focusDeviceRequest}
                            />

                            <FlyToWorkArea
                                workArea={selectedWorkArea}
                                focusRequest={focusWorkAreaRequest}
                            />

                            {latestDevicePositions.map((device, index) => {
                                const lat = Number(device.lat);
                                const lon = Number(device.lon);
                                const acc =
                                    device.acc === null ||
                                    device.acc === undefined
                                        ? null
                                        : Number(device.acc);
                                const deviceId = getPointDeviceId(device);

                                if (
                                    !Number.isFinite(lat) ||
                                    !Number.isFinite(lon)
                                ) {
                                    return null;
                                }

                                return (
                                    <Fragment
                                        key={`device-position-${deviceId ?? index}`}
                                    >
                                        {acc !== null &&
                                            Number.isFinite(acc) && (
                                                <Circle
                                                    center={[lat, lon]}
                                                    radius={Math.min(
                                                        Math.max(acc, 3),
                                                        250,
                                                    )}
                                                    pathOptions={{
                                                        color: "#64748b",
                                                        fillColor: "#94a3b8",
                                                        fillOpacity: 0.08,
                                                        weight: 1,
                                                    }}
                                                />
                                            )}

                                        <Marker
                                            position={[lat, lon]}
                                            icon={getDeviceMarkerIcon(
                                                getDeviceLabel(device),
                                            )}
                                            opacity={0.92}
                                            zIndexOffset={650}
                                        >
                                            <Popup>
                                                <div>
                                                    <p className="font-bold">
                                                        Device-position
                                                    </p>

                                                    <p className="font-medium">
                                                        {getDeviceFullLabel(
                                                            device,
                                                        )}
                                                    </p>

                                                    <p>
                                                        ID: {deviceId ?? "N/A"}
                                                    </p>

                                                    <p>
                                                        Accuracy:{" "}
                                                        {device.acc ?? "N/A"} m
                                                    </p>

                                                    <p>
                                                        Tid:{" "}
                                                        {formatTimestamp(
                                                            device.data_timestamp ??
                                                                device.created_at,
                                                        )}
                                                    </p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    </Fragment>
                                );
                            })}

                            {selectedWorkArea &&
                                selectedWorkAreaDevicePosition && (
                                    <Polyline
                                        positions={[
                                            [
                                                Number(selectedWorkArea.lat),
                                                Number(selectedWorkArea.lon),
                                            ],
                                            [
                                                Number(
                                                    selectedWorkAreaDevicePosition.lat,
                                                ),
                                                Number(
                                                    selectedWorkAreaDevicePosition.lon,
                                                ),
                                            ],
                                        ]}
                                        pathOptions={{
                                            color: "#10b981",
                                            weight: 4,
                                            dashArray: "8 8",
                                            opacity: 0.9,
                                        }}
                                    />
                                )}

                            {workAreas.map((area) => {
                                const lat = Number(area.lat);
                                const lon = Number(area.lon);
                                const radiusMeters = Number(
                                    area.circle_radius_m,
                                );
                                const areaKey = getWorkAreaKey(area);
                                const isSelected =
                                    areaKey === selectedWorkAreaKey;

                                if (
                                    !Number.isFinite(lat) ||
                                    !Number.isFinite(lon)
                                ) {
                                    return null;
                                }

                                return (
                                    <Fragment key={areaKey}>
                                        <Circle
                                            center={[lat, lon]}
                                            radius={radiusMeters || 100}
                                            pathOptions={{
                                                color: isSelected
                                                    ? "#10b981"
                                                    : "#64748b",
                                                fillColor: isSelected
                                                    ? "#10b981"
                                                    : "#94a3b8",
                                                fillOpacity: isSelected
                                                    ? 0.22
                                                    : 0.08,
                                                weight: isSelected ? 4 : 2,
                                            }}
                                        />

                                        <Marker
                                            position={[lat, lon]}
                                            icon={getWorkAreaMarkerIcon(
                                                isSelected,
                                            )}
                                            opacity={isSelected ? 1 : 0.7}
                                            zIndexOffset={
                                                isSelected ? 1000 : 450
                                            }
                                            eventHandlers={{
                                                click: () =>
                                                    handleSelectWorkArea(area),
                                            }}
                                        >
                                            <Popup>
                                                <div>
                                                    <p className="font-bold">
                                                        {isSelected
                                                            ? "Markerat arbetsområde"
                                                            : "Annat arbetsområde"}
                                                    </p>

                                                    <p className="font-medium">
                                                        {area.matchedAddress ||
                                                            "Sparat arbetsområde"}
                                                    </p>

                                                    <p>
                                                        Tillhör:{" "}
                                                        {getAreaDeviceLabel(
                                                            area,
                                                        )}
                                                    </p>

                                                    <p>
                                                        Device ID:{" "}
                                                        {area.device_ID}
                                                    </p>

                                                    <p>
                                                        Radie:{" "}
                                                        {radiusMeters || 100} m
                                                    </p>

                                                    <p>
                                                        Status:{" "}
                                                        {area.active
                                                            ? "Aktiv"
                                                            : "Inaktiv"}
                                                    </p>

                                                    {isSelected &&
                                                        selectedWorkAreaDevicePosition && (
                                                            <p>
                                                                Grön streckad
                                                                linje visar
                                                                koppling till
                                                                devicens senaste
                                                                position.
                                                            </p>
                                                        )}
                                                </div>
                                            </Popup>
                                        </Marker>
                                    </Fragment>
                                );
                            })}

                            {selectedLocation && (
                                <Circle
                                    center={[
                                        selectedLocation.lat,
                                        selectedLocation.lng,
                                    ]}
                                    radius={Number(radius) || 100}
                                    pathOptions={{
                                        color: "#7c3aed",
                                        fillColor: "#8b5cf6",
                                        fillOpacity: 0.12,
                                        weight: 3,
                                        dashArray: "8 8",
                                    }}
                                >
                                    <Popup>
                                        <div>
                                            <p className="font-bold">
                                                Förhandsvisning av nytt område
                                            </p>

                                            <p className="font-medium">
                                                {
                                                    selectedLocation.matchedAddress
                                                }
                                            </p>

                                            <p>Radie: {radius} m</p>

                                            <p>
                                                Sparas för:{" "}
                                                {getSelectedDeviceLabel()}
                                            </p>

                                            {selectedLocationIsAddressBased && (
                                                <p>
                                                    Detta område är valt via
                                                    adressökning.
                                                </p>
                                            )}

                                            {selectedLocationIsDeviceBased && (
                                                <p>
                                                    Detta område är baserat på
                                                    devicens senaste position.
                                                </p>
                                            )}
                                        </div>
                                    </Popup>
                                </Circle>
                            )}
                        </MapContainer>

                        <div className="absolute right-4 top-4 z-[1000] hidden max-h-[calc(100%-2rem)] w-[340px] overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 xl:block">
                            <div className="mb-3">
                                <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                                    Arbetsområden
                                </h2>

                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Klicka på ett område. Markerat område blir
                                    grönt på kartan. Övriga områden blir grå.
                                </p>
                            </div>

                            {workAreasError && (
                                <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                                    {workAreasError}
                                </div>
                            )}

                            {workAreasLoading ? (
                                <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    Laddar områden...
                                </p>
                            ) : workAreas.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    Inga sparade områden ännu.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {workAreas.map((area) => {
                                        const areaKey = getWorkAreaKey(area);
                                        const isSelected =
                                            areaKey === selectedWorkAreaKey;
                                        const hasDevicePosition =
                                            latestDevicePositions.some(
                                                (device) =>
                                                    String(
                                                        getPointDeviceId(
                                                            device,
                                                        ),
                                                    ) ===
                                                    String(area.device_ID),
                                            );

                                        return (
                                            <button
                                                key={`map-panel-${areaKey}`}
                                                type="button"
                                                onClick={() =>
                                                    handleSelectWorkArea(area)
                                                }
                                                className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                                                    isSelected
                                                        ? "border-emerald-300 bg-emerald-500/15"
                                                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="mb-1 flex flex-wrap gap-1">
                                                        {isSelected && (
                                                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                                                MARKERAT
                                                            </span>
                                                        )}

                                                        <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                            {hasDevicePosition
                                                                ? "GNSS finns"
                                                                : "Ingen GNSS"}
                                                        </span>
                                                    </div>

                                                    <p className="line-clamp-2 font-bold text-slate-950 dark:text-white">
                                                        {area.matchedAddress ||
                                                            "Sparat arbetsområde"}
                                                    </p>

                                                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                                                        Tillhör:{" "}
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {getAreaDeviceLabel(
                                                                area,
                                                            )}
                                                        </span>
                                                    </p>

                                                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                                                        Radie:{" "}
                                                        {area.circle_radius_m} m
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
