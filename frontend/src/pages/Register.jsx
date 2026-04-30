import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Register() {
    const [showUsername, setShowUsername] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const navigate = useNavigate();

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!showUsername.trim() || !username.trim() || !password.trim()) {
            setError("Fyll i alla fält");
            return;
        }

        if (password.length < 4) {
            setError("Lösenordet måste vara minst 4 tecken");
            return;
        }

        try {
            await axios.post("/api/user/register/", {
                show_username: showUsername.trim(),
                username: username.trim(),
                password: password,
            });

            setSuccess("Konto skapat. Du skickas till login...");

            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (error) {
            console.error("Register failed:", error);
            setError("Kunde inte skapa konto");
        }
    }

    return (
        <main className="login-page">
            <form className="login-card" onSubmit={handleSubmit}>
                <h1>Registrera</h1>
                <p>Skapa konto för COAP Tracker Dashboard</p>

                <label>
                    Visningsnamn
                    <input
                        value={showUsername}
                        onChange={(event) =>
                            setShowUsername(event.target.value)
                        }
                        placeholder="Dennis"
                    />
                </label>

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
                {success && <p className="success">{success}</p>}

                <button type="submit">Registrera</button>

                <p className="auth-link">
                    Har du redan konto? <Link to="/login">Logga in</Link>
                </p>
            </form>
        </main>
    );
}
