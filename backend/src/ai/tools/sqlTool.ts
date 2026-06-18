import { tool } from "@langchain/core/tools";
import { z } from "zod";
import pool from "../../db/db_connection.js";
import { RunnableConfig } from "@langchain/core/runnables"; // <-- Viktig import

export const runReadOnlyQueries = tool(
    // KORRIGERING: Vi tar emot runnableConfig som det andra argumentet här!
    async ({ query }: { query: string }, runnableConfig?: RunnableConfig) => {
        console.log("Running SQL query...");

        // Nu kommer TypeScript att hitta 'runnableConfig' utan problem!
        const user_ID = runnableConfig?.configurable?.current_user_id;
        console.log("Hittat user_ID i verktyget:", user_ID);

        const upperQuery = query.trim().toUpperCase();

        if (!upperQuery.startsWith("SELECT")) {
            console.error("Error no SELECT");
            return JSON.stringify({
                error: "You just have permission to do SELECT queries",
            });
        }

        try {
            console.log(`AI försöker köra SQL: ${query}`);
            const [rows] = await pool.execute(query);

            return JSON.stringify(rows);
        } catch (error: any) {
            console.error("MySQL Error:", error.message);
            return JSON.stringify({ error: error.message });
        }
    },
    {
        name: "runReadOnlyQueries",
        description:
            "Run SELECT query based on that given query to get statistics or status on IoT devices based on user_ID",
        schema: z.object({
            query: z.string().describe("A valid SQL SELECT query"),
        }),
    },
);
