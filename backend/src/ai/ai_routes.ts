import { Router } from "express";
import {
    explainAlertWithOllama,
    explainDevicePayloadWithOllama,
} from "../services/ai/ollama.service.js";

import { agent } from "./agent.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const router = Router();
router.post("/agent", async (req, res) => {
    try {
        console.log("req.body: ", req.body);
        const { message, user_ID } = req.body;

        if (!message) {
            return res.status(400).json({
                error: "Du måste skicka med ett 'message' i din JSON body.",
            });
        }

        // 1. Dina fasta instruktioner till modellen
        const systemPrompt = `
        Du är en tyst databas-analytiker och ska svara på frågor och hjälpa användaren med det som frågas.
        Skriv alltid ren och korrekt svenska, istället för skriva en device skriv 1 device.
        `;

        // 2. Sammansättningen där du skickar med ALLT i ett och samma meddelande
        const combinedText = `
        [CONTEXT: Logged in user_ID = ${user_ID || "unknown"}]

        [INSTRUKTIONER]:
        ${systemPrompt.trim()}

        [ANVÄNDARENS FRÅGA]:
        ${message.trim()}
        `;

        const result = await agent.invoke(
            {
                messages: [new HumanMessage(combinedText)],
            },
            {
                configurable: {
                    thread_id: `user_session_${user_ID || "anon"}`,
                    current_user_id: user_ID,
                },
                recursionLimit: 10,
            },
        );

        // ✨ SÄKER HÄMTNING AV SVAR ✨
        // Ibland ligger svaret i sista meddelandet, ibland i näst sista om verktyg kördes.
        // Vi letar efter det sista AIMessage som faktiskt har textinnehåll:
        let reply: string = "";

        if (result.messages && result.messages.length > 0) {
            // Gå baklänges i meddelandena för att hitta AI:s textsträng
            for (let i = result.messages.length - 1; i >= 0; i--) {
                const msg = result.messages[i];

                // Kontrollera att det är ett AI-meddelande (inte ToolMessage eller HumanMessage)
                // Vi kollar både ._getType() och att innehållet är en textsträng
                if (msg._getType() === "ai" && msg.content && typeof msg.content === "string") {
                    reply = msg.content;
                    break;
                }
            }
        }

        // Om vi mot förmodan inte hittar något, sätt ett standardsvar istället för att krascha
        if (!reply) {
            reply = "Jag kunde tyvärr inte generera ett svar baserat på datan.";
        }

        console.log("Skickar slutgiltigt svar till frontend:", reply);

        res.json({success: true, data: reply})
    } catch (err) {
        console.error("Error in agent route: ", err);
        res.status(500).send("Ett internt fel uppstod i AI-agenten.");
    }
});

// En helt "tyst" route för dashboarden
router.post("/dashboard", async (req, res) => {
  try {
        console.log("req.body: ", req.body);
        const { user_ID } = req.body;

        if (!user_ID) {
            return res.status(400).json({
                error: "Du måste skicka med ett 'user_ID' i din JSON body.",
            });
        }

        console.log("Running AI Agent Query for user:", user_ID);

       // Här hårdkodar vi instruktionen inuti backend. Användaren slipper skriva något!
       const systemPrompt = `
        SAMMANFATTNING:
        Du är en tyst databas-analytiker.
        Kör bara SQL-fråga om användaren vill ha någon information om device annars kör inte ens en SQL-fråga!

        SQL REGLER:
        Kör en SQL-fråga för att kontrollera om användaren har några enheter med battery_percent under 20 %
        och ge devicens namn och device_ID i svaret.

        Svara tydligt på vilken device det är!

        REGLER FÖR SVAR:
        - Om användaren frågor "Ge mig all information om device" då ska du koppla alla tabeller och ge viktigt information utifrån dem.
        - Om databasen är tom (inga enheter under 20 %): Svara EXAKT bara: "Alla enheter har bra batterinivå just nu."
        `;
        
        const combinedText = `[CONTEXT: Logged in user_ID = ${user_ID}]\n\nQuery: ${systemPrompt}`;

        const result = await agent.invoke(
            {
                messages: [new HumanMessage(combinedText)],
            },
            {
                configurable: {
                    // Genom att lägga till Date.now() blir minnet helt rent varje gång!
                    thread_id: `dashboard_summary_${user_ID}_${Date.now()}`,
                    current_user_id: user_ID,
                },
                recursionLimit: 10,
            },
        );

        const reply = result.messages[result.messages.length - 1].content;
        console.log("reply: ", reply);

        res.json({success: true, data: reply})
    } catch (err) {
        console.error("Error in agent route: ", err);
        res.status(500).send("Ett internt fel uppstod i AI-agenten.");
    }
});

router.post("/explain-alert", async (req, res) => {
    const alertData = req.body;

    if (!alertData?.device_ID || !alertData?.to_status) {
        return res.status(400).json({
            success: false,
            error: "device_ID and alert data are required",
        });
    }

    try {
        const explanation = await explainAlertWithOllama(alertData);

        return res.json({
            success: true,
            explanation,
            alert: alertData,
        });
    } catch (error) {
        console.error("Failed to explain alert:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to explain alert",
        });
    }
});

router.post("/explain/device-payload", async (req, res) => {
    const payloadData = req.body;

    if (!payloadData) {
        return res.status(400).json({
            success: false,
            error: "payload is required",
        });
    }

    try {
        const explanation = await explainDevicePayloadWithOllama(payloadData);
        return res.status(200).json({
            success: true,
            explanation,
            payload: payloadData,
        });
    } catch (error) {
        console.error("Failed to explain device-payload", error);

        return res.status(500).json({
            success: false,
            error: "Failed to device-payload",
        });
    }
});

export default router;
