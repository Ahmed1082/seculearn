import { useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiHelpCircle,
  FiStar,
  FiTrendingUp,
  FiXCircle,
} from "react-icons/fi";
import "../../styles/AllQuizzes.css";

const courses = [
  { id: "c1", name: "Introduction to Cybersecurity" },
  { id: "c2", name: "Introduction to Cryptography" },
  { id: "c3", name: "Ethical Hacking" },
];

const lectures = [
  { id: "l1", courseId: "c1", title: "Lecture 1: Cyber Fundamentals" },
  { id: "l2", courseId: "c1", title: "Lecture 2: Firewall Rules" },
  { id: "l3", courseId: "c2", title: "Lecture 1: Classical Ciphers" },
  { id: "l4", courseId: "c2", title: "Lecture 2: AES and Modes" },
  { id: "l5", courseId: "c3", title: "Lecture 1: Vulnerability Scanning" },
  { id: "l6", courseId: "c3", title: "Lecture 2: Post Exploitation" },
];

const quizzes = [
  { id: "q1", title: "Quiz 1: Threat Basics", lectureId: "l1", doneStudentIds: ["s1"], missedStudentIds: [], results: { s1: 90 } },
  { id: "q2", title: "Quiz 2: Attack Types", lectureId: "l1", doneStudentIds: ["s1"], missedStudentIds: [], results: { s1: 95 } },
  { id: "q3", title: "Quiz 3: Defense Strategies", lectureId: "l1", doneStudentIds: ["s1"], missedStudentIds: [], results: { s1: 100 } },
  { id: "q4", title: "Quiz 1: Network Protocols", lectureId: "l2", doneStudentIds: ["s1"], missedStudentIds: [], results: { s1: 88 } },
  { id: "q5", title: "Quiz 2: Firewall Analysis", lectureId: "l2", doneStudentIds: ["s1"], missedStudentIds: [], results: { s1: 84 } },
  { id: "q6", title: "Quiz 1: Caesar Cipher", lectureId: "l3", doneStudentIds: ["s1"], missedStudentIds: [], results: { s1: 92 } },
  { id: "q7", title: "Quiz 2: Vigenere Cipher", lectureId: "l3", doneStudentIds: ["s1"], missedStudentIds: [], results: { s1: 86 } },
  { id: "q8", title: "Quiz 1: AES Concepts", lectureId: "l4", doneStudentIds: [], missedStudentIds: [], results: {} },
  { id: "q9", title: "Quiz 2: Block Modes", lectureId: "l4", doneStudentIds: [], missedStudentIds: [], results: {} },
  { id: "q10", title: "Quiz 1: Recon Basics", lectureId: "l5", doneStudentIds: [], missedStudentIds: ["s1"], results: {} },
  { id: "q11", title: "Quiz 2: Web Enumeration", lectureId: "l5", doneStudentIds: ["s1"], missedStudentIds: [], results: { s1: 79 } },
  { id: "q12", title: "Quiz 1: Incident Response", lectureId: "l6", doneStudentIds: ["s1"], missedStudentIds: [], results: { s1: 91 } },
];

const mockStudentIds = new Set(
  quizzes.flatMap((quiz) => [
    ...quiz.doneStudentIds.map((id) => String(id)),
    ...quiz.missedStudentIds.map((id) => String(id)),
    ...Object.keys(quiz.results || {}).map((id) => String(id)),
  ])
);

const getCurrentStudentId = () => {
  const fallbackId = "s1";
  const stored = localStorage.getItem("user");

  if (!stored) return fallbackId;

  try {
    const user = JSON.parse(stored);
    const id = user.id || user.student_id || user.user_id || fallbackId;
    return String(id);
  } catch {
    return fallbackId;
  }
};

const resolveStudentIdForMockData = (studentId) => {
  if (mockStudentIds.has(studentId)) return studentId;
  if (mockStudentIds.has("s1")) return "s1";
  return studentId;
};

const getStatus = (quiz, studentId) => {
  if (quiz.doneStudentIds.includes(studentId)) return "done";
  if (quiz.missedStudentIds.includes(studentId)) return "missed";
  return "pending";
};

