import { Fragment, useEffect, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import Navbar from "../components/Navbar";
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

// Fix för Leaflet marker-icons i Vite/React
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClickPopup() {
    const [clickedPosition, setClickedPosition] = useState(null);

    useMapEvents({
        click(event) {
            setClickedPosition(event.latlng);
        },
    });

    if (!clickedPosition) {
        return null;
    }

    return (
        <Popup position={clickedPosition}>
            You clicked the map at {clickedPosition.toString()}
        </Popup>
    );
}

function CenterMapOnFirstPoint({ points }) {
    const map = useMap();
    const hasCenteredMap = useRef(false);

    useEffect(() => {
        if (hasCenteredMap.current) {
            return;
        }

        if (points.length === 0) {
            return;
        }

        const firstPoint = points[0];
        const lat = Number(firstPoint.lat);
        const lon = Number(firstPoint.lon);

        if (Number.isNaN(lat) || Number.isNaN(lon)) {
            return;
        }

        map.setView([lat, lon], 12);
        hasCenteredMap.current = true;
    }, [points, map]);

    return null;
}

export default function Home() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    console.log("show_username: ", user?.show_username);
    console.log("user_ID: ", user?.user_ID);

    const [points, setPoints] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");

    async function loadGnssData() {
        try {
            const response = await axios.get(`/api/gnss/user/${user.user_ID}`);

            const result = response.data;
            console.log("response.data", response.data);

            if (response.data.success != false) {
                setPoints(Array.isArray(result.data) ? result.data : []);
                setErrorMessage("");
            } else {
                setErrorMessage(response.data.msg);
            }

            console.log(points.length);
        } catch (error) {
            console.error("Failed to load GNSS data:", error);
            setErrorMessage("Failed to load GNSS data");
        }
    }

    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true });
            return;
        }

        loadGnssData();
    }, [user]);

    return (
        <>
            <Navbar />
            <h2 style={{ textAlign: "center" }}>Hello {user.show_username}</h2>
            <h1 id="header">GNSS location</h1>

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            {points.length <= 0 ? (
                <p>No GPS data stored</p>
            ) : (
                <div id="map">
                    <MapContainer
                        center={[59.33, 18.06]}
                        zoom={13}
                        className="leaflet-map"
                    >
                        <TileLayer
                            maxZoom={19}
                            attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapClickPopup />

                        <CenterMapOnFirstPoint points={points} />
                        {points.length > 0 &&
                            points.map((point, index) => {
                                const lat = Number(point.lat);
                                const lon = Number(point.lon);
                                const acc =
                                    point.acc === null
                                        ? null
                                        : Number(point.acc);

                                if (Number.isNaN(lat) || Number.isNaN(lon)) {
                                    return null;
                                }

                                return (
                                    <div key={`${point.device_ID}-${index}`}>
                                        <Marker position={[lat, lon]}>
                                            <Popup>
                                                <strong>Device:</strong>{" "}
                                                {point.device_ID}
                                                <br />
                                                <strong>Lat:</strong> {lat}
                                                <br />
                                                <strong>Lon:</strong> {lon}
                                                <br />
                                                <strong>Accuracy:</strong>{" "}
                                                {point.acc ?? "N/A"}
                                                <br />
                                                <strong>Time:</strong>{" "}
                                                {point.data_timestamp ?? "N/A"}
                                            </Popup>
                                        </Marker>

                                        {acc !== null && !Number.isNaN(acc) && (
                                            <Circle
                                                center={[lat, lon]}
                                                radius={Math.min(acc * 0.03, 5)}
                                                pathOptions={{
                                                    color: "red",
                                                    fillColor: "#f03",
                                                    fillOpacity: 0.2,
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                    </MapContainer>
                </div>
            )}

            <button onClick={logout}>Logout</button>
        </>
    );
}
