import { Moon, Sun } from "lucide-react";

function getCurrentTheme() {
    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

export default function ThemeToggle({ fullText = true }) {
    const theme = getCurrentTheme();

    function handleToggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";

        localStorage.setItem("theme", nextTheme);
        window.dispatchEvent(new Event("theme-change"));
    }

    return (
        <button
            onClick={handleToggleTheme}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
        >
            {theme === "dark" ? (
                <>
                    <Sun className="h-4 w-4" />
                    {fullText ? "Light mode" : "Light"}
                </>
            ) : (
                <>
                    <Moon className="h-4 w-4" />
                    {fullText ? "Dark mode" : "Dark"}
                </>
            )}
        </button>
    );
}
