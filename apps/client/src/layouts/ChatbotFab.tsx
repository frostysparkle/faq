// Yaksha-mini floating chatbot widget.
// Replaces the old ChatbotFab + ChatbotPage with an in-place overlay
// that matches the design at samagama.in/internship/faq#ym-panel.
// Only rendered for the student role (see AppShell).
import '../styles/yaksha-mini.css';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import type { ChatQueryResponse } from '@samagama/shared';
import { useSendMessage, useSubmitChatFeedback } from '../features/chatbot/queries';

/* ── Types ────────────────────────────────────────────────────────────── */
interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { id: string; title: string; similarity: number }[];
  fallback_triggered?: boolean;
  escalated?: boolean;
  messageIndex?: number;
  feedback?: 'helpful' | 'incorrect';
}

const WELCOME: DisplayMessage = {
  role: 'assistant',
  content:
    "Hi — I'm Yaksha-mini. I answer strictly from this site's FAQ. Ask me about VINS, NOC, dates, stipend, or certificates.",
  sources: [],
};

/* ── SVG icons (matching the reference site) ──────────────────────────── */
function ChatBubbleIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      width={size}
      height={size}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Main widget component ────────────────────────────────────────────── */
export function ChatbotFab() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Resize State
  const [dimensions, setDimensions] = useState({ width: 380, height: 580 });
  const isResizing = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMutation = useSendMessage();
  const feedbackMutation = useSubmitChatFeedback();

  /* Auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* Focus the input when the panel opens */
  useEffect(() => {
    if (!open) return;
    // Small delay so the panel is rendered before we try to focus
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [open]);

  // Resizing logic for Top, Left, and Top-Left edges
  const startResize = (direction: 'top' | 'left' | 'top-left', e: React.PointerEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!isResizing.current) return;
      const dx = startX - moveEv.clientX; // expanding left means dx is positive
      const dy = startY - moveEv.clientY; // expanding top means dy is positive

      setDimensions((prev) => {
        let newW = prev.width;
        let newH = prev.height;
        if (direction === 'left' || direction === 'top-left') {
          newW = Math.max(300, Math.min(startWidth + dx, window.innerWidth - 32));
        }
        if (direction === 'top' || direction === 'top-left') {
          newH = Math.max(400, Math.min(startHeight + dy, window.innerHeight - 32));
        }
        return { width: newW, height: newH };
      });
    };

    const onPointerUp = () => {
      isResizing.current = false;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = ''; // reset global cursor
    };

    // set cursor globally to avoid cursor flickering when mouse moves faster than element
    if (direction === 'top') document.body.style.cursor = 'ns-resize';
    else if (direction === 'left') document.body.style.cursor = 'ew-resize';
    else document.body.style.cursor = 'nwse-resize';

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  /* Send a message */
  const send = async () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);
    try {
      const result: ChatQueryResponse = await sendMutation.mutateAsync({
        message: text,
        sessionId: sessionId ?? undefined,
      });
      if (!sessionId) setSessionId(result.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
          fallback_triggered: result.fallback_triggered,
          escalated: result.escalated,
          messageIndex: result.messageIndex,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          sources: [],
        },
      ]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleFeedback = (msgIdx: number, displayIdx: number, rating: 'helpful' | 'incorrect') => {
    if (!sessionId) return;
    // If the user clicks the already-active rating, do nothing (idempotent).
    const current = messages[displayIdx]?.feedback;
    if (current === rating) return;
    setMessages((prev) => prev.map((m, i) => (i === displayIdx ? { ...m, feedback: rating } : m)));
    feedbackMutation.mutate({ sessionId, messageIndex: msgIdx, rating });
  };

  /* ── Launcher (visible when panel is closed) ────────────────────────── */
  if (!open) {
    return createPortal(
      <button
        type="button"
        className="ym-launcher"
        id="ym-launcher"
        aria-label="Open Yaksha-mini chat"
        data-tooltip="Open Yaksha-mini chat"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: '1.5rem',
          bottom: '1.5rem',
          left: 'auto',
          top: 'auto',
          zIndex: 9000,
        }}
      >
        <span className="ym-launcher-tooltip">Ask Yaksha-mini</span>
        <ChatBubbleIcon />
      </button>,
      document.body,
    );
  }

  /* ── Chat panel (visible when open) ─────────────────────────────────── */
  return createPortal(
    <section
      className="yaksha-mini"
      id="ym-panel"
      aria-label="Yaksha-mini chat"
      style={
        {
          position: 'fixed',
          right: '1.5rem',
          bottom: '1.5rem',
          left: 'auto',
          top: 'auto',
          zIndex: 9100,
          '--ym-width': `${dimensions.width}px`,
          '--ym-height': `${dimensions.height}px`,
        } as React.CSSProperties
      }
    >
      <div className="ym-resize-handle top" onPointerDown={(e) => startResize('top', e)} />
      <div className="ym-resize-handle left" onPointerDown={(e) => startResize('left', e)} />
      <div
        className="ym-resize-handle top-left"
        onPointerDown={(e) => startResize('top-left', e)}
      />

      {/* Header */}
      <div className="yaksha-mini-head">
        <div className="ym-titles">
          <span className="ym-avatar" aria-hidden="true">
            <ChatBubbleIcon size={22} />
          </span>
          <span className="ym-title-stack">
            <span className="ym-title">Yaksha-mini</span>
            <span className="ym-sub">
              <span className="ym-online-dot" aria-hidden="true" />
              Answers from this site
            </span>
          </span>
        </div>
        <button
          type="button"
          className="ym-close"
          id="ym-close"
          aria-label="Close chat"
          data-tooltip="Close chat"
          onClick={() => setOpen(false)}
        >
          &times;
        </button>
      </div>

      {/* Chat log */}
      <div className="yaksha-mini-log" id="ym-log" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            msg={m}
            displayIndex={i}
            sessionId={sessionId}
            onFeedback={handleFeedback}
          />
        ))}

        {isTyping && (
          <div className="ym-msg thinking">
            <div className="ym-bubble">
              <span className="ym-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      <form
        className="yaksha-mini-form"
        id="ym-form"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          id="ym-input"
          name="question"
          placeholder="Type a question…"
          maxLength={500}
          aria-label="Your question for Yaksha-mini"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="ym-send-btn"
          id="ym-send-btn"
          aria-label="Send message"
          data-tooltip="Send message"
          disabled={!input.trim() || sendMutation.isPending}
        >
          <SendIcon />
        </button>
      </form>
    </section>,
    document.body,
  );
}

