import { useState, useRef, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const { data } = await apiClient.post('/api/chat/query', {
        message: text,
        sessionId,
        conversationHistory: history,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Yaksha Chatbot</h1>
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '1rem', background: '#fafafa' }}>
        {messages.length === 0 && (
          <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '4rem' }}>
            Ask a question about the Samagama portal. Type <strong>#escalate</strong> to raise a ticket.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%', padding: '0.6rem 0.9rem', borderRadius: 12,
              background: m.role === 'user' ? '#3b82f6' : '#e2e8f0',
              color: m.role === 'user' ? '#fff' : '#1e293b',
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ color: '#94a3b8', fontStyle: 'italic', marginLeft: 4 }}>Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          disabled={loading}
          style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{ padding: '0.6rem 1.2rem', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          Send
        </button>
      </div>
    </div>
  );
}
