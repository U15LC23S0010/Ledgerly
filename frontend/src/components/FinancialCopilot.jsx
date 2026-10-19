import { useEffect, useRef, useState } from "react";
import { askFinancialCopilot } from "../api/insightsApi";
import {
  Bot,
  X,
  Send,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import "./FinancialCopilot.css";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I'm your Ledgerly Financial Copilot. Ask me about your expenses, transactions, accounts, budgets, invoices, or customers.",
};

const SUGGESTIONS = [
  "Summarize my recent spending",
  "What is my current account balance?",
  "Show my unpaid invoices",
];

export default function FinancialCopilot() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const sendMessage = async (text = message) => {
    const question = text.trim();

    if (!question || loading) return;

    setMessage("");
    setMessages((previous) => [
      ...previous,
      { role: "user", content: question },
    ]);
    setLoading(true);

    try {
      const response = await askFinancialCopilot(question);
      const answer = response?.data?.answer;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("The Copilot returned an empty response.");
      }

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: answer },
      ]);
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.message ||
        "Something went wrong. Please try again.";

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `I couldn't answer that right now. ${detail}`,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const resetChat = () => {
    if (loading) return;
    setMessages([INITIAL_MESSAGE]);
    setMessage("");
  };

  return (
    <div className="financial-copilot">
      {open && (
        <section
          className="copilot-panel"
          aria-label="Ledgerly Financial Copilot"
          aria-modal="false"
          role="dialog"
        >
          <header className="copilot-header">
            <div className="copilot-heading">
              <div className="copilot-avatar">
                <Sparkles size={20} />
              </div>

              <div>
                <h2>Financial Copilot</h2>
                <p>Your personal finance assistant</p>
              </div>
            </div>

            <div className="copilot-header-actions">
              <button
                type="button"
                className="copilot-icon-button"
                onClick={resetChat}
                disabled={loading}
                aria-label="Clear conversation"
                title="New conversation"
              >
                <RotateCcw size={17} />
              </button>

              <button
                type="button"
                className="copilot-icon-button"
                onClick={() => setOpen(false)}
                aria-label="Close Copilot"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <div className="copilot-messages">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`copilot-message-row ${
                  item.role === "user" ? "user-row" : "assistant-row"
                }`}
              >
                {item.role === "assistant" && (
                  <div className="copilot-small-avatar">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`copilot-message ${
                    item.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  } ${item.error ? "copilot-error" : ""}`}
                >
                  {item.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="copilot-suggestions">
                <p>Try asking</p>

                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    disabled={loading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="copilot-message-row assistant-row">
                <div className="copilot-small-avatar">
                  <Bot size={16} />
                </div>
                <div className="copilot-message assistant-message copilot-typing">
                  Thinking
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            className="copilot-input-area"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <textarea
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about your finances..."
              aria-label="Message Financial Copilot"
              rows={1}
              maxLength={1000}
              disabled={loading}
            />

            <button
              type="submit"
              className="copilot-send-button"
              disabled={loading || !message.trim()}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>

          <p className="copilot-disclaimer">
            Answers are generated by AI. Verify important financial figures.
          </p>
        </section>
      )}

      <button
        type="button"
        className={`copilot-launcher ${open ? "launcher-open" : ""}`}
        onClick={() => setOpen((previous) => !previous)}
        aria-label={
          open ? "Close Financial Copilot" : "Open Financial Copilot"
        }
        aria-expanded={open}
        title="Financial Copilot"
      >
        {open ? <X size={25} /> : <Sparkles size={25} />}
      </button>
    </div>
  );
}