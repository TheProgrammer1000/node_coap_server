import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    function handleSubmit(event) {
        event.preventDefault();

        // Enkel test-login just nu
        if (username === "admin" && password === "1234") {
            login();
            navigate("/");
            return;
        }

        setError("Fel användarnamn eller lösenord");
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
                        placeholder="admin"
                    />
                </label>

                <label>
                    Lösenord
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="1234"
                    />
                </label>

                {error && <p className="error">{error}</p>}

                <button type="submit">Logga in</button>
            </form>
        </main>
    );
}
