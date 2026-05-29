const axios = require('axios');

const BASE_URL = 'http://localhost:5000/internal/llm';
const SECRET = 'my_internal_secret';

async function testGenerate() {
    console.log('Testing /generate...');
    try {
        const response = await axios.post(`${BASE_URL}/generate`, {
            system_instruction: "You are a helpful support bot. Use ONLY the provided context to answer. If the answer is not in the context, reply EXACTLY with: 'I don't have an answer for you at the moment. You can escalate it to backend team: Type #escalate'.",
            rag_context: [
                "FAQ: To change your billing cycle, go to Settings > Billing and select 'Update Plan'."
            ],
            conversation_history: [
                { role: "user", content: "Hi" },
                { role: "assistant", content: "Hello! How can I help?" }
            ],
            current_message: "How do I change my billing?"
        }, {
            headers: { Authorization: `Bearer ${SECRET}` }
        });
        console.log('Generate Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Generate Error:', error.response ? error.response.data : error.message);
    }
}

async function testSummarize() {
    console.log('\nTesting /summarize...');
    try {
        const response = await axios.post(`${BASE_URL}/summarize`, {
            escalation_type: "force_escalate",
            force_reason: "The billing page shows an error 404.",
            conversation_history: [
                { role: "user", content: "I tried to change my billing but it failed." },
                { role: "assistant", content: "I'm sorry to hear that. What error did you see?" }
            ]
        }, {
            headers: { Authorization: `Bearer ${SECRET}` }
        });
        console.log('Summarize Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Summarize Error:', error.response ? error.response.data : error.message);
    }
}

async function runTests() {
    await testGenerate();
    await testSummarize();
}

runTests();
