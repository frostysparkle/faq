import { Bot, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Panel } from "../../components/ui/Panel";
import { PageHeader } from "../faq/FaqPages";

export function ChatbotPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello. I am Yaksha, your Samagama internship assistant. I answer from approved FAQs and moderated Q&A."
    },
    { role: "user", content: "How do I submit my NOC document?" },
    {
      role: "assistant",
      content:
        "Submit NOC from Documents > NOC Submission. Upload your signed NOC and proof of internship completion before the deadline.\n\nSource: FAQ #42 - NOC Submission Process"
    }
  ]);

  return (
    <>
      <PageHeader
        title="Yaksha Chatbot"
        subtitle="Source-grounded answers from approved Samagama knowledge."
      />
      <Panel title="Chat" icon={Bot}>
        <div className="chatWindow" aria-live="polite">
          {messages.map((message, index) => (
            <div className={`chatBubble ${message.role}`} key={`${message.role}-${index}`}>
              {message.content}
            </div>
          ))}
        </div>
        <div className="feedbackRow">
          <button className="successButton">
            <ThumbsUp aria-hidden="true" />
            Helpful
          </button>
          <button className="dangerButton">
            <ThumbsDown aria-hidden="true" />
            Incorrect
          </button>
        </div>
        <form
          className="chatInput"
          onSubmit={(event) => {
            event.preventDefault();
            setMessages((current) => [
              ...current,
              { role: "user", content: "Attendance correction process" },
              {
                role: "assistant",
                content:
                  "I could not find a verified answer for this. You can post this in Community Q&A."
              }
            ]);
          }}
        >
          <input placeholder="Type your question" />
          <button className="primaryButton">
            <Send aria-hidden="true" />
            Send
          </button>
        </form>
      </Panel>
    </>
  );
}
