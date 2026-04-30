import { Link } from "react-router-dom";
import logo from "../assets/img/mobil-logo.png";

export default function Navbar() {
    return (
        <nav>
            <ul>
                <li className="logo-item">
                    <Link to="/" className="logo-link">
                        <img src={logo} id="logo" alt="Logo" />
                    </Link>
                </li>

                <li>
                    <Link to="/">Home</Link>
                </li>

                <li>
                    <Link to="/product">Platform</Link>
                </li>

                <li>
                    <Link to="/register-device">Add Device</Link>
                </li>
            </ul>
        </nav>
    );
}
