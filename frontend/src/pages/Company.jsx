import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Activity,
    ArrowRight,
    Bluetooth,
    CheckCircle2,
    Cloud,
    Cpu,
    Database,
    Gauge,
    Mail,
    MapPinned,
    Radio,
    Rocket,
    Server,
    ShieldCheck,
    TerminalSquare,
    Wrench,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const CONTACT_EMAIL = "nodecoreit@gmail.com";

const services = [
    {
        icon: Cpu,
        title: "Firmware & Embedded",
        text: "Utveckling i C/Zephyr för BLE, Cellular, GNSS, I2C, sensorer, device-status och diagnostik.",
    },
    {
        icon: Server,
        title: "Backend & API",
        text: "Node.js-backend, REST API, CoAP, Socket.IO, databasdesign och realtidsflöden.",
    },
    {
        icon: MapPinned,
        title: "IoT Dashboard",
        text: "Webbplattform med device-status, kartor, geofence, alerts, historik, events och sessioner.",
    },
    {
        icon: TerminalSquare,
        title: "CLI & Device Tools",
        text: "Command line tools för device events, firmware commands, status och diagnostik.",
    },
];

const offers = [
    {
        name: "Förstudie",
        tag: "Start",
        headline: "Teknisk riktning innan utveckling",
        description:
            "För företag som vill förstå vad som krävs innan de bygger en IoT-prototyp eller uppkopplad produkt.",
        items: [
            "Genomgång av hårdvara och användningsfall",
            "Teknisk lösningsskiss",
            "Val av kommunikation: BLE, Cellular, CoAP, HTTP eller MQTT",
            "Risker, krav och nästa steg",
            "Tydligt MVP-scope",
        ],
        cta: "Boka förstudie",
    },
    {
        name: "IoT Proof of Concept",
        tag: "Prototyp",
        headline: "Visa att dataflödet fungerar",
        description:
            "För företag som vill testa ett konkret flöde från fysisk device till backend, databas och dashboard.",
        items: [
            "Firmware-grund för BLE eller Cellular",
            "Backend API och databas",
            "Enkel dashboard eller teknisk demo",
            "Device status, firmware version och historik",
            "Demo som kan visas internt",
        ],
        cta: "Starta PoC",
        highlighted: true,
    },
    {
        name: "MVP / Pilot",
        tag: "Produkt",
        headline: "Från prototyp till användbar pilot",
        description:
            "För företag som vill bygga vidare från en teknisk demo till en lösning som kan testas med riktiga användare.",
        items: [
            "Device onboarding och användarflöde",
            "Alerts, events och geofence",
            "BLE-sessioner eller GNSS-spårning",
            "Device detail, status och diagnostik",
            "Förberett för verklig användning",
        ],
        cta: "Diskutera MVP",
    },
    {
        name: "Drift & vidareutveckling",
        tag: "Löpande",
        headline: "Support när systemet är i drift",
        description:
            "För system som behöver vidareutveckling, hosting, felsökning, nya features och teknisk förvaltning.",
        items: [
            "Support och felsökning",
            "Hosting och backend-drift",
            "Nya funktioner och förbättringar",
            "Firmware command queue och diagnostik",
            "Löpande prioritering",
        ],
        cta: "Prata drift",
    },
];

const processSteps = [
    {
        title: "1. Förstå hårdvaran",
        text: "Vi går igenom device, sensorer, kommunikation och vilken data som ska bli användbar.",
    },
    {
        title: "2. Koppla upp device",
        text: "Firmware skickar data via BLE, Cellular, CoAP, HTTP eller annan lämplig transport.",
    },
    {
        title: "3. Bygga backend",
        text: "API, databas, events, device-status, alerts och realtidsuppdateringar byggs runt dataflödet.",
    },
    {
        title: "4. Visa i dashboard",
        text: "Användaren får en tydlig webbplattform med status, historik, karta, sessioner och diagnostik.",
    },
];

