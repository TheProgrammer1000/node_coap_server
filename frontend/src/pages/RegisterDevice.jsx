import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import Navbar from "../components/Navbar";

export default function RegisterDevice() {
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();

    const [deviceId, setDeviceId] = useState("");
    const [deviceName, setDeviceName] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!deviceId.trim()) {
            setError("Fyll i enhets-ID");
            return;
        }

        setIsLoading(true);

        try {
            await axios.post("/api/device/register/", {
                device_ID: deviceId.trim(),
                user_ID: user.user_ID,
                device_name: deviceName.trim() || null,
            });

            setSuccess("Enhet registrerad! Omdirigerar...");
            setTimeout(() => {
                navigate("/");
            }, 2000);
        } catch (error) {
            console.error("Register device failed:", error);
            setError("Kunde inte registrera enhet. Kontrollera enhets-ID.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <Navbar />
            <main className="login-page">
                <form className="login-card" onSubmit={handleSubmit}>
                    <h1>Registrera enhet</h1>
                    <p>Lägg till en ny GNSS-enhet för {user?.show_username}</p>

                    <label>
                        Enhets-ID
                        <input
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            placeholder="ex. 123456789"
                            type="number"
                        />
                    </label>

                    <label>
                        Enhetsnamn{" "}
                        <span style={{ opacity: 0.5, fontSize: "0.85em" }}>
                            (valfritt)
                        </span>
                        <input
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            placeholder="ex. Min tracker"
                        />
                    </label>

                    {error && <p className="error">{error}</p>}
                    {success && <p className="success">{success}</p>}

                    <button type="submit" disabled={isLoading}>
                        {isLoading ? "Registrerar..." : "Registrera enhet"}
                    </button>

                    <p className="auth-link">
                        <span
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate("/")}
                        >
                            ← Tillbaka till kartan
                        </span>
                    </p>
                </form>
            </main>
        </>
    );
}
