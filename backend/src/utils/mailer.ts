import "dotenv/config";
import { Resend } from "resend";

// Initiera Resend med din API-nyckel från .env
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

// Denna funktion exporterar vi så att du kan använda den i din /register-route sen!
export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
    try {
        const { data, error } = await resend.emails.send({
            from: "Nodecore <onboarding@resend.dev>", // Resends gratis test-domän
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error("Fel från Resend API:", error);
            return { success: false, error };
        }

        console.log("Mejl skickat via Resend! ID:", data?.id);
        return { success: true, data };
    } catch (error) {
        console.error("Kritiskt fel i mailer.ts:", error);
        return { success: false, error };
    }
};

// --- TESTKÖRNING ---
// Den här funktionen körs BARA när du testar filen direkt med tsx
async function testMail() {
    console.log("Försöker skicka testmejl...");
    await sendEmail({
        to: "nodecoreit@gmail.com", // Skicka till din egen Gmail för att testa
        subject: "Test från Nodecore via Resend!",
        html: "<h1>Det fungerar!</h1><p>Nu slipper vi Googles lösenordsspärrar helt och hållet.</p>"
    });
}

// Kör testet direkt
testMail();