export default function Company() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        company: "",
        message: "",
    });

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function handleSubmit(event) {
        event.preventDefault();

        const subject = encodeURIComponent(
            `NodeCore förfrågan${form.company ? ` - ${form.company}` : ""}`,
        );

        const body = encodeURIComponent(
            `Namn: ${form.name}\nE-post: ${form.email}\nFöretag: ${form.company}\n\nMeddelande:\n${form.message}`,
        );

        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600">
                            <Cpu className="h-6 w-6" />
                        </div>

                        <div>
                            <p className="text-lg font-black tracking-tight text-white">
                                NodeCore IT
                            </p>
                            <p className="text-xs text-slate-400">
                                Firmware to dashboard
                            </p>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-6 text-sm font-bold text-slate-300 md:flex">
                        <a href="#services" className="hover:text-white">
                            Tjänster
                        </a>
                        <a href="#offers" className="hover:text-white">
                            Erbjudanden
                        </a>
                        <a href="#contact" className="hover:text-white">
                            Kontakt
                        </a>
                    </nav>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/login"
                            className="hidden h-10 items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 text-sm font-black text-white transition hover:bg-white/10 sm:inline-flex"
                        >
                            Logga in
                        </Link>

                        <a
                            href="#contact"
                            className="inline-flex h-10 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700"
                        >
                            Boka demo
                        </a>
                    </div>
                </div>
            </header>

            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.35),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.28),_transparent_35%)]" />

                <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
                    <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200">
                            <Radio className="h-4 w-4" />
                            IoT, embedded, backend och dashboard
                        </div>

                        <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
                            Från firmware till färdig IoT-plattform.
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                            NodeCore IT hjälper företag att koppla upp fysisk
                            utrustning till backend, databas och webbplattform —
                            med realtidsdata, alerts, device-status, diagnostik
                            och tydlig dashboard.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <a
                                href="#contact"
                                className="inline-flex h-14 items-center justify-center rounded-2xl bg-blue-600 px-6 text-base font-black text-white transition hover:bg-blue-700"
                            >
                                Starta projekt
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </a>

                            <a
                                href="#offers"
                                className="inline-flex h-14 items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 text-base font-black text-white transition hover:bg-white/10"
                            >
                                Se erbjudanden
                            </a>
                        </div>

                        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <MiniStat label="Firmware" value="C/Zephyr" />
                            <MiniStat label="Backend" value="Node.js" />
                            <MiniStat label="Data" value="MySQL" />
                            <MiniStat label="Live" value="Socket.IO" />
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:p-5">
                        <div className="rounded-[1.5rem] bg-slate-900 p-5">
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black text-slate-400">
                                        NodeCore Platform
                                    </p>
                                    <p className="text-2xl font-black text-white">
                                        Device overview
                                    </p>
                                </div>

                                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                                    LIVE
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <DashboardPreviewRow
                                    icon={Radio}
                                    title="Cellular GNSS"
                                    text="Position, geofence och alerts"
                                    status="Online"
                                />
                                <DashboardPreviewRow
                                    icon={Bluetooth}
                                    title="BLE Motion"
                                    text="BNO055 sessions och historik"
                                    status="Streaming"
                                />
                                <DashboardPreviewRow
                                    icon={Gauge}
                                    title="Device Health"
                                    text="Battery, firmware och status"
                                    status="OK"
                                />
                                <DashboardPreviewRow
                                    icon={TerminalSquare}
                                    title="Command Queue"
                                    text="Firmware diagnostics och commands"
                                    status="Ready"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-y border-white/10 bg-slate-900/70">
                <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
                    <ValueItem
                        icon={ShieldCheck}
                        title="Mindre osäkerhet"
                        text="Se om devices är online, skickar data och kör rätt firmware."
                    />
                    <ValueItem
                        icon={Activity}
                        title="Snabbare felsökning"
                        text="Events, status och diagnostik gör det enklare att hitta problem."
                    />
                    <ValueItem
                        icon={Cloud}
                        title="Från hårdvara till produkt"
                        text="Bygg inte bara firmware — bygg en komplett uppkopplad tjänst."
                    />
                </div>
            </section>

            <section
                id="services"
                className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
            >
                <div className="max-w-3xl">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">
                        Tjänster
                    </p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
                        Det NodeCore kan leverera.
                    </h2>
                    <p className="mt-4 text-lg leading-8 text-slate-300">
                        Fokus är system där firmware, backend och dashboard
                        måste fungera tillsammans.
                    </p>
                </div>

                <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {services.map((service) => (
                        <Card
                            key={service.title}
                            className="border-white/10 bg-white/5 text-white"
                        >
                            <CardContent className="p-6">
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300">
                                    <service.icon className="h-6 w-6" />
                                </div>

                                <h3 className="text-xl font-black text-white">
                                    {service.title}
                                </h3>

                                <p className="mt-3 text-sm leading-6 text-slate-300">
                                    {service.text}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <section
                id="offers"
                className="bg-white py-16 text-slate-950 sm:py-20"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">
                            Erbjudanden
                        </p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                            Rätt upplägg beror på hårdvara, scope och mål.
                        </h2>
                        <p className="mt-4 text-lg leading-8 text-slate-600">
                            I stället för fasta paketpriser börjar vi med att
                            förstå vad som ska byggas. Därefter kan arbetet
                            delas upp i tydliga steg: förstudie, proof of
                            concept, MVP/pilot och eventuell drift.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {offers.map((offer) => (
                            <OfferCard key={offer.name} offer={offer} />
                        ))}
                    </div>

                    <div className="mt-8 grid gap-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-slate-700 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <p className="font-black text-slate-950">
                                Pris efter behov och omfattning
                            </p>
                            <p className="mt-2">
                                Varje IoT-projekt bedöms utifrån hårdvara,
                                kommunikation, firmware, backend, datamängd,
                                dashboard, säkerhet, antal devices och drift.
                                Därför lämnas pris efter kort genomgång.
                            </p>
                        </div>

                        <a
                            href="#contact"
                            className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700"
                        >
                            Be om offert
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">
                            Process
                        </p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
                            En enkel väg från idé till fungerande system.
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {processSteps.map((step) => (
                            <div
                                key={step.title}
                                className="rounded-3xl border border-white/10 bg-white/5 p-6"
                            >
                                <h3 className="text-lg font-black text-white">
                                    {step.title}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-slate-300">
                                    {step.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="contact" className="bg-slate-900 py-16 sm:py-20">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">
                            Kontakt
                        </p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
                            Vill du bygga en uppkopplad produkt?
                        </h2>
                        <p className="mt-5 text-lg leading-8 text-slate-300">
                            Skicka en kort beskrivning av hårdvaran, sensorerna
                            och vad du vill mäta, styra eller visa i
                            dashboarden.
                        </p>

                        <div className="mt-8 space-y-4">
                            <ContactLine
                                icon={Mail}
                                title="E-post"
                                text={CONTACT_EMAIL}
                            />
                            <ContactLine
                                icon={Wrench}
                                title="Fokus"
                                text="Embedded, backend, IoT dashboards och systemintegration."
                            />
                            <ContactLine
                                icon={Database}
                                title="Leverans"
                                text="Förstudie, PoC, MVP, pilot eller löpande vidareutveckling."
                            />
                        </div>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="rounded-[2rem] border border-white/10 bg-white p-5 text-slate-950 shadow-2xl sm:p-8"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Namn"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                            <Field
                                label="E-post"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="mt-4">
                            <Field
                                label="Företag"
                                name="company"
                                value={form.company}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mt-4">
                            <label className="text-sm font-black text-slate-700">
                                Vad vill du bygga?
                            </label>
                            <textarea
                                name="message"
                                value={form.message}
                                onChange={handleChange}
                                required
                                rows={6}
                                className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                                placeholder="Exempel: Vi vill spåra utrustning, läsa sensordata, få alerts eller bygga en prototyp..."
                            />
                        </div>

                        <button
                            type="submit"
                            className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-base font-black text-white transition hover:bg-blue-700"
                        >
                            Skicka förfrågan
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </button>

                        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                            Formuläret öppnar din e-postklient. Senare kan detta
                            kopplas till ett riktigt contact API.
                        </p>
                    </form>
                </div>
            </section>

            <footer className="border-t border-white/10 bg-slate-950 px-4 py-8 text-sm text-slate-400 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {new Date().getFullYear()} NodeCore IT.</p>
                    <p>Embedded systems · Backend · IoT dashboards</p>
                </div>
            </footer>
        </main>
    );
}

function OfferCard({ offer }) {
    return (
        <article
            className={`flex h-full flex-col rounded-3xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                offer.highlighted
                    ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white"
            }`}
        >
            <div className="mb-5 flex items-center justify-between gap-3">
                <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                        offer.highlighted
                            ? "bg-blue-600 text-white"
                            : "bg-blue-50 text-blue-700"
                    }`}
                >
                    {offer.tag}
                </span>

                <Rocket className="h-5 w-5 text-blue-600" />
            </div>

            <h3 className="text-2xl font-black text-slate-950">{offer.name}</h3>

            <p className="mt-3 text-lg font-black text-blue-600">
                {offer.headline}
            </p>

            <p className="mt-4 min-h-[120px] text-sm leading-6 text-slate-600">
                {offer.description}
            </p>

            <div className="mt-6 space-y-3">
                {offer.items.map((item) => (
                    <div
                        key={item}
                        className="flex gap-3 text-sm text-slate-700"
                    >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                    </div>
                ))}
            </div>

            <a
                href="#contact"
                className={`mt-8 inline-flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-black transition ${
                    offer.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-slate-950 text-white hover:bg-slate-800"
                }`}
            >
                {offer.cta}
            </a>
        </article>
    );
}

function MiniStat({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-black text-white">{value}</p>
        </div>
    );
}

function DashboardPreviewRow({ icon: Icon, title, text, status }) {
    return (
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300">
                <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate font-black text-white">{title}</p>
                <p className="truncate text-sm text-slate-400">{text}</p>
            </div>

            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                {status}
            </span>
        </div>
    );
}

function ValueItem({ icon: Icon, title, text }) {
    return (
        <div className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300">
                <Icon className="h-5 w-5" />
            </div>

            <div>
                <p className="font-black text-white">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
            </div>
        </div>
    );
}

function ContactLine({ icon: Icon, title, text }) {
    return (
        <div className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300">
                <Icon className="h-5 w-5" />
            </div>

            <div>
                <p className="font-black text-white">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
            </div>
        </div>
    );
}

function Field({ label, name, value, onChange, required = false }) {
    return (
        <div>
            <label className="text-sm font-black text-slate-700">{label}</label>
            <input
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
        </div>
    );
}
