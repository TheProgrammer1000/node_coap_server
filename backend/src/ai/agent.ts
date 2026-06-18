import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import { MemorySaver } from "@langchain/langgraph";
import { runReadOnlyQueries } from "./tools/sqlTool.js";

// NY IMPORT FÖR LOKAL KÖRNING
import { ChatOllama } from "@langchain/ollama";

// NY IMPORT FÖR LOKAL KÖRNING

const model = new ChatOllama({
    model: process.env.AI_MODEL, // Måste matcha namnet du startade i terminalen
    baseUrl: "http://localhost:11434", 
    temperature: 0, // 0 är bäst för kod och SQL så den inte hallucinerar
});
const memory = new MemorySaver();

const systemMessage = `
Du är Nodecore IT:s smarta databas-assistent och support. Din primära uppgift är att hämta information från en MySQL-databas via verktyget 'runReadOnlyQueries' baserat på användarens fråga.

SAMTALSHANTERING:
- Om användaren frågar om något om device då ska du OMEDELBART använda 'runReadOnlyQueries' för att hämta informationen.
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

DATABAS TABELLER:

    - user (
        user_ID int NOT NULL AUTO_INCREMENT,
        show_username varchar(255) DEFAULT NULL,
        username varchar(255) DEFAULT NULL,
        email varchar(255) DEFAULT NULL,
        password_hash varchar(255) DEFAULT NULL,
        auth_provider enum('local','google','microsoft') NOT NULL DEFAULT 'local',
        provider_user_id varchar(255) DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_ID),
        UNIQUE KEY unique_username (username),
        UNIQUE KEY unique_email (email),
        UNIQUE KEY unique_provider_user (auth_provider,provider_user_id)
    ) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

    - device_user (
        device_ID bigint NOT NULL,
        user_ID int NOT NULL,
        device_name varchar(255) DEFAULT NULL,
        data_transport varchar(255) NOT NULL DEFAULT 'cellular',
        PRIMARY KEY (device_ID),
        UNIQUE KEY device_ID_UNIQUE (device_ID)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


    - device_health (
        device_ID bigint NOT NULL,
        last_seen timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        battery_percent int DEFAULT NULL,
        firmware_version varchar(255) DEFAULT NULL,
    PRIMARY KEY (device_ID)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 
SÄKERHETSREGEL:
Du kommer att få instruktioner om vilken användare som är inloggad via ett SystemMessage. 
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


DATBAS KOPPLING:
- Exempel på få alla devices från user_ID "SELECT * FROM user a, device_user b WHERE a.user_ID = b.user_ID AND a.user_ID = ?;"
- Exempel på koppla alla devices och få battery procent och senaste sedd device_health exempelvis "SELECT b.device_ID, b.device_name, c.battery_percent, c.last_seen FROM user a, device_user b, device_health c WHERE a.user_ID = b.user_ID AND b.device_ID = c.device_ID AND a.user_ID = ?;"
- Om vi inte får koppling eller inge rader då MÅSTE du svara användaren och det inte fanns något och ställa en annan fråga
`;

export const agent = createReactAgent({
    llm: model,
    tools: [runReadOnlyQueries],
    messageModifier: systemMessage, // <-- TypeScript är nöjd nu när detta är en vanlig sträng!
    checkpointSaver: memory,
});
