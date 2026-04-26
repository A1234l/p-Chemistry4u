import { useState, useRef, useEffect } from "react";
import type { SavedQuestion, TopicStats, MCOption } from "../types";

interface Message {
  role: "user" | "assistant";
  content: string;
  question?: SavedQuestion;
}

interface Props {
  onSaveQuestion: (q: SavedQuestion) => void;
  topicStats: TopicStats;
  weakTopics: string[];
}

const AP_CHEM_TOPICS = [
  "Atomic Structure", "Molecular Geometry", "Stoichiometry",
  "Thermodynamics", "Kinetics", "Equilibrium",
  "Acids & Bases", "Electrochemistry", "Intermolecular Forces", "Gases"
];

function buildSystemPrompt(topicStats: TopicStats, weakTopics: string[]) {
  const statsLines = Object.entries(topicStats)
    .filter(([, s]) => s.total > 0)
    .map(([t, s]) => `  - ${t}: ${s.correct}/${s.total} correct (${Math.round(s.correct / s.total * 100)}%)`)
    .join("\n");

  const weakSection = weakTopics.length > 0
    ? `The student is currently STRUGGLING most with: ${weakTopics.join(", ")}. Proactively suggest or generate questions on these topics when appropriate.`
    : "No weak topics identified yet.";

  return `You are ChemMentorAP, an expert AP Chemistry tutor for high school students. You are encouraging, precise, and pedagogically excellent.

Your primary capabilities:
1. Answer any AP Chemistry question conversationally.
2. Generate AP Chem practice questions (MC or FRQ) on demand.
3. Explain concepts clearly with real-world context.

AP Chem topics you cover: ${AP_CHEM_TOPICS.join(", ")}.

${weakSection}

Student performance so far:
${statsLines || "  No questions answered yet."}

CRITICAL — When generating questions, you MUST respond in this EXACT JSON format wrapped in <QUESTION> tags:
<QUESTION>
{
  "type": "MC" or "FRQ",
  "topic": "<one of the AP Chem topics listed above>",
  "question": "<the question text>",
  "options": [{"letter":"A","text":"..."},{"letter":"B","text":"..."},{"letter":"C","text":"..."},{"letter":"D","text":"..."}],
  "correctAnswer": "A" (the letter, MC only),
  "explanation": "<brief explanation of correct answer>"
}
</QUESTION>

For FRQ, omit options and correctAnswer fields.
After the JSON block, write a short friendly message to the student (e.g., "Here's a kinetics question for you! Save it to your question bank to practice later.").
If the user is NOT asking for a question, respond normally in plain text — do NOT output JSON.`;
}

function parseQuestion(text: string): { question: SavedQuestion | null; cleanText: string } {
  const match = text.match(/<QUESTION>([\s\S]*?)<\/QUESTION>/);
  if (!match) return { question: null, cleanText: text };

  try {
    const json = JSON.parse(match[1].trim());
    const q: SavedQuestion = {
      id: crypto.randomUUID(),
      type: json.type,
      topic: json.topic,
      question: json.question,
      options: json.options,
      correctAnswer: json.correctAnswer,
      explanation: json.explanation,
      savedAt: new Date().toISOString(),
    };
    const cleanText = text.replace(/<QUESTION>[\s\S]*?<\/QUESTION>/, "").trim();
    return { question: q, cleanText };
  } catch {
    return { question: null, cleanText: text };
  }
}

