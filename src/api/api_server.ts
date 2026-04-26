import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import routes from "./routes/index.js";

export function startApiServer() {
    const app = express();
    const port = Number(process.env.API_SERVER_PORT || 3000);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // api_server.ts ligger i src/api/
    // public ligger två nivåer upp
    const publicPath = path.resolve(__dirname, "../../public");

    console.log("Current working directory:", process.cwd());
    console.log("Serving static files from:", publicPath);

    app.use(express.json());

    // Serverar public/index.html, public/index.js, public/index.css
    app.use(express.static(publicPath));

    // REST API routes
    app.use("/api", routes);

    app.get("/health", (req, res) => {
        res.send("API server is running");
    });

    app.listen(port, () => {
        console.log(`API server listening on port ${port}`);
        console.log(`UI: http://localhost:${port}/`);
        console.log(`Index: http://localhost:${port}/index.html`);
        console.log(`Health: http://localhost:${port}/health`);
        console.log(`GNSS API: http://localhost:${port}/api/gnss`);
    });
}
