import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Bot, X, Send, Loader2 } from "lucide-react";

export default function AiChatDrawer({ isOpen, onClose }) {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_ID || null;

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            message:
                "Hej! Jag är Nodecore IT AI. Hur kan jag hjälpa dig med din IoT-flotta idag?",
        },
    ]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Skrolla till botten automatiskt vid nya meddelanden
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, chatLoading]);

    // Stäng med escape-knappen
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === "Escape") onClose();
        }
        if (isOpen) window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    async function handleSendChatMessage(e) {
        e.preventDefault();
        if (!chatInput.trim() || chatLoading) return;

        // Skapa meddelandeobjektet för din lokala React-state
        const userMessage = {
            role: "user",
            message: chatInput.trim(),
            user_ID: userId,
        };
        const updatedMessages = [...messages, userMessage];

        // 1. Uppdatera gränssnittet direkt så användaren ser sitt meddelande
        setMessages(updatedMessages);
        setChatInput("");
        setChatLoading(true);

        try {
            // 2. Skicka meddelandet till din backend
            const response = await axios.post("/api/ai/agent", {
                role: userMessage.role,
                message: userMessage.message,
                user_ID: userMessage.user_ID,
            });

            console.log("Fullständigt svar från backend:", response.data);

            // 3. KORRIGERING: Plocka ut .data från backend-objektet { success: true, data: "..." }
            // Om response.data.data av någon anledning saknas faller vi tillbaka på response.data
            const aiReply = response.data?.data || response.data;

            // 4. Spara meddelandet som en ren sträng i staten
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    message: aiReply,
                },
            ]);
        } catch (error) {
            console.error("AI Agent Error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    message:
                        "Ett fel uppstod vid kommunikation med AI-agenten. Kontrollera din server.",
                },
            ]);
        } finally {
            setChatLoading(false);
        }
    }

    return (
        <>
            {/* AI CHAT PANEL (SLIDE-OVER DRAWER från höger) */}
            <div
                className={`fixed inset-y-0 right-0 z-50 flex w-full sm:w-[440px] transform flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* Header */}
                <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-950 dark:text-white">
                                Nodecore AI Assistant
                            </h3>
                            <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                                Live System Agent
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Meddelande-lista */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-violet-600 text-white shadow-sm rounded-tr-none" : "bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 shadow-xs rounded-tl-none"}`}
                            >
                                <p className="whitespace-pre-wrap leading-relaxed">
                                    {msg.message}
                                </p>
                            </div>
                        </div>
                    ))}
                    {chatLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-2xl rounded-tl-none px-4 py-2.5 bg-white border border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                                <span>Tänker</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Formulär */}
                <form
                    onSubmit={handleSendChatMessage}
                    className="border-t border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-950"
                >
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Fråga om din device"
                            disabled={chatLoading}
                            className="w-full h-11 rounded-xl border border-slate-200 pl-4 pr-12 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-800 dark:bg-slate-900 dark:focus:bg-slate-950 dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim() || chatLoading}
                            className="absolute right-1.5 h-8 w-8 flex items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-40 disabled:hover:bg-violet-600"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </form>
            </div>

            {/* Bakgrunds-dimmer när chatten är öppen */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs transition-opacity"
                />
            )}
        </>
    );
}