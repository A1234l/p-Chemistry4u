import { useState, useEffect } from "react";
import Chat from "./components/Chat";
import QuestionBank from "./components/QuestionBank";
import ProgressDashboard from "./components/ProgressDashboard";
import type { TopicStats, SavedQuestion } from "./types";
import "./App.css";

type Tab = "chat" | "questions" | "progress";

const INITIAL_STATS: TopicStats = {
  "Atomic Structure": { correct: 0, total: 0 },
  "Molecular Geometry": { correct: 0, total: 0 },
  "Stoichiometry": { correct: 0, total: 0 },
  "Thermodynamics": { correct: 0, total: 0 },
  "Kinetics": { correct: 0, total: 0 },
  "Equilibrium": { correct: 0, total: 0 },
  "Acids & Bases": { correct: 0, total: 0 },
  "Electrochemistry": { correct: 0, total: 0 },
  "Intermolecular Forces": { correct: 0, total: 0 },
  "Gases": { correct: 0, total: 0 },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStats>(INITIAL_STATS);

  useEffect(() => {
    const stored = localStorage.getItem("apchem_questions");
    if (stored) setSavedQuestions(JSON.parse(stored));
    const stats = localStorage.getItem("apchem_stats");
    if (stats) setTopicStats(JSON.parse(stats));
  }, []);

  const saveQuestion = (q: SavedQuestion) => {
    setSavedQuestions(prev => {
      const updated = [...prev, q];
      localStorage.setItem("apchem_questions", JSON.stringify(updated));
      return updated;
    });
  };

  const recordAnswer = (topic: string, correct: boolean) => {
    setTopicStats(prev => {
      const updated = {
        ...prev,
        [topic]: {
          correct: prev[topic].correct + (correct ? 1 : 0),
          total: prev[topic].total + 1,
        },
      };
      localStorage.setItem("apchem_stats", JSON.stringify(updated));
      return updated;
    });
  };

  const getWeakTopics = () => {
    return Object.entries(topicStats)
      .filter(([, s]) => s.total >= 2)
      .sort((a, b) => {
        const rateA = a[1].total ? a[1].correct / a[1].total : 1;
        const rateB = b[1].total ? b[1].correct / b[1].total : 1;
        return rateA - rateB;
      })
      .slice(0, 3)
      .map(([topic]) => topic);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚗️</span>
            <span className="logo-text">p-Chemistry4u<span className="logo-ap">AP</span></span>
          </div>
          <nav className="tabs">
            {(["chat", "questions", "progress"] as Tab[]).map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "chat" && "💬 Chat"}
                {tab === "questions" && `📋 Questions ${savedQuestions.length > 0 ? `(${savedQuestions.length})` : ""}`}
                {tab === "progress" && "📊 Progress"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {activeTab === "chat" && (
          <Chat
            onSaveQuestion={saveQuestion}
            topicStats={topicStats}
            weakTopics={getWeakTopics()}
          />
        )}
        {activeTab === "questions" && (
          <QuestionBank
            questions={savedQuestions}
            onRecordAnswer={recordAnswer}
          />
        )}
        {activeTab === "progress" && (
          <ProgressDashboard topicStats={topicStats} />
        )}
      </main>
    </div>
  );
}
