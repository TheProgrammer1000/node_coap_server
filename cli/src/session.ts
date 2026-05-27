import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/*
    Data som sparas efter login.
    user_ID används automatiskt i kommandon så användaren slipper --user.
*/
export type NodecoreSession = {
    user_ID: number;
    username?: string;
    token?: string;
};

/*
    Sparar sessionen i användarens home directory:
    Mac:   /Users/denniskarlsson/.nodecore/config.json
    Linux: /home/dennis/.nodecore/config.json
*/
const CONFIG_DIR = path.join(os.homedir(), ".nodecore");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

/*
    Sparar login-sessionen efter lyckad login.
*/
export function saveSession(session: NodecoreSession) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(session, null, 2), {
        mode: 0o600,
    });
}

/*
    Läser sparad session.
    Returnerar null om användaren inte är inloggad.
*/
export function loadSession(): NodecoreSession | null {
    if (!fs.existsSync(CONFIG_PATH)) {
        return null;
    }

    try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        const session = JSON.parse(raw) as NodecoreSession;

        if (!session.user_ID) {
            return null;
        }

        return session;
    } catch {
        return null;
    }
}

/*
    Används i kommandon som kräver login.
*/
export function requireSession(): NodecoreSession | null {
    const session = loadSession();

    if (!session) {
        console.error("You are not logged in.");
        console.error(
            "Run: nodecore user login --username <username> --password <password>",
        );
        process.exitCode = 1;
        return null;
    }

    return session;
}

/*
    Tar bort sparad session.
*/
export function clearSession() {
    if (fs.existsSync(CONFIG_PATH)) {
        fs.unlinkSync(CONFIG_PATH);
    }
}

/*
    Visar var sessionen sparas.
*/
export function getSessionPath() {
    return CONFIG_PATH;
}
