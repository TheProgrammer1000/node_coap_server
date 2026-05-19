import { Routes, Route, Navigate } from "react-router-dom";

import ThemeSync from "./components/ThemeSync";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import RegisterDevice from "./pages/RegisterDevice";
import AddLocation from "./pages/WorkAreas";
import GeofenceDashboard from "./pages/GeofenceDashboard";
import MotionLive from "./pages/MotionLive";
import Devices from "./pages/Devices";
import MockBleMotionSession from "./pages/MockBleMotionSession";
import MockCellular from "./pages/MockCellular";

export default function App() {
    return (
        <>
            <ThemeSync />

            <Routes>
                <Route
                    path="/"
                    element={<Navigate to="/landing-page" replace />}
                />

                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Google OAuth callback måste vara utanför ProtectedRoute */}
                <Route path="/oauth/callback" element={<OAuthCallback />} />

                <Route
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path="/mock-motion-session"
                        element={<MockBleMotionSession />}
                    />

                    <Route path="/landing-page" element={<LandingPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route
                        path="/register-device"
                        element={<RegisterDevice />}
                    />

                    <Route path="/work-areas" element={<AddLocation />} />
                    <Route path="/geofence" element={<GeofenceDashboard />} />
                    <Route path="/motion-live" element={<MotionLive />} />
                    <Route path="/devices" element={<Devices />} />
                    <Route
                        path="/mock-cellular-route"
                        element={<MockCellular />}
                    />
                </Route>

                <Route
                    path="*"
                    element={<Navigate to="/landing-page" replace />}
                />
            </Routes>
        </>
    );
}
