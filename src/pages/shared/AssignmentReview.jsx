import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
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

const roleMap = {
  lecturer: "Lecturer",
  ta: "TA",
  student: "Student",
};

const currentUserRole = (localStorage.getItem("role") || "student").toLowerCase();
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return String(
      user.id ||
      user.user_id ||
      user.lecturer_id ||
      user.instructor_id ||
      user.student_id ||
      user.username ||
      ""
    );
  } catch {
    return "";
  }
};

const normalizeRole = (value) => {
  const role = String(value || "").toLowerCase();
  if (role === "lecturer" || role === "ta" || role === "student") return role;
  return "";
};

const normalizeReviewComment = (
  rawComment,
  { isPrivate = false, currentUserId = "", fallbackRole = "student", studentIds = new Set() } = {}
) => {
  const apiAuthorId =
  rawComment?.user_id ??
  rawComment?.user?.id ??
  rawComment?.author_id ??
  rawComment?.lecturer_id ??
  rawComment?.instructor_id ??
  null;

  const authorRoleFromApi = normalizeRole(
    rawComment?.user?.role || rawComment?.role
  );
const authorId =
  apiAuthorId !== null && apiAuthorId !== undefined
    ? String(apiAuthorId)
    : authorRoleFromApi === fallbackRole
    ? String(currentUserId)
    : null;

  const studentIdCandidates = [
    rawComment?.student_id,
    rawComment?.studentId,
    rawComment?.student?.id,
    rawComment?.student?.student_id,
    rawComment?.assignment_submission?.student_id,
    rawComment?.submission?.student_id,
  ];

  let studentId = null;
  for (const candidate of studentIdCandidates) {
    if (candidate !== null && candidate !== undefined && String(candidate) !== "") {
      studentId = String(candidate);
      break;
    }
  }

  if (isPrivate && !studentId && authorId !== null && authorId !== undefined && String(authorId) !== "") {
    if (authorRoleFromApi === "student") {
      studentId = String(authorId);
    } else if (studentIds.has(String(authorId))) {
      studentId = String(authorId);
    }
  }

  const authorRole =
    authorRoleFromApi ||
    (String(authorId || "") === String(currentUserId || "") ? fallbackRole : "student");

  return {
    id: rawComment?.id ?? `${isPrivate ? "prv" : "pub"}-${Date.now()}`,
    authorId: authorId !== null && authorId !== undefined ? String(authorId) : null,
    authorName: rawComment?.user?.name || rawComment?.name || "User",
    authorRole,
    text: rawComment?.message || rawComment?.text || "",
    timestamp: rawComment?.created_at || rawComment?.updated_at || new Date().toISOString(),
    ...(isPrivate ? { studentId } : {}),
  };
};

const getPrivateThreadMapStorageKey = (assignmentId) =>
  `assignment-review:private-thread-map:${String(assignmentId || "")}`;

