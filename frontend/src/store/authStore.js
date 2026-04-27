import { create } from "zustand";

export const useAuthStore = create((set) => ({
    isLoggedIn: localStorage.getItem("isLoggedIn") === "true",
    user: JSON.parse(localStorage.getItem("user") || "null"),

    login: (user) => {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify(user));

        set({
            isLoggedIn: true,
            user,
        });
    },

    logout: () => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");

        set({
            isLoggedIn: false,
            user: null,
        });
    },
}));
