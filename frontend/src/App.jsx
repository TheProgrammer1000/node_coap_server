import { Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Product from "./pages/Product";
import Home from "./pages/Home";
import RegisterDevice from "./pages/RegisterDevice";
import AddLocation from "./pages/AddLocation";
import GeofenceDashboard from "./pages/GeofenceDashboard";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/product" replace />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
                element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/product" element={<Product />} />
                <Route path="/home" element={<Home />} />
                <Route path="/register-device" element={<RegisterDevice />} />
                <Route path="/work-areas" element={<AddLocation />} />
                <Route path="/geofence" element={<GeofenceDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/product" replace />} />
        </Routes>
    );
}