const getScore = (quiz, studentId) => quiz.results?.[studentId] ?? null;

const scoreColor = (score) => {
  if (score >= 90) return "#54f4fc";
  if (score >= 75) return "#7fe1ff";
  if (score >= 60) return "#c084fc";
  return "#a8b5c8";
};

const scoreLabel = (score) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Average";
  return "Needs Work";
};

const statusConfig = {
  done: { label: "Completed", icon: FiCheckCircle },
  pending: { label: "Upcoming", icon: FiClock },
  missed: { label: "Missed", icon: FiXCircle },
};

const StudentAllQuizzes = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeCourse, setActiveCourse] = useState("all");
  const currentStudentId = useMemo(() => resolveStudentIdForMockData(getCurrentStudentId()), []);

  const enrichedQuizzes = useMemo(() => {
    return quizzes
      .map((quiz) => {
        const lecture = lectures.find((item) => item.id === quiz.lectureId);
        const course = courses.find((item) => item.id === lecture?.courseId);

        return {
          ...quiz,
          lecture,
          course,
          status: getStatus(quiz, currentStudentId),
          score: getScore(quiz, currentStudentId),
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [currentStudentId]);

  const stats = useMemo(() => {
    const total = enrichedQuizzes.length;
    const done = enrichedQuizzes.filter((item) => item.status === "done").length;
    const pending = enrichedQuizzes.filter((item) => item.status === "pending").length;
    const missed = enrichedQuizzes.filter((item) => item.status === "missed").length;
    const scores = enrichedQuizzes.filter((item) => item.score !== null).map((item) => item.score);
    const avgScore = scores.length ? Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length) : null;
    const bestScore = scores.length ? Math.max(...scores) : null;

    return { total, done, pending, missed, scores, avgScore, bestScore };
  }, [enrichedQuizzes]);

  const filteredQuizzes = useMemo(() => {
    return enrichedQuizzes.filter((item) => {
      const statusMatch = activeFilter === "all" || item.status === activeFilter;
      const courseMatch = activeCourse === "all" || item.course?.id === activeCourse;
      return statusMatch && courseMatch;
    });
  }, [activeCourse, activeFilter, enrichedQuizzes]);

  const filterItems = [
    { key: "all", label: "All", count: stats.total },
    { key: "done", label: "Completed", count: stats.done },
    { key: "pending", label: "Upcoming", count: stats.pending },
    { key: "missed", label: "Missed", count: stats.missed },
  ];

  return (
    <section className="all-quizzes-page">
      <div className="all-quizzes-shell">
        <header className="all-quizzes-header">
          <div className="all-quizzes-header-icon">
            <FiHelpCircle size={16} />
          </div>

          <div>
            <h1>Quizzes</h1>
            <p>Your quiz history and upcoming tests</p>
          </div>
        </header>

        <section className="all-quizzes-stats-grid">
          <article className="all-quizzes-stat-card all-quizzes-stat-total">
            <strong>{stats.total}</strong>
            <span>Total</span>
          </article>

          <article className="all-quizzes-stat-card all-quizzes-stat-completed">
            <strong>{stats.done}</strong>
            <span>Completed</span>
          </article>

          <article className="all-quizzes-stat-card all-quizzes-stat-average">
            <strong style={{ color: stats.avgScore !== null ? scoreColor(stats.avgScore) : "#9eb0c8" }}>
              {stats.avgScore !== null ? `${stats.avgScore}%` : "-"}
            </strong>
            <span>Avg Score</span>
          </article>

          <article className="all-quizzes-stat-card all-quizzes-stat-best">
            <strong style={{ color: stats.bestScore !== null ? scoreColor(stats.bestScore) : "#9eb0c8" }}>
              {stats.bestScore !== null ? `${stats.bestScore}%` : "-"}
            </strong>
            <span>Best Score</span>
          </article>
        </section>

        <section className="all-quizzes-trend-card">
          <div className="all-quizzes-trend-icon">
            <FiTrendingUp size={14} />
          </div>

          <div className="all-quizzes-trend-content">
            <div className="all-quizzes-trend-top">
              <h2>Score History</h2>
              <span>{stats.scores.length} quizzes graded</span>
            </div>

            {stats.scores.length > 0 ? (
              <div className="all-quizzes-bars">
                {enrichedQuizzes
                  .filter((item) => item.score !== null)
                  .map((quiz) => (
                    <div
                      key={quiz.id}
                      className="all-quizzes-bar"
                      style={{
                        height: `${Math.max(6, Math.round(quiz.score * 0.34))}px`,
                        background: scoreColor(quiz.score),
                      }}
                      title={`${quiz.title}: ${quiz.score}/100`}
                    />
                  ))}
              </div>
            ) : (
              <p className="all-quizzes-trend-empty">No graded quizzes yet.</p>
            )}
          </div>

          <div className="all-quizzes-trend-average">
            <strong style={{ color: stats.avgScore !== null ? scoreColor(stats.avgScore) : "#9eb0c8" }}>
              {stats.avgScore !== null ? `${stats.avgScore}%` : "-"}
            </strong>
            <span>average</span>
          </div>
        </section>

        <section className="all-quizzes-filters-row">
          <div className="all-quizzes-filter-group">
            <FiFilter size={14} />

            {filterItems.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`all-quizzes-filter-chip ${activeFilter === filter.key ? "is-active" : ""}`}
                onClick={() => setActiveFilter(filter.key)}
              >
                <span>{filter.label}</span>
                <small>{filter.count}</small>
              </button>
            ))}
          </div>

          <div className="all-quizzes-course-filter">
            <FiBookOpen size={14} />

            <select
              value={activeCourse}
              onChange={(event) => setActiveCourse(event.target.value)}
              aria-label="Filter quizzes by course"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="all-quizzes-list">
          {filteredQuizzes.length === 0 ? (
            <article className="all-quizzes-empty-state">
              <FiHelpCircle size={24} />
              <p>No quizzes match the selected filter.</p>
            </article>
          ) : (
            filteredQuizzes.map((quiz) => {
              const status = statusConfig[quiz.status];
              const StatusIcon = status.icon;
              const isDone = quiz.status === "done";
              const isPending = quiz.status === "pending";
              const isMissed = quiz.status === "missed";

              return (
                <article key={quiz.id} className="all-quizzes-item">
                  <div className={`all-quizzes-item-icon status-${quiz.status}`}>
                    <StatusIcon size={14} />
                  </div>

                  <div className="all-quizzes-item-content">
                    <div className="all-quizzes-item-head">
                      <div>
                        <h3>{quiz.title}</h3>

                        <div className="all-quizzes-item-meta">
                          <span>{quiz.course?.name}</span>
                          <span className="all-quizzes-dot">&middot;</span>
                          <span>{quiz.lecture?.title?.split(":")[0]}</span>
                        </div>
                      </div>

                      <div className="all-quizzes-right-head">
                        {isDone && quiz.score !== null && (
                          <div
                            className="all-quizzes-score-ring"
                            style={{
                              background: `conic-gradient(${scoreColor(quiz.score)} ${Math.round(quiz.score * 3.6)}deg, #151515 0deg)`,
                            }}
                          >
                            <div className="all-quizzes-score-ring-inner" style={{ color: scoreColor(quiz.score) }}>
                              {quiz.score}
                            </div>
                          </div>
                        )}

                        <div className={`all-quizzes-status-pill status-${quiz.status}`}>
                          <StatusIcon size={11} />
                          <span>{status.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="all-quizzes-item-foot">
                      {isDone && quiz.score !== null && (
                        <div className="all-quizzes-score-note">
                          <FiStar size={12} style={{ color: scoreColor(quiz.score) }} />
                          <span style={{ color: scoreColor(quiz.score) }}>{scoreLabel(quiz.score)}</span>
                          <small>{quiz.score}/100</small>
                        </div>
                      )}

                      {isPending && (
                        <button type="button" className="all-quizzes-start-btn">
                          Start Quiz
                        </button>
                      )}

                      {isMissed && (
                        <p className="all-quizzes-note-missed">Quiz window closed</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </section>
  );
};

export default StudentAllQuizzes;
