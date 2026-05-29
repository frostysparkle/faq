require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;
const LM_STUDIO_URL = process.env.LM_STUDIO_URL;

// Authentication Middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    next();
};

// API 1: Generate RAG Response
app.post('/internal/llm/generate', authenticate, async (req, res) => {
    const { system_instruction, rag_context, conversation_history, current_message } = req.body;

    if (!current_message) {
        return res.status(400).json({ status: 'error', message: 'current_message is required' });
    }

    // Prepare context string
    const contextString = rag_context && rag_context.length > 0 
        ? "\n\nCONTEXT:\n" + rag_context.join('\n') 
        : "";

    // Prepare messages for LM Studio (OpenAI format)
    const messages = [
        { role: 'system', content: system_instruction + contextString },
        ...conversation_history,
        { role: 'user', content: current_message }
    ];

    try {
        const response = await axios.post(`${LM_STUDIO_URL}/chat/completions`, {
            messages: messages,
            temperature: 0.2,
            max_tokens: 500
        });

        const responseText = response.data.choices[0].message.content.trim();
        const fallbackString = "I don't have an answer for you at the moment. You can escalate it to backend team: Type #escalate";
        const fallbackTriggered = responseText.includes(fallbackString);

        res.json({
            status: 'success',
            data: {
                response_text: responseText,
                fallback_triggered: fallbackTriggered
            }
        });
    } catch (error) {
        console.error('Error calling LM Studio:', error.message);
        res.status(500).json({ status: 'error', message: 'LLM Server Error' });
    }
});

// API 2: Summarize for Escalation
app.post('/internal/llm/summarize', authenticate, async (req, res) => {
    const { escalation_type, force_reason, conversation_history } = req.body;

    const historyText = conversation_history.map(m => `${m.role}: ${m.content}`).join('\n');
    
    const systemPrompt = `You are a support supervisor. Summarize the user's issue based on the conversation history and their reason for escalation.
Output MUST be in strict JSON format.
JSON structure:
{
  "summary": "concise summary of the problem",
  "is_general_query": boolean
}
Do not include any other text or explanation.`;

    const userPrompt = `Escalation Type: ${escalation_type}
Reason provided: ${force_reason || 'No reason provided'}

Conversation History:
${historyText}`;

    try {
        const response = await axios.post(`${LM_STUDIO_URL}/chat/completions`, {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0,
            // Attempting to force JSON if LM Studio supports it, otherwise prompt handles it
            response_format: { type: "json_object" } 
        });

        let responseContent = response.data.choices[0].message.content.trim();
        
        // Basic cleanup in case LLM adds markdown code blocks
        if (responseContent.startsWith('```json')) {
            responseContent = responseContent.replace(/^```json/, '').replace(/```$/, '').trim();
        }

        const summaryData = JSON.parse(responseContent);

        res.json({
            status: 'success',
            data: summaryData
        });
    } catch (error) {
        console.error('Error calling LM Studio for summarization:', error.message);
        res.status(500).json({ status: 'error', message: 'LLM Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`LLM Server running on port ${PORT}`);
});
