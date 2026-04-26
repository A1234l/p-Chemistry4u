import { useState } from "react";
import type { SavedQuestion, MCOption } from "../types";

const AP_CHEM_TOPICS = [
  "Atomic Structure", "Molecular Geometry", "Stoichiometry",
  "Thermodynamics", "Kinetics", "Equilibrium",
  "Acids & Bases", "Electrochemistry", "Intermolecular Forces", "Gases"
];

interface Props {
  questions: SavedQuestion[];
  onRecordAnswer: (topic: string, correct: boolean) => void;
}

export default function QuestionBank({ questions, onRecordAnswer }: Props) {
  const [typeFilter, setTypeFilter] = useState<"all" | "MC" | "FRQ">("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [answers, setAnswers] = useState<Record<string, { selected?: string; frqText?: string; submitted: boolean; correct?: boolean; showAnswer?: boolean }>>({});

  const availableTopics = ["all", ...AP_CHEM_TOPICS.filter(t => questions.some(q => q.topic === t))];

  const filtered = questions.filter(q =>
    (typeFilter === "all" || q.type === typeFilter) &&
    (topicFilter === "all" || q.topic === topicFilter)
  );

  const handleSelect = (qId: string, letter: string) => {
    if (answers[qId]?.submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], selected: letter, submitted: false } }));
  };

  const handleFrqChange = (qId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], frqText: text, submitted: false } }));
  };

  const handleSubmitMC = (q: SavedQuestion) => {
    const ans = answers[q.id];
    if (!ans?.selected) return;
    const correct = ans.selected === q.correctAnswer;
    setAnswers(prev => ({ ...prev, [q.id]: { ...ans, submitted: true, correct } }));
    onRecordAnswer(q.topic, correct);
  };

  const handleSubmitFRQ = (q: SavedQuestion) => {
    setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], submitted: true } }));
  };

  const handleShowAnswer = (qId: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], showAnswer: true } }));
  };

  if (questions.length === 0) {
    return (
      <div className="empty-bank">
        <div className="empty-icon">📋</div>
        <h2>No questions saved yet</h2>
        <p>Go to the Chat tab and ask Claude to generate some AP Chem questions, then save them here!</p>
      </div>
    );
  }

  return (
    <div className="question-bank">
      <div className="bank-header">
        <h2>Question Bank <span className="count">({questions.length})</span></h2>
        <div className="filter-btns">
          {(["all", "MC", "FRQ"] as const).map(f => (
            <button key={f} className={`filter-btn ${typeFilter === f ? "active" : ""}`} onClick={() => setTypeFilter(f)}>
              {f === "all" ? "All Types" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="topic-filter-row">
        <span className="topic-filter-label">Topic:</span>
        <div className="topic-filter-btns">
          {availableTopics.map(t => (
            <button
              key={t}
              className={`topic-filter-btn ${topicFilter === t ? "active" : ""}`}
              onClick={() => setTopicFilter(t)}
            >
              {t === "all" ? "All Topics" : t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty-bank">
          <div className="empty-icon">🔍</div>
          <h2>No questions match this filter</h2>
          <p>Try a different topic or type.</p>
        </div>
      )}

      <div className="questions-list">
        {filtered.map(q => {
          const ans = answers[q.id] || { submitted: false };
          return (
            <div key={q.id} className={`question-card ${ans.submitted ? (ans.correct ? "card-correct" : q.type === "FRQ" ? "card-submitted" : "card-wrong") : ""}`}>
              <div className="card-meta">
                <span className={`badge badge-${q.type.toLowerCase()}`}>{q.type}</span>
                <span className="badge badge-topic">{q.topic}</span>
                <span className="card-date">{new Date(q.savedAt).toLocaleDateString()}</span>
              </div>

              <p className="card-question">{q.question}</p>

              {q.type === "MC" && q.options && (
                <div className="card-options">
                  {q.options.map((opt: MCOption) => (
                    <button
                      key={opt.letter}
                      disabled={ans.submitted}
                      className={`option-btn ${ans.selected === opt.letter ? "selected" : ""} ${
                        ans.submitted
                          ? opt.letter === q.correctAnswer
                            ? "correct"
                            : ans.selected === opt.letter
                            ? "wrong"
                            : ""
                          : ""
                      }`}
                      onClick={() => handleSelect(q.id, opt.letter)}
                    >
                      <span className="opt-letter">{opt.letter}</span>
                      <span>{opt.text}</span>
                    </button>
                  ))}
                  {!ans.submitted && (
                    <div className="btn-row">
                      <button
                        className="submit-btn"
                        disabled={!ans.selected}
                        onClick={() => handleSubmitMC(q)}
                      >
                        Submit Answer
                      </button>
                      {!ans.showAnswer && (
                        <button className="show-answer-btn" onClick={() => handleShowAnswer(q.id)}>
                          Show Answer
                        </button>
                      )}
                    </div>
                  )}
                  {ans.showAnswer && !ans.submitted && (
                    <div className="answer-feedback revealed">
                      💡 Answer: <strong>{q.correctAnswer}</strong>
                      {q.explanation && <p className="explanation">{q.explanation}</p>}
                    </div>
                  )}
                  {ans.submitted && (
                    <div className={`answer-feedback ${ans.correct ? "correct" : "wrong"}`}>
                      {ans.correct ? "✅ Correct!" : `❌ Wrong — Correct answer: ${q.correctAnswer}`}
                      {q.explanation && <p className="explanation">{q.explanation}</p>}
                    </div>
                  )}
                </div>
              )}

              {q.type === "FRQ" && (
                <div className="frq-section">
                  <textarea
                    className="frq-input"
                    placeholder="Type your response here..."
                    rows={5}
                    value={ans.frqText || ""}
                    onChange={e => handleFrqChange(q.id, e.target.value)}
                    disabled={ans.submitted}
                  />
                  {!ans.submitted ? (
                    <div className="btn-row">
                      <button
                        className="submit-btn"
                        disabled={!ans.frqText?.trim()}
                        onClick={() => handleSubmitFRQ(q)}
                      >
                        Submit FRQ
                      </button>
                      {!ans.showAnswer && (
                        <button className="show-answer-btn" onClick={() => handleShowAnswer(q.id)}>
                          Show Answer
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="frq-submitted">
                      ✏️ Response submitted! Review with your teacher or ask Claude to evaluate it in the chat.
                      {q.explanation && (
                        <div className="frq-hint">
                          <strong>Model Answer / Key Concepts:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                  {ans.showAnswer && !ans.submitted && q.explanation && (
                    <div className="answer-feedback revealed">
                      💡 <strong>Model Answer / Key Concepts:</strong>
                      <p className="explanation">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}