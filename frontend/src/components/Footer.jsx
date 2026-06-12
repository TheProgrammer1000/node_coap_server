import React, { useState } from "react";
import logo from "../assets/img/mobil-logo.png";

export default function Footer() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
    });
    const [status, setStatus] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("Skickar...");

        console.log("Kontaktformulär skickat:", formData);

        setTimeout(() => {
            setStatus("Skickat! Tack för att du kontaktar oss.");
            setFormData({ name: "", email: "", message: "" });
        }, 1500);
    };

    return (
        <footer className="bg-gray-900 text-gray-200 py-8 px-6 mt-auto border-t border-gray-800">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* VÄNSTER SIDA: INFO & LOGOTYP (Ljusare text och samlad) */}
                <div className="flex flex-col space-y-5">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 border border-gray-700 shadow-inner">
                                <img
                                    src={logo}
                                    alt="Nodecore IT logo"
                                    className="h-7 w-7 object-contain"
                                />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-wider">
                                NODE<span className="text-blue-500">CORE</span>
                            </h2>
                        </div>

                        <p className="text-gray-300 max-w-sm text-sm leading-relaxed">
                            Den intelligenta IoT-plattformen för nästa
                            generations cellulära enheter och
                            realtidsdiagnostik.
                        </p>
                    </div>

                    <div className="pt-1">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Support & Kontakt
                        </h3>
                        <a
                            href="mailto:nodecoreit@gmail.com"
                            className="text-base text-blue-400 hover:text-blue-300 transition-colors font-medium"
                        >
                            nodecoreit@gmail.com
                        </a>
                        <p className="text-xs text-gray-500 mt-3">
                            &copy; {new Date().getFullYear()} Nodecore IT. Alla
                            rättigheter reserverade.
                        </p>
                    </div>
                </div>

                {/* HÖGER SIDA: KONTAKTFORMULÄR (Större och mer välkomnande) */}
                <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-800 shadow-xl md:justify-self-end w-full md:max-w-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Namn och E-post */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1.5 font-medium">
                                    Namn
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                                    placeholder="Ditt namn"
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1.5 font-medium">
                                    E-postadress
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                                    placeholder="din.email@exempel.se"
                                />
                            </div>
                        </div>

                        {/* Meddelande */}
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-300 mb-1.5 font-medium">
                                Meddelande
                            </label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows="3"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
                                placeholder="Vad kan vi hjälpa dig med?"
                            />
                        </div>

                        {/* Status och Knapp */}
                        <div className="flex items-center justify-between gap-4 pt-1">
                            <div className="h-5 flex items-center">
                                {status && (
                                    <p
                                        className={`text-sm font-medium ${status.includes("Tack") || status.includes("Skickat") ? "text-green-400" : "text-blue-400"}`}
                                    >
                                        {status}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-colors text-sm shadow-lg shadow-blue-600/10"
                            >
                                Skicka
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </footer>
    );
}
