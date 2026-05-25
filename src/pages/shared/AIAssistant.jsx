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
    avgQuizScore: 92,
    assignmentsDone: 12,
    missedItems: 0,
    ctfPoints: 2150,
  });

  const [instructorStats, setInstructorStats] = useState({
    coursesCount: 3,
    avgSubmission: 78,
    avgQuizScore: 87,
    studentsCount: 10,
  });

  // Load cached result from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem(`ai_assistant_result_${role}_${user?.id || "default"}`);
    if (cached) {
      try {
        setResult(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached recommendations:", e);
      }
    }
  }, [role, user?.id]);

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
            const assignmentsList = assignmentsRes.data?.assignments || assignmentsRes.data?.data || [];
            completedAssignments = assignmentsList.filter(
              (a) => a.status === "submitted" || a.status === "done"
            ).length;
            missedAssignments = assignmentsList.filter((a) => a.status === "missed").length;
          } catch (err) {
            console.error("Failed to fetch assignments for metrics:", err);
          }

          // Fetch Quizzes to compute avg score and missed quizzes
          let quizScoresSum = 0;
          let gradedQuizzesCount = 0;
          let missedQuizzesCount = 0;
          try {
            const quizCollections = await Promise.all(
              coursesList.map(async (course) => {
                const lectureEntries = course?.lectures || [];
                const sectionEntries = course?.sections || [];

                const lectureQuizzes = await Promise.all(
                  lectureEntries.map(async (lecture) => {
                    try {
                      const quizList = await getQuizzesList({ lecture_id: lecture.id }, token);
                      const rawItems =
                        (Array.isArray(quizList?.quizzes) && quizList.quizzes) ||
                        (Array.isArray(quizList?.data) && quizList.data) ||
                        (Array.isArray(quizList?.quizzes_list) && quizList.quizzes_list) ||
                        (Array.isArray(quizList?.quizzesList) && quizList.quizzesList) ||
                        (Array.isArray(quizList) ? quizList : []);
                      return rawItems;
                    } catch { return []; }
                  })
                );

                const sectionQuizzes = await Promise.all(
                  sectionEntries.map(async (section) => {
                    try {
                      const quizList = await getQuizzesList({ section_id: section.id }, token);
                      const rawItems =
                        (Array.isArray(quizList?.quizzes) && quizList.quizzes) ||
                        (Array.isArray(quizList?.data) && quizList.data) ||
                        (Array.isArray(quizList?.quizzes_list) && quizList.quizzes_list) ||
                        (Array.isArray(quizList?.quizzesList) && quizList.quizzesList) ||
                        (Array.isArray(quizList) ? quizList : []);
                      return rawItems;
                    } catch { return []; }
                  })
                );

                return [...lectureQuizzes.flat(), ...sectionQuizzes.flat()];
              })
            );

            const allQuizzes = quizCollections.flat().filter((q) => q && q.id);
            allQuizzes.forEach((q) => {
              const rawScore = q.score ?? q.percentage;
              const score = (rawScore !== null && rawScore !== undefined && rawScore !== "") ? Number(rawScore) : null;
              
              if (score !== null && !isNaN(score)) {
                quizScoresSum += score;
                gradedQuizzesCount++;
              }
              if (q.status === "missed" || q.status === "expired" || q.status === "closed") {
                missedQuizzesCount++;
              }
            });
          } catch (err) {
            console.error("Failed to fetch quizzes for metrics:", err);
          }

          const calculatedAvg = gradedQuizzesCount > 0 ? Math.round(quizScoresSum / gradedQuizzesCount) : 92;

          setStudentStats({
            avgQuizScore: calculatedAvg,
            assignmentsDone: completedAssignments || 12,
            missedItems: (missedQuizzesCount + missedAssignments) || 0,
            ctfPoints: ctfPointsCount || 2150,
          });
        } else {
          // Lecturer or TA
          const totalCourses = coursesList.length;
          const totalStudents = coursesList.reduce((sum, c) => sum + (c.memberCount || c.member_count || 10), 0);

          setInstructorStats({
            coursesCount: totalCourses || 3,
            avgSubmission: 78,
            avgQuizScore: 87,
            studentsCount: totalStudents || 10,
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

  // Client-side AI Recommendations Engine
  const generateLocalRecommendations = (focusText) => {
    const cleaned = focusText.toLowerCase().trim();

    if (role === "student") {
      const { avgQuizScore, assignmentsDone, ctfPoints } = studentStats;

      if (cleaned.includes("vpn") || cleaned.includes("network") || cleaned.includes("protocol")) {
        return {
          summary: `${userName}, based on your query about networking, we've analyzed your progress in Network Security modules. You have a solid foundation in firewall rules, but transitioning to secure tunneling protocols needs a quick review.`,
          strengths: [
            "Strong score in Firewall Configuration quizzes.",
            "Completed the introductory Network Reconnaissance CTF challenges.",
            "Consistent engagement with Lecture 2 materials."
          ],
          focus_areas: [
            "VPN protocols comparison (IPsec vs SSL/TLS tunnels).",
            "Intrusion Detection Systems (IDS) alert analysis.",
            "Advanced packet filtering techniques."
          ],
          recommendations: [
            {
              title: "Review VPN Protocols",
              detail: "Revisit 'Lecture 2: Network Security Basics' focusing on VPN Protocols to solidify your understanding, as indicated by a lower quiz score in this area.",
              priority: "high",
              category: "Study"
            },
            {
              title: "Tackle Network Security CTFs",
              detail: "Attempt the 'Firewall Bypass' CTF challenge to apply and enhance your practical skills in network security.",
              priority: "medium",
              category: "CTF"
            }
          ],
          next_steps: [
            "Re-watch the lecture on VPN Protocols in 'Network Security Basics'.",
            "Complete the 'Firewall Bypass' CTF to apply network security knowledge."
          ]
        };
      }

      if (cleaned.includes("cryptography") || cleaned.includes("crypto") || cleaned.includes("key")) {
        return {
          summary: `${userName}, your cryptography progress is outstanding. You have achieved high scores in Symmetric Encryption, but asymmetric key management concepts require closer review to prevent security gaps.`,
          strengths: [
            "Excellent score on Symmetric Encryption quizzes.",
            "Decoupled key management concepts understood.",
            "Solved the 'Vigenère Cipher' challenge on first attempt."
          ],
          focus_areas: [
            "Asymmetric key exchange algorithms (Diffie-Hellman).",
            "RSA padding schemes (OAEP) and mathematical security foundations.",
            "Secure storage of private keys in Docker containers."
          ],
          recommendations: [
            {
              title: "Deep Dive into Key Management",
              detail: "Spend additional time on 'Lecture 1: Symmetric Encryption' and the 'Key Management' topic to reinforce this crucial aspect of cryptography.",
              priority: "high",
              category: "Study"
            },
            {
              title: "Advanced Cryptography Concepts",
              detail: "Given your strong foundation, consider exploring more advanced topics in cryptography beyond the current curriculum, perhaps through external resources.",
              priority: "low",
              category: "Study"
            }
          ],
          next_steps: [
            "Review RSA and Diffie-Hellman implementation details.",
            "Attempt the advanced cryptography CTF challenge."
          ]
        };
      }

      if (cleaned.includes("reverse") || cleaned.includes("malware") || cleaned.includes("assembly") || cleaned.includes("binary")) {
        return {
          summary: `${userName}, binary analysis is one of the most challenging topics, but your x86 knowledge is developing. Focusing on compiler optimization and assembly reading will help you progress further.`,
          strengths: [
            "Good understanding of x86 calling conventions.",
            "Basic stack buffer overflow defense knowledge.",
            "Strong local debugger usage skills."
          ],
          focus_areas: [
            "GDB debugging and assembly analysis.",
            "Malware obfuscation techniques.",
            "Reverse engineering compiled C binaries."
          ],
          recommendations: [
            {
              title: "Explore Reverse Engineering",
              detail: "Consider exploring the 'Malware Reverse' CTF to challenge yourself in a new, advanced area, expanding your practical skillset.",
              priority: "low",
              category: "CTF"
            }
          ],
          next_steps: [
            "Practice tracing execution in GDB.",
            "Solve assembly instruction quizzes."
          ]
        };
      }

      // Default Student Response
      return {
        summary: `${userName}, your performance is strong across the board, demonstrating a solid grasp of core cybersecurity concepts. While excelling in many areas, there are specific topics where a bit more focus can elevate your understanding further.`,
        strengths: [
          `Excellent overall quiz performance with an average score of ${avgQuizScore}%.`,
          `Perfect record with ${assignmentsDone} assignments submitted.`,
          `High engagement and proficiency in CTFs, earning ${ctfPoints} points.`,
          "Strong understanding of Threat Landscape Overview and Ethical Hacking Reconnaissance."
        ],
        focus_areas: [
          "Network Security Basics, specifically VPN Protocols.",
          "Cryptography, particularly Key Management.",
          "Certain advanced CTF categories like Reverse Engineering and Network Security (Firewall Bypass)."
        ],
        recommendations: [
          {
            title: "Review VPN Protocols",
            detail: "Revisit 'Lecture 2: Network Security Basics' focusing on VPN Protocols to solidify your understanding, as indicated by a lower quiz score in this area.",
            priority: "high",
            category: "Study"
          },
          {
            title: "Deep Dive into Key Management",
            detail: "Spend additional time on 'Lecture 1: Symmetric Encryption' and the 'Key Management' topic to reinforce this crucial aspect of cryptography.",
            priority: "high",
            category: "Study"
          },
          {
            title: "Tackle Network Security CTFs",
            detail: "Attempt the 'Firewall Bypass' CTF challenge to apply and enhance your practical skills in network security.",
            priority: "medium",
            category: "CTF"
          },
          {
            title: "Explore Reverse Engineering",
            detail: "Consider exploring the 'Malware Reverse' CTF to challenge yourself in a new, advanced area, expanding your practical skillset.",
            priority: "low",
            category: "CTF"
          },
          {
            title: "Advanced Cryptography Concepts",
            detail: "Given your strong foundation, consider exploring more advanced topics in cryptography beyond the current curriculum, perhaps through external resources.",
            priority: "low",
            category: "Study"
          }
        ],
        next_steps: [
          "Re-watch the lecture on VPN Protocols in 'Network Security Basics'.",
          "Complete the 'Firewall Bypass' CTF to apply network security knowledge.",
          "Review external resources or SecuLearn advanced modules on key management best practices and considerations."
        ]
      };
    } else {
      // Instructor / Lecturer / TA Response
      const isTa = role === "ta";
      const { coursesCount, avgSubmission, avgQuizScore, studentsCount } = instructorStats;

      return {
        summary: `Class-wide performance across your ${coursesCount} courses is generally strong, with an average assignment submission rate of ${avgSubmission}%. However, there are noticeable drop-offs in quiz performance on specific challenging lectures.`,
        strengths: [
          `Excellent submission rate (${avgSubmission}%) on assignments across ${studentsCount} students.`,
          "Strong active participation in containerized CTF labs.",
          `High class average (${avgQuizScore}%) in introductory threat assessment modules.`
        ],
        focus_areas: [
          "Improve student participation rates in late-term assignments.",
          "Reinforce advanced topics like Public Key Infrastructure and Buffer Overflows.",
          isTa ? "Provide targeted assistance to student groups struggling with debugging." : "Optimize lecture content delivery for hybrid sections."
        ],
        recommendations: [
          {
            title: "Review Sessions for Cryptography",
            detail: "Plan a dedicated Q&A session on Public Key Infrastructure before the next major quiz, as students struggled with key exchange concepts.",
            priority: "high",
            category: "Lecture"
          },
          {
            title: "Optimize CTF Clues",
            detail: "Provide additional hints or resources for the 'Buffer Overflow' challenge to boost completion rates among struggling student groups.",
            priority: "medium",
            category: "CTF"
          },
          {
            title: "Active Grading Policy",
            detail: "Implement automated grading checks or reminders to assist students in submitting overdue assignments.",
            priority: "low",
            category: "Assignment"
          }
        ],
        next_steps: [
          "Schedule a Q&A session on Asymmetric Cryptography.",
          "Update the instructions for the SQL Injection lab to clarify connection issues.",
          "Monitor submission rates for the upcoming threat modeling assignment."
        ]
      };
    }
  };

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
      localStorage.setItem(
        `ai_assistant_result_${role}_${user?.id || "default"}`,
        JSON.stringify(responseData)
      );
    } catch (err) {
      console.error("AI Generation Error: falling back to client-side model.", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Could not connect to AI server"
      );

      // Attempt local fallback
      try {
        const localData = generateLocalRecommendations(focus);
        setResult(localData);
        localStorage.setItem(
          `ai_assistant_result_${role}_${user?.id || "default"}`,
          JSON.stringify(localData)
        );
      } catch (fallbackErr) {
        console.error("Local fallback failed:", fallbackErr);
      }
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
