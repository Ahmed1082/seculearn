import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../app/apiClient";
import {
  FiAlertCircle,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiFilter,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";
import "../../styles/AllAssignments.css";

const statusConfig = {
  done: {
    label: "Submitted",
    icon: FiCheckCircle,
  },
  pending: {
    label: "Pending",
    icon: FiClock,
  },
  missed: {
    label: "Missed",
    icon: FiXCircle,
  },
};

const normalizeStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  if (status === "submitted" || status === "done") return "done";
  if (status === "missed") return "missed";
  return "pending";
};

const normalizeSource = (value) => {
  const source = String(value || "").trim().toLowerCase();
  if (source === "section") return "section";
  return "lecture";
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDueDate = (value) => {
  if (!value) return "No due date";
  const normalized = String(value).replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
};

const getTrackerEndpoint = (courseId) =>
  courseId
    ? `/api/student/assignments-tracker/${courseId}`
    : "/api/student/assignments-tracker";

const extractAssignments = (payload) => {
  if (Array.isArray(payload?.assignments)) return payload.assignments;
  if (Array.isArray(payload?.data?.assignments)) return payload.data.assignments;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const extractStats = (payload, assignments) => {
  const stats = payload?.stats || payload?.data?.stats || {};
  const normalizedAssignments = Array.isArray(assignments) ? assignments : [];

  const submitted =
    toNumber(stats.submitted, -1) >= 0
      ? toNumber(stats.submitted)
      : normalizedAssignments.filter((item) => item.status === "done").length;
  const pending =
    toNumber(stats.pending, -1) >= 0
      ? toNumber(stats.pending)
      : normalizedAssignments.filter((item) => item.status === "pending").length;
  const missed =
    toNumber(stats.missed, -1) >= 0
      ? toNumber(stats.missed)
      : normalizedAssignments.filter((item) => item.status === "missed").length;
  const total =
    toNumber(stats.total, -1) >= 0
      ? toNumber(stats.total)
      : normalizedAssignments.length;
  const progress =
    toNumber(stats.progress_percentage, -1) >= 0
      ? Math.max(0, Math.min(100, toNumber(stats.progress_percentage)))
      : total
        ? Math.round((submitted / total) * 100)
        : 0;

  return { total, done: submitted, pending, missed, progress };
};

/**
 * Build a map: assignmentId -> { courseId, contentId, source }
 * by fetching assignments for each lecture/section in each course.
 */
const buildAssignmentRouteMap = async (courses, token) => {
  const map = {}; // key: String(assignmentId)

  const fetches = [];

  for (const course of courses) {
    const courseId = course.id;

    for (const lecture of course.lectures || []) {
      fetches.push(
        apiRequest(`/api/get-lecture-assignments/${lecture.id}`, { token })
          .then((res) => {
            const items = Array.isArray(res?.data?.data)
              ? res.data.data
              : Array.isArray(res?.data)
                ? res.data
                : [];
            for (const item of items) {
              const aid = String(item?.id ?? "");
              if (aid) {
                map[aid] = { courseId, contentId: lecture.id, source: "lecture" };
              }
            }
          })
          .catch(() => {})
      );
    }

    for (const section of course.sections || []) {
      fetches.push(
        apiRequest(`/api/get-section-assignments/${section.id}`, { token })
          .then((res) => {
            const items = Array.isArray(res?.data?.data)
              ? res.data.data
              : Array.isArray(res?.data)
                ? res.data
                : [];
            for (const item of items) {
              const aid = String(item?.id ?? "");
              if (aid) {
                map[aid] = { courseId, contentId: section.id, source: "section" };
              }
            }
          })
          .catch(() => {})
      );
    }
  }

  await Promise.all(fetches);
  return map;
};

const StudentAllAssignments = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [activeFilter, setActiveFilter] = useState("all");
  const [activeCourse, setActiveCourse] = useState("all");
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    done: 0,
    pending: 0,
    missed: 0,
    progress: 0,
  });
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const [assignmentsError, setAssignmentsError] = useState("");

  // Fetch courses (needed for route map + filter dropdown)
  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      setCoursesError("");
      try {
        const response = await apiRequest("/api/get-courses", { token });
        if (!isMounted) return;
        setCourses(Array.isArray(response?.data?.courses) ? response.data.courses : []);
      } catch (error) {
        if (!isMounted) return;
        setCoursesError(error?.response?.data?.message || "Failed to load courses.");
      } finally {
        if (isMounted) setIsLoadingCourses(false);
      }
    };

    fetchCourses();
    return () => { isMounted = false; };
  }, [token]);

  // Fetch assignments + enrich with courseId/contentId from route map
  useEffect(() => {
    if (!token || isLoadingCourses) return;
    let isMounted = true;

    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      setAssignmentsError("");

      try {
        // Fetch tracker and route map in parallel
        const [trackerResponse, routeMap] = await Promise.all([
          apiRequest(
            activeCourse === "all" ? getTrackerEndpoint() : getTrackerEndpoint(activeCourse),
            { token }
          ),
          buildAssignmentRouteMap(courses, token),
        ]);

        if (!isMounted) return;

        const normalizedAssignments = extractAssignments(trackerResponse?.data).map((assignment) => {
          const assignmentId = String(assignment?.id ?? assignment?.assignment_id ?? "");
          const source = normalizeSource(assignment?.source);
          const dueDate = assignment?.due_date || assignment?.dueDate || null;

          // Look up route info from map
          const routeInfo = routeMap[assignmentId] || {};
          const courseId =
            routeInfo.courseId ??
            assignment?.course_id ??
            assignment?.courseId ??
            assignment?.course?.id ??
            null;
          const contentId =
            routeInfo.contentId ??
            assignment?.lecture_id ??
            assignment?.section_id ??
            assignment?.content_id ??
            null;
          const resolvedSource = routeInfo.source || source;

          const courseName =
            assignment?.course_name ||
            assignment?.course?.title ||
            assignment?.course?.name ||
            "Course";

          return {
            ...assignment,
            id: assignmentId,
            courseId,
            contentId,
            source: resolvedSource,
            courseName,
            status: normalizeStatus(assignment?.status),
            sourceLabel: resolvedSource === "section" ? "Section" : "Lecture",
            dueDate,
            points: toNumber(assignment?.points, 100),
            originalName:
              assignment?.original_name ||
              assignment?.original_file_name ||
              assignment?.file_name ||
              "",
          };
        });

        setAssignments(normalizedAssignments);
        setStats(extractStats(trackerResponse?.data, normalizedAssignments));
      } catch (error) {
        if (!isMounted) return;
        setAssignments([]);
        setStats({ total: 0, done: 0, pending: 0, missed: 0, progress: 0 });
        setAssignmentsError(error?.response?.data?.message || "Failed to load assignments.");
      } finally {
        if (isMounted) setIsLoadingAssignments(false);
      }
    };

    fetchAssignments();
    return () => { isMounted = false; };
  }, [activeCourse, token, courses, isLoadingCourses]);

  const filteredAssignments = useMemo(() => {
    if (activeFilter === "all") return assignments;
    return assignments.filter((item) => item.status === activeFilter);
  }, [activeFilter, assignments]);

  const filterItems = [
    { key: "all", label: "All", count: stats.total },
    { key: "done", label: "Submitted", count: stats.done },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "missed", label: "Missed", count: stats.missed },
  ];

  const statCards = [
    { label: "Total", value: stats.total, className: "all-assignments-stat-total" },
    { label: "Submitted", value: stats.done, className: "all-assignments-stat-done" },
    { label: "Pending", value: stats.pending, className: "all-assignments-stat-pending" },
    { label: "Missed", value: stats.missed, className: "all-assignments-stat-missed" },
  ];

  // Navigate to the assignment submission/view page
  const handleOpenAssignment = (assignment) => {
    if (!assignment?.courseId || !assignment?.contentId || !assignment?.id) return;
    navigate(
      `/student/courses/${assignment.courseId}/${assignment.source}/${assignment.contentId}/assignment/${assignment.id}`
    );
  };

  const getPendingActionLabel = (assignment) =>
    assignment?.courseId && assignment?.contentId ? "Submit Now" : "Pending";

  return (
    <section className="all-assignments-page">
      <div className="all-assignments-shell">
        <header className="all-assignments-header">
          <div className="all-assignments-header-icon">
            <FiFileText size={16} />
          </div>
          <div>
            <h1>Assignments</h1>
            <p>Track and submit your course assignments</p>
          </div>
        </header>

        <section className="all-assignments-stats-grid">
          {statCards.map((card) => (
            <article key={card.label} className={`all-assignments-stat-card ${card.className}`}>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </article>
          ))}
        </section>

        <section className="all-assignments-progress-card">
          <div className="all-assignments-progress-top">
            <h2>Overall Progress</h2>
            <span>{stats.progress}%</span>
          </div>
          <div className="all-assignments-progress-track">
            <div className="all-assignments-progress-fill" style={{ width: `${stats.progress}%` }} />
          </div>
          <p>{stats.done} of {stats.total} assignments submitted</p>
        </section>

        <section className="all-assignments-filters-row">
          <div className="all-assignments-filter-group">
            <FiFilter size={14} />
            {filterItems.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`all-assignments-filter-chip ${activeFilter === filter.key ? "is-active" : ""}`}
                onClick={() => setActiveFilter(filter.key)}
              >
                <span>{filter.label}</span>
                <small>{filter.count}</small>
              </button>
            ))}
          </div>

          <div className="all-assignments-course-filter">
            <FiBookOpen size={14} />
            <select
              value={activeCourse}
              onChange={(event) => setActiveCourse(event.target.value)}
              aria-label="Filter assignments by course"
              disabled={isLoadingCourses || isLoadingAssignments}
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title || course.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {(coursesError || assignmentsError) && (
          <section className="all-assignments-feedback error" aria-live="polite">
            <FiAlertCircle size={16} />
            <p>{assignmentsError || coursesError}</p>
          </section>
        )}

        {isLoadingAssignments || isLoadingCourses ? (
          <section className="all-assignments-empty-state">
            <FiRefreshCw size={24} className="all-assignments-spin" />
            <p>Loading assignments...</p>
          </section>
        ) : filteredAssignments.length === 0 ? (
          <section className="all-assignments-empty-state">
            <FiFileText size={24} />
            <p>
              {assignmentsError
                ? "Assignments could not be loaded."
                : "No assignments match the selected filter."}
            </p>
          </section>
        ) : (
          <section className="all-assignments-list">
            {filteredAssignments.map((assignment) => {
              const status = statusConfig[assignment.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const canOpen = Boolean(assignment.courseId && assignment.contentId && assignment.id);

              return (
                <article
                  key={assignment.id}
                  className={`all-assignments-item ${canOpen ? "is-clickable" : "is-static"}`}
                  style={{ cursor: canOpen ? "pointer" : "default" }}
                  onClick={() => canOpen && handleOpenAssignment(assignment)}
                >
                  <div className={`all-assignments-item-icon status-${assignment.status}`}>
                    <StatusIcon size={14} />
                  </div>

                  <div className="all-assignments-item-content">
                    <div className="all-assignments-item-head">
                      <div>
                        <h3>{assignment.title || "Untitled assignment"}</h3>
                        <div className="all-assignments-item-meta">
                          <span>{assignment.courseName}</span>
                          <span className="all-assignments-dot">&middot;</span>
                          <span>{assignment.sourceLabel}</span>
                          <span className="all-assignments-dot">&middot;</span>
                          <span>{assignment.points} pts</span>
                          <span className="all-assignments-dot">&middot;</span>
                          <span>{formatDueDate(assignment.dueDate)}</span>
                        </div>
                      </div>

                      <div className={`all-assignments-status-pill status-${assignment.status}`}>
                        <StatusIcon size={11} />
                        <span>{status.label}</span>
                      </div>
                    </div>

                    <div className="all-assignments-item-foot">
                      {assignment.originalName && (
                        <p className="all-assignments-file-name">{assignment.originalName}</p>
                      )}

                      {assignment.status === "done" && (
                        <p className="all-assignments-note done">Submitted successfully</p>
                      )}

                      {assignment.status === "pending" && (
                        <button
                          type="button"
                          className="all-assignments-submit-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (canOpen) handleOpenAssignment(assignment);
                          }}
                          disabled={!canOpen}
                        >
                          {getPendingActionLabel(assignment)}
                        </button>
                      )}

                      {assignment.status === "missed" && (
                        <p className="all-assignments-note missed">Deadline passed</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </section>
  );
};

export default StudentAllAssignments;
