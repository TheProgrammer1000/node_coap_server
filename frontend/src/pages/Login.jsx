import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../store/authStore";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (!username.trim() || !password.trim()) {
            setError("Fyll i användarnamn och lösenord");
            return;
        }

        try {
            const response = await axios.post("/api/user/login/", {
                username: username.trim(),
                password: password,
            });

            if (response.data.data.length > 0) {
                login(response.data.data[0]);
                navigate("/");
            } else {
                console.error("response.data.data[0]: ", response.data.data[0]);
            }
        } catch (error) {
            console.error("Login failed:", error);
            setError("Fel användarnamn eller lösenord");
        }
    }

    return (
        <main className="login-page">
            <form className="login-card" onSubmit={handleSubmit}>
                <h1>Logga in</h1>
                <p>COAP Tracker Dashboard</p>

                <label>
                    Användarnamn
                    <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="dennis"
                    />
                </label>

                <label>
                    Lösenord
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Skriv lösenord"
                    />
                </label>

                {error && <p className="error">{error}</p>}

                <button type="submit">Logga in</button>

                <p className="auth-link">
                    Inget konto? <Link to="/register">Registrera dig</Link>
                </p>
            </form>
        </main>
    );
}