const readPrivateThreadMap = (assignmentId) => {
  if (!assignmentId) return {};
  try {
    const raw = localStorage.getItem(getPrivateThreadMapStorageKey(assignmentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const getAssignmentSettingsStorageKey = (assignmentId) =>
  `seculearn-assignment-settings:${String(assignmentId || "unknown")}`;

const normalizeAssignmentSettings = (settings = {}) => ({
  closeSubmissionsAfterDueDate: Boolean(
    settings?.closeSubmissionsAfterDueDate ??
      settings?.close_submissions_after_due_date ??
      settings?.close_on_deadline
  ),
  acceptingSubmissions:
    typeof settings?.acceptingSubmissions === "boolean"
      ? settings.acceptingSubmissions
      : typeof settings?.accepting_submissions === "boolean"
        ? settings.accepting_submissions
        : typeof settings?.is_accepting === "boolean"
          ? settings.is_accepting
        : true,
  dueDate:
    typeof settings?.dueDate === "string"
      ? settings.dueDate
      : typeof settings?.due_date === "string"
        ? String(settings.due_date).trim().replace(" ", "T").slice(0, 16)
        : "",
});

const readStoredAssignmentSettings = (assignmentId) => {
  if (!assignmentId) return normalizeAssignmentSettings();

  try {
    const raw = localStorage.getItem(getAssignmentSettingsStorageKey(assignmentId));
    if (!raw) return normalizeAssignmentSettings();
    return normalizeAssignmentSettings(JSON.parse(raw));
  } catch {
    return normalizeAssignmentSettings();
  }
};

const writeStoredAssignmentSettings = (assignmentId, partialSettings = {}) => {
  if (!assignmentId) return normalizeAssignmentSettings(partialSettings);

  const nextSettings = normalizeAssignmentSettings({
    ...readStoredAssignmentSettings(assignmentId),
    ...partialSettings,
  });

  localStorage.setItem(
    getAssignmentSettingsStorageKey(assignmentId),
    JSON.stringify(nextSettings)
  );

  return nextSettings;
};

const parseAssignmentDate = (value) => {
  if (!value) return null;
  const parsed = new Date(String(value).trim().replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatAssignmentDueDate = (value) => {
  const parsed = parseAssignmentDate(value);
  if (!parsed) return "";

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// API helpers
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://cary-nontumorous-unimpedingly.ngrok-free.dev";

const buildApiHeaders = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  "ngrok-skip-browser-warning": "true",
});

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
  const {
    courseId,
    lectureId,
    sectionId,
    courseTitle,
    lectureTitle,
    assignmentTitle,
    dueDate: assignmentDueDateFromState = "",
    closeSubmissionsAfterDueDate: closeAfterDueFromState,
    acceptingSubmissions: acceptingSubmissionsFromState,
    maxScore = 100
  } = location.state || {};
  const contentDetailsPath = useMemo(() => {
    if (location.pathname.startsWith("/ta/")) {
      return sectionId
        ? `/ta/courses/${courseId}/section/${sectionId}`
        : `/ta/courses/${courseId}/lecture/${lectureId}`;
    }

    return sectionId
      ? `/lecturer/courses/${courseId}/section/${sectionId}`
      : `/lecturer/courses/${courseId}/lecture/${lectureId}`;
  }, [location.pathname, courseId, lectureId, sectionId]);
  const initialStoredAssignmentSettings = useMemo(
    () => readStoredAssignmentSettings(assignmentId),
    [assignmentId]
  );

  const [submissions, setSubmissions] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptingSubmissions, setAcceptingSubmissions] = useState(
    typeof acceptingSubmissionsFromState === "boolean"
      ? acceptingSubmissionsFromState
      : initialStoredAssignmentSettings.acceptingSubmissions
  );
  const [assignmentDueDate, setAssignmentDueDate] = useState(
    assignmentDueDateFromState || initialStoredAssignmentSettings.dueDate || ""
  );
  const [closeSubmissionsAfterDueDate, setCloseSubmissionsAfterDueDate] =
    useState(
      typeof closeAfterDueFromState === "boolean"
        ? closeAfterDueFromState
        : initialStoredAssignmentSettings.closeSubmissionsAfterDueDate
    );
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
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const privateThreadMapRef = useRef({});
  const isDueDatePassed = useMemo(() => {
    const parsedDueDate = parseAssignmentDate(assignmentDueDate);
    return parsedDueDate ? parsedDueDate.getTime() < Date.now() : false;
  }, [assignmentDueDate]);
  const isSubmissionWindowForcedClosed =
    closeSubmissionsAfterDueDate && isDueDatePassed;
  const isAcceptingSubmissions = isSubmissionWindowForcedClosed
    ? false
    : acceptingSubmissions;
  const assignmentDueDateLabel = useMemo(
    () => formatAssignmentDueDate(assignmentDueDate),
    [assignmentDueDate]
  );

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const storedSettings = readStoredAssignmentSettings(assignmentId);
    setAssignmentDueDate(assignmentDueDateFromState || storedSettings.dueDate || "");
    setCloseSubmissionsAfterDueDate(
      typeof closeAfterDueFromState === "boolean"
        ? closeAfterDueFromState
        : storedSettings.closeSubmissionsAfterDueDate
    );
    setAcceptingSubmissions(
      typeof acceptingSubmissionsFromState === "boolean"
        ? acceptingSubmissionsFromState
        : storedSettings.acceptingSubmissions
    );
  }, [
    acceptingSubmissionsFromState,
    assignmentDueDateFromState,
    assignmentId,
    closeAfterDueFromState,
  ]);

  useEffect(() => {
    if (!assignmentId) return;

    writeStoredAssignmentSettings(assignmentId, {
      dueDate: assignmentDueDate,
      closeSubmissionsAfterDueDate,
      acceptingSubmissions: isAcceptingSubmissions,
    });
  }, [
    acceptingSubmissions,
    assignmentDueDate,
    assignmentId,
    closeSubmissionsAfterDueDate,
    isAcceptingSubmissions,
  ]);

  useEffect(() => {
    privateThreadMapRef.current = readPrivateThreadMap(assignmentId);
  }, [assignmentId]);

  const persistPrivateThreadMap = useCallback(() => {
    if (!assignmentId) return;
    localStorage.setItem(
      getPrivateThreadMapStorageKey(assignmentId),
      JSON.stringify(privateThreadMapRef.current || {})
    );
  }, [assignmentId]);

  const bindCommentToStudent = useCallback(
    (commentId, studentId) => {
      if (!assignmentId || !commentId || !studentId) return;
      const key = String(commentId);
      const value = String(studentId);
      if (privateThreadMapRef.current[key] === value) return;
      privateThreadMapRef.current = {
        ...privateThreadMapRef.current,
        [key]: value,
      };
      persistPrivateThreadMap();
    },
    [assignmentId, persistPrivateThreadMap]
  );

  // -------- API-driven state --------
  const [assignmentStats, setAssignmentStats] = useState({
    turned_in: 0,
    assigned: 0,
    missed: 0,
  });
  const [studentsList, setStudentsList] = useState([]);

  // -------- API helper functions --------
  const fetchAssignmentSubmissions = async () => {
    if (!assignmentId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/dr-ta/assignment/${assignmentId}/get-assignment-submissions`,
        { headers: buildApiHeaders(token) }
      );
      const data = res.data || {};
      const storedSettings = readStoredAssignmentSettings(assignmentId);
      const nextDueDate =
        (typeof data?.due_date === "string"
          ? String(data.due_date).trim().replace(" ", "T").slice(0, 16)
          : "") ||
        assignmentDueDateFromState ||
        storedSettings.dueDate ||
        "";
      const nextCloseAfterDue =
        typeof data?.close_on_deadline === "boolean"
          ? data.close_on_deadline
          : typeof data?.close_submissions_after_due_date === "boolean"
            ? data.close_submissions_after_due_date
          : typeof closeAfterDueFromState === "boolean"
            ? closeAfterDueFromState
            : storedSettings.closeSubmissionsAfterDueDate;
      const nextAcceptingSubmissions =
        typeof data?.is_accepting === "boolean"
          ? data.is_accepting
          : typeof data.accepting_submissions === "boolean"
            ? data.accepting_submissions
          : typeof acceptingSubmissionsFromState === "boolean"
            ? acceptingSubmissionsFromState
            : storedSettings.acceptingSubmissions;

      if (data.stats) setAssignmentStats(data.stats);
      setAssignmentDueDate(nextDueDate);
      setCloseSubmissionsAfterDueDate(nextCloseAfterDue);
      setAcceptingSubmissions(nextAcceptingSubmissions);
      writeStoredAssignmentSettings(assignmentId, {
        dueDate: nextDueDate,
        closeSubmissionsAfterDueDate: nextCloseAfterDue,
        acceptingSubmissions: nextAcceptingSubmissions,
      });
      if (data.students) {
        const formattedStudents = data.students.map((s) => ({
          id: s.student_id,
          name: s.student_name,
          studentId: s.custom_id,
          status: s.status,
          grade: s.grade,
          submitted_at: s.submitted_at,
          submission_id: s.submission_id,

          submission: s.submission_id
            ? {
                submission_id: s.submission_id,
                submittedAt: s.submitted_at,
                grade: s.grade,
                fileName: s.file_name || "",
                file_url: s.file_url || "",
                fileSize: s.file_size || 0
              }
            : null
        }));

        setStudentsList(formattedStudents);
        return formattedStudents;
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch assignment submissions", err);
      return [];
    }
  };

  const saveGradeApi = async (submissionId, grade) => {
    if (!submissionId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/dr-ta/submission/${submissionId}/save-grade`,
        { grade },
        { headers: buildApiHeaders(token) }
      );
    } catch (err) {
      console.error("Failed to save grade", err);
    }
  };

  const toggleAcceptingApi = async () => {
    if (!assignmentId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/api/dr-ta/assignment/${assignmentId}/toggle-accepting`,
        {},
        { headers: buildApiHeaders(token) }
      );
      return res?.data || null;
    } catch (err) {
      console.error("Failed to toggle accepting submissions", err);
      return null;
    }
  };

  const getStudentSubmissionDetailsApi = async (studentId) => {
    if (!assignmentId || !studentId) return null;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/dr-ta/assignment/${assignmentId}/student/${studentId}`,
        { headers: buildApiHeaders(token) }
      );
      return res.data || null;
    } catch (err) {
      console.error("Failed to fetch student submission details", err);
      return null;
    }
  };

  const returnSubmissionApi = async (submissionId) => {
    if (!submissionId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE_URL}/api/dr-ta/submission/${submissionId}/return`,
        { headers: buildApiHeaders(token) }
      );
    } catch (err) {
      console.error("Failed to return submission", err);
    }
  };

  const addAssignmentCommentApi = async (text, isPrivate = 0, studentId = null) => {

    if (!assignmentId || !text) return null;

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("assignment_id", String(assignmentId));
      formData.append("message", text);
      formData.append("is_private", String(isPrivate));

      if (studentId) {
        formData.append("student_id", String(studentId));
      }

      const res = await axios.post(
        `${API_BASE_URL}/api/add-comment`,
        formData,
        { headers: buildApiHeaders(token) }
      );

      return res.data?.data || res.data;

    } catch (err) {
      console.error("Failed to add assignment comment", err);
      return null;
    }
  };

  const getClassCommentsApi = async () => {
    if (!assignmentId) return [];
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/get-class-comments/${assignmentId}`,
        { headers: buildApiHeaders(token) }
      );
      // Handle both array and object with data property
      const comments = res.data?.data || res.data || [];
      return Array.isArray(comments) ? comments : [];
    } catch (err) {
      console.error("Failed to fetch class comments", err);
      return [];
    }
  };

  const getPrivateCommentsApi = async () => {
    if (!assignmentId) return [];
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/get-private-comments/${assignmentId}`,
        { headers: buildApiHeaders(token) }
      );
      // Handle both array and object with data property
      const comments = res.data?.data || res.data || [];
      return Array.isArray(comments) ? comments : [];
    } catch (err) {
      console.error("Failed to fetch private comments", err);
      return [];
    }
  };

  const deleteCommentApi = async (commentId) => {
    if (!commentId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE_URL}/api/delete-comment/${commentId}`,
        { headers: buildApiHeaders(token) }
      );
      return true;
    } catch (err) {
      console.error("Failed to delete comment", err);
      return false;
    }
  };

  const updateCommentApi = async (commentId, text, isPrivate) => {
    if (!commentId || !text) return;
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("message", text);
      formData.append("is_private", String(isPrivate));
      await axios.post(
        `${API_BASE_URL}/api/update-comment/${commentId}`,
        formData,
        { headers: buildApiHeaders(token) }
      );
      return true;
    } catch (err) {
      console.error("Failed to update comment", err);
      return false;
    }
  };

  useEffect(() => {
    if (!assignmentId) return;

    // reset local state
    setSubmissions([]);
    setSelectedStudentId(null);
    setFilterType("all");
    setSearchQuery("");
    setStatusOverrides({});
    setExcusedByStudent({});
    setReturnedByStudent({});
    setIsReturnMenuOpen(false);
    setReturnActionFeedback("");
    setDraftGrades({});
    setPublicMessages([]);
    setPublicDraft("");
    setActivePublicMenuId(null);
    setEditingPublicCommentId(null);
    setPublicEditDraft("");
    setPrivateMessagesByStudent({});
    setPrivateDraft("");
    setActivePrivateMenuId(null);
    setEditingPrivateCommentId(null);
    setPrivateEditDraft("");

    const hydrateComments = async () => {
      const students = await fetchAssignmentSubmissions();
      const studentIds = new Set((students || []).map((student) => String(student.id)));

      const [classComments, privateComments] = await Promise.all([
        getClassCommentsApi(),
        getPrivateCommentsApi(),
      ]);

      setPublicMessages(
        (classComments || []).map((comment) =>
          normalizeReviewComment(comment, {
            isPrivate: false,
            currentUserId,
            fallbackRole: currentUserRole,
            studentIds,
          })
        )
      );

      const grouped = {};
      let mapUpdated = false;
      const threadMapSnapshot = { ...(privateThreadMapRef.current || {}) };
      (privateComments || []).forEach((comment) => {
        const normalized = normalizeReviewComment(comment, {
          isPrivate: true,
          currentUserId,
          fallbackRole: currentUserRole,
          studentIds,
        });

        const commentKey = String(normalized.id || "");
        let resolvedStudentId = normalized.studentId || threadMapSnapshot[commentKey] || null;
        if (
          !resolvedStudentId &&
          normalized.authorRole === "student" &&
          normalized.authorId &&
          studentIds.has(String(normalized.authorId))
        ) {
          resolvedStudentId = String(normalized.authorId);
        }

        if (!resolvedStudentId) return;

        if (commentKey && threadMapSnapshot[commentKey] !== String(resolvedStudentId)) {
          threadMapSnapshot[commentKey] = String(resolvedStudentId);
          mapUpdated = true;
        }

        const hydratedComment = {
          ...normalized,
          studentId: String(resolvedStudentId),
        };
        if (!grouped[hydratedComment.studentId]) grouped[hydratedComment.studentId] = [];
        grouped[hydratedComment.studentId].push(hydratedComment);
      });

      if (mapUpdated) {
        privateThreadMapRef.current = threadMapSnapshot;
        persistPrivateThreadMap();
      }

      setPrivateMessagesByStudent(grouped);
    };

    hydrateComments();
  }, [assignmentId, currentUserId]);

  const getComputedStatus = (studentId) => {
    if (statusOverrides[studentId]) return statusOverrides[studentId];

    const apiStudent = studentsList.find((s) => s.id === studentId);
    if (apiStudent) return apiStudent.status;

    return "assigned";
  };

  const studentList = studentsList.map((student) => ({
    ...student,
    status: getComputedStatus(student.id),
  }));
  const turnedInCount = assignmentStats.turned_in || studentList.filter((student) => student.status === "turned_in").length;
  const missedCount = assignmentStats.missed || studentList.filter((student) => student.status === "missed").length;
  const assignedCount = assignmentStats.assigned || studentList.filter((student) => student.status === "assigned").length;

  const filteredStudents = studentList.filter((student) => {
    const statusMatches = filterType === "all" || student.status === filterType;
    const searchMatches = (student.name || "")
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
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

  const handleSaveGrade = async (studentId) => {
    const value = draftGrades[studentId];
    if (value === undefined || value === "") return;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    const clamped = Math.max(0, Math.min(maxScore, Math.round(numeric)));

    setStudentsList((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              submission: {
                ...s.submission,
                grade: clamped,
              },
            }
          : s
      )
    );
    setDraftGrades((prev) => ({ ...prev, [studentId]: String(clamped) }));

    // call backend
    const student = studentList.find((s) => s.id === studentId);
    const submissionId =
      student?.submission?.submission_id || student?.submission?.id;
    if (submissionId) {
      await saveGradeApi(submissionId, clamped);
    }
  };

  const handleSendPublicComment = async () => {
    const text = publicDraft.trim();
    if (!text) return;

    const response = await addAssignmentCommentApi(text, 0);
    if (!response) return;
    const nextComment = {
      id: response?.id || `pub-${Date.now()}`,
      authorId:
        response?.user_id || response?.user?.id || response?.authorId || currentUserId || "inst-1",
      authorName: response?.user?.name || response?.authorName || user?.name || "User",
      authorRole:
        normalizeRole(response?.user?.role || response?.authorRole) || currentUserRole,
      text,
      timestamp: response?.created_at || response?.timestamp || new Date().toISOString(),
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
    const isInstructor = currentUserRole === "lecturer" || currentUserRole === "ta";
    if (!comment || !isInstructor) return;
    setEditingPublicCommentId(comment.id);
    setPublicEditDraft(comment.text || "");
    setActivePublicMenuId(null);
  };

  const handleCancelPublicEdit = () => {
    setEditingPublicCommentId(null);
    setPublicEditDraft("");
  };

  const handleDeletePublicComment = async (commentId) => {
    const deleted = await deleteCommentApi(commentId);
    if (!deleted) return;
    setPublicMessages((prev) => prev.filter((comment) => comment.id !== commentId));
    setActivePublicMenuId(null);
    if (editingPublicCommentId === commentId) {
      setEditingPublicCommentId(null);
      setPublicEditDraft("");
    }
  };



  const handleSendPrivateComment = async (studentId) => {
    const text = privateDraft.trim();
    if (!text || !studentId) return;

    const response = await addAssignmentCommentApi(text, 1, studentId);
    if (!response) return;
    if (response?.id) {
      bindCommentToStudent(response.id, studentId);
    }

    const nextComment = {
      id: response?.id || `prv-${Date.now()}`,
      authorId:
        response?.user_id || response?.user?.id || response?.authorId || currentUserId || "inst-1",
      authorName: response?.user?.name || response?.authorName || user?.name || "User",
      authorRole:
        normalizeRole(response?.user?.role || response?.authorRole) || currentUserRole,
      text,
      timestamp: response?.timestamp || response?.created_at || new Date().toISOString(),
      studentId: String(studentId),
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
    const isInstructor = currentUserRole === "lecturer" || currentUserRole === "ta";
    if (!comment || !isInstructor) return;
    setEditingPrivateCommentId(comment.id);
    setPrivateEditDraft(comment.text || "");
    setActivePrivateMenuId(null);
  };

  const handleCancelPrivateEdit = () => {
    setEditingPrivateCommentId(null);
    setPrivateEditDraft("");
  };

  const handleDeletePrivateComment = async (studentId, commentId) => {
    if (!studentId || !commentId) return;
    const deleted = await deleteCommentApi(commentId);
    if (!deleted) return;
    if (privateThreadMapRef.current[String(commentId)]) {
      const nextMap = { ...privateThreadMapRef.current };
      delete nextMap[String(commentId)];
      privateThreadMapRef.current = nextMap;
      persistPrivateThreadMap();
    }
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

  const handleReturnAssignments = async (student) => {
    if (!student || student.status !== "turned_in" || !student.submission) {
      setReturnActionFeedback("This student has no turned-in submission to return.");
      setIsReturnMenuOpen(false);
      return;
    }

    const submissionId = student.submission.submission_id;
    if (submissionId) {
      await returnSubmissionApi(submissionId);
      await fetchAssignmentSubmissions();
      setStudentsList((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? {
                ...s,
                status: "assigned",
                submission: null,
              }
            : s
        )
      );
    }

    setReturnedByStudent((prev) => ({ ...prev, [student.id]: true }));
    setReturnActionFeedback(`Returned submission for ${student.name}.`);
    setIsReturnMenuOpen(false);
  };

  const handleBulkGrade = async (student) => {
    if (!student || student.status !== "turned_in" || !student.submission) {
      setReturnActionFeedback("This student cannot be graded before submission.");
      setIsReturnMenuOpen(false);
      return;
    }

    const submissionId = student.submission.submission_id || student.submission.id;
    if (submissionId) {
      await saveGradeApi(submissionId, 100);
      setDraftGrades((prev) => ({ ...prev, [student.id]: "100" }));
      setStudentsList((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? {
                ...s,
                grade: 100,
                submission: {
                  ...s.submission,
                  grade: 100,
                },
              }
            : s
        )
      );
    }
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

  const handleSavePublicEdit = async () => {
    if (!editingPublicCommentId || !publicEditDraft.trim()) return;

    const updated = await updateCommentApi(editingPublicCommentId, publicEditDraft.trim(), 0);
    if (!updated) return;

    setPublicMessages((prev) =>
      prev.map((c) =>
        c.id === editingPublicCommentId 
          ? { 
              ...c, 
              text: publicEditDraft.trim(),
              timestamp: new Date().toISOString()
            } 
          : c
      )
    );

    setEditingPublicCommentId(null);
    setPublicEditDraft("");
  };

  const handleSavePrivateEdit = async (studentId) => {
    if (!editingPrivateCommentId || !privateEditDraft.trim() || !studentId) return;

    const updated = await updateCommentApi(editingPrivateCommentId, privateEditDraft.trim(), 1);
    if (!updated) return;

    setPrivateMessagesByStudent((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || []).map((c) =>
        c.id === editingPrivateCommentId 
          ? { 
              ...c, 
              text: privateEditDraft.trim(),
              timestamp: new Date().toISOString()
            } 
          : c
      ),
    }));

    setEditingPrivateCommentId(null);
    setPrivateEditDraft("");
  };

  return (
    <section className="assignment-review-page">
      <div className="assignment-review-inner">
        <button
          type="button"
          className="assignment-review-back"
          onClick={() =>
            navigate(contentDetailsPath, {
              state: {
                courseTitle,
                lectureTitle,
                sectionId,
                lectureId,
                courseId
              }
            })
          }
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
                      ? studentList.length
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
                    onClick={async () => {
                      if (selectedStudentId === student.id) return;

                      setSelectedStudentId(student.id);

                      const details = await getStudentSubmissionDetailsApi(student.id);

                      if (details?.submission) {
                        setStudentsList((prev) =>
                          prev.map((s) =>
                            s.id === student.id
                              ? {
                                  ...s,
                                  status: "turned_in",
                                  submission: {
                                    submission_id: details.submission.id,
                                    submittedAt: details.submission.submitted_at,
                                    grade: details.submission.grade,
                                    fileName: details.submission.file_name,
                                    file_url: details.submission.file_url,
                                    fileSize: details.submission.file_size || 0,
                                  },
                                }
                              : s
                          )
                        );
                        setSubmissions((prev) => [
                          ...prev.filter((s) => s.studentId !== student.id),
                          {
                            id: details.submission.id,
                            submission_id: details.submission.id,
                            studentId: student.id,
                            fileName: details.submission.file_name,
                            fileType: details.submission.file_type || "application/pdf",
                            fileSize: details.submission.file_size || 0,
                            submittedAt: details.submission.submitted_at,
                            grade: details.submission.grade,
                            file_url: details.submission.file_url,
                          },
                        ]);
                      }
                    }}
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
                            {gradeValue !== "" ? `${gradeValue}/${maxScore}` : `___/${maxScore}`}
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
                  <h1>{assignmentTitle}</h1>
                  <p>
                    {courseTitle} - {lectureTitle}
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
                  <div className="assignment-review-toggle-copy">
                    <p>Accepting submissions</p>
                    {closeSubmissionsAfterDueDate && (
                      <small className="assignment-review-toggle-note">
                        {isDueDatePassed
                          ? `Closed automatically after ${
                              assignmentDueDateLabel || "the due date"
                            }.`
                          : `Will close automatically on ${
                              assignmentDueDateLabel || "the due date"
                            }.`}
                      </small>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`assignment-review-switch ${isAcceptingSubmissions ? "is-on" : ""}`}
                    onClick={async () => {
                      const nextValue = !isAcceptingSubmissions;
                      setAcceptingSubmissions(nextValue);
                      const toggleResponse = await toggleAcceptingApi();
                      const nextCloseAfterDue =
                        typeof toggleResponse?.close_on_deadline === "boolean"
                          ? toggleResponse.close_on_deadline
                          : typeof toggleResponse?.close_submissions_after_due_date === "boolean"
                            ? toggleResponse.close_submissions_after_due_date
                            : closeSubmissionsAfterDueDate;
                      const nextAccepting =
                        typeof toggleResponse?.is_accepting === "boolean"
                          ? toggleResponse.is_accepting
                          : typeof toggleResponse?.accepting_submissions === "boolean"
                            ? toggleResponse.accepting_submissions
                            : nextValue;

                      setCloseSubmissionsAfterDueDate(nextCloseAfterDue);
                      setAcceptingSubmissions(nextAccepting);
                      writeStoredAssignmentSettings(assignmentId, {
                        dueDate: assignmentDueDate,
                        closeSubmissionsAfterDueDate: nextCloseAfterDue,
                        acceptingSubmissions: nextAccepting,
                      });
                      await fetchAssignmentSubmissions();
                    }}
                    disabled={isSubmissionWindowForcedClosed}
                    aria-label="Toggle accepting submissions"
                    aria-pressed={isAcceptingSubmissions}
                  >
                    <span />
                  </button>
                </section>

                <section className="assignment-review-submissions-section">
                  <h2>Student Submissions</h2>

                  <div className="assignment-review-submissions-grid">
                    {studentList.filter(s => s.status === "turned_in" && s.submission).map((student) => (
                        <button
                          type="button"
                          key={student.id}
                          className="assignment-review-submission-card"
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <div className="assignment-review-submission-head">
                            <span className="assignment-review-student-avatar">{getInitials(student?.name)}</span>
                            <strong>{student?.name || "Student"}</strong>
                          </div>

                          <div className="assignment-review-submission-file">
                            {getFileIcon(student.submission.fileType)}
                            <span>{student.submission.fileName}</span>
                          </div>

                          <span className={`assignment-review-turned-pill ${returnedByStudent[student.id] ? "returned" : ""}`}>
                            {returnedByStudent[student.id] ? "Returned" : "Turned in"}
                          </span>
                        </button>
                      ))}
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
                      const canManageComment =
                      ["lecturer", "ta"].includes(currentUserRole) &&
                      (
                        String(comment.authorId || "") === String(currentUserId || "") ||
                        String(comment.authorName || "").trim().toLowerCase() ===
                        String(user?.name || "").trim().toLowerCase()
                      );
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
                                <em>{roleMap[comment.authorRole] || "Student"}</em>
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
                        {getFileIcon(selectedStudent.submission.fileType || selectedStudent.submission.fileName)}
                        <div>
                          <strong>{selectedStudent.submission.fileName}</strong>
                          <p>
                            {formatFileSize(selectedStudent.submission.fileSize)} - Submitted {formatCommentTime(selectedStudent.submission.submittedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="assignment-review-file-preview-placeholder">
                        <FileText size={40} />
                        {selectedStudent.submission?.file_url ? (
                          <a
                            href={selectedStudent.submission.file_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View File
                          </a>
                        ) : (
                          <span>No file available</span>
                        )}
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
                        <span>/ {maxScore}</span>

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
                      const canManageComment =
                      (currentUserRole === "lecturer" || currentUserRole === "ta") &&
                      (
                        String(comment.authorId || "") === String(currentUserId || "") ||
                        String(comment.authorName || "").trim().toLowerCase() ===
                        String(user?.name || "").trim().toLowerCase()
                      );
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
                                {comment.authorRole === "lecturer" && <em>Lecturer</em>}
                                {comment.authorRole === "ta" && <em>TA</em>}
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

