import { Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import RegisterDevice from "./pages/RegisterDevice";
import WorkAreas from "./pages/WorkAreas";
import GeofenceDashboard from "./pages/GeofenceDashboard";
import MockCellular from "./pages/MockCellular";
import MotionLive from "./pages/MotionLive";
import MockMotionSession from "./pages/MockBleMotionSession";
import Account from "./pages/Account";
import DeviceEvents from "./pages/DeviceEvents";
import DeviceDetails from "./pages/DeviceDetails";
import DeviceControl from "./pages/DeviceControl";

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* Protected platform pages */}
            <Route
                element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/landing-page" element={<LandingPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/register-device" element={<RegisterDevice />} />
                <Route path="/account" element={<Account />} />
                <Route path="/work-areas" element={<WorkAreas />} />
                <Route path="/geofence" element={<GeofenceDashboard />} />
                <Route path="/device-control" element={<DeviceControl />} />

                <Route path="/mock-cellular-route" element={<MockCellular />} />
                <Route path="/motion-live" element={<MotionLive />} />
                <Route
                    path="/mock-motion-session"
                    element={<MockMotionSession />}
                />
                <Route path="/device-events" element={<DeviceEvents />} />
                {/* DeviceDetails läser params.device_ID */}
                <Route path="/devices/:device_ID" element={<DeviceDetails />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            {/* Unknown pages */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
