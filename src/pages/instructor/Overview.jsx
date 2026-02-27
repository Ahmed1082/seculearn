import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import "../../styles/InstructorOverview.css";

const Overview = () => {
  const navigate = useNavigate();
  const handleOpenCourses = () => navigate("/instructor/courses");

  const instructorName = useMemo(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return "Instructor X";

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
        "Instructor X"
      );
    } catch {
      return "Instructor X";
    }
  }, []);

  const statCards = [
    { label: "TOTAL COURSES", value: "3", icon: <FiBookOpen />, tone: "courses" },
    { label: "TOTAL LECTURES", value: "12", icon: <FiBarChart2 />, tone: "lectures" },
    { label: "AVG QUIZ SCORE", value: "87%", icon: <FiTrendingUp />, tone: "score" },
    { label: "ENROLLED STUDENTS", value: "10", icon: <FiUsers />, tone: "students" },
  ];

  const progressCards = [
    {
      title: "Overall Assignment Submission Rate",
      value: "78%",
      summary: "53 submitted - 15 missed out of 12 assignments",
      width: "78%",
    },
    {
      title: "Average Quiz Score",
      value: "87%",
      summary: "Across 12 quizzes - 42 total attempts",
      width: "87%",
    },
  ];

  const coursePerformance = [
    {
      title: "Introduction to Cybersecurity",
      meta: "4 Lectures   6 Assignments   6 Quizzes   10 Students",
      completion: "77%",
      score: "86%",
    },
    {
      title: "Introduction to Cryptography",
      meta: "4 Lectures   3 Assignments   3 Quizzes   10 Students",
      completion: "71%",
      score: "89%",
    },
    {
      title: "Ethical Hacking",
      meta: "4 Lectures   3 Assignments   3 Quizzes   10 Students",
      completion: "84%",
      score: "87%",
    },
  ];

  const recentActivity = [
    {
      icon: <FiCheckCircle />,
      text: "Ahmed Ali submitted Assignment 1: Threat Report",
      time: "2 hours ago",
      tone: "success",
    },
    {
      icon: <FiClock />,
      text: "Sara Hassan completed Quiz 2: Attack Types",
      time: "4 hours ago",
      tone: "info",
    },
    {
      icon: <FiAlertTriangle />,
      text: "3 students missed Assignment 2: IDS Setup deadline",
      time: "1 day ago",
      tone: "danger",
    },
    {
      icon: <FiActivity />,
      text: "New lecture added: Post-Exploitation",
      time: "2 days ago",
      tone: "accent",
    },
    {
      icon: <FiUsers />,
      text: "2 new students enrolled in Ethical Hacking",
      time: "3 days ago",
      tone: "sky",
    },
  ];

  return (
    <div className="instructor-overview-page">
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
          onClick={() => navigate("/instructor/courses")}
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
                key={course.title}
                className="overview-performance-item"
                role="button"
                tabIndex={0}
                onClick={handleOpenCourses}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenCourses();
                  }
                }}
              >
                <div className="overview-performance-main">
                  <h3>{course.title}</h3>
                  <p>{course.meta}</p>
                </div>

                <div className="overview-performance-metrics">
                  <div>
                    <strong>{course.completion}</strong>
                    <span>COMPLETION</span>
                  </div>
                  <div>
                    <strong>{course.score}</strong>
                    <span>AVG SCORE</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-activity-card">
          <h2>
            <FiClock />
            Recent Activity
          </h2>

          <div className="overview-activity-list">
            {recentActivity.map((item, index) => (
              <div
                key={`${item.text}-${index}`}
                className="overview-activity-item"
              >
                <span className={`overview-activity-icon ${item.tone}`}>
                  {item.icon}
                </span>
                <div>
                  <p>{item.text}</p>
                  <span>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default Overview;
