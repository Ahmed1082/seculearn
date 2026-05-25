import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import "../../styles/Overview.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://cary-nontumorous-unimpedingly.ngrok-free.dev";

const OverviewDashboard = ({ coursesPath, userFallbackName }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    if (!token) {
      setError("No authentication token found. Please log in again.");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.get("/api/dr-ta/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          "bypass-tunnel-reminder": "true",
        },
      });
      
      if (res.data && res.data.status === "success") {
        setData(res.data);
      } else {
        throw new Error(res.data?.message || "Failed to load dashboard data.");
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      const errMsg = err.response?.data?.message || err.message || "An error occurred while connecting to the server.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const handleOpenCourse = (courseId) => navigate(`${coursesPath}/${courseId}`);

  const displayName = useMemo(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return userFallbackName;

    try {
      const user = JSON.parse(stored);
      return (
        user.name ||
        user.full_name ||
        user.username ||
        (user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : "") ||
        user.first_name ||
        userFallbackName
      );
    } catch {
      return userFallbackName;
    }
  }, [userFallbackName]);

  // Helper to map type to appropriate icon and tone classes
  const getActivityDetails = (type) => {
    const t = String(type || "").toLowerCase();
    if (t.includes("submission")) {
      return { icon: <FiCheckCircle />, tone: "success" };
    } else if (t.includes("quiz")) {
      return { icon: <FiClock />, tone: "info" };
    } else if (t.includes("missed") || t.includes("danger") || t.includes("alert")) {
      return { icon: <FiAlertTriangle />, tone: "danger" };
    } else if (t.includes("student") || t.includes("user")) {
      return { icon: <FiUsers />, tone: "sky" };
    } else {
      return { icon: <FiActivity />, tone: "accent" };
    }
  };

  if (loading) {
    return (
      <div className="lecturer-overview-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div className="overview-stat-icon" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '28px', animation: 'spin 1.5s linear infinite' }}>
          <FiActivity />
        </div>
        <p style={{ color: '#86a2c6', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Loading Dashboard Data...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lecturer-overview-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center', padding: '20px' }}>
        <div className="overview-activity-icon danger" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiAlertTriangle />
        </div>
        <h2 style={{ color: '#dae5f2', fontSize: '1.5rem', fontWeight: 600 }}>Failed to Load Dashboard</h2>
        <p style={{ color: '#ff6e8d', maxWidth: '400px', fontSize: '0.95rem' }}>{error}</p>
        <button
          onClick={fetchDashboardData}
          className="overview-courses-btn"
          style={{ marginTop: '10px' }}
        >
          <FiActivity /> Retry Connection
        </button>
      </div>
    );
  }

  // Derive display values from dynamic data
  const instructorName = data?.instructor?.name || displayName;
  
  const cards = data?.cards || {};
  const statCards = [
    { label: "TOTAL COURSES", value: cards.total_courses ?? "0", icon: <FiBookOpen />, tone: "courses" },
    { label: "TOTAL LECTURES", value: cards.total_lectures ?? "0", icon: <FiBarChart2 />, tone: "lectures" },
    { label: "AVG QUIZ SCORE", value: cards.avg_quiz_score ?? "0%", icon: <FiTrendingUp />, tone: "score" },
    { label: "ENROLLED STUDENTS", value: cards.enrolled_students ?? "0", icon: <FiUsers />, tone: "students" },
  ];

  const progress = data?.progress_bars || {};
  const progressCards = [
    {
      title: "Overall Assignment Submission Rate",
      value: progress.overall_submission_rate ?? "0%",
      summary: progress.submission_subtext ?? "",
      width: progress.overall_submission_rate ?? "0%",
    },
    {
      title: "Average Quiz Score",
      value: progress.average_quiz_score ?? "0%",
      summary: progress.quiz_subtext ?? "",
      width: progress.average_quiz_score ?? "0%",
    },
  ];

  const coursePerformance = data?.course_performance || [];
  const recentActivity = data?.recent_activity || [];

  return (
    <div className="lecturer-overview-page">
      <style>{`
        .overview-performance-card,
        .overview-activity-card {
          display: flex !important;
          flex-direction: column !important;
          min-height: 0 !important;
        }

        @media (min-width: 1201px) {
          .overview-performance-list,
          .overview-activity-list {
            min-height: 0 !important;
            flex: 1 !important;
            overflow-y: auto !important;
          }
        }

        /* Custom scrollbars for performance list and activity list */
        .overview-performance-list::-webkit-scrollbar,
        .overview-activity-list::-webkit-scrollbar {
          width: 6px !important;
        }

        .overview-performance-list::-webkit-scrollbar-track,
        .overview-activity-list::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1) !important;
          border-radius: 4px !important;
        }

        .overview-performance-list::-webkit-scrollbar-thumb,
        .overview-activity-list::-webkit-scrollbar-thumb {
          background: rgba(0, 229, 255, 0.25) !important;
          border-radius: 4px !important;
          border: 1px solid rgba(0, 0, 0, 0.15) !important;
        }

        .overview-performance-list::-webkit-scrollbar-thumb:hover,
        .overview-activity-list::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 229, 255, 0.45) !important;
        }
      `}</style>
      <section className="overview-hero">
        <div>
          <p className="overview-welcome">Welcome back,</p>
          <h1 className="overview-heading">{instructorName}</h1>
          <p className="overview-subtitle">
            Here&apos;s what&apos;s happening across your courses today.
          </p>
        </div>

        <button
          className="overview-courses-btn"
          onClick={() => navigate(coursesPath)}
        >
          <FiBookOpen />
          View All Courses
        </button>
      </section>

      <section className="overview-stats-grid">
        {statCards.map((card) => (
          <article
            key={card.label}
            className={`overview-stat-card overview-stat-${card.tone}`}
          >
            <div>
              <p className="overview-stat-label">{card.label}</p>
              <p className="overview-stat-value">{card.value}</p>
            </div>
            <span className="overview-stat-icon">{card.icon}</span>
          </article>
        ))}
      </section>

      <section className="overview-progress-grid">
        {progressCards.map((item) => (
          <article key={item.title} className="overview-progress-card">
            <div className="overview-progress-head">
              <h3>{item.title}</h3>
              <span>{item.value}</span>
            </div>
            <div className="overview-progress-track">
              <div
                className="overview-progress-fill"
                style={{ width: item.width }}
              />
            </div>
            <p>{item.summary}</p>
          </article>
        ))}
      </section>

      <section className="overview-bottom-grid">
        <article className="overview-performance-card">
          <h2>
            <FiBookOpen />
            Course Performance
          </h2>

          <div className="overview-performance-list">
            {coursePerformance.map((course) => (
              <div
                key={course.id || course.title}
                className="overview-performance-item"
                role="button"
                tabIndex={0}
                onClick={() => handleOpenCourse(course.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenCourse(course.id);
                  }
                }}
              >
                <div className="overview-performance-main">
                  <h3>{course.title}</h3>
                  <p>{course.stats_line}</p>
                </div>

                <div className="overview-performance-metrics">
                  <div>
                    <strong>
                      {typeof course.completion_percentage === "number" && !String(course.completion_percentage).endsWith("%")
                        ? `${course.completion_percentage}%`
                        : course.completion_percentage ?? "0%"}
                    </strong>
                    <span>COMPLETION</span>
                  </div>
                  <div>
                    <strong>{course.average_score || "0%"}</strong>
                    <span>AVG SCORE</span>
                  </div>
                </div>
              </div>
            ))}
            {coursePerformance.length === 0 && (
              <p style={{ color: '#86a2c6', textAlign: 'center', padding: '20px' }}>No courses details available.</p>
            )}
          </div>
        </article>

        <article className="overview-activity-card">
          <h2>
            <FiClock />
            Recent Activity
          </h2>

          <div className="overview-activity-list">
            {recentActivity.map((item, index) => {
              const details = getActivityDetails(item.type);
              return (
                <div
                  key={`${item.message}-${index}`}
                  className="overview-activity-item"
                >
                  <span className={`overview-activity-icon ${details.tone}`}>
                    {details.icon}
                  </span>
                  <div>
                    <p>{item.message}</p>
                    <span>{item.time}</span>
                  </div>
                </div>
              );
            })}
            {recentActivity.length === 0 && (
              <p style={{ color: '#86a2c6', textAlign: 'center', padding: '20px' }}>No recent activity.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default OverviewDashboard;
