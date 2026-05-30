import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { apiRequest } from "../../app/apiClient";
import { getStudentChallenges } from "../../app/ctfApi";
import { getQuizzesList } from "../../app/quizApi";
import "../../styles/AIAssistant.css";

const priorityStyles = {
  high: "ai-priority-high",
  medium: "ai-priority-medium",
  low: "ai-priority-low",
};

const QUIZ_REQUEST_CONCURRENCY = 4;
const METRICS_TIMEOUT_MS = 12000;

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;

  const parsed = Number(String(value ?? "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const extractAssignments = (payload) => {
  if (Array.isArray(payload?.assignments)) return payload.assignments;
  if (Array.isArray(payload?.data?.assignments)) return payload.data.assignments;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getQuizItems = (payload) =>
  (Array.isArray(payload?.quizzes) && payload.quizzes) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload?.quizzes_list) && payload.quizzes_list) ||
  (Array.isArray(payload?.quizzesList) && payload.quizzesList) ||
  (Array.isArray(payload) ? payload : []);

const mapWithConcurrency = async (
  items,
  mapper,
  concurrency = QUIZ_REQUEST_CONCURRENCY
) => {
  const results = [];
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
};

const getCourseQuizTargets = (coursesList) =>
  coursesList.flatMap((course) => {
    const lectureEntries = Array.isArray(course?.lectures) ? course.lectures : [];
    const sectionEntries = Array.isArray(course?.sections) ? course.sections : [];

    return [
      ...lectureEntries.map((lecture) => ({ lecture_id: lecture.id })),
      ...sectionEntries.map((section) => ({ section_id: section.id })),
    ];
  });

const getQuizScore = (quiz) => {
  const attempts = Array.isArray(quiz?.attempts) ? quiz.attempts : [];
  const firstAttemptScore = attempts.length > 0 ? attempts[0]?.score : null;
  const rawScore = quiz?.score ?? quiz?.percentage ?? firstAttemptScore;

  if (rawScore === null || rawScore === undefined || rawScore === "") return null;

  const score = Number(rawScore);
  return Number.isFinite(score) ? score : null;
};

const isMissedQuiz = (quiz) => {
  const status = String(quiz?.status || "").trim().toLowerCase();
  return status === "missed" || status === "expired" || status === "closed";
};

const getStudentQuizMetrics = async (coursesList, token) => {
  const quizTargets = getCourseQuizTargets(coursesList);

  const quizCollections = await mapWithConcurrency(
    quizTargets,
    async (params) => {
      try {
        return getQuizItems(await getQuizzesList(params, token));
      } catch (error) {
        console.error("Failed to fetch quiz metrics for content:", error);
        return [];
      }
    }
  );

  const quizzes = quizCollections.flat();
  const scores = quizzes
    .map(getQuizScore)
    .filter((score) => score !== null);
  const avgQuizScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;

  return {
    avgQuizScore,
    missedQuizzes: quizzes.filter(isMissedQuiz).length,
  };
};

const withTimeout = (promise, fallback, label) =>
  new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      console.warn(`${label} metrics timed out.`);
      resolve(fallback);
    }, METRICS_TIMEOUT_MS);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        console.error(`Failed to load ${label.toLowerCase()} metrics.`, error);
        resolve(fallback);
      });
  });

const getStudentAssignmentMetrics = (payload) => {
  const stats = payload?.stats || payload?.data?.stats || {};

  if (
    stats.submitted !== undefined ||
    stats.done !== undefined ||
    stats.completed !== undefined ||
    stats.missed !== undefined
  ) {
    return {
      assignmentsDone: toNumber(
        stats.submitted ?? stats.done ?? stats.completed
      ),
      missedAssignments: toNumber(stats.missed),
    };
  }

  const assignmentsList = extractAssignments(payload);
  return {
    assignmentsDone: assignmentsList.filter((assignment) => {
      const status = String(assignment?.status || "").toLowerCase();
      return status === "submitted" || status === "done";
    }).length,
    missedAssignments: assignmentsList.filter(
      (assignment) => String(assignment?.status || "").toLowerCase() === "missed"
    ).length,
  };
};

const getInstructorDashboardMetrics = (dashboardPayload, coursesList) => {
  const payload =
    dashboardPayload?.status === "success" ? dashboardPayload : dashboardPayload?.data || dashboardPayload;
  const cards = payload?.cards || {};
  const progress = payload?.progress_bars || {};

  return {
    coursesCount: toNumber(cards.total_courses, coursesList.length),
    avgSubmission: toNumber(progress.overall_submission_rate),
    avgQuizScore: toNumber(cards.avg_quiz_score ?? progress.average_quiz_score),
    studentsCount: toNumber(cards.enrolled_students),
  };
};

