import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function applyTheme() {
    const savedTheme = localStorage.getItem("theme");
    const root = document.documentElement;

    if (savedTheme === "dark") {
        root.classList.add("dark");
    } else {
        root.classList.remove("dark");
    }
}

export default function ThemeSync() {
    const location = useLocation();

    useEffect(() => {
        applyTheme();
    }, [location.pathname]);

    useEffect(() => {
        applyTheme();

        function handleThemeChange() {
            applyTheme();
        }

        window.addEventListener("theme-change", handleThemeChange);
        window.addEventListener("storage", handleThemeChange);

        return () => {
            window.removeEventListener("theme-change", handleThemeChange);
            window.removeEventListener("storage", handleThemeChange);
        };
    }, []);

    return null;
}
