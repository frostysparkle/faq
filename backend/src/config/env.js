'use strict';
require('dotenv').config();

const required = (name) => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
};

module.exports = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  LLM_BASE_URL: process.env.LLM_BASE_URL || 'http://localhost:5000/internal/llm',
  LLM_INTERNAL_SECRET: process.env.LLM_INTERNAL_SECRET || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  VITE_ORIGIN: process.env.VITE_ORIGIN || 'http://localhost:5173',
};