/* ── Message bubble sub-component ─────────────────────────────────────── */
interface MessageBubbleProps {
  msg: DisplayMessage;
  displayIndex: number;
  sessionId: string | null;
  onFeedback: (msgIdx: number, displayIdx: number, rating: 'helpful' | 'incorrect') => void;
}

function MessageBubble({ msg, displayIndex, sessionId, onFeedback }: MessageBubbleProps) {
  const isUser = msg.role === 'user';

  return (
    <div className={`ym-msg ${isUser ? 'user' : 'assistant'}`}>
      <div>
        <div className="ym-bubble">
          {msg.escalated && <TriangleAlert size={13} className="ym-escalated-icon" />}
          {msg.content}
        </div>

        {/* Feedback buttons */}
        {!isUser && msg.messageIndex !== undefined && sessionId && (
          <div className="ym-feedback-row">
            <button
              type="button"
              className={`ym-fb-btn${msg.feedback === 'helpful' ? ' active-helpful' : msg.feedback === 'incorrect' ? ' ym-fb-inactive' : ''}`}
              onClick={() => onFeedback(msg.messageIndex!, displayIndex, 'helpful')}
            >
              <ThumbsUp size={10} /> Helpful
            </button>
            <button
              type="button"
              className={`ym-fb-btn${msg.feedback === 'incorrect' ? ' active-incorrect' : msg.feedback === 'helpful' ? ' ym-fb-inactive' : ''}`}
              onClick={() => onFeedback(msg.messageIndex!, displayIndex, 'incorrect')}
            >
              <ThumbsDown size={10} /> Not helpful
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
