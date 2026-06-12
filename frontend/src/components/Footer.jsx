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
        <footer className="bg-gray-900 text-gray-200 py-12 px-6 mt-auto border-t border-gray-800">
            <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center">
                {/* INFO & LOGOTYP (Balanserad storlek) */}
                <div className="flex flex-col items-center space-y-5 w-full max-w-lg">
                    <div className="flex flex-col items-center">
                        {/* Logotyp och Rubrik */}
                        <div className="flex items-center gap-3 mb-3 justify-center">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-800 border border-gray-700 shadow-md">
                                <img
                                    src={logo}
                                    alt="Nodecore IT logo"
                                    className="h-7 w-7 object-contain"
                                />
                            </div>
                            <h2 className="text-2xl font-extrabold text-white tracking-wider">
                                NODE<span className="text-blue-500">CORE</span>
                            </h2>
                        </div>

                        {/* Beskrivningstext */}
                        <p className="text-gray-300 text-base leading-relaxed font-normal">
                            Den intelligenta IoT-plattformen för nästa
                            generations cellulära enheter och
                            realtidsdiagnostik.
                        </p>
                    </div>

                    {/* Support & Kontakt */}
                    <div className="pt-3 w-full">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                            Support & Kontakt
                        </h3>
                        <a
                            href="mailto:nodecoreit@gmail.com"
                            className="text-base md:text-lg text-blue-400 hover:text-blue-300 transition-colors font-semibold inline-block border-b border-transparent hover:border-blue-300 pb-0.5"
                        >
                            nodecoreit@gmail.com
                        </a>
                        <p className="text-xs text-gray-500 mt-6 tracking-wide">
                            &copy; {new Date().getFullYear()} Nodecore IT. Alla
                            rättigheter reserverade.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
