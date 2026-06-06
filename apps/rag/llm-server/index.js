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
const STREAM_PING_INTERVAL_MS = 5000;
const HARD_TIMEOUT_MS = 5 * 60 * 1000;

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  next();
};

const sendSSE = (res, data) => {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const callLMStudio = async (messages, temperature = 0.2, maxTokens = 500) => {
  const response = await axios.post(`${LM_STUDIO_URL}/chat/completions`, {
    messages,
    temperature,
    max_tokens: maxTokens,
  });
  return response.data.choices[0].message.content.trim();
};

app.post('/internal/llm/generate', authenticate, async (req, res) => {
  const { system_instruction, rag_context, conversation_history, current_message } = req.body;

  if (!current_message) {
    return res.status(400).json({ status: 'error', message: 'current_message is required' });
  }

  const contextString =
    rag_context && rag_context.length > 0 ? '\n\nCONTEXT:\n' + rag_context.join('\n') : '';

  const messages = [
    { role: 'system', content: system_instruction + contextString },
    ...conversation_history,
    { role: 'user', content: current_message },
  ];

  try {
    const responseText = await callLMStudio(messages);

    const fallbackString =
      "I don't have an answer for you at the moment. You can escalate it to backend team: Type #escalate";
    const fallbackTriggered = responseText.includes(fallbackString);

    res.json({
      status: 'success',
      data: {
        response_text: responseText,
        fallback_triggered: fallbackTriggered,
      },
    });
  } catch (error) {
    console.error('Error calling LM Studio:', error.message);
    res.status(500).json({ status: 'error', message: 'LLM Server Error' });
  }
});

app.post('/internal/llm/generate-stream', authenticate, async (req, res) => {
  const { system_instruction, rag_context, conversation_history, current_message } = req.body;

  if (!current_message) {
    return res.status(400).json({ status: 'error', message: 'current_message is required' });
  }

  const contextString =
    rag_context && rag_context.length > 0 ? '\n\nCONTEXT:\n' + rag_context.join('\n') : '';

  const messages = [
    { role: 'system', content: system_instruction + contextString },
    ...conversation_history,
    { role: 'user', content: current_message },
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const pingInterval = setInterval(() => {
    sendSSE(res, { type: 'ping', timestamp: Date.now() });
  }, STREAM_PING_INTERVAL_MS);

  const timeout = setTimeout(() => {
    clearInterval(pingInterval);
    sendSSE(res, { type: 'timeout' });
    res.end();
  }, HARD_TIMEOUT_MS);

  try {
    const response = await axios.post(
      `${LM_STUDIO_URL}/chat/completions`,
      { messages, temperature: 0.2, max_tokens: 500, stream: true },
      { responseType: 'stream' }
    );

    let fullContent = '';

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              fullContent += parsed.choices[0].delta.content;
            }
          } catch {}
        }
      }
    });

    response.data.on('end', () => {
      clearInterval(pingInterval);
      clearTimeout(timeout);
      sendSSE(res, { type: 'response', content: fullContent.trim() });
      res.end();
    });

    response.data.on('error', (err) => {
      clearInterval(pingInterval);
      clearTimeout(timeout);
      sendSSE(res, { type: 'error', message: err.message });
      res.end();
    });
  } catch (error) {
    clearInterval(pingInterval);
    clearTimeout(timeout);
    sendSSE(res, { type: 'error', message: error.message });
    res.end();
  }
});

app.post('/internal/llm/summarize', authenticate, async (req, res) => {
  const { escalation_type, force_reason, conversation_history, keepRecentCount } = req.body;

  if (!conversation_history || !Array.isArray(conversation_history)) {
    return res.status(400).json({ status: 'error', message: 'conversation_history is required' });
  }

  if (keepRecentCount !== undefined) {
    const keepRecent = keepRecentCount;
    const toSummarize = conversation_history.slice(0, -keepRecent);

    if (toSummarize.length === 0) {
      return res.json({ status: 'success', data: { summary: '', summarizedCount: 0 } });
    }

    const historyText = toSummarize.map((m) => `${m.role}: ${m.content}`).join('\n');

    const systemPrompt = `You are a conversation summarizer. Summarize the following conversation into a concise summary that captures the key points, topics discussed, and any important context.
Keep the summary brief but informative - it should be enough to understand the flow of conversation without reading all the original messages.
Do not include any preamble, just output the summary text.`;

    const userPrompt = `Summarize this conversation:\n${historyText}`;

    try {
      const summary = await callLMStudio(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        0.3,
        300
      );

      res.json({
        status: 'success',
        data: {
          summary,
          summarizedCount: toSummarize.length,
        },
      });
    } catch (error) {
      console.error('Error calling LM Studio for summarization:', error.message);
      res.status(500).json({ status: 'error', message: 'LLM Server Error' });
    }
    return;
  }

  const historyText = conversation_history.map((m) => `${m.role}: ${m.content}`).join('\n');

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
    const response = await axios.post(
      `${LM_STUDIO_URL}/chat/completions`,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }
    );

    let responseContent = response.data.choices[0].message.content.trim();

    if (responseContent.startsWith('```json')) {
      responseContent = responseContent
        .replace(/^```json/, '')
        .replace(/```$/, '')
        .trim();
    }

    const summaryData = JSON.parse(responseContent);

    res.json({
      status: 'success',
      data: summaryData,
    });
  } catch (error) {
    console.error('Error calling LM Studio for summarization:', error.message);
    res.status(500).json({ status: 'error', message: 'LLM Server Error' });
  }
});

app.post('/internal/llm/summarize-chunks', authenticate, async (req, res) => {
  const { chunks, metaPrompt } = req.body;

  if (!chunks || !Array.isArray(chunks)) {
    return res.status(400).json({ status: 'error', message: 'chunks array is required' });
  }

  if (chunks.length === 0) {
    return res.json({ status: 'success', data: { metaSummary: '' } });
  }

  const chunksText = chunks
    .map((c, i) => `Chunk ${i + 1}:\n${c.summary || '(empty)'}`)
    .join('\n\n');

  const defaultMetaPrompt = `You are a conversation archivist. Given a series of conversation summaries (chunks), create a coherent meta-summary that captures the overall topics, themes, and important context across all chunks.
Keep it concise but comprehensive - this meta-summary will be used alongside recent messages to provide context for ongoing conversations.
Do not include any preamble, just output the meta-summary.`;

  const userPrompt = `${metaPrompt || defaultMetaPrompt}\n\nChunks:\n${chunksText}`;

  try {
    const metaSummary = await callLMStudio(
      [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: userPrompt },
      ],
      0.3,
      400
    );

    res.json({
      status: 'success',
      data: { metaSummary },
    });
  } catch (error) {
    console.error('Error calling LM Studio for meta-summarization:', error.message);
    res.status(500).json({ status: 'error', message: 'LLM Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`LLM Server running on port ${PORT}`);
});