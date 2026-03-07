import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Users,
  Search,
  Clock3,
  XCircle,
  FileText,
  File,
  FileArchive,
  Image as ImageIcon,
  Globe,
  MoreVertical,
  Pencil,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import "../../styles/AssignmentReview.css";

const courses = [
  { id: "c1", name: "Introduction to Cybersecurity" },
];

const lectures = [
  { id: "l1", courseId: "c1", title: "Lecture 1: Threat Landscape Overview" },
];

const assignments = [
  {
    id: "a1",
    lectureId: "l1",
    title: "Assignment 1: Threat Report",
    doneStudentIds: ["s1", "s2", "s3", "s4", "s5"],
    missedStudentIds: ["s6", "s7"],
  },
];

const students = [
  { id: "s1", name: "Ahmed Ali", studentId: "STU001" },
  { id: "s2", name: "Sara Hassan", studentId: "STU002" },
  { id: "s3", name: "Omar Khalil", studentId: "STU003" },
  { id: "s4", name: "Fatima Nour", studentId: "STU004" },
  { id: "s5", name: "Youssef Amin", studentId: "STU005" },
  { id: "s6", name: "Layla Ibrahim", studentId: "STU006" },
  { id: "s7", name: "Kareem Fahmy", studentId: "STU007" },
  { id: "s8", name: "Nadia Sayed", studentId: "STU008" },
  { id: "s9", name: "Tarek Mostafa", studentId: "STU009" },
  { id: "s10", name: "Hana Zaki", studentId: "STU010" },
];

const submissionsByAssignment = {
  a1: [
    {
      id: "sub-1",
      assignmentId: "a1",
      studentId: "s1",
      fileName: "ThreatReport_AhmedAli.pdf",
      fileType: "application/pdf",
      fileSize: 384211,
      submittedAt: "2026-02-25T10:15:00Z",
      grade: 85,
    },
    {
      id: "sub-2",
      assignmentId: "a1",
      studentId: "s2",
      fileName: "Threat_Analysis_Sara.docx",
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 276902,
      submittedAt: "2026-02-25T12:30:00Z",
      grade: 92,
    },
    {
      id: "sub-3",
      assignmentId: "a1",
      studentId: "s3",
      fileName: "threat_report_omar.pdf",
      fileType: "application/pdf",
      fileSize: 412680,
      submittedAt: "2026-02-25T15:15:00Z",
      grade: null,
    },
    {
      id: "sub-4",
      assignmentId: "a1",
      studentId: "s4",
      fileName: "ThreatLandscape_Fatima.pdf",
      fileType: "application/pdf",
      fileSize: 532400,
      submittedAt: "2026-02-26T09:08:00Z",
      grade: 78,
    },
    {
      id: "sub-5",
      assignmentId: "a1",
      studentId: "s5",
      fileName: "Report_Youssef.zip",
      fileType: "application/zip",
      fileSize: 1364800,
      submittedAt: "2026-02-26T10:30:00Z",
      grade: null,
    },
  ],
};

