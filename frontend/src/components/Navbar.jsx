import { Link } from "react-router-dom";
import logo from "../assets/img/mobil-logo.png";

export default function Navbar() {
    return (
        <nav>
            <ul>
                <Link to="/">
                    <img src={logo} id="logo" alt="Logo" />
                </Link>

                <li>
                    <Link to="/">Home</Link>
                </li>

                <li>
                    <Link to="/product">Platform</Link>
                </li>
            </ul>
        </nav>
    );
}
