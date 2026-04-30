import express from "express";
import dotenv from "dotenv";

dotenv.config();

import routes from "./routes/index.js";

export function startApiServer() {
    const app = express();

    const port = Number(process.env.API_SERVER_PORT || 3000);
    const host = process.env.API_HOST_NAME || "127.0.0.1";

    app.use(express.json());

    // REST API routesa
    app.use("/api", routes);

    app.get("/health", (req, res) => {
        res.send("API server is running");
    });

    app.listen(port, host, () => {
        console.log(`API server listening on http://${host}:${port}`);
        console.log(`UI: http://${host}:${port}/`);
        console.log(`Index: http://${host}:${port}/index.html`);
        console.log(`GNSS API: http://${host}:${port}/api/gnss`);
    });
}
