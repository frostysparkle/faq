'use strict';
const axios = require('axios');
const { LLM_BASE_URL, LLM_INTERNAL_SECRET } = require('../config/env');

const llmClient = axios.create({
  baseURL: LLM_BASE_URL,
  headers: { Authorization: `Bearer ${LLM_INTERNAL_SECRET}` },
  timeout: 30_000,
});

const SYSTEM_INSTRUCTION = `You are a helpful FAQ assistant for the Samagama internship portal. Answer questions accurately and concisely based on the provided context. If the answer is not in the context, say you don't know and suggest escalation.`;

async function generate({ ragContext, conversationHistory, currentMessage }) {
  const { data } = await llmClient.post('/generate', {
    system_instruction: SYSTEM_INSTRUCTION,
    rag_context: ragContext,
    conversation_history: conversationHistory,
    current_message: currentMessage,
  });
  return data;
}

async function summarize({ escalationType, forceReason, conversationHistory }) {
  const { data } = await llmClient.post('/summarize', {
    escalation_type: escalationType,
    force_reason: forceReason,
    conversation_history: conversationHistory,
  });
  return data;
}

module.exports = { generate, summarize };
