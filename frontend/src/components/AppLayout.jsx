import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import ThemeSync from "./ThemeSync";
import { socket } from "@/lib/socket";

export default function AppLayout() {
    useEffect(() => {
        let userId = null;

        try {
            const storedUser = localStorage.getItem("user");
            const user = storedUser ? JSON.parse(storedUser) : null;

            userId = user?.user_ID;
        } catch (error) {
            console.error("Could not read user from localStorage:", error);
        }

        if (!userId) {
            console.warn("No user_ID found. Socket room was not joined.");
            return;
        }

        function joinUserRoom() {
            console.log("Socket connected:", socket.id);
            console.log("Joining user socket room:", `user:${userId}`);

            socket.emit("join-user-room", userId);
        }

        function handleJoinedRoom(payload) {
            console.log("Socket joined room confirmed:", payload);
        }

        function handleConnectError(error) {
            console.error("Socket connection error:", error.message);
        }

        socket.on("connect", joinUserRoom);
        socket.on("socket:joined", handleJoinedRoom);
        socket.on("connect_error", handleConnectError);

        if (!socket.connected) {
            socket.connect();
        } else {
            joinUserRoom();
        }

        return () => {
            socket.off("connect", joinUserRoom);
            socket.off("socket:joined", handleJoinedRoom);
            socket.off("connect_error", handleConnectError);
        };
    }, []);

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
