import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import ThemeSync from "./ThemeSync";

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
            <ThemeSync />

            <Navbar />

            <main className="min-h-screen xl:pl-72">
                <Outlet />
            </main>
        </div>
    );
}
