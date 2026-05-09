import { Fragment, useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
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
} from "lucide-react";
import axios from "axios";

import LocationSearchCard from "../components/LocationSearchCard";
import { Button } from "@/components/ui/button";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

function FitMapToWorkAreas({ workAreas }) {
    const map = useMap();

    useEffect(() => {
        if (!workAreas || workAreas.length === 0) return;

        const validAreas = workAreas.filter((area) => {
            const lat = Number(area.lat);
            const lon = Number(area.lon);

            return Number.isFinite(lat) && Number.isFinite(lon);
        });

        if (validAreas.length === 0) return;

        const bounds = L.latLngBounds(
            validAreas.map((area) => [Number(area.lat), Number(area.lon)]),
        );

        const timer = window.setTimeout(() => {
            map.invalidateSize();

            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 13,
            });
        }, 150);

        return () => {
            window.clearTimeout(timer);
        };
    }, [workAreas, map]);

    return null;
}

export default function AddLocation() {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [radius, setRadius] = useState(100);

    const [workAreas, setWorkAreas] = useState([]);
    const [workAreasLoading, setWorkAreasLoading] = useState(true);
    const [workAreasError, setWorkAreasError] = useState("");

    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");
    const [deviceLoading, setDeviceLoading] = useState(true);
    const [deviceError, setDeviceError] = useState("");

    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_ID || null;

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
                setSelectedDeviceId(String(loadedDevices[0].device_ID));
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

    async function loadWorkAreas() {
        if (!userId) {
            setWorkAreas([]);
            setWorkAreasLoading(false);
            setWorkAreasError("Ingen användare hittades.");
            return;
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
                setWorkAreasError(
                    result.msg || "Kunde inte hämta arbetsområden.",
                );
                return;
            }

            const loadedWorkAreas = Array.isArray(result.devices)
                ? result.devices
                : [];

            setWorkAreas(loadedWorkAreas);
        } catch (error) {
            console.error("Failed to load work areas:", error);
            setWorkAreas([]);
            setWorkAreasError("Kunde inte hämta arbetsområden.");
        } finally {
            setWorkAreasLoading(false);
        }
    }

    useEffect(() => {
        loadUserDevices();
        loadWorkAreas();
    }, [userId]);

    async function handleSubmitWorkArea() {
        setSubmitError("");
        setSubmitSuccess("");

        if (!selectedLocation) {
            setSubmitError("Sök och välj en plats först.");
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
            lon: selectedLocation.lng,
            lat: selectedLocation.lat,
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
                    data.message || "Kunde inte spara arbetsområdet",
                );
            }

            setSubmitSuccess("Arbetsområdet sparades.");

            await loadWorkAreas();
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

    function getAreaDeviceLabel(area) {
        if (area.device_name) {
            return `${area.device_name} - ${area.device_ID}`;
        }

        return `Device ${area.device_ID}`;
    }

    function getSelectedDeviceLabel() {
        const selectedDevice = devices.find(
            (device) => String(device.device_ID) === String(selectedDeviceId),
        );

        if (selectedDevice?.device_name) {
            return `${selectedDevice.device_name} - ${selectedDevice.device_ID}`;
        }

        return selectedDeviceId ? `Device ${selectedDeviceId}` : "Ej vald";
    }

    return (
        <section className="mx-auto max-w-[1700px] px-4 py-6 md:px-6 md:py-8">
            <div className="mb-5">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    Work Areas
                </h1>

                <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-400">
                    Skapa zoner där dina registrerade enheter får vara och se
                    befintliga områden på kartan.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[440px_minmax(0,1fr)]">
                <div className="max-h-none space-y-4 lg:max-h-[calc(100dvh-170px)] lg:overflow-y-auto lg:pr-1">
                    <LocationSearchCard
                        onLocationSelected={(location) => {
                            setSelectedLocation(location);
                            setSubmitError("");
                            setSubmitSuccess("");
                        }}
                    />

                    {selectedLocation && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Vald plats
                            </p>

                            <p className="mt-1 font-medium text-slate-900 dark:text-white">
                                {selectedLocation.matchedAddress}
                            </p>

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
                            </div>

                            <div className="mt-5">
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                                    <Smartphone className="h-4 w-4" />
                                    Välj enhet
                                </label>

                                <select
                                    value={selectedDeviceId}
                                    onChange={(e) => {
                                        setSelectedDeviceId(e.target.value);
                                        setSubmitError("");
                                        setSubmitSuccess("");
                                    }}
                                    disabled={
                                        deviceLoading || devices.length === 0
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white"
                                >
                                    {deviceLoading ? (
                                        <option value="">
                                            Laddar enheter...
                                        </option>
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
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                                        {deviceError}
                                    </p>
                                )}
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

                            {submitSuccess && (
                                <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                        <p>{submitSuccess}</p>
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
                                        Spara arbetsområde
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                                    Sparade arbetsområden
                                </h2>

                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {workAreasLoading
                                        ? "Laddar..."
                                        : `${workAreas.length} område${
                                              workAreas.length === 1 ? "" : "n"
                                          }`}
                                </p>
                            </div>
                        </div>

                        {workAreasError && (
                            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-600 dark:text-red-300">
                                {workAreasError}
                            </div>
                        )}

                        <div className="space-y-3">
                            {workAreasLoading ? (
                                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    Hämtar arbetsområden...
                                </p>
                            ) : workAreas.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    Inga arbetsområden sparade ännu.
                                </p>
                            ) : (
                                workAreas.map((area) => (
                                    <div
                                        key={area.id}
                                        className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-950"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-emerald-500/15 p-2 dark:bg-emerald-500/20">
                                                <MapPinned className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-2 text-sm font-semibold text-slate-950 dark:text-white">
                                                    {area.matchedAddress}
                                                </p>

                                                <div className="mt-2 grid gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                    <p>
                                                        Device:{" "}
                                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                                            {getAreaDeviceLabel(
                                                                area,
                                                            )}
                                                        </span>
                                                    </p>

                                                    <p>
                                                        Radie:{" "}
                                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                                            {
                                                                area.circle_radius_m
                                                            }{" "}
                                                            m
                                                        </span>
                                                    </p>

                                                    <p>
                                                        Status:{" "}
                                                        <span
                                                            className={
                                                                area.active
                                                                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                                                                    : "font-medium text-slate-500"
                                                            }
                                                        >
                                                            {area.active
                                                                ? "Aktiv"
                                                                : "Inaktiv"}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="relative z-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="relative z-0 h-[calc(100dvh-270px)] min-h-[560px] w-full">
                        <MapContainer
                            center={[59.3293, 18.0686]}
                            zoom={6}
                            className="z-0 h-full w-full"
                        >
                            <ResizeMap />

                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <FitMapToWorkAreas workAreas={workAreas} />

                            <FlyToLocation
                                selectedLocation={selectedLocation}
                            />

                            {workAreas.map((area) => {
                                const lat = Number(area.lat);
                                const lon = Number(area.lon);
                                const radiusMeters = Number(
                                    area.circle_radius_m,
                                );

                                if (
                                    !Number.isFinite(lat) ||
                                    !Number.isFinite(lon)
                                ) {
                                    return null;
                                }

                                return (
                                    <Fragment key={area.id}>
                                        <Marker position={[lat, lon]}>
                                            <Popup>
                                                <div>
                                                    <p className="font-medium">
                                                        {area.matchedAddress}
                                                    </p>

                                                    <p>
                                                        Device:{" "}
                                                        {getAreaDeviceLabel(
                                                            area,
                                                        )}
                                                    </p>

                                                    <p>
                                                        Radie: {radiusMeters} m
                                                    </p>

                                                    <p>
                                                        Status:{" "}
                                                        {area.active
                                                            ? "Aktiv"
                                                            : "Inaktiv"}
                                                    </p>
                                                </div>
                                            </Popup>
                                        </Marker>

                                        <Circle
                                            center={[lat, lon]}
                                            radius={radiusMeters || 100}
                                            pathOptions={{
                                                color: area.active
                                                    ? "#10b981"
                                                    : "#64748b",
                                                fillColor: area.active
                                                    ? "#10b981"
                                                    : "#64748b",
                                                fillOpacity: 0.12,
                                                weight: 2,
                                            }}
                                        />
                                    </Fragment>
                                );
                            })}

                            {selectedLocation && (
                                <>
                                    <Marker
                                        position={[
                                            selectedLocation.lat,
                                            selectedLocation.lng,
                                        ]}
                                    >
                                        <Popup>
                                            <div>
                                                <p className="font-medium">
                                                    {
                                                        selectedLocation.matchedAddress
                                                    }
                                                </p>

                                                <p>
                                                    Lat: {selectedLocation.lat}
                                                </p>

                                                <p>
                                                    Lng: {selectedLocation.lng}
                                                </p>

                                                <p>Radie: {radius} m</p>

                                                <p>
                                                    Device:{" "}
                                                    {getSelectedDeviceLabel()}
                                                </p>
                                            </div>
                                        </Popup>
                                    </Marker>

                                    <Circle
                                        center={[
                                            selectedLocation.lat,
                                            selectedLocation.lng,
                                        ]}
                                        radius={Number(radius) || 100}
                                        pathOptions={{
                                            color: "#2563eb",
                                            fillColor: "#3b82f6",
                                            fillOpacity: 0.12,
                                            weight: 2,
                                        }}
                                    />
                                </>
                            )}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </section>
    );
}
