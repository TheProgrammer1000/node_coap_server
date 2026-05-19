import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
    const location = useLocation();
    const token = localStorage.getItem("token");

    const hasToken = token && token !== "undefined" && token !== "null";

    if (!hasToken) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}