const publicCommentsSeed = {
  a1: [
    {
      id: "pub-1",
      authorId: "inst-1",
      authorName: "Dr. Mahmoud",
      authorRole: "Instructor",
      text: "Reminder: Focus on at least 3 different threat categories in your report. Quality over quantity.",
      timestamp: "2026-02-25T11:00:00Z",
    },
    {
      id: "pub-2",
      authorId: "s2",
      authorName: "Sara Hassan",
      authorRole: "Student",
      text: "Are we allowed to use external references beyond the lecture slides?",
      timestamp: "2026-02-25T12:30:00Z",
    },
    {
      id: "pub-3",
      authorId: "inst-1",
      authorName: "Dr. Mahmoud",
      authorRole: "Instructor",
      text: "Yes, external references are encouraged. Just make sure to cite them properly using APA format.",
      timestamp: "2026-02-25T13:00:00Z",
    },
    {
      id: "pub-4",
      authorId: "s3",
      authorName: "Omar Khalil",
      authorRole: "Student",
      text: "Thanks for clarifying. Also, is there a minimum page count?",
      timestamp: "2026-02-25T15:15:00Z",
    },
    {
      id: "pub-5",
      authorId: "inst-1",
      authorName: "Dr. Mahmoud",
      authorRole: "Instructor",
      text: "No minimum page count. Focus on depth of analysis.",
      timestamp: "2026-02-25T16:00:00Z",
    },
    {
      id: "pub-6",
      authorId: "s1",
      authorName: "Ahmed Ali",
      authorRole: "Student",
      text: "Can we include diagrams from threat intelligence reports?",
      timestamp: "2026-02-26T10:30:00Z",
    },
    {
      id: "pub-7",
      authorId: "inst-1",
      authorName: "Dr. Mahmoud",
      authorRole: "Instructor",
      text: "Yes, diagrams are welcome as long as the source is cited.",
      timestamp: "2026-02-26T11:00:00Z",
    },
  ],
};

