import { OpenAI } from "openai";
import { assistantId } from "../../assistant-config"; // ✅ Corrected import path

// Initialize OpenAI with API key from .env.local
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Make sure this key is correctly loaded
});

export async function POST(req) {
    try {
        // Parse incoming request
        const { message, threadId } = await req.json();

        console.log("🛠 DEBUG: Received message:", message);
        console.log("➡️ Assistant ID:", assistantId);
        console.log("➡️ Using API Key:", process.env.OPENAI_API_KEY ? "Loaded" : "MISSING");

        if (!process.env.OPENAI_API_KEY) {
            throw new Error("Missing OpenAI API Key. Ensure it is set in .env.local");
        }

        // Ensure we have a valid thread or create a new one
        let thread = threadId;
        if (!thread) {
            console.log("🛠 Creating new OpenAI thread...");
            const threadResponse = await openai.beta.threads.create({});
            thread = threadResponse.id;
        }

        console.log("📜 Thread ID:", thread);

        // Send user message to OpenAI Assistant
        await openai.beta.threads.messages.create(thread, {
            role: "user",
            content: message,
        });

        console.log("📨 Message sent to Assistant:", message);

        // Run the assistant's processing
        const run = await openai.beta.threads.runs.create(thread, {
            assistant_id: assistantId,
        });

        console.log("⏳ Waiting for Assistant response...");

        // Poll for response until completion
        let runStatus = await openai.beta.threads.runs.retrieve(thread, run.id);
        while (runStatus.status !== "completed") {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retrying
            runStatus = await openai.beta.threads.runs.retrieve(thread, run.id);
        }

        console.log("✅ Assistant response complete!");

        // Retrieve the latest assistant message
        const messages = await openai.beta.threads.messages.list(thread);
        const reply = messages.data[0]?.content[0]?.text?.value || "Error: No response received.";

        console.log("📝 Assistant Reply:", reply);

        return Response.json({ reply, threadId: thread });

    } catch (error) {
        console.error("🛑 ERROR:", error);
        return Response.json({ error: error.message || "Failed to process request." }, { status: 500 });
    }
}
