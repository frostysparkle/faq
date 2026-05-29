// Floating chatbot button. Only rendered for the student role (see AppShell).
// Implements Change Spec §4 — fixed position, accessible label, navigates to /chatbot.
import { Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ChatbotFab() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="chatbotFab"
      aria-label="Open Yaksha Chatbot"
      onClick={() => navigate('/chatbot')}
    >
      <Bot aria-hidden="true" size={24} />
    </button>
  );
}
