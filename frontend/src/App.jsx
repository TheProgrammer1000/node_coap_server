import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Product from "./pages/Product";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import RegisterDevice from "./pages/RegisterDevice";
import AddLocation from "./pages/AddLocation";
import GeofenceDashboard from "./pages/GeofenceDashboard";

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route
                path="/home"
                element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/product"
                element={
                    <ProtectedRoute>
                        <Product />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/work-areas"
                element={
                    <ProtectedRoute>
                        <AddLocation />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/geofence"
                element={
                    <ProtectedRoute>
                        <GeofenceDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/register-device"
                element={
                    <ProtectedRoute>
                        <RegisterDevice />
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
    );
}
