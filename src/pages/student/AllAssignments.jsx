import { useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiFilter,
  FiXCircle,
} from "react-icons/fi";
import "../../styles/AllAssignments.css";

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

const assignments = [
  { id: "a1", title: "Assignment 1: Threat Report", lectureId: "l1", doneStudentIds: ["s1"], missedStudentIds: [] },
  { id: "a2", title: "Assignment 2: Vulnerability Scan", lectureId: "l1", doneStudentIds: ["s1"], missedStudentIds: [] },
  { id: "a3", title: "Assignment 3: Risk Assessment", lectureId: "l1", doneStudentIds: ["s1"], missedStudentIds: [] },
  { id: "a4", title: "Assignment 1: Firewall Config", lectureId: "l2", doneStudentIds: ["s1"], missedStudentIds: [] },
  { id: "a5", title: "Assignment 2: Network Segmentation", lectureId: "l2", doneStudentIds: ["s1"], missedStudentIds: [] },
  { id: "a6", title: "Assignment 1: Caesar Attack", lectureId: "l3", doneStudentIds: [], missedStudentIds: [] },
  { id: "a7", title: "Assignment 2: Vigenere Break", lectureId: "l3", doneStudentIds: ["s1"], missedStudentIds: [] },
  { id: "a8", title: "Assignment 1: AES Lab", lectureId: "l4", doneStudentIds: [], missedStudentIds: [] },
  { id: "a9", title: "Assignment 2: CBC Analysis", lectureId: "l4", doneStudentIds: [], missedStudentIds: [] },
  { id: "a10", title: "Assignment 1: Nmap Report", lectureId: "l5", doneStudentIds: ["s1"], missedStudentIds: [] },
  { id: "a11", title: "Assignment 2: Web Vulnerabilities", lectureId: "l5", doneStudentIds: [], missedStudentIds: ["s1"] },
  { id: "a12", title: "Assignment 1: Incident Timeline", lectureId: "l6", doneStudentIds: ["s1"], missedStudentIds: [] },
];

const mockStudentIds = new Set(
  assignments.flatMap((assignment) => [
    ...assignment.doneStudentIds.map((id) => String(id)),
    ...assignment.missedStudentIds.map((id) => String(id)),
  ])
);

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

const getStatus = (assignment, currentStudentId) => {
  if (assignment.doneStudentIds.includes(currentStudentId)) return "done";
  if (assignment.missedStudentIds.includes(currentStudentId)) return "missed";
  return "pending";
};

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

const StudentAllAssignments = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeCourse, setActiveCourse] = useState("all");
  const currentStudentId = useMemo(() => resolveStudentIdForMockData(getCurrentStudentId()), []);

  const enrichedAssignments = useMemo(() => {
    return assignments
      .map((assignment) => {
        const lecture = lectures.find((item) => item.id === assignment.lectureId);
        const course = courses.find((item) => item.id === lecture?.courseId);

        return {
          ...assignment,
          lecture,
          course,
          status: getStatus(assignment, currentStudentId),
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [currentStudentId]);

  const stats = useMemo(() => {
    const total = enrichedAssignments.length;
    const done = enrichedAssignments.filter((item) => item.status === "done").length;
    const pending = enrichedAssignments.filter((item) => item.status === "pending").length;
    const missed = enrichedAssignments.filter((item) => item.status === "missed").length;
    const progress = total ? Math.round((done / total) * 100) : 0;

    return { total, done, pending, missed, progress };
  }, [enrichedAssignments]);

  const filteredAssignments = useMemo(() => {
    return enrichedAssignments.filter((item) => {
      const statusMatch = activeFilter === "all" || item.status === activeFilter;
      const courseMatch = activeCourse === "all" || item.course?.id === activeCourse;
      return statusMatch && courseMatch;
    });
  }, [activeCourse, activeFilter, enrichedAssignments]);

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

          <p>
            {stats.done} of {stats.total} assignments submitted
          </p>
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

        <section className="all-assignments-list">
          {filteredAssignments.length === 0 ? (
            <article className="all-assignments-empty-state">
              <FiFileText size={24} />
              <p>No assignments match the selected filter.</p>
            </article>
          ) : (
            filteredAssignments.map((assignment) => {
              const status = statusConfig[assignment.status];
              const StatusIcon = status.icon;

              return (
                <article key={assignment.id} className="all-assignments-item">
                  <div className={`all-assignments-item-icon status-${assignment.status}`}>
                    <StatusIcon size={14} />
                  </div>

                  <div className="all-assignments-item-content">
                    <div className="all-assignments-item-head">
                      <div>
                        <h3>{assignment.title}</h3>

                        <div className="all-assignments-item-meta">
                          <span>{assignment.course?.name}</span>
                          <span className="all-assignments-dot">&middot;</span>
                          <span>{assignment.lecture?.title?.split(":")[0]}</span>
                        </div>
                      </div>

                      <div className={`all-assignments-status-pill status-${assignment.status}`}>
                        <StatusIcon size={11} />
                        <span>{status.label}</span>
                      </div>
                    </div>

                    <div className="all-assignments-item-foot">
                      {assignment.status === "done" && (
                        <p className="all-assignments-note done">Submitted successfully</p>
                      )}

                      {assignment.status === "pending" && (
                        <button type="button" className="all-assignments-submit-btn">
                          Submit Now
                        </button>
                      )}

                      {assignment.status === "missed" && (
                        <p className="all-assignments-note missed">Deadline passed</p>
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

export default StudentAllAssignments;