const privateCommentsSeed = {
  a1: {
    s1: [
      {
        id: "p1",
        authorId: "inst-1",
        authorName: "Dr. Mahmoud",
        authorRole: "Instructor",
        text: "Great structure. Add one more real-world attack case.",
        timestamp: "2026-02-26T11:10:00Z",
      },
    ],
  },
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatCommentTime = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFileIcon = (type = "") => {
  if (type.startsWith("image/")) return <ImageIcon className="assignment-review-file-icon image" size={16} />;
  if (type.includes("pdf")) return <FileText className="assignment-review-file-icon pdf" size={16} />;
  if (type.includes("zip") || type.includes("rar")) return <FileArchive className="assignment-review-file-icon archive" size={16} />;
  return <File className="assignment-review-file-icon doc" size={16} />;
};

const getInitials = (name = "") => name.trim().charAt(0).toUpperCase() || "?";

const filterTabs = [
  { key: "all", label: "All" },
  { key: "turned_in", label: "Turned in" },
  { key: "assigned", label: "Pending" },
  { key: "missed", label: "Missed" },
];

const AssignmentReview = () => {
  const { assignmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const contentDetailsPath = useMemo(() => {
    if (location.pathname.startsWith("/ta/")) return "/ta/contentDetails";
    if (location.pathname.startsWith("/student/")) return "/student/contentDetails";
    return "/lecturer/contentDetails";
  }, [location.pathname]);

  const assignment = useMemo(
    () => assignments.find((item) => item.id === assignmentId) || assignments[0],
    [assignmentId]
  );

  const lecture = useMemo(
    () => lectures.find((item) => item.id === assignment?.lectureId) || null,
    [assignment]
  );

  const course = useMemo(
    () => courses.find((item) => item.id === lecture?.courseId) || null,
    [lecture]
  );

  const [submissions, setSubmissions] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptingSubmissions, setAcceptingSubmissions] = useState(true);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [excusedByStudent, setExcusedByStudent] = useState({});
  const [returnedByStudent, setReturnedByStudent] = useState({});
  const [isReturnMenuOpen, setIsReturnMenuOpen] = useState(false);
  const [returnActionFeedback, setReturnActionFeedback] = useState("");
  const [draftGrades, setDraftGrades] = useState({});
  const [publicMessages, setPublicMessages] = useState([]);
  const [publicDraft, setPublicDraft] = useState("");
  const [activePublicMenuId, setActivePublicMenuId] = useState(null);
  const [editingPublicCommentId, setEditingPublicCommentId] = useState(null);
  const [publicEditDraft, setPublicEditDraft] = useState("");
  const [privateMessagesByStudent, setPrivateMessagesByStudent] = useState({});
  const [privateDraft, setPrivateDraft] = useState("");
  const [activePrivateMenuId, setActivePrivateMenuId] = useState(null);
  const [editingPrivateCommentId, setEditingPrivateCommentId] = useState(null);
  const [privateEditDraft, setPrivateEditDraft] = useState("");

  useEffect(() => {
    if (!assignment) return;
    setSubmissions([...(submissionsByAssignment[assignment.id] || [])]);
    setSelectedStudentId(null);
    setFilterType("all");
    setSearchQuery("");
    setStatusOverrides({});
    setExcusedByStudent({});
    setReturnedByStudent({});
    setIsReturnMenuOpen(false);
    setReturnActionFeedback("");
    setDraftGrades({});
    setPublicMessages([...(publicCommentsSeed[assignment.id] || [])]);
    setPublicDraft("");
    setActivePublicMenuId(null);
    setEditingPublicCommentId(null);
    setPublicEditDraft("");
    setPrivateMessagesByStudent({ ...(privateCommentsSeed[assignment.id] || {}) });
    setPrivateDraft("");
    setActivePrivateMenuId(null);
    setEditingPrivateCommentId(null);
    setPrivateEditDraft("");
  }, [assignment]);

  if (!assignment) {
    return (
      <section className="assignment-review-page">
        <div className="assignment-review-not-found">Assignment not found.</div>
      </section>
    );
  }

  const getSubmissionForStudent = (studentId) =>
    submissions.find((sub) => sub.studentId === studentId) || null;

  const getComputedStatus = (studentId) => {
    if (statusOverrides[studentId]) return statusOverrides[studentId];
    if (assignment.doneStudentIds.includes(studentId)) return "turned_in";
    if (assignment.missedStudentIds.includes(studentId)) return "missed";
    return "assigned";
  };

  const studentList = students.map((student) => ({
    ...student,
    status: getComputedStatus(student.id),
    submission: getSubmissionForStudent(student.id),
  }));

  const turnedInCount = studentList.filter((student) => student.status === "turned_in").length;
  const missedCount = studentList.filter((student) => student.status === "missed").length;
  const assignedCount = studentList.filter((student) => student.status === "assigned").length;

  const filteredStudents = studentList.filter((student) => {
    const statusMatches = filterType === "all" || student.status === filterType;
    const searchMatches = student.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return statusMatches && searchMatches;
  });

  const selectedStudent = selectedStudentId
    ? studentList.find((student) => student.id === selectedStudentId) || null
    : null;

  useEffect(() => {
    setActivePrivateMenuId(null);
    setEditingPrivateCommentId(null);
    setPrivateEditDraft("");
    setIsReturnMenuOpen(false);
    setReturnActionFeedback("");
  }, [selectedStudentId]);

  const getPrivateMessages = (studentId) => privateMessagesByStudent[studentId] || [];

  const readGrade = (student) => {
    const draft = draftGrades[student.id];
    if (draft !== undefined) return draft;
    if (student.submission?.grade === null || student.submission?.grade === undefined) return "";
    return String(student.submission.grade);
  };

  const handleSaveGrade = (studentId) => {
    const value = draftGrades[studentId];
    if (value === undefined || value === "") return;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    const clamped = Math.max(0, Math.min(100, Math.round(numeric)));

    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.studentId === studentId
          ? {
              ...sub,
              grade: clamped,
            }
          : sub
      )
    );
    setDraftGrades((prev) => ({ ...prev, [studentId]: String(clamped) }));
  };

  const handleSendPublicComment = () => {
    const text = publicDraft.trim();
    if (!text) return;

    const nextComment = {
      id: `pub-${Date.now()}`,
      authorId: "inst-1",
      authorName: "Dr. Mahmoud",
      authorRole: "Instructor",
      text,
      timestamp: new Date().toISOString(),
    };

    setPublicMessages((prev) => [...prev, nextComment]);
    setPublicDraft("");
    setActivePublicMenuId(null);
    setEditingPublicCommentId(null);
    setPublicEditDraft("");
  };

  const togglePublicCommentMenu = (commentId) => {
    setActivePublicMenuId((prev) => (prev === commentId ? null : commentId));
  };

  const handleEditPublicComment = (comment) => {
    if (!comment || comment.authorRole !== "Instructor") return;
    setEditingPublicCommentId(comment.id);
    setPublicEditDraft(comment.text || "");
    setActivePublicMenuId(null);
  };

  const handleCancelPublicEdit = () => {
    setEditingPublicCommentId(null);
    setPublicEditDraft("");
  };

  const handleSavePublicEdit = () => {
    const text = publicEditDraft.trim();
    if (!text || !editingPublicCommentId) return;
    setPublicMessages((prev) =>
      prev.map((comment) =>
        comment.id === editingPublicCommentId
          ? {
              ...comment,
              text,
              timestamp: new Date().toISOString(),
            }
          : comment
      )
    );
    setEditingPublicCommentId(null);
    setPublicEditDraft("");
  };

  const handleDeletePublicComment = (commentId) => {
    setPublicMessages((prev) => prev.filter((comment) => comment.id !== commentId));
    setActivePublicMenuId(null);
    if (editingPublicCommentId === commentId) {
      setEditingPublicCommentId(null);
      setPublicEditDraft("");
    }
  };

  const handleSendPrivateComment = (studentId) => {
    const text = privateDraft.trim();
    if (!text) return;

    const nextComment = {
      id: `prv-${Date.now()}`,
      authorId: "inst-1",
      authorName: "Dr. Mahmoud",
      authorRole: "Instructor",
      text,
      timestamp: new Date().toISOString(),
    };

    setPrivateMessagesByStudent((prev) => ({
      ...prev,
      [studentId]: [...(prev[studentId] || []), nextComment],
    }));
    setPrivateDraft("");
    setActivePrivateMenuId(null);
    setEditingPrivateCommentId(null);
    setPrivateEditDraft("");
  };

  const togglePrivateCommentMenu = (commentId) => {
    setActivePrivateMenuId((prev) => (prev === commentId ? null : commentId));
  };

  const handleEditPrivateComment = (comment) => {
    if (!comment || comment.authorRole !== "Instructor") return;
    setEditingPrivateCommentId(comment.id);
    setPrivateEditDraft(comment.text || "");
    setActivePrivateMenuId(null);
  };

  const handleCancelPrivateEdit = () => {
    setEditingPrivateCommentId(null);
    setPrivateEditDraft("");
  };

  const handleSavePrivateEdit = (studentId) => {
    const text = privateEditDraft.trim();
    if (!text || !editingPrivateCommentId || !studentId) return;

    setPrivateMessagesByStudent((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || []).map((comment) =>
        comment.id === editingPrivateCommentId
          ? {
              ...comment,
              text,
              timestamp: new Date().toISOString(),
            }
          : comment
      ),
    }));
    setEditingPrivateCommentId(null);
    setPrivateEditDraft("");
  };

  const handleDeletePrivateComment = (studentId, commentId) => {
    if (!studentId || !commentId) return;
    setPrivateMessagesByStudent((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || []).filter((comment) => comment.id !== commentId),
    }));
    setActivePrivateMenuId(null);
    if (editingPrivateCommentId === commentId) {
      setEditingPrivateCommentId(null);
      setPrivateEditDraft("");
    }
  };

  const applyStatusToStudents = (studentIds, status) => {
    if (!studentIds.length) return;
    setStatusOverrides((prev) => ({
      ...prev,
      ...studentIds.reduce((acc, id) => ({ ...acc, [id]: status }), {}),
    }));
  };

  const handleReturnAssignments = (student) => {
    if (!student || student.status !== "turned_in" || !student.submission) {
      setReturnActionFeedback("This student has no turned-in submission to return.");
      setIsReturnMenuOpen(false);
      return;
    }

    setReturnedByStudent((prev) => ({ ...prev, [student.id]: true }));
    setReturnActionFeedback(`Returned submission for ${student.name}.`);
    setIsReturnMenuOpen(false);
  };

  const handleBulkGrade = (student) => {
    if (!student || student.status !== "turned_in" || !student.submission) {
      setReturnActionFeedback("This student cannot be graded before submission.");
      setIsReturnMenuOpen(false);
      return;
    }

    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.studentId === student.id
          ? { ...sub, grade: 100 }
          : sub
      )
    );
    setDraftGrades((prev) => ({ ...prev, [student.id]: "100" }));
    setReturnActionFeedback(`Set grade to 100 for ${student.name}.`);
    setIsReturnMenuOpen(false);
  };

  const handleMarkComplete = (student) => {
    if (!student) return;
    applyStatusToStudents([student.id], "turned_in");
    setExcusedByStudent((prev) => ({ ...prev, [student.id]: false }));
    setReturnActionFeedback(`Marked ${student.name} as complete.`);
    setIsReturnMenuOpen(false);
  };

  const handleMarkMissing = (student) => {
    if (!student) return;
    applyStatusToStudents([student.id], "missed");
    setReturnActionFeedback(`Marked ${student.name} as missing.`);
    setIsReturnMenuOpen(false);
  };

  const handleExcuse = (student) => {
    if (!student || student.status !== "missed") {
      setReturnActionFeedback("Only missed students can be excused.");
      setIsReturnMenuOpen(false);
      return;
    }

    setExcusedByStudent((prev) => ({ ...prev, [student.id]: true }));
    setReturnActionFeedback(`Excused ${student.name}.`);
    setIsReturnMenuOpen(false);
  };

  const handleRemoveExcuse = (student) => {
    if (!student || !excusedByStudent[student.id]) {
      setReturnActionFeedback("This student is not marked as excused.");
      setIsReturnMenuOpen(false);
      return;
    }

    setExcusedByStudent((prev) => ({ ...prev, [student.id]: false }));
    setReturnActionFeedback(`Removed excuse from ${student.name}.`);
    setIsReturnMenuOpen(false);
  };

  return (
    <section className="assignment-review-page">
      <div className="assignment-review-inner">
        <button
          type="button"
          className="assignment-review-back"
          onClick={() => navigate(contentDetailsPath)}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="assignment-review-shell">
          <aside className="assignment-review-left-panel">
            <header className="assignment-review-left-header">
              <div className="assignment-review-left-title">
                <Users size={15} />
                <span>All students</span>
              </div>

              <div className="assignment-review-search-wrap">
                <Search size={14} className="assignment-review-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search students..."
                  aria-label="Search students"
                />
              </div>

              <div className="assignment-review-filter-tabs">
                {filterTabs.map((tab) => {
                  const count =
                    tab.key === "all"
                      ? students.length
                      : tab.key === "turned_in"
                        ? turnedInCount
                        : tab.key === "assigned"
                          ? assignedCount
                          : missedCount;

                  return (
                    <button
                      type="button"
                      key={tab.key}
                      className={`assignment-review-filter-btn ${filterType === tab.key ? "is-active" : ""}`}
                      onClick={() => setFilterType(tab.key)}
                    >
                      {tab.label} ({count})
                    </button>
                  );
                })}
              </div>
            </header>

            <div className="assignment-review-student-list">
              {filteredStudents.map((student) => {
                const gradeValue = readGrade(student);

                return (
                  <button
                    type="button"
                    key={student.id}
                    className={`assignment-review-student-item ${selectedStudentId === student.id ? "is-selected" : ""}`}
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <span className="assignment-review-student-avatar">{getInitials(student.name)}</span>

                    <span className="assignment-review-student-meta">
                      <strong>{student.name}</strong>
                      <small>{student.studentId}</small>
                    </span>

                    <span className="assignment-review-student-state">
                      {student.status === "turned_in" ? (
                        <span className="assignment-review-grade-wrap">
                          <span className="assignment-review-grade">
                            {gradeValue !== "" ? `${gradeValue}/100` : "___/100"}
                          </span>
                          {returnedByStudent[student.id] && (
                            <small className="assignment-review-returned-tag">Returned</small>
                          )}
                        </span>
                      ) : student.status === "missed" ? (
                        excusedByStudent[student.id] ? (
                          <span className="assignment-review-excused-pill">Excused</span>
                        ) : (
                          <XCircle size={16} className="assignment-review-status-missed" />
                        )
                      ) : (
                        <Clock3 size={16} className="assignment-review-status-pending" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="assignment-review-right-panel">
            {!selectedStudent ? (
              <div className="assignment-review-overview">
                <header className="assignment-review-title-block">
                  <h1>{assignment.title}</h1>
                  <p>
                    {course?.name} · {lecture?.title?.split(":")[0]}
                  </p>
                </header>

                <section className="assignment-review-stats-grid">
                  <article className="assignment-review-stat-card done">
                    <strong>{turnedInCount}</strong>
                    <span>Turned in</span>
                  </article>

                  <article className="assignment-review-stat-card pending">
                    <strong>{assignedCount}</strong>
                    <span>Assigned</span>
                  </article>
                </section>

                <section className="assignment-review-toggle-row">
                  <p>Accepting submissions</p>
                  <button
                    type="button"
                    className={`assignment-review-switch ${acceptingSubmissions ? "is-on" : ""}`}
                    onClick={() => setAcceptingSubmissions((prev) => !prev)}
                    aria-label="Toggle accepting submissions"
                    aria-pressed={acceptingSubmissions}
                  >
                    <span />
                  </button>
                </section>

                <section className="assignment-review-submissions-section">
                  <h2>Student Submissions</h2>

                  <div className="assignment-review-submissions-grid">
                    {submissions.map((submission) => {
                      const student = students.find((item) => item.id === submission.studentId);
                      return (
                        <button
                          type="button"
                          key={submission.id}
                          className="assignment-review-submission-card"
                          onClick={() => setSelectedStudentId(submission.studentId)}
                        >
                          <div className="assignment-review-submission-head">
                            <span className="assignment-review-student-avatar">{getInitials(student?.name)}</span>
                            <strong>{student?.name || "Student"}</strong>
                          </div>

                          <div className="assignment-review-submission-file">
                            {getFileIcon(submission.fileType)}
                            <span>{submission.fileName}</span>
                          </div>

                          <span className={`assignment-review-turned-pill ${returnedByStudent[submission.studentId] ? "returned" : ""}`}>
                            {returnedByStudent[submission.studentId] ? "Returned" : "Turned in"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="assignment-review-comments-card">
                  <div className="assignment-review-comments-head">
                    <h3>
                      <Globe size={16} />
                      Class comments
                    </h3>
                    <span>{publicMessages.length}</span>
                  </div>

                  <div className="assignment-review-comments-list">
                    {publicMessages.map((comment) => {
                      const canManageComment = comment.authorRole === "Instructor";
                      const isEditingComment = editingPublicCommentId === comment.id;

                      return (
                        <article key={comment.id} className="assignment-review-comment-item">
                          <div className="assignment-review-comment-main">
                            <span className="assignment-review-comment-avatar">
                              {getInitials(comment.authorName)}
                            </span>

                            <div className="assignment-review-comment-content">
                              <div className="assignment-review-comment-topline">
                                <strong>{comment.authorName}</strong>
                                {canManageComment && (
                                  <em>Instructor</em>
                                )}
                              </div>

                              {isEditingComment ? (
                                <div className="assignment-review-comment-edit">
                                  <input
                                    type="text"
                                    value={publicEditDraft}
                                    onChange={(event) => setPublicEditDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") handleSavePublicEdit();
                                      if (event.key === "Escape") handleCancelPublicEdit();
                                    }}
                                  />
                                  <div className="assignment-review-comment-edit-actions">
                                    <button type="button" onClick={handleSavePublicEdit}>
                                      Save
                                    </button>
                                    <button type="button" onClick={handleCancelPublicEdit}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p>{comment.text}</p>
                              )}
                            </div>
                          </div>

                          <div className="assignment-review-comment-meta">
                            <time>{formatCommentTime(comment.timestamp)}</time>
                            {canManageComment && !isEditingComment && (
                              <div className="assignment-review-comment-menu">
                                <button
                                  type="button"
                                  className="assignment-review-comment-menu-btn"
                                  onClick={() => togglePublicCommentMenu(comment.id)}
                                  aria-label={`More options for ${comment.authorName} comment`}
                                >
                                  <MoreVertical size={14} />
                                </button>

                                {activePublicMenuId === comment.id && (
                                  <div className="assignment-review-comment-menu-dropdown">
                                    <button
                                      type="button"
                                      onClick={() => handleEditPublicComment(comment)}
                                    >
                                      <Pencil size={13} />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => handleDeletePublicComment(comment.id)}
                                    >
                                      <Trash2 size={13} />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="assignment-review-comment-input-row">
                    <span className="assignment-review-comment-avatar">D</span>
                    <input
                      type="text"
                      value={publicDraft}
                      onChange={(event) => setPublicDraft(event.target.value)}
                      placeholder="Add a class comment..."
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleSendPublicComment();
                      }}
                    />
                    <button type="button" onClick={handleSendPublicComment} aria-label="Send class comment">
                      <SendHorizontal size={16} />
                    </button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="assignment-review-student-detail">
                <button
                  type="button"
                  className="assignment-review-inline-back"
                  onClick={() => setSelectedStudentId(null)}
                >
                  <ArrowLeft size={13} />
                  Back to overview
                </button>

                <header className="assignment-review-student-header">
                  <span className="assignment-review-student-header-avatar">
                    {getInitials(selectedStudent.name)}
                  </span>
                  <div>
                    <h2>{selectedStudent.name}</h2>
                    <p>{selectedStudent.studentId}</p>
                  </div>
                </header>

                <section className="assignment-review-return-row">
                  <div className="assignment-review-return-control">
                    <button
                      type="button"
                      className="assignment-review-return-main-btn"
                      onClick={() => handleReturnAssignments(selectedStudent)}
                      disabled={selectedStudent.status !== "turned_in" || !selectedStudent.submission}
                    >
                      Return
                    </button>
                    
                    {isReturnMenuOpen && (
                      <div className="assignment-review-return-menu">
                        <button
                          type="button"
                          onClick={() => handleBulkGrade(selectedStudent)}
                          disabled={selectedStudent.status !== "turned_in" || !selectedStudent.submission}
                        >
                          Bulk grade
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkComplete(selectedStudent)}
                        >
                          Mark as complete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkMissing(selectedStudent)}
                          disabled={selectedStudent.status === "turned_in"}
                        >
                          Mark as missing
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcuse(selectedStudent)}
                          disabled={selectedStudent.status !== "missed"}
                        >
                          Excuse
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExcuse(selectedStudent)}
                          disabled={!excusedByStudent[selectedStudent.id]}
                        >
                          Do not excuse
                        </button>
                      </div>
                    )}
                  </div>
                    {returnActionFeedback && (
                    <p className="assignment-review-return-feedback">{returnActionFeedback}</p>
                  )}
                </section>

                {selectedStudent.status === "turned_in" && selectedStudent.submission ? (
                  <>
                    <article className="assignment-review-file-preview-card">
                      <div className="assignment-review-submission-file-row">
                        {getFileIcon(selectedStudent.submission.fileType)}
                        <div>
                          <strong>{selectedStudent.submission.fileName}</strong>
                          <p>
                            {formatFileSize(selectedStudent.submission.fileSize)} · Submitted {formatCommentTime(selectedStudent.submission.submittedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="assignment-review-file-preview-placeholder">
                        <FileText size={40} />
                        <p>File preview</p>
                      </div>
                    </article>

                    <article className="assignment-review-grade-card">
                      <h3>Grade</h3>

                      <div className="assignment-review-grade-row">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={readGrade(selectedStudent)}
                          onChange={(event) =>
                            setDraftGrades((prev) => ({
                              ...prev,
                              [selectedStudent.id]: event.target.value,
                            }))
                          }
                          placeholder="___"
                        />
                        <span>/ 100</span>

                        <button
                          type="button"
                          className="assignment-review-save-btn"
                          onClick={() => handleSaveGrade(selectedStudent.id)}
                        >
                          Save Grade
                        </button>
                      </div>
                    </article>
                  </>
                ) : selectedStudent.status === "missed" ? (
                  <article className="assignment-review-status-panel missed">
                    <XCircle size={40} />
                    <strong>Deadline missed</strong>
                    <p>This student did not submit.</p>
                  </article>
                ) : (
                  <article className="assignment-review-status-panel pending">
                    <Clock3 size={40} />
                    <strong>Not yet submitted</strong>
                    <p>Waiting for submission.</p>
                  </article>
                )}

                <section className="assignment-review-comments-card private">
                  <div className="assignment-review-comments-head">
                    <h3>Private comments</h3>
                    <span>{getPrivateMessages(selectedStudent.id).length}</span>
                  </div>

                  <div className="assignment-review-comments-list">
                    {getPrivateMessages(selectedStudent.id).map((comment) => {
                      const canManageComment = comment.authorRole === "Instructor";
                      const isEditingComment = editingPrivateCommentId === comment.id;

                      return (
                        <article key={comment.id} className="assignment-review-comment-item">
                          <div className="assignment-review-comment-main">
                            <span className="assignment-review-comment-avatar">
                              {getInitials(comment.authorName)}
                            </span>

                            <div className="assignment-review-comment-content">
                              <div className="assignment-review-comment-topline">
                                <strong>{comment.authorName}</strong>
                                {canManageComment && <em>Instructor</em>}
                              </div>

                              {isEditingComment ? (
                                <div className="assignment-review-comment-edit">
                                  <input
                                    type="text"
                                    value={privateEditDraft}
                                    onChange={(event) => setPrivateEditDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") handleSavePrivateEdit(selectedStudent.id);
                                      if (event.key === "Escape") handleCancelPrivateEdit();
                                    }}
                                  />
                                  <div className="assignment-review-comment-edit-actions">
                                    <button type="button" onClick={() => handleSavePrivateEdit(selectedStudent.id)}>
                                      Save
                                    </button>
                                    <button type="button" onClick={handleCancelPrivateEdit}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p>{comment.text}</p>
                              )}
                            </div>
                          </div>

                          <div className="assignment-review-comment-meta">
                            <time>{formatCommentTime(comment.timestamp)}</time>
                            {canManageComment && !isEditingComment && (
                              <div className="assignment-review-comment-menu">
                                <button
                                  type="button"
                                  className="assignment-review-comment-menu-btn"
                                  onClick={() => togglePrivateCommentMenu(comment.id)}
                                  aria-label={`More options for ${comment.authorName} comment`}
                                >
                                  <MoreVertical size={14} />
                                </button>

                                {activePrivateMenuId === comment.id && (
                                  <div className="assignment-review-comment-menu-dropdown">
                                    <button
                                      type="button"
                                      onClick={() => handleEditPrivateComment(comment)}
                                    >
                                      <Pencil size={13} />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => handleDeletePrivateComment(selectedStudent.id, comment.id)}
                                    >
                                      <Trash2 size={13} />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="assignment-review-comment-input-row">
                    <span className="assignment-review-comment-avatar">D</span>
                    <input
                      type="text"
                      value={privateDraft}
                      onChange={(event) => setPrivateDraft(event.target.value)}
                      placeholder="Reply to this student..."
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          handleSendPrivateComment(selectedStudent.id);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSendPrivateComment(selectedStudent.id)}
                      aria-label="Send private comment"
                    >
                      <SendHorizontal size={16} />
                    </button>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

export default AssignmentReview;
