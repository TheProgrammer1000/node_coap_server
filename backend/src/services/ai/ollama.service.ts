type AlertContext = {
    id?: number;
    device_ID?: number;
    device_name?: string;
    from_status?: string;
    to_status?: string;
    device_area_distance_m?: number | string;
    created_at?: string;
};

type DevicePayload = {
    device_ID: number;
    command_status: string;
    msg: string;
    payload: {
        rsrp: number;
        cell_id: string;
        operator: string;
        battery: number;
    };
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

/*

*/

function get_rsrp_level(rsrp: number): string {
    // 1. Hantera om värdet inte är ett giltigt nummer
    if (rsrp === undefined || rsrp === null || Number.isNaN(rsrp)) {
        return "Okänd";
    }

    // 2. Sortera logiken strikt uppifrån och ned
    if (rsrp >= -85) {
        return "Utmärkt"; // -85 dBm och bättre (t.ex. -71 dBm som du hade i loggen!)
    } else if (rsrp >= -95) {
        return "Bra"; // Mellan -86 och -95 dBm
    } else if (rsrp >= -105) {
        return "Okej"; // Mellan -96 och -105 dBm
    } else if (rsrp >= -115) {
        return "Dålig"; // Mellan -106 och -115 dBm
    } else {
        return "Extremt dålig"; // Allt sämre än -115 dBm (t.ex. -120 dBm)
    }
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

/*

   device_ID: number;
    command_status: string;
    msg: string;
    payload: {
        rsrp: number;
        cell_id: string;
        operator: string;
        battery: number;
    };

*/

export async function explainDevicePayloadWithOllama(
    payloadContext: DevicePayload,
) {
    const rsrp = get_rsrp_level(payloadContext.payload.rsrp);

    console.log(rsrp);

    const prompt = `
    Du ska förklara datat enligt följande:

    Viktiga regler:
    - Ta variablen ${rsrp} för att indikera om signal styrka är bra eller dålig och ge och visa variablen ${payloadContext.payload.rsrp}
    - Kolla ${payloadContext.payload.battery} alltså batteri nivå och säg hur mycket procent den är på 
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
