import { OpenAI } from "openai";
import { assistantId } from "../../assistant-config"; // Ensure assistant ID is imported

export async function POST(req) {
    try {
        const { message, threadId } = await req.json(); // Handle message input and threads

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY, // Uses the API key from .env.local
        });

        // Ensure a thread exists or create a new one
        let thread = threadId;
        if (!thread) {
            const threadResponse = await openai.beta.threads.create({});
            thread = threadResponse.id;
        }

        // Send user message to OpenAI Assistant
        await openai.beta.threads.messages.create(thread, {
            role: "user",
            content: message,
        });

        // Run the assistant's processing
        const run = await openai.beta.threads.runs.create(thread, {
            assistant_id: assistantId, // Using EverLight Aetherius' Assistant ID
        });

        // Poll for a response (simplified for now, can be upgraded with webhooks)
        let runStatus = await openai.beta.threads.runs.retrieve(thread, run.id);
        while (runStatus.status !== "completed") {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retrying
            runStatus = await openai.beta.threads.runs.retrieve(thread, run.id);
        }

        // Get the latest message from the assistant
        const messages = await openai.beta.threads.messages.list(thread);
        const reply = messages.data[0]?.content[0]?.text?.value || "Error: No response received.";

        return Response.json({ reply, threadId: thread });

    } catch (error) {
        console.error("🛑 ERROR:", error);
        return Response.json({ error: "Failed to process request." }, { status: 500 });
    }
}
