import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../app/apiClient";
import { getQuizzesList } from "../../app/quizApi";
import {
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiHelpCircle,
  FiRefreshCw,
  FiStar,
  FiTrendingUp,
  FiXCircle,
} from "react-icons/fi";
import "../../styles/AllQuizzes.css";

const QUIZ_REQUEST_CONCURRENCY = 4;

const toNumberOrNull = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const normalizeQuizStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "done" ||
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "submitted"
  ) {
    return "done";
  }

  if (
    normalized === "missed" ||
    normalized === "expired" ||
    normalized === "closed"
  ) {
    return "missed";
  }

  return "pending";
};

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

const sortQuizzes = (items) =>
  [...items].sort((a, b) => {
    const courseCompare = (a.course?.name || "").localeCompare(
      b.course?.name || ""
    );
    if (courseCompare !== 0) return courseCompare;
    return a.title.localeCompare(b.title);
  });

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

const getNormalizedScore = (apiQuiz) => {
  const attempts = apiQuiz?.attempts || [];
  const hasAttempts = Array.isArray(attempts) && attempts.length > 0;
  const firstAttempt = hasAttempts ? attempts[0] : null;

  const isPassed =
    apiQuiz?.is_passed ??
    apiQuiz?.isPassed ??
    firstAttempt?.is_passed ??
    firstAttempt?.isPassed ??
    null;

  const rawScore =
    toNumberOrNull(apiQuiz?.score) ??
    toNumberOrNull(apiQuiz?.percentage) ??
    toNumberOrNull(firstAttempt?.score) ??
    null;

  if (rawScore === null) return null;

  const passing = toNumberOrNull(apiQuiz?.passing_percentage) ?? 60;

  if (rawScore >= passing) {
    return rawScore;
  }

  if (isPassed === true || isPassed === 1 || isPassed === "1") {
    return 100;
  }

  if (isPassed === false || isPassed === 0 || isPassed === "0") {
    return 0;
  }

  return rawScore;
};

const normalizeApiQuiz = (apiQuiz, content, course) => {
  const attempts = apiQuiz?.attempts || [];
  const hasAttempts = Array.isArray(attempts) && attempts.length > 0;
  const rawStatus = apiQuiz?.status;
  const isDone = hasAttempts || [
    "done", "completed", "complete", "submitted"
  ].includes(String(rawStatus || "").trim().toLowerCase());

  return {
    id: String(apiQuiz?.id || ""),
    title: apiQuiz?.title || `Quiz ${apiQuiz?.id || ""}`,
    duration_minutes:
      toNumberOrNull(apiQuiz?.duration_minutes) ??
      toNumberOrNull(apiQuiz?.time_limit) ??
      30,
    question_count:
      toNumberOrNull(apiQuiz?.questions_count) ??
      toNumberOrNull(apiQuiz?.question_count) ??
      (Array.isArray(apiQuiz?.questions) ? apiQuiz.questions.length : 0),
    passing_percentage:
      toNumberOrNull(apiQuiz?.passing_percentage) ??
      toNumberOrNull(apiQuiz?.passingScore) ??
      60,
    status: isDone ? "done" : normalizeQuizStatus(rawStatus),
    score: getNormalizedScore(apiQuiz),
    content,
    course,
  };
};

