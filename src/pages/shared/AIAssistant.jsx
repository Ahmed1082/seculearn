import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
import { getStudentChallenges, getInstructorChallenges } from "../../app/ctfApi";
import { getQuizzesList } from "../../app/quizApi";
import "../../styles/AIAssistant.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://cary-nontumorous-unimpedingly.ngrok-free.dev";

const buildApiHeaders = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  "ngrok-skip-browser-warning": "true",
});

const priorityStyles = {
  high: "ai-priority-high",
  medium: "ai-priority-medium",
  low: "ai-priority-low",
};

const AIAssistant = ({ role = "student" }) => {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  
  const user = useMemo(() => {
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  }, [storedUser]);

  const userName = useMemo(() => {
    if (!user) return role === "student" ? "Student" : role === "ta" ? "TA" : "Lecturer";
    return (
      user.name ||
      user.full_name ||
      user.username ||
      (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : "") ||
      user.first_name ||
      "User"
    );
  }, [user, role]);

  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Stats States
  const [statsLoading, setStatsLoading] = useState(true);
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
      setStatsLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      setStatsLoading(true);
      try {
        // 1. Fetch courses
        const coursesRes = await axios.get("/api/get-courses", {
          headers: buildApiHeaders(token),
        });
        const coursesList = coursesRes.data?.courses || [];

        if (role === "student") {
          // Fetch CTFs
          let ctfPointsCount = 0;
          try {
            const challenges = await getStudentChallenges(token);
            ctfPointsCount = challenges
              .filter((c) => c.isSolved)
              .reduce((sum, c) => sum + (c.points || 0), 0);
          } catch (err) {
            console.error("Failed to fetch CTF challenges for metrics:", err);
          }

          // Fetch Assignments
          let completedAssignments = 0;
          let missedAssignments = 0;
          try {
            const assignmentsRes = await axios.get(
              "/api/student/assignments-tracker",
              { headers: buildApiHeaders(token) }
            );
            const payload = assignmentsRes.data;
            const stats = payload?.stats || payload?.data?.stats || {};
            
            if (stats.submitted !== undefined) {
              completedAssignments = Number(stats.submitted ?? 0);
              missedAssignments = Number(stats.missed ?? 0);
            } else {
              const assignmentsList = Array.isArray(payload?.assignments) ? payload.assignments : 
                                      Array.isArray(payload?.data?.assignments) ? payload.data.assignments : 
                                      Array.isArray(payload?.data) ? payload.data : [];
                                      
              completedAssignments = assignmentsList.filter(
                (a) => {
                  const status = String(a.status || "").toLowerCase();
                  return status === "submitted" || status === "done";
                }
              ).length;
              missedAssignments = assignmentsList.filter((a) => String(a.status || "").toLowerCase() === "missed").length;
            }
          } catch (err) {
            console.error("Failed to fetch assignments for metrics:", err);
          }

          let quizScoresSum = 0;
          let gradedQuizzesCount = 0;
          let missedQuizzesCount = 0;
          try {
            const studentLectureIds = new Set();
            const studentSectionIds = new Set();
            coursesList.forEach((course) => {
              (course?.lectures || []).forEach((l) => studentLectureIds.add(String(l.id)));
              (course?.sections || []).forEach((s) => studentSectionIds.add(String(s.id)));
            });

            const allQuizzesList = await getQuizzesList({}, token);
            const rawQuizzes =
              (Array.isArray(allQuizzesList?.quizzes) && allQuizzesList.quizzes) ||
              (Array.isArray(allQuizzesList?.data) && allQuizzesList.data) ||
              (Array.isArray(allQuizzesList) ? allQuizzesList : []);

            const allQuizzes = rawQuizzes.filter((quiz) => {
              if (quiz.lecture_id) return studentLectureIds.has(String(quiz.lecture_id));
              if (quiz.section_id) return studentSectionIds.has(String(quiz.section_id));
              return false;
            });

            allQuizzes.forEach((q) => {
              const attempts = q.attempts || [];
              const hasAttempts = Array.isArray(attempts) && attempts.length > 0;
              const firstAttemptScore = hasAttempts ? attempts[0]?.score : null;
              
              const rawScore = q.score ?? q.percentage ?? firstAttemptScore;
              const score = (rawScore !== null && rawScore !== undefined && rawScore !== "") ? Number(rawScore) : null;
              
              const rawStatus = String(q.status || "").trim().toLowerCase();
              const isDone = hasAttempts || ["done", "completed", "complete", "submitted"].includes(rawStatus);

              if (score !== null && !isNaN(score)) {
                quizScoresSum += score;
                gradedQuizzesCount++;
              }
              if (!isDone && (rawStatus === "missed" || rawStatus === "expired" || rawStatus === "closed")) {
                missedQuizzesCount++;
              }
            });
          } catch (err) {
            console.error("Failed to fetch quizzes for metrics:", err);
          }

          const calculatedAvg = gradedQuizzesCount > 0 ? Math.round(quizScoresSum / gradedQuizzesCount) : 0;

          setStudentStats({
            avgQuizScore: gradedQuizzesCount > 0 ? calculatedAvg : 0,
            assignmentsDone: completedAssignments,
            missedItems: missedQuizzesCount + missedAssignments,
            ctfPoints: ctfPointsCount,
          });
        } else {
          // Lecturer or TA
          const totalCourses = coursesList.length;
          const totalStudents = coursesList.reduce((sum, c) => sum + (c.memberCount || c.member_count || 0), 0);

          setInstructorStats({
            coursesCount: totalCourses,
            avgSubmission: 0,
            avgQuizScore: 0,
            studentsCount: totalStudents,
          });
        }
      } catch (err) {
        console.error("Failed to load metrics, using realistic fallbacks.", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchMetrics();
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

      const res = await axios.post(
        endpoint,
        {
          focus_area: focus.trim() || undefined,
        },
        { headers: buildApiHeaders(token) }
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
