import type { TopicStats } from "../types";

interface Props {
  topicStats: TopicStats;
}

const TOPIC_COLORS: Record<string, string> = {
  "Atomic Structure": "#6366f1",
  "Molecular Geometry": "#8b5cf6",
  "Stoichiometry": "#06b6d4",
  "Thermodynamics": "#f59e0b",
  "Kinetics": "#ef4444",
  "Equilibrium": "#10b981",
  "Acids & Bases": "#3b82f6",
  "Electrochemistry": "#f97316",
  "Intermolecular Forces": "#ec4899",
  "Gases": "#84cc16",
};

export default function ProgressDashboard({ topicStats }: Props) {
  const attempted = Object.entries(topicStats).filter(([, s]) => s.total > 0);
  const totalCorrect = attempted.reduce((sum, [, s]) => sum + s.correct, 0);
  const totalAnswered = attempted.reduce((sum, [, s]) => sum + s.total, 0);
  const overallPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  const sorted = [...attempted].sort((a, b) => {
    const rA = a[1].correct / a[1].total;
    const rB = b[1].correct / b[1].total;
    return rA - rB;
  });

  return (
    <div className="progress-dashboard">
      <div className="dashboard-header">
        <h2>Your Progress</h2>
        {overallPct !== null && (
          <div className="overall-score">
            <div className="score-ring" style={{ "--pct": overallPct } as React.CSSProperties}>
              <span className="score-num">{overallPct}%</span>
              <span className="score-label">Overall</span>
            </div>
            <div className="score-detail">
              <p>{totalCorrect} correct out of {totalAnswered} questions</p>
            </div>
          </div>
        )}
      </div>

      {attempted.length === 0 ? (
        <div className="no-data">
          <div className="no-data-icon">📊</div>
          <h3>No data yet</h3>
          <p>Answer some MC questions in the Question Bank to see your progress by topic!</p>
        </div>
      ) : (
        <>
          <div className="topics-grid">
            {sorted.map(([topic, stats]) => {
              const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              const color = TOPIC_COLORS[topic] || "#6366f1";
              const status = pct >= 80 ? "strong" : pct >= 50 ? "developing" : "needs-work";
              return (
                <div key={topic} className={`topic-card status-${status}`}>
                  <div className="topic-name">{topic}</div>
                  <div className="topic-bar-wrap">
                    <div
                      className="topic-bar"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <div className="topic-stats">
                    <span className="pct-label" style={{ color }}>{pct}%</span>
                    <span className="frac-label">{stats.correct}/{stats.total}</span>
                  </div>
                  <div className={`status-badge ${status}`}>
                    {status === "strong" ? "✅ Strong" : status === "developing" ? "📈 Developing" : "⚠️ Needs Work"}
                  </div>
                </div>
              );
            })}
          </div>

          {sorted.filter(([, s]) => s.total >= 2 && s.correct / s.total < 0.5).length > 0 && (
            <div className="weak-topics-panel">
              <h3>🎯 Focus Areas</h3>
              <p>Based on your performance, Claude will prioritize these topics when generating questions:</p>
              <div className="weak-list">
                {sorted
                  .filter(([, s]) => s.total >= 2 && s.correct / s.total < 0.5)
                  .map(([topic, stats]) => (
                    <div key={topic} className="weak-item">
                      <span className="weak-topic">{topic}</span>
                      <span className="weak-rate">
                        {Math.round(stats.correct / stats.total * 100)}% correct
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