const StudentAllQuizzes = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const activeLoadRef = useRef(0);

  const [loadState, setLoadState] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeCourse, setActiveCourse] = useState("all");

  const fetchAllQuizzes = useCallback(async () => {
    const loadId = activeLoadRef.current + 1;
    activeLoadRef.current = loadId;

    if (!token) {
      setCourses([]);
      setQuizzes([]);
      setLoadState("ready");
      return;
    }

    setLoadState("loading");
    setErrorMsg("");
    setQuizzes([]);

    try {
      const coursesResponse = await apiRequest("/api/get-courses", { token });
      if (activeLoadRef.current !== loadId) return;

      const rawCourses = Array.isArray(coursesResponse?.data?.courses)
        ? coursesResponse.data.courses
        : [];
      setCourses(rawCourses);

      const trackerPath =
        activeCourse === "all"
          ? "/api/student/quizzes-tracker"
          : `/api/student/quizzes-tracker/${activeCourse}`;

      const trackerResponse = await apiRequest(trackerPath, { token });
      if (activeLoadRef.current !== loadId) return;

      const rawQuizzes =
        trackerResponse?.data?.quizzes ||
        trackerResponse?.data?.data?.quizzes ||
        trackerResponse?.quizzes ||
        [];

      const normalized = rawQuizzes.map((quiz) => {
        const foundCourse = rawCourses.find(
          (c) =>
            (c.title || c.name || "").trim().toLowerCase() ===
            (quiz.course_name || "").trim().toLowerCase()
        );

        const courseId = foundCourse ? String(foundCourse.id) : (activeCourse !== "all" ? activeCourse : "");
        const courseName = foundCourse ? (foundCourse.title || foundCourse.name) : (quiz.course_name || "Course");

        let contentType = String(quiz.source || "").toLowerCase() === "section" ? "section" : "lecture";
        let contentId = "";
        let contentTitle = quiz.content_title || "";

        if (foundCourse) {
          if (contentType === "section") {
            const sect = (foundCourse.sections || []).find(
              (s) =>
                (s.title || "").trim().toLowerCase() ===
                (quiz.content_title || "").trim().toLowerCase()
            );
            if (sect) {
              contentId = String(sect.id);
              contentTitle = sect.title;
            }
          } else {
            const lect = (foundCourse.lectures || []).find(
              (l) =>
                (l.title || "").trim().toLowerCase() ===
                (quiz.content_title || "").trim().toLowerCase()
            );
            if (lect) {
              contentId = String(lect.id);
              contentTitle = lect.title;
            }
          }
        }

        const isPassed =
          quiz.is_passed ??
          quiz.isPassed ??
          null;

        const rawScore = toNumberOrNull(quiz.score);
        const qCount = toNumberOrNull(quiz.questions_count) ?? 0;
        const passing = 60;

        let score = rawScore;
        if (rawScore !== null) {
          if (rawScore >= passing) {
            score = rawScore;
          } else if (qCount > 0 && rawScore <= qCount) {
            score = Math.round((rawScore / qCount) * 100);
          } else if (isPassed === true || isPassed === 1 || isPassed === "1") {
            score = 100;
          } else if (isPassed === false || isPassed === 0 || isPassed === "0") {
            score = 0;
          }
        }

        const status = normalizeQuizStatus(quiz.status);

        return {
          id: String(quiz.id || ""),
          title: quiz.title || `Quiz ${quiz.id || ""}`,
          duration_minutes: toNumberOrNull(quiz.duration_minutes) ?? 30,
          question_count: toNumberOrNull(quiz.questions_count) ?? 0,
          passing_percentage: passing,
          status,
          score,
          content: {
            id: contentId,
            title: contentTitle,
            courseId,
            type: contentType,
          },
          course: {
            id: courseId,
            name: courseName,
          },
        };
      });

      setQuizzes(sortQuizzes(normalized));
      setLoadState("ready");
    } catch (error) {
      if (activeLoadRef.current !== loadId) return;
      setCourses([]);
      setQuizzes([]);
      setErrorMsg(error?.message || "Failed to load quizzes.");
      setLoadState("error");
    }
  }, [token, activeCourse]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      fetchAllQuizzes();
    }, 0);

    return () => {
      activeLoadRef.current += 1;
      window.clearTimeout(loadTimer);
    };
  }, [fetchAllQuizzes]);

  const stats = useMemo(() => {
    const total = quizzes.length;
    const done = quizzes.filter((quiz) => quiz.status === "done").length;
    const pending = quizzes.filter((quiz) => quiz.status === "pending").length;
    const missed = quizzes.filter((quiz) => quiz.status === "missed").length;
    const scores = quizzes
      .filter((quiz) => quiz.score !== null)
      .map((quiz) => quiz.score);
    const avgScore = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null;
    const bestScore = scores.length ? Math.max(...scores) : null;

    return { total, done, pending, missed, scores, avgScore, bestScore };
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const statusMatch =
        activeFilter === "all" || quiz.status === activeFilter;
      const courseMatch =
        activeCourse === "all" || quiz.course?.id === activeCourse;
      return statusMatch && courseMatch;
    });
  }, [activeCourse, activeFilter, quizzes]);

  const filterItems = [
    { key: "all", label: "All", count: stats.total },
    { key: "done", label: "Completed", count: stats.done },
    { key: "pending", label: "Upcoming", count: stats.pending },
    { key: "missed", label: "Missed", count: stats.missed },
  ];

  const openQuiz = (quiz) => {
    const courseId = quiz.course?.id || quiz.content?.courseId;
    const contentId = quiz.content?.id;

    if (!courseId || !contentId || !quiz.id) return;

    navigate(
      quiz.content?.type === "section"
        ? `/student/courses/${courseId}/section/${contentId}/exam/${quiz.id}`
        : `/student/courses/${courseId}/lecture/${contentId}/exam/${quiz.id}`
    );
  };

  if (loadState === "loading") {
    return (
      <section className="all-quizzes-page">
        <div className="all-quizzes-shell">
          <header className="all-quizzes-header">
            <div className="all-quizzes-header-icon">
              <FiHelpCircle size={16} />
            </div>
            <div>
              <h1>Quizzes</h1>
              <p>Loading your quizzes...</p>
            </div>
          </header>

          <div className="all-quizzes-list">
            <article className="all-quizzes-empty-state">
              <FiHelpCircle size={24} />
              <p>Loading...</p>
            </article>
          </div>
        </div>
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <section className="all-quizzes-page">
        <div className="all-quizzes-shell">
          <header className="all-quizzes-header">
            <div className="all-quizzes-header-icon">
              <FiHelpCircle size={16} />
            </div>
            <div>
              <h1>Quizzes</h1>
              <p>{errorMsg}</p>
            </div>
          </header>

          <div className="all-quizzes-list">
            <article className="all-quizzes-empty-state">
              <FiRefreshCw size={24} />
              <p>{errorMsg}</p>
              <button
                type="button"
                className="all-quizzes-start-btn"
                style={{ marginTop: 12 }}
                onClick={fetchAllQuizzes}
              >
                Retry
              </button>
            </article>
          </div>
        </div>
      </section>
    );
  }

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
            <strong
              style={{
                color:
                  stats.avgScore !== null ? scoreColor(stats.avgScore) : "#9eb0c8",
              }}
            >
              {stats.avgScore !== null ? `${stats.avgScore}%` : "-"}
            </strong>
            <span>Avg Score</span>
          </article>

          <article className="all-quizzes-stat-card all-quizzes-stat-best">
            <strong
              style={{
                color:
                  stats.bestScore !== null
                    ? scoreColor(stats.bestScore)
                    : "#9eb0c8",
              }}
            >
              {stats.bestScore !== null ? `${stats.bestScore}%` : "-"}
            </strong>
            <span>Best Score</span>
          </article>
        </section>

        {stats.scores.length > 0 && (
          <section className="all-quizzes-trend-card">
            <div className="all-quizzes-trend-icon">
              <FiTrendingUp size={14} />
            </div>

            <div className="all-quizzes-trend-content">
              <div className="all-quizzes-trend-top">
                <h2>Score History</h2>
                <span>{stats.scores.length} quizzes graded</span>
              </div>

              <div className="all-quizzes-bars">
                {quizzes
                  .filter((quiz) => quiz.score !== null)
                  .map((quiz) => (
                    <div
                      key={quiz.id}
                      className="all-quizzes-bar"
                      style={{
                        height: `${Math.max(6, Math.round(quiz.score * 0.34))}px`,
                        background: scoreColor(quiz.score),
                      }}
                      title={`${quiz.title}: ${quiz.score}%`}
                    />
                  ))}
              </div>
            </div>

            <div className="all-quizzes-trend-average">
              <strong
                style={{
                  color:
                    stats.avgScore !== null ? scoreColor(stats.avgScore) : "#9eb0c8",
                }}
              >
                {stats.avgScore !== null ? `${stats.avgScore}%` : "-"}
              </strong>
              <span>average</span>
            </div>
          </section>
        )}

        <section className="all-quizzes-filters-row">
          <div className="all-quizzes-filter-group">
            <FiFilter size={14} />
            {filterItems.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`all-quizzes-filter-chip ${
                  activeFilter === filter.key ? "is-active" : ""
                }`}
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
              disabled={loadState === "loading"}
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={String(course.id)}>
                  {course.title || course.name || `Course ${course.id}`}
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
            <>
              {filteredQuizzes.map((quiz) => {
              const config = statusConfig[quiz.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const isDone = quiz.status === "done";
              const isPending = quiz.status === "pending";
              const isMissed = quiz.status === "missed";

              return (
                <article
                  key={quiz.id}
                  className="all-quizzes-item"
                  onClick={() => openQuiz(quiz)}
                >
                  <div className={`all-quizzes-item-icon status-${quiz.status}`}>
                    <StatusIcon size={14} />
                  </div>

                  <div className="all-quizzes-item-content">
                    <div className="all-quizzes-item-head">
                      <div>
                        <h3>{quiz.title}</h3>
                        <div className="all-quizzes-item-meta">
                          <span>{quiz.course?.name}</span>
                          {quiz.content?.title && (
                            <>
                              <span className="all-quizzes-dot">&middot;</span>
                              <span>{quiz.content.title.split(":")[0]}</span>
                            </>
                          )}
                          <span className="all-quizzes-dot">&middot;</span>
                          <span>{quiz.question_count} questions</span>
                        </div>
                      </div>

                      <div className="all-quizzes-right-head">
                        {isDone && quiz.score !== null && (
                          <div
                            className="all-quizzes-score-ring"
                            style={{
                              background: `conic-gradient(${scoreColor(
                                quiz.score
                              )} ${Math.round(quiz.score * 3.6)}deg, #151515 0deg)`,
                            }}
                          >
                            <div
                              className="all-quizzes-score-ring-inner"
                              style={{ color: scoreColor(quiz.score) }}
                            >
                              {quiz.score}
                            </div>
                          </div>
                        )}

                        <div
                          className={`all-quizzes-status-pill status-${quiz.status}`}
                        >
                          <StatusIcon size={11} />
                          <span>{config.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="all-quizzes-item-foot">
                      {isDone && quiz.score !== null && (
                        <div className="all-quizzes-score-note">
                          <FiStar
                            size={12}
                            style={{ color: scoreColor(quiz.score) }}
                          />
                          <span style={{ color: scoreColor(quiz.score) }}>
                            {scoreLabel(quiz.score)}
                          </span>
                          <small>{quiz.score}%</small>
                        </div>
                      )}

                      {(isPending || isDone) && (
                        <button
                          type="button"
                          className="all-quizzes-start-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            openQuiz(quiz);
                          }}
                        >
                          {isDone ? "View Result" : "Start Quiz"}
                        </button>
                      )}

                      {isMissed && (
                        <p className="all-quizzes-note-missed">
                          Quiz window closed
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
              })}

            </>
          )}
        </section>
      </div>
    </section>
  );
};

export default StudentAllQuizzes;
