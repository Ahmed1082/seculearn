import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getQuizResultsDashboard, getStudentQuizDetails } from "../../app/quizApi";
import {
  FiArrowLeft,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiHelpCircle,
  FiRefreshCw,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import "../../styles/QuizReview.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://cary-nontumorous-unimpedingly.ngrok-free.dev";

const buildApiHeaders = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  "ngrok-skip-browser-warning": "true",
});

const scoreColor = (score) => {
  if (score >= 90) return "#54f4fc";
  if (score >= 75) return "#2d8ff0";
  if (score >= 60) return "#c084fc";
  return "#ff6e8d";
};

const getBarColorClass = (percent) => {
  if (percent >= 75) return "is-strong";
  if (percent >= 50) return "is-mid";
  return "is-weak";
};

const QuizReview = ({ role = "lecturer" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, lectureId, sectionId, quizId } = useParams();
  const isSectionView = Boolean(sectionId);
  const basePath = courseId
    ? `/${role}/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}`
    : `/${role}/courses`;

  const token = localStorage.getItem("token");

  const unwrapApiData = (payload) => payload?.data ?? payload;

  // ── state ───────────────────────────────────────────────
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [dashboard, setDashboard] = useState(null); // API #41 response
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null); // API #42 response
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // ── fetch dashboard (API #41) ───────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg("");
    try {
      const data = unwrapApiData(await getQuizResultsDashboard(quizId, token));
      setDashboard(data);
      setLoadState("ready");
    } catch (err) {
      setErrorMsg(err.message || "Failed to load quiz results.");
      setLoadState("error");
    }
  }, [quizId, token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── fetch student detail (API #42) ─────────────────────
  const fetchStudentDetail = useCallback(
    async (studentId) => {
      setDetailLoading(true);
      setDetailError("");
      setStudentDetail(null);
      try {
        const data = unwrapApiData(
          await getStudentQuizDetails(quizId, studentId, token)
        );
        setStudentDetail(data);
      } catch (err) {
        setDetailError(err.message || "Failed to load student details.");
      } finally {
        setDetailLoading(false);
      }
    },
    [quizId, token]
  );

  const handleSelectStudent = (studentId) => {
    setSelectedStudentId(studentId);
    fetchStudentDetail(studentId);
  };

  const stats = useMemo(() => {
    if (!dashboard) return null;
    const s = dashboard.stats || dashboard.statistics || null;
    
    const rawAverage = s?.average ?? dashboard.average ?? dashboard.avg_score ?? null;
    let parsedAverage = null;
    if (rawAverage !== null && rawAverage !== undefined) {
      const cleaned = String(rawAverage).replace("%", "").trim();
      const num = Number(cleaned);
      if (!isNaN(num)) {
        parsedAverage = num;
      }
    }

    return {
      completed: s?.completed ?? dashboard.completed ?? dashboard.done ?? 0,
      missed: s?.missed ?? dashboard.missed ?? 0,
      pending: s?.pending ?? dashboard.pending ?? 0,
      average: parsedAverage,
      high: s?.high ?? dashboard.high ?? dashboard.highest_score ?? null,
      low: s?.low ?? dashboard.low ?? dashboard.lowest_score ?? null,
    };
  }, [dashboard]);

  const studentList = useMemo(() => {
    if (!dashboard) return [];
    return (dashboard.students || []).map((s) => {
      const rawScore = s.score ?? s.percentage ?? null;
      let parsedScore = null;
      if (rawScore !== null && rawScore !== undefined) {
        const cleaned = String(rawScore).replace("%", "").trim();
        const num = Number(cleaned);
        if (!isNaN(num)) {
          parsedScore = num;
        }
      }
      return {
        id: String(s.id || s.student_id),
        name: s.name || s.student_name || `Student ${s.id}`,
        studentCode: s.student_id || s.code || "",
        status: s.status || "pending",
        score: parsedScore,
      };
    });
  }, [dashboard]);

  const questionStats = useMemo(() => {
    if (!dashboard) return [];
    return (dashboard.question_stats || dashboard.questions || []).map((q, i) => ({
      id: String(q.id || i),
      label: q.question_text || q.text || `Q${i + 1}`,
      correct: q.correct_count ?? q.correct ?? 0,
      total: q.total_count ?? q.total ?? 1,
      pct: q.correct_percentage ?? q.pct ?? Math.round(((q.correct_count ?? q.correct ?? 0) / (q.total_count ?? q.total ?? 1)) * 100),
    }));
  }, [dashboard]);

  // ── student detail derived ──────────────────────────────
  const detailQuestions = useMemo(() => {
    if (!studentDetail) return [];
    const raw =
      studentDetail.details ||
      studentDetail.questions ||
      studentDetail.answers ||
      [];
    return raw.map((item, i) => ({
      id: String(item.question_id || item.id || i),
      text: item.question_text || item.text || "",
      options: (item.options || []).map((opt) => ({
        id: String(opt.id),
        text: opt.option_text || opt.text || "",
        isCorrect: Boolean(opt.is_correct),
      })),
      selectedOptionId: String(
        item.student_answer_id || item.selected_option_id || ""
      ),
      isCorrect: Boolean(item.is_correct),
      explanation: item.explanation || "",
    }));
  }, [studentDetail]);

  const selectedStudent = studentList.find((s) => s.id === String(selectedStudentId));
  const quizTitle =
    dashboard?.quiz_title ||
    location.state?.quizTitle ||
    `Quiz ${quizId}`;

  const handleBack = () => {
    if (courseId) {
      navigate(basePath);
      return;
    }
    navigate(-1);
  };

  // ── loading ─────────────────────────────────────────────
  if (loadState === "loading") {
    return (
      <section className="quiz-review-page">
        <div className="quiz-review-shell">
          <button type="button" className="quiz-review-back-btn" onClick={handleBack}>
            <FiArrowLeft />
            Back
          </button>
          <div className="quiz-review-empty-card">
            <FiHelpCircle />
            <p>Loading quiz results...</p>
          </div>
        </div>
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <section className="quiz-review-page">
        <div className="quiz-review-shell">
          <button type="button" className="quiz-review-back-btn" onClick={handleBack}>
            <FiArrowLeft />
            Back
          </button>
          <div className="quiz-review-empty-card">
            <FiHelpCircle />
            <p>{errorMsg}</p>
            <button
              type="button"
              className="quiz-review-back-btn"
              style={{ marginTop: 12 }}
              onClick={fetchDashboard}
            >
              <FiRefreshCw size={14} />
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="quiz-review-page">
      <div className="quiz-review-shell">
        <button type="button" className="quiz-review-back-btn" onClick={handleBack}>
          <FiArrowLeft />
          Back
        </button>

        <header className="quiz-review-header-card">
          <span className="quiz-review-header-icon" aria-hidden="true">
            <FiHelpCircle />
          </span>
          <div className="quiz-review-header-copy">
            <h1>{quizTitle}</h1>
            <p>
              {dashboard?.course_title || location.state?.courseTitle || ""}{dashboard?.course_title || location.state?.courseTitle ? " | " : ""}
              {dashboard?.lecture_title || location.state?.lectureTitle || ""}
              {questionStats.length > 0 ? ` | ${questionStats.length} questions` : ""}
            </p>
          </div>
        </header>

        <section className="quiz-review-stats-grid">
          <article className="quiz-review-stat-card completed">
            <strong>{stats?.completed ?? 0}</strong>
            <span>Completed</span>
          </article>

          <article className="quiz-review-stat-card missed">
            <strong>{stats?.missed ?? 0}</strong>
            <span>Missed</span>
          </article>

          <article className="quiz-review-stat-card pending">
            <strong>{stats?.pending ?? 0}</strong>
            <span>Pending</span>
          </article>

          <article className="quiz-review-stat-card average">
            <strong
              style={{
                color:
                  stats?.average === null
                    ? "#8ea4c8"
                    : scoreColor(stats.average),
              }}
            >
              {stats?.average === null ? "-" : `${stats.average}%`}
            </strong>
            <span>Average</span>
          </article>

          <article className="quiz-review-stat-card high-low">
            <strong>
              {stats?.high === null ? "-" : `${stats.high}/${stats.low}`}
            </strong>
            <span>High / Low</span>
          </article>
        </section>

        <div className="quiz-review-main-grid">
          <aside className="quiz-review-students-card">
            <header className="quiz-review-students-header">
              <div>
                <FiUsers />
                <h2>Students</h2>
              </div>
              <span>{studentList.length}</span>
            </header>

            <div className="quiz-review-students-list">
              {studentList.length === 0 ? (
                <p style={{ padding: "12px 16px", opacity: 0.5 }}>
                  No student data available.
                </p>
              ) : (
                studentList.map((student) => {
                  const isDone = student.status === "completed" || student.status === "done";
                  const isMissed = student.status === "missed";
                  const isSelected = selectedStudentId === student.id;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      className={`quiz-review-student-item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => handleSelectStudent(student.id)}
                    >
                      <span className="quiz-review-student-info">
                        <strong>{student.name}</strong>
                        {student.studentCode && (
                          <small>{student.studentCode}</small>
                        )}
                      </span>

                      <span className="quiz-review-student-state">
                        {isDone && typeof student.score === "number" && (
                          <span
                            className="quiz-review-student-score"
                            style={{ color: scoreColor(student.score) }}
                          >
                            {student.score}%
                          </span>
                        )}
                        {isDone ? (
                          <FiCheckCircle className="state-done" />
                        ) : isMissed ? (
                          <FiXCircle className="state-missed" />
                        ) : (
                          <FiClock className="state-pending" />
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="quiz-review-detail-panel">
            {!selectedStudentId ? (
              <div className="quiz-review-empty-card">
                <FiEye />
                <p>Select a student to view their answers</p>
              </div>
            ) : detailLoading ? (
              <div className="quiz-review-empty-card">
                <FiHelpCircle />
                <p>Loading student details...</p>
              </div>
            ) : detailError ? (
              <div className="quiz-review-no-attempt-card">
                <FiHelpCircle />
                <strong>{selectedStudent?.name}</strong>
                <p>{detailError}</p>
              </div>
            ) : detailQuestions.length === 0 ? (
              <div className="quiz-review-no-attempt-card">
                <FiHelpCircle />
                <strong>{selectedStudent?.name}</strong>
                <p>
                  {selectedStudent?.status === "missed"
                    ? "This student missed the quiz."
                    : "This student has not taken the quiz yet."}
                </p>
              </div>
            ) : (
              <div className="quiz-review-student-detail">
                <header className="quiz-review-selected-header">
                  <div className="quiz-review-selected-copy">
                    <strong>{selectedStudent?.name}</strong>
                    {selectedStudent?.studentCode && (
                      <small>{selectedStudent.studentCode}</small>
                    )}
                  </div>

                  {typeof selectedStudent?.score === "number" && (
                    <div className="quiz-review-score-ring">
                      <svg viewBox="0 0 36 36" aria-hidden="true">
                        <circle cx="18" cy="18" r="16" className="ring-track" />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          className="ring-progress"
                          style={{
                            stroke: scoreColor(selectedStudent.score),
                            strokeDasharray: `${Math.min(Math.max(selectedStudent.score, 0), 100) * 1.005} 100.5`,
                          }}
                        />
                      </svg>
                      <span style={{ color: scoreColor(selectedStudent.score) }}>
                        {selectedStudent.score}%
                      </span>
                    </div>
                  )}
                </header>

                <div className="quiz-review-answers-list">
                  {detailQuestions.map((q, qIndex) => (
                    <article
                      key={q.id}
                      className={`quiz-review-question-card ${q.isCorrect ? "is-correct" : "is-wrong"}`}
                    >
                      <div className="quiz-review-question-top">
                        <span className="quiz-review-question-number">
                          {qIndex + 1}
                        </span>
                        <p>{q.text}</p>
                      </div>

                      <div className="quiz-review-options-list">
                        {q.options.map((opt) => {
                          const isSelected = q.selectedOptionId === opt.id;
                          const isAnswer = opt.isCorrect;
                          const rowClass = [
                            "quiz-review-option-row",
                            isAnswer ? "is-answer" : "",
                            isSelected && !isAnswer ? "is-selected-wrong" : "",
                          ]
                            .filter(Boolean)
                            .join(" ");

                          return (
                            <div key={opt.id} className={rowClass}>
                              {isAnswer ? (
                                <FiCheckCircle />
                              ) : isSelected ? (
                                <FiXCircle />
                              ) : (
                                <span className="option-placeholder" />
                              )}
                              <span>{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <p className="quiz-review-explanation">
                          {q.explanation}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {questionStats.length > 0 && (
          <section className="quiz-review-analysis-card">
            <header>
              <FiBarChart2 />
              <h2>Question Analysis</h2>
            </header>

            <div className="quiz-review-analysis-list">
              {questionStats.map((stat, index) => (
                <article key={stat.id} className="quiz-review-analysis-item">
                  <span className="quiz-review-analysis-label">Q{index + 1}</span>

                  <span className="quiz-review-analysis-track">
                    <span
                      className={`quiz-review-analysis-fill ${getBarColorClass(stat.pct)}`}
                      style={{ width: `${stat.pct}%` }}
                    />
                  </span>

                  <span className="quiz-review-analysis-score">
                    {stat.correct}/{stat.total}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
};

export default QuizReview;