const AIAssistant = ({ role = "student" }) => {
  const token = localStorage.getItem("token");

  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Stats States
  const [studentStats, setStudentStats] = useState({
    avgQuizScore: 0,
    assignmentsDone: 0,
    missedItems: 0,
    ctfPoints: 0,
  });

  const [instructorStats, setInstructorStats] = useState({
    coursesCount: 0,
    avgSubmission: 0,
    avgQuizScore: 0,
    studentsCount: 0,
  });

  // Fetch actual data to compute metrics
  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        const coursesRes = await apiRequest("/api/get-courses", { token });
        const coursesList = Array.isArray(coursesRes.data?.courses)
          ? coursesRes.data.courses
          : [];

        if (role === "student") {
          const [assignmentsResult, quizzesResult, ctfResult] = await Promise.allSettled([
            withTimeout(
              apiRequest("/api/student/assignments-tracker", { token }),
              null,
              "Assignments"
            ),
            withTimeout(
              getStudentQuizMetrics(coursesList, token),
              { avgQuizScore: 0, missedQuizzes: 0 },
              "Quiz"
            ),
            withTimeout(getStudentChallenges(token), [], "CTF"),
          ]);

          const assignmentMetrics =
            assignmentsResult.status === "fulfilled" && assignmentsResult.value
              ? getStudentAssignmentMetrics(assignmentsResult.value.data)
              : { assignmentsDone: 0, missedAssignments: 0 };
          const quizMetrics =
            quizzesResult.status === "fulfilled"
              ? quizzesResult.value
              : { avgQuizScore: 0, missedQuizzes: 0 };
          const challenges =
            ctfResult.status === "fulfilled" && Array.isArray(ctfResult.value)
              ? ctfResult.value
              : [];
          const ctfPointsCount = challenges
            .filter((challenge) => challenge.isSolved)
            .reduce((sum, challenge) => sum + toNumber(challenge.points), 0);

          if (!isMounted) return;
          setStudentStats({
            avgQuizScore: quizMetrics.avgQuizScore,
            assignmentsDone: assignmentMetrics.assignmentsDone,
            missedItems: quizMetrics.missedQuizzes + assignmentMetrics.missedAssignments,
            ctfPoints: ctfPointsCount,
          });
        } else {
          const dashboardRes = await withTimeout(
            apiRequest("/api/dr-ta/dashboard", { token }),
            null,
            "Dashboard"
          );
          const dashboardMetrics = getInstructorDashboardMetrics(
            dashboardRes?.data,
            coursesList
          );

          if (!isMounted) return;
          setInstructorStats({
            ...dashboardMetrics,
            studentsCount:
              dashboardMetrics.studentsCount ||
              coursesList.reduce(
                (sum, course) => sum + toNumber(course.memberCount ?? course.member_count),
                0
              ),
          });
        }
      } catch (err) {
        console.error("Failed to load AI assistant metrics.", err);
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, [token, role]);

  const roleConfig = {
    student: {
      title: "Your Personal Learning Coach",
      subtitle: "AI-powered recommendations based on your grades, quizzes, assignments and CTF activity.",
      placeholder: "Optional: tell the AI what to focus on (e.g. 'Help me prepare for the next cryptography quiz').",
    },
    lecturer: {
      title: "Teaching Insights Assistant",
      subtitle: "AI analysis of class-wide engagement and performance to enhance your online lectures and sections.",
      placeholder: "Optional: focus area (e.g. 'How can I improve student understanding of network protocols?').",
    },
    ta: {
      title: "TA Coaching Assistant",
      subtitle: "AI guidance on grading patterns, section delivery and feedback to better support students.",
      placeholder: "Optional: focus area (e.g. 'How should I give better written feedback on assignments?').",
    },
  }[role];

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate premium visual analysis duration
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const endpoint = (role === "lecturer" || role === "ta")
        ? "/api/dr-ta/ai-recommendations"
        : "/api/student/ai-recommendations";

      const res = await apiRequest(
        endpoint,
        {
          method: "POST",
          token,
          data: {
            focus_area: focus.trim() || undefined,
          },
          cache: false,
        }
      );

      let responseData = null;
      if (res.data && res.data.status === "success" && res.data.data) {
        responseData = res.data.data;
      } else {
        responseData = res.data;
      }

      // Normalize recommendations keys from backend format to frontend format
      if (responseData && Array.isArray(responseData.recommendations)) {
        responseData.recommendations = responseData.recommendations.map((r) => ({
          ...r,
          category: r.category || r.type || "General",
          detail: r.detail || r.description || "",
        }));
      }

      setResult(responseData);
    } catch (err) {
      console.error("AI Generation Error:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Could not connect to AI server"
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Stats Card data
  const statsList = useMemo(() => {
    if (role === "student") {
      const { avgQuizScore, assignmentsDone, missedItems, ctfPoints } = studentStats;
      return [
        { label: "Avg Quiz Score", value: `${avgQuizScore}%`, icon: TrendingUp, color: "ai-text-emerald" },
        { label: "Assignments Done", value: assignmentsDone, icon: CheckCircle, color: "ai-text-cyan" },
        { label: "Missed Items", value: missedItems, icon: AlertTriangle, color: "ai-text-destructive" },
        { label: "CTF Points", value: ctfPoints, icon: Target, color: "ai-text-purple" },
      ];
    } else {
      const { coursesCount, avgSubmission, avgQuizScore, studentsCount } = instructorStats;
      return [
        { label: "Courses", value: coursesCount, icon: Brain, color: "ai-text-cyan" },
        { label: "Avg Submission", value: `${avgSubmission}%`, icon: CheckCircle, color: "ai-text-emerald" },
        { label: "Avg Quiz Score", value: `${avgQuizScore}%`, icon: TrendingUp, color: "ai-text-purple" },
        { label: "Students", value: studentsCount, icon: Target, color: "ai-text-amber" },
      ];
    }
  }, [role, studentStats, instructorStats]);

  return (
    <section className="ai-assistant-page">
      <div className="ai-assistant-shell">
        {/* Banner Hero */}
        <div className="ai-hero-banner">
          <div className="ai-banner-badge">
            <Sparkles size={12} /> AI Recommendation System
          </div>
          <h1>{roleConfig.title}</h1>
          <p>{roleConfig.subtitle}</p>
          <div className="ai-banner-brain">
            <Brain size={48} />
          </div>
        </div>

        {/* Stats KPIs */}
        <div className="ai-stats-grid">
          {statsList.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="ai-stat-card">
                <div className="ai-stat-info">
                  <span className="ai-stat-label">{s.label}</span>
                  <span className="ai-stat-value">{s.value}</span>
                </div>
                <div className={`ai-stat-icon-wrapper ${s.color}`}>
                  <Icon size={22} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Panel */}
        <div className="ai-action-card">
          <div className="ai-card-title">
            <Sparkles size={18} />
            <h2>Generate Recommendations</h2>
          </div>
          <div className="ai-card-content">
            <textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder={roleConfig.placeholder}
              rows={3}
            />
            <div className="ai-action-buttons">
              <button
                className="ai-primary-btn"
                onClick={generate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="ai-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generate AI Recommendations
                  </>
                )}
              </button>
              {result && !loading && (
                <button
                  className="ai-secondary-btn"
                  onClick={generate}
                  disabled={loading}
                >
                  <RefreshCw size={16} /> Regenerate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && !loading && (
          <div className="ai-stat-card ai-text-destructive" style={{ padding: "16px", display: "flex", gap: "12px", alignItems: "center", justifyContent: "flex-start" }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
              <span style={{ fontWeight: 600, fontSize: "14px" }}>API Server Connection Failed</span>
              <span style={{ fontSize: "13px", opacity: 0.9 }}>{error}. Loaded fallback recommendations.</span>
            </div>
          </div>
        )}

        {/* Analysis Loading */}
        {loading && (
          <div className="ai-loader-container">
            <Loader2 size={40} className="ai-spin" />
            <p>Analyzing your course activity and CTF history...</p>
          </div>
        )}

        {/* Recommendations Result View */}
        {result && !loading && (
          <div className="ai-result-view">
            {/* Summary */}
            <div className="ai-summary-card">
              <div className="ai-summary-icon">
                <Brain size={20} />
              </div>
              <div className="ai-summary-text">
                <h3>AI Summary</h3>
                <p>{result.summary}</p>
              </div>
            </div>

            {/* Strengths & Focus Areas */}
            <div className="ai-checklists-grid">
              <div className="ai-checklist-card card-strengths">
                <h3>
                  <CheckCircle size={16} /> Strengths
                </h3>
                <ul>
                  {result.strengths?.map((s, idx) => (
                    <li key={idx}>
                      <span className="bullet-strength">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="ai-checklist-card card-focus">
                <h3>
                  <Target size={16} /> Focus Areas
                </h3>
                <ul>
                  {result.focus_areas?.map((f, idx) => (
                    <li key={idx}>
                      <span className="bullet-focus">▸</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Personalized Recommendations */}
            <div className="ai-recommendations-section">
              <h2>
                <Sparkles size={18} /> Personalized Recommendations
              </h2>
              <div className="ai-recommendations-grid">
                {result.recommendations?.map((r, idx) => (
                  <div key={idx} className="ai-rec-card">
                    <div className="ai-rec-header">
                      <h3>{r.title}</h3>
                      <span className={`ai-priority-badge ${priorityStyles[r.priority]}`}>
                        {r.priority}
                      </span>
                    </div>
                    <span className="ai-rec-category-badge">{r.category}</span>
                    <p>{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            {result.next_steps && result.next_steps.length > 0 && (
              <div className="ai-next-steps-card">
                <h3>
                  <ArrowRight size={16} /> Next Steps
                </h3>
                <div className="ai-steps-list">
                  {result.next_steps.map((step, idx) => (
                    <div key={idx} className="ai-step-item">
                      <div className="ai-step-number">{idx + 1}</div>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty Placeholder State */}
        {!result && !loading && (
          <div className="ai-empty-state">
            <Brain size={48} />
            <p>
              Click <span className="highlight-text">Generate AI Recommendations</span> to get personalized insights based on {role === "student" ? "your" : "your courses'"} latest activity.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AIAssistant;
