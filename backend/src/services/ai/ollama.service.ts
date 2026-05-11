type AlertContext = {
    id?: number;
    device_ID?: number;
    device_name?: string;
    from_status?: string;
    to_status?: string;
    device_area_distance_m?: number | string;
    created_at?: string;
};

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

function getSeverity(distanceValue?: number | string) {
    const distance = Number(distanceValue);

    if (Number.isNaN(distance)) {
        return "Okänd";
    }

    if (distance < 50) {
        return "Låg";
    }

    if (distance < 500) {
        return "Medel";
    }

    return "Hög";
}

export async function explainAlertWithOllama(alertContext: AlertContext) {
    const severity = getSeverity(alertContext.device_area_distance_m);

    const prompt = `
Du är en svensk AI-assistent för en IoT asset tracking-plattform.

Du ska förklara ett geofence-larm för en vanlig användare.

Viktiga regler:
- Skriv på tydlig svenska.
- Skriv kort och professionellt.
- Hitta inte på egna ord.
- Använd ordet "geofence" eller "arbetsområde".
- Skriv inte "geoförsäzon".
- Skriv inte "medelvåldig".
- Allvarsnivån är redan bestämd av systemet: ${severity}
- Ändra inte allvarsnivån.

Begrepp:
- "inside" betyder att enheten var inom arbetsområdet.
- "outside" betyder att enheten är utanför arbetsområdet.
- "device_area_distance_m" är avståndet i meter.

Alert-data:
${JSON.stringify(alertContext, null, 2)}

Svara exakt i detta format:

Händelse:
[en kort mening]

Allvar:
${severity}

Rekommenderad åtgärd:
[en kort praktisk rekommendation]
`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt,
            stream: false,
            options: {
                temperature: 0.1,
                num_predict: 120,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const data = await response.json();

    return data.response;
}