export default function Chat({ onSaveQuestion, topicStats, weakTopics }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! I'm ChemMentorAP 👋 I'm here to help you ace AP Chemistry. Ask me anything, or say something like **\"Give me an MC question on stoichiometry\"** or **\"Generate an FRQ on equilibrium\"** to get practice questions you can save and study!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildSystemPrompt(topicStats, weakTopics),
          messages: apiMessages,
        }),
      });

      const data = await response.json();
      const rawText = data.content?.map((b: { type: string; text?: string }) => b.type === "text" ? b.text : "").join("") || "Sorry, I couldn't respond.";
      const { question, cleanText } = parseQuestion(rawText);

      setMessages(prev => [...prev, { role: "assistant", content: cleanText, question: question || undefined }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Oops, something went wrong. Check your API key in `.env`." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-bubble">
              {msg.content.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
              {msg.question && (
                <QuestionPreview question={msg.question} onSave={onSaveQuestion} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        {weakTopics.length > 0 && (
          <div className="weak-hint">
            💡 Suggested: Ask about <strong>{weakTopics[0]}</strong> — your weakest topic
          </div>
        )}
        <div className="input-row">
          <textarea
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about AP Chem, or request a practice question..."
            rows={2}
          />
          <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionPreview({ question, onSave }: { question: SavedQuestion; onSave: (q: SavedQuestion) => void }) {
  const [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [frqText, setFrqText] = useState("");
  const [frqSubmitted, setFrqSubmitted] = useState(false);

  const handleSave = () => { onSave(question); setSaved(true); };

  return (
    <div className="question-preview">
      <div className="q-header">
        <span className="q-type-badge">{question.type}</span>
        <span className="q-topic-badge">{question.topic}</span>
      </div>
      <p className="q-text">{question.question}</p>

      {question.type === "MC" && question.options && (
        <div className="q-options">
          {question.options.map((opt: MCOption) => (
            <button
              key={opt.letter}
              className={`option-btn ${selected === opt.letter ? "selected" : ""} ${
                submitted ? (opt.letter === question.correctAnswer ? "correct" : selected === opt.letter ? "wrong" : "") : ""
              }`}
              onClick={() => !submitted && setSelected(opt.letter)}
            >
              <span className="opt-letter">{opt.letter}</span>
              <span>{opt.text}</span>
            </button>
          ))}
          {!submitted && (
            <div className="btn-row">
              {selected && (
                <button className="submit-preview-btn" onClick={() => setSubmitted(true)}>
                  Check Answer
                </button>
              )}
              {!showAnswer && (
                <button className="show-answer-btn" onClick={() => setShowAnswer(true)}>
                  Show Answer
                </button>
              )}
            </div>
          )}
          {showAnswer && !submitted && (
            <div className="answer-feedback revealed">
              💡 Answer: <strong>{question.correctAnswer}</strong>
              {question.explanation && <p className="explanation">{question.explanation}</p>}
            </div>
          )}
          {submitted && (
            <div className={`answer-feedback ${selected === question.correctAnswer ? "correct" : "wrong"}`}>
              {selected === question.correctAnswer ? "✅ Correct!" : `❌ Incorrect — Answer: ${question.correctAnswer}`}
              {question.explanation && <p className="explanation">{question.explanation}</p>}
            </div>
          )}
        </div>
      )}

      {question.type === "FRQ" && (
        <div className="frq-section">
          <textarea
            className="frq-input"
            placeholder="Type your response here..."
            rows={4}
            value={frqText}
            onChange={e => setFrqText(e.target.value)}
            disabled={frqSubmitted}
          />
          {!frqSubmitted && (
            <div className="btn-row">
              <button className="submit-preview-btn" disabled={!frqText.trim()} onClick={() => setFrqSubmitted(true)}>
                Submit FRQ
              </button>
              {!showAnswer && (
                <button className="show-answer-btn" onClick={() => setShowAnswer(true)}>
                  Show Answer
                </button>
              )}
            </div>
          )}
          {showAnswer && question.explanation && (
            <div className="answer-feedback revealed">
              💡 <strong>Model Answer / Key Concepts:</strong>
              <p className="explanation">{question.explanation}</p>
            </div>
          )}
          {frqSubmitted && (
            <div className="frq-submitted">
              ✏️ Submitted! Save to your question bank to revisit later.
              {question.explanation && !showAnswer && (
                <div className="frq-hint">
                  <strong>Model Answer / Key Concepts:</strong> {question.explanation}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!saved ? (
        <button className="save-btn" onClick={handleSave}>💾 Save to Question Bank</button>
      ) : (
        <span className="saved-label">✓ Saved!</span>
      )}
    </div>
  );
}