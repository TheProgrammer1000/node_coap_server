import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Box,
    CirclePlus,
    Home,
    LogOut,
    Menu,
    Moon,
    Sun,
    X,
} from "lucide-react";

import { useAuthStore } from "../store/authStore";
import logo from "../assets/img/mobil-logo.png";

import { Button } from "@/components/ui/button";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const logout = useAuthStore((state) => state.logout);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("theme");

        if (savedTheme === "dark" || savedTheme === "light") {
            return savedTheme;
        }

        return "light";
    });

    useEffect(() => {
        const root = document.documentElement;

        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }

        localStorage.setItem("theme", theme);
    }, [theme]);

    function toggleTheme() {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }

    function handleLogout() {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("theme");

        if (logout) {
            logout();
        }

        navigate("/login", { replace: true });
    }

    function isActive(path) {
        return location.pathname === path;
    }

    function navButtonClass(path) {
        return isActive(path)
            ? "rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg hover:from-blue-600 hover:to-violet-600"
            : "rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
    }

    const navLinks = [
        {
            to: "/home",
            label: "Home",
            icon: Home,
        },
        {
            to: "/product",
            label: "Platform",
            icon: Box,
        },
        {
            to: "/register-device",
            label: "Add Device",
            icon: CirclePlus,
        },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
                <div className="flex items-center justify-between gap-4">
                    <Link
                        to="/home"
                        className="flex min-w-0 items-center gap-3"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                            <img
                                src={logo}
                                alt="GeoNode logo"
                                className="h-12 w-12 object-contain"
                            />
                        </div>

                        <div className="min-w-0">
                            <p className="truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                                GeoNode
                            </p>
                            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                                IoT GNSS Tracking Platform
                            </p>
                        </div>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden items-center gap-3 lg:flex">
                        {navLinks.map((item) => {
                            const Icon = item.icon;

                            return (
                                <Button
                                    key={item.to}
                                    asChild
                                    variant="ghost"
                                    className={`h-12 px-5 text-base font-semibold ${navButtonClass(item.to)}`}
                                >
                                    <Link to={item.to}>
                                        <Icon className="mr-2 h-5 w-5" />
                                        {item.label}
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>

                    {/* Desktop actions */}
                    <div className="hidden items-center gap-3 lg:flex">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={toggleTheme}
                            className="h-12 rounded-2xl border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"
                        >
                            {theme === "dark" ? (
                                <>
                                    <Sun className="mr-2 h-5 w-5" />
                                    Light
                                </>
                            ) : (
                                <>
                                    <Moon className="mr-2 h-5 w-5" />
                                    Dark
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleLogout}
                            className="h-12 rounded-2xl border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <LogOut className="mr-2 h-5 w-5" />
                            Logga ut
                        </Button>
                    </div>

                    {/* Mobile menu button */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        className="h-12 w-12 rounded-2xl border-slate-200 bg-white p-0 lg:hidden dark:border-slate-800 dark:bg-slate-900"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 lg:hidden dark:border-slate-800">
                        <div className="grid gap-3">
                            {navLinks.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <Button
                                        key={item.to}
                                        asChild
                                        variant="ghost"
                                        className={`h-12 w-full justify-start rounded-2xl px-4 text-base font-semibold ${navButtonClass(item.to)}`}
                                    >
                                        <Link
                                            to={item.to}
                                            onClick={() =>
                                                setMobileMenuOpen(false)
                                            }
                                        >
                                            <Icon className="mr-2 h-5 w-5" />
                                            {item.label}
                                        </Link>
                                    </Button>
                                );
                            })}
                        </div>

                        <div className="grid gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={toggleTheme}
                                className="h-12 w-full justify-start rounded-2xl border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"
                            >
                                {theme === "dark" ? (
                                    <>
                                        <Sun className="mr-2 h-5 w-5" />
                                        Byt till light mode
                                    </>
                                ) : (
                                    <>
                                        <Moon className="mr-2 h-5 w-5" />
                                        Byt till dark mode
                                    </>
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleLogout}
                                className="h-12 w-full justify-start rounded-2xl border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"
                            >
                                <LogOut className="mr-2 h-5 w-5" />
                                Logga ut
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
