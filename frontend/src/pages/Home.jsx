import { Fragment, useEffect, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AlertCircle, MapPinned, Wifi, WifiOff } from "lucide-react";

import { socket } from "@/lib/socket";
import Navbar from "../components/Navbar";
import { Card, CardContent } from "@/components/ui/card";

// Fix för Leaflet marker-icons i Vite/React
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function CenterMapOnFirstPoint({ points }) {
    const map = useMap();
    const hasCenteredMap = useRef(false);

    useEffect(() => {
        if (hasCenteredMap.current || points.length === 0) {
            return;
        }

        const firstPoint = points[0];
        const lat = Number(firstPoint.lat);
        const lon = Number(firstPoint.lon);

        if (Number.isNaN(lat) || Number.isNaN(lon)) {
            return;
        }

        map.setView([lat, lon], 13);
        hasCenteredMap.current = true;
    }, [points, map]);

    return null;
}

export default function Home() {
    const navigate = useNavigate();

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_ID || null;

    const [points, setPoints] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const [socketStatus, setSocketStatus] = useState("disconnected");
    const [lastLiveUpdate, setLastLiveUpdate] = useState(null);

    async function loadGnssData() {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await axios.get(`/api/device/gnss/${userId}`);
            const result = response.data;

            console.log("response.data", response.data);

            if (response.data.success !== false) {
                setPoints(Array.isArray(result.data) ? result.data : []);
                setErrorMessage("");
            } else {
                setErrorMessage(
                    response.data.msg || "Failed to load GNSS data",
                );
            }
        } catch (error) {
            console.error("Failed to load GNSS data:", error);
            setErrorMessage("Failed to load GNSS data");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true });
            return;
        }

        loadGnssData();
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setSocketStatus("disconnected");

            if (socket.connected) {
                socket.disconnect();
            }

            return;
        }

        setSocketStatus("connecting");

        function handleConnect() {
            console.log("Socket connected:", socket.id);

            setSocketStatus("connected");
            socket.emit("join-user-room", userId);
        }

        function handleDisconnect() {
            console.log("Socket disconnected");

            setSocketStatus("disconnected");
        }

        function handleConnectError(error) {
            console.error("Socket connection error:", error);

            setSocketStatus("disconnected");
        }

        function handleJoined(payload) {
            console.log("Joined socket room:", payload);
        }

        function handleNewPosition(newPoint) {
            console.log("Live GNSS position:", newPoint);

            setPoints((prevPoints) => [newPoint, ...prevPoints]);
            setLastLiveUpdate(new Date().toLocaleTimeString());
        }

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);
        socket.on("socket:joined", handleJoined);
        socket.on("gnss:new-position", handleNewPosition);

        if (!socket.connected) {
            socket.connect();
        } else {
            handleConnect();
        }

        return () => {
            socket.emit("leave-user-room", userId);

            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
            socket.off("socket:joined", handleJoined);
            socket.off("gnss:new-position", handleNewPosition);

            socket.disconnect();
            setSocketStatus("disconnected");
        };
    }, [userId]);

    return (
        <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
            <Navbar />

            <section className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            {socketStatus === "connected" ? (
                                <>
                                    <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-blue-700 dark:text-blue-300">
                                        Live connected
                                    </span>
                                </>
                            ) : socketStatus === "connecting" ? (
                                <>
                                    <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-blue-700 dark:text-blue-300">
                                        Ansluter live...
                                    </span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="h-4 w-4 text-red-500" />
                                    <span className="text-red-500">
                                        Live disconnected
                                    </span>
                                </>
                            )}
                        </div>

                        {lastLiveUpdate && (
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                Senaste live-update:{" "}
                                <span className="font-semibold">
                                    {lastLiveUpdate}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {errorMessage && (
                    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-700 dark:text-red-300">
                        <AlertCircle className="h-5 w-5" />
                        <p className="text-sm font-medium">{errorMessage}</p>
                    </div>
                )}

                <Card className="overflow-hidden border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex h-[calc(100dvh-275px)] min-h-[320px] items-center justify-center md:h-[calc(100dvh-225px)] md:min-h-[420px] lg:h-[calc(100dvh-220px)] lg:min-h-[470px]">
                                <p className="text-slate-500">
                                    Laddar GPS-data...
                                </p>
                            </div>
                        ) : points.length <= 0 ? (
                            <div className="flex h-[calc(100dvh-275px)] min-h-[320px] flex-col items-center justify-center px-6 text-center md:h-[calc(100dvh-225px)] md:min-h-[420px] lg:h-[calc(100dvh-220px)] lg:min-h-[470px]">
                                <div className="mb-4 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                                    <MapPinned className="h-8 w-8 text-slate-500" />
                                </div>

                                <h3 className="text-xl font-semibold">
                                    Ingen GPS-data sparad ännu
                                </h3>

                                <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
                                    När din nRF-enhet skickar positioner via
                                    CoAP kommer de visas här på kartan i
                                    realtid.
                                </p>
                            </div>
                        ) : (
                            <div className="h-[calc(100dvh-275px)] min-h-[320px] w-full md:h-[calc(100dvh-225px)] md:min-h-[420px] lg:h-[calc(100dvh-220px)] lg:min-h-[470px]">
                                <MapContainer
                                    center={[59.33, 18.06]}
                                    zoom={13}
                                    className="h-full w-full"
                                >
                                    <TileLayer
                                        maxZoom={19}
                                        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />

                                    <CenterMapOnFirstPoint points={points} />

                                    {points.map((point, index) => {
                                        const lat = Number(point.lat);
                                        const lon = Number(point.lon);
                                        const acc =
                                            point.acc === null
                                                ? null
                                                : Number(point.acc);

                                        if (
                                            Number.isNaN(lat) ||
                                            Number.isNaN(lon)
                                        ) {
                                            return null;
                                        }

                                        return (
                                            <Fragment
                                                key={`${point.device_ID ?? "device"}-${point.data_timestamp ?? index}-${index}`}
                                            >
                                                <Marker position={[lat, lon]}>
                                                    <Popup
                                                        maxWidth={170}
                                                        minWidth={130}
                                                        className="compact-gnss-popup"
                                                    >
                                                        <div className="w-[135px] text-xs leading-tight text-slate-950">
                                                            <p className="mb-2 font-bold">
                                                                GNSS position
                                                            </p>

                                                            <div className="space-y-1">
                                                                <div className="flex justify-between gap-2">
                                                                    <span className="text-slate-500">
                                                                        Device
                                                                    </span>
                                                                    <span className="max-w-[70px] truncate font-semibold">
                                                                        {point.device_ID ??
                                                                            point.device_id ??
                                                                            "N/A"}
                                                                    </span>
                                                                </div>

                                                                <div className="flex justify-between gap-2">
                                                                    <span className="text-slate-500">
                                                                        Lat
                                                                    </span>
                                                                    <span className="font-semibold">
                                                                        {lat.toFixed(
                                                                            5,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <div className="flex justify-between gap-2">
                                                                    <span className="text-slate-500">
                                                                        Lon
                                                                    </span>
                                                                    <span className="font-semibold">
                                                                        {lon.toFixed(
                                                                            5,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <div className="flex justify-between gap-2 rounded-md bg-blue-50 px-2 py-1">
                                                                    <span className="font-medium text-blue-700">
                                                                        Acc
                                                                    </span>
                                                                    <span className="font-bold text-blue-700">
                                                                        {point.acc ??
                                                                            "N/A"}
                                                                    </span>
                                                                </div>

                                                                <div className="pt-1">
                                                                    <p className="text-[10px] text-slate-500">
                                                                        Time
                                                                    </p>
                                                                    <p className="truncate text-[11px] font-semibold">
                                                                        {point.data_timestamp ??
                                                                            "N/A"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Marker>

                                                {acc !== null &&
                                                    !Number.isNaN(acc) && (
                                                        <Circle
                                                            center={[lat, lon]}
                                                            radius={Math.min(
                                                                acc * 0.03,
                                                                5,
                                                            )}
                                                            pathOptions={{
                                                                color: "#2563eb",
                                                                fillColor:
                                                                    "#3b82f6",
                                                                fillOpacity: 0.15,
                                                                weight: 1,
                                                            }}
                                                        />
                                                    )}
                                            </Fragment>
                                        );
                                    })}
                                </MapContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
