import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getQuizzesList } from "../../app/quizApi";
import {
  FiAlignLeft,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiHash,
  FiHelpCircle,
  FiLayers,
  FiMinusCircle,
  FiPaperclip,
  FiPlus,
  FiTrash2,
  FiToggleLeft,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { FaRegEdit } from "react-icons/fa";
import "../../styles/LectureDetails.css";

const lectureSeed = {
  id: "",
  title: "",
  course: "Course",
  assignments: [],
  quizzes: [],
};

const roleCopy = {
  lecturer: "lecturer",
  ta: "TA",
  student: "student",
};

const getDefaultAssignmentForm = () => ({
  title: "",
  description: "",
  dueDate: "",
  maxScore: 100,
  files: [],
  closeSubmissionsAfterDueDate: false,
});

const getDefaultQuizForm = () => ({
  title: "",
  timeLimit: 30,
  questionCount: 10,
  shuffleQuestions: false,
});

const toBooleanOrNull = (value) => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return null;
};

const readBooleanValue = (source, ...keys) => {
  for (const key of keys) {
    const parsed = toBooleanOrNull(source?.[key]);
    if (parsed !== null) return parsed;
  }
  return null;
};

const getCurrentStudentId = () => {
  const stored = localStorage.getItem("user");

  if (!stored) return "";

  try {
    const user = JSON.parse(stored);
    const id = user.id || user.student_id || user.user_id;
    return id ? String(id) : "";
  } catch {
    return "";
  }
};

const sanitizeQuizNumber = (value, min, max, fallback) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
};

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

const mapApiQuizToCard = (quiz) => ({
  id: String(quiz?.id || ""),
  apiId: quiz?.id || null,
  title: quiz?.title || `Quiz ${quiz?.id || ""}`,
  timeLimit:
    toNumberOrNull(quiz?.duration_minutes) ??
    toNumberOrNull(quiz?.time_limit) ??
    30,
  passingScore: toNumberOrNull(quiz?.passing_percentage) ?? 60,
  questionCount:
    toNumberOrNull(quiz?.questions_count) ??
    toNumberOrNull(quiz?.question_count) ??
    (Array.isArray(quiz?.questions) ? quiz.questions.length : 0),
  shuffleQuestions:
    Boolean(quiz?.shuffleQuestions) || Boolean(quiz?.shuffle_questions),
  shuffleOptions:
    Boolean(quiz?.shuffleOptions) || Boolean(quiz?.shuffle_options),
  showResults:
    typeof quiz?.showResults === "boolean"
      ? quiz.showResults
      : typeof quiz?.show_results === "boolean"
        ? quiz.show_results
        : true,
  status: normalizeQuizStatus(quiz?.status),
  score:
    toNumberOrNull(quiz?.score) ??
    toNumberOrNull(quiz?.percentage) ??
    null,
  questions: Array.isArray(quiz?.questions) ? quiz.questions : [],
});

const createClientId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://cary-nontumorous-unimpedingly.ngrok-free.dev";

const buildApiHeaders = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  "ngrok-skip-browser-warning": "true",
});

const LECTURE_ASSIGNMENT_FILE_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar";
const SECTION_ASSIGNMENT_FILE_ACCEPT = ".pdf,application/pdf";
const ALLOWED_ASSIGNMENT_FILE_EXTENSIONS = new Set(
  LECTURE_ASSIGNMENT_FILE_ACCEPT.split(",").map((entry) =>
    entry.replace(".", "").toLowerCase()
  )
);

const toAbsoluteApiUrl = (path = "") => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
};

const resolveFileHref = (fileLike = {}) => {
  const dataUrl = fileLike?.dataUrl || "";
  if (dataUrl) return dataUrl;

  const raw = String(fileLike?.url || fileLike?.path || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|blob:|data:)/i.test(raw)) return raw;

  return toAbsoluteApiUrl(raw);
};

const toApiDateTime = (dateTimeLocalValue) => {
  if (!dateTimeLocalValue) return "";
  const normalized = dateTimeLocalValue.replace("T", " ").trim();
  if (normalized.length === 16) return `${normalized}:00`;
  return normalized;
};

const toDateTimeInputValue = (apiDateTime) => {
  if (!apiDateTime) return "";
  const normalized = String(apiDateTime).trim().replace(" ", "T");
  return normalized.slice(0, 16);
};

const getApiFileDisplayName = (fileLike = {}, fallbackPath = "") => {
  const apiName =
    fileLike?.original_name ||
    fileLike?.original_file_name ||
    fileLike?.file_name ||
    fileLike?.filename ||
    fileLike?.file_original_name ||
    fileLike?.assignment_file_name ||
    fileLike?.submission_file_name ||
    fileLike?.file_display_name ||
    "";

  if (apiName) return apiName;

  return String(fallbackPath || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .pop() || "";
};

const isPdfFile = (file) => {
  if (!(file instanceof File)) return false;
  return (
    file.type === "application/pdf" ||
    String(file.name || "").toLowerCase().endsWith(".pdf")
  );
};

const isSupportedLectureAssignmentFile = (file) => {
  if (!(file instanceof File)) return false;
  const extension = String(file.name || "")
    .split(".")
    .pop()
    ?.toLowerCase();

  return !!extension && ALLOWED_ASSIGNMENT_FILE_EXTENSIONS.has(extension);
};

const AccordionSection = ({
  id,
  icon,
  title,
  count,
  open,
  onToggle,
  children,
}) => (
  <section className={`lecture-details-block ${open ? "is-open" : ""}`}>
    <button
      type="button"
      className="lecture-details-block-head"
      onClick={() => onToggle(id)}
      aria-expanded={open}
      aria-controls={`${id}-content`}
    >
      <div className="lecture-details-block-title">
        <span className="lecture-details-head-icon">{icon}</span>
        <span>{title}</span>
        {typeof count === "number" && (
          <span className="lecture-details-count-badge">{count}</span>
        )}
      </div>

      <FiChevronDown className="lecture-details-chevron" />
    </button>

    {open && (
      <div id={`${id}-content`} className="lecture-details-block-content">
        {children}
      </div>
    )}
  </section>
);

const ContentDetails = ({ role = "lecturer" }) => {
  const navigate = useNavigate();
  const { courseId, lectureId, sectionId } = useParams();
  const location = useLocation();
  const isSectionView = !!sectionId;
  const stateCourseId = courseId;
  const stateSectionId = sectionId;
  const stateSectionTitle =
    location.state?.sectionTitle || location.state?.title;
  const lectureTitleFromState =
    location.state?.lectureTitle || location.state?.title;
  const lectureFileInputRef = useRef(null);
  const assignmentDialogFileInputRef = useRef(null);
  const assignmentDueDateInputRef = useRef(null);
  const objectUrlsRef = useRef(new Set());
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await axios.get("/api/get-courses", {
          headers: buildApiHeaders(token),
        });

        const selectedCourse = res.data.courses.find(
          (c) => c.id === Number(stateCourseId)
        );

        if (selectedCourse) {
          setCourseTitle(selectedCourse.title);
        }
      } catch (err) {
        console.error("Error fetching course:", err);
      }
    };

    if (stateCourseId && token) {
      fetchCourse();
    }
  }, [stateCourseId, token]);

  const canManageLecture = role === "lecturer" || role === "ta";
  const isTA = role === "ta";
  const isLecturer = role === "lecturer";

  const [courseTitle, setCourseTitle] = useState("");

  const [lectureData, setLectureData] = useState(() => {
    return {
      ...lectureSeed,
      id: lectureId || "",
      title: sectionId
      ? stateSectionTitle || `Section ${sectionId}`
      : lectureTitleFromState || `Lecture ${lectureId}`,
    };
  });
  const [openSections, setOpenSections] = useState({
    lecture: true,
    assignments: true,
    quizzes: true,
  });

  const [uploadedLectureFiles, setUploadedLectureFiles] = useState([]);
  const [isUploadingLectureFiles, setIsUploadingLectureFiles] = useState(false);
  const [isFetchingSectionUploads, setIsFetchingSectionUploads] =
    useState(false);
  const [lectureUploadError, setLectureUploadError] = useState("");
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState(
    getDefaultAssignmentForm()
  );
  const [assignmentDialogMode, setAssignmentDialogMode] = useState("create");
  const [assignmentEditingId, setAssignmentEditingId] = useState(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizForm, setQuizForm] = useState(getDefaultQuizForm());
  const [quizDialogMode, setQuizDialogMode] = useState("create");
  const [quizEditingId, setQuizEditingId] = useState(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [quizLoadError, setQuizLoadError] = useState("");
  const [isFetchingSectionAssignments, setIsFetchingSectionAssignments] =
    useState(false);
  const [sectionAssignmentsError, setSectionAssignmentsError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState("");
  const [editedTitle, setEditedTitle] = useState("");

  const getNames = (ids) => {
    if (!Array.isArray(ids) || !ids.length) return "None";
    return ids
      .map((student) =>
        typeof student === "object"
          ? student.name || student.student_name || student.id || ""
          : student
      )
      .filter(Boolean)
      .join(", ") || "None";
  };

  const currentStudentId = useMemo(() => getCurrentStudentId(), []);
  const canManageAssignmentsViaApi = isSectionView ? isTA : isLecturer;
  const canManageUploadsViaApi = isSectionView ? isTA : isLecturer;
  const contentApiId = useMemo(() => {
    if (isSectionView) {
      const sectionTargetId = stateSectionId;
      return sectionTargetId ? String(sectionTargetId) : "";
    }

    const lectureTargetId = lectureId || lectureData.id;
    return lectureTargetId ? String(lectureTargetId) : "";
  }, [isSectionView, stateSectionId, lectureId, lectureData.id]);
  const assignmentApiScope = isSectionView ? "section" : "lecture";
  const assignmentOwnerField =
    assignmentApiScope === "section" ? "section_id" : "lecture_id";
  const assignmentCollectionEndpoint = contentApiId
    ? `/api/get-${assignmentApiScope}-assignments/${contentApiId}`
    : "";
  const createAssignmentEndpoint = `/api/create-${assignmentApiScope}-assignment`;
  const getAssignmentUpdateEndpoint = (assignmentId) =>
    `/api/update-${assignmentApiScope}-assignment/${assignmentId}`;
  const getAssignmentDeleteEndpoint = (assignmentId) =>
    `/api/delete-${assignmentApiScope}-assignment/${assignmentId}`;
  const uploadApiScope = isSectionView ? "section" : "lecture";
  const uploadOwnerField = uploadApiScope === "section" ? "section_id" : "lecture_id";
  const uploadCollectionEndpoint = contentApiId
    ? `/api/get-${uploadApiScope}-uploads/${contentApiId}`
    : "";
  const createUploadEndpoint = `/api/upload-${uploadApiScope}`;
  const getUploadDeleteEndpoint = (uploadId) =>
    `/api/delete-${uploadApiScope}-upload/${uploadId}`;
  const assignmentFileAccept = isSectionView
    ? SECTION_ASSIGNMENT_FILE_ACCEPT
    : LECTURE_ASSIGNMENT_FILE_ACCEPT;
  const unitLabel = isSectionView ? "Section" : "Lecture";
  const unitLabelLower = unitLabel.toLowerCase();
  const addQuizPath = `/${role}/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}/add-quiz`;
  const resolvedTitle = isSectionView
    ? stateSectionTitle || lectureData.title
    : lectureTitleFromState || lectureData.title;
  const pageTitle = resolvedTitle;
  const contentBlockTitle = `${unitLabel} Content`;
  const uploadButtonLabel = `Upload ${unitLabel} File`;
  const lectureContentHintText = canManageLecture
    ? `Upload ${unitLabelLower} material files (PDF, slides, docs) for students.`
    : `${unitLabel} materials uploaded by your instructor appear below.`;
  const assignmentDialogDescription =
    assignmentDialogMode === "edit"
      ? `Update this ${unitLabelLower} assignment details.`
      : `Create an assignment for this ${unitLabelLower}'s students.`;
  const assignmentDialogTitle =
    assignmentDialogMode === "edit" ? "Edit Assignment" : "New Assignment";
  const assignmentDialogSubmitLabel =
    assignmentDialogMode === "edit" ? "Save Changes" : "Create Assignment";
  const quizCreateDescription = `Configure and launch a quiz for this ${unitLabelLower}.`;
  const quizEditDescription = `Update quiz settings for this ${unitLabelLower}.`;

  const createDownloadEntry = (file) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);

    return {
      id: createClientId("upload"),
      name: file.name,
      url,
      file,
      size: file.size,
      lastModified: file.lastModified,
    };
  };

  const revokeEntryUrl = (entry) => {
    if (!entry?.url) return;
    if (!objectUrlsRef.current.has(entry.url)) return;
    URL.revokeObjectURL(entry.url);
    objectUrlsRef.current.delete(entry.url);
  };

  const revokeManyEntryUrls = (entries = []) => {
    entries.forEach((entry) => revokeEntryUrl(entry));
  };

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    },
    []
  );

  useEffect(() => {
    setLectureData((prev) => ({
      ...prev,
      id: lectureId || prev.id || "",
      title: isSectionView
        ? stateSectionTitle || `Section ${sectionId}`
        : lectureTitleFromState || `Lecture ${lectureId}`,
    }));
  }, [isSectionView, lectureId, lectureTitleFromState, sectionId, stateSectionTitle]);

  // Fetch quizzes from backend (API #40)
  useEffect(() => {
    if (!contentApiId) return;

    const fetchQuizzes = async () => {
      setIsLoadingQuizzes(true);
      setQuizLoadError("");

      try {
        const response = await getQuizzesList(
          isSectionView
            ? { section_id: contentApiId }
            : { lecture_id: contentApiId },
          token
        );

        const raw =
          (Array.isArray(response?.quizzes) && response.quizzes) ||
          (Array.isArray(response?.data) && response.data) ||
          (Array.isArray(response?.quizzes_list) && response.quizzes_list) ||
          (Array.isArray(response?.quizzesList) && response.quizzesList) ||
          (Array.isArray(response) ? response : []);

        const normalized = raw.map(mapApiQuizToCard);

        setLectureData((prev) => ({ ...prev, quizzes: normalized }));
        setIsLoadingQuizzes(false);
      } catch (error) {
        setLectureData((prev) => ({ ...prev, quizzes: [] }));
        setQuizLoadError(error.message || "Failed to load quizzes.");
        setIsLoadingQuizzes(false);
        // silently ignore — quiz list section will just be empty
      }
    };

    fetchQuizzes();
  }, [contentApiId, isSectionView, token]);

  const formatDueDate = (dateValue) => {
    if (!dateValue) return "";
    const normalizedDate = String(dateValue).replace(" ", "T");
    const parsed = new Date(normalizedDate);
    if (Number.isNaN(parsed.getTime())) return dateValue;
    return parsed.toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (typeof bytes !== "number" || Number.isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatFileDate = (timestamp) => {
    if (!timestamp) return "";
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString();
  };

  const getFileExtension = (fileName) => {
    if (!fileName || typeof fileName !== "string") return "FILE";
    const parts = fileName.split(".");
    if (parts.length < 2) return "FILE";
    return parts[parts.length - 1].slice(0, 4).toUpperCase();
  };

  const mapSectionUploadToLectureFile = useCallback((upload) => {
    const name =
      getApiFileDisplayName(upload, upload?.file_path || upload?.path || upload?.url) ||
      upload?.name ||
      "Uploaded file";
    const sizeKb = Number(upload?.size_kb);
    const sizeBytes =
      Number(upload?.size_bytes) ||
      Number(upload?.size) ||
      (Number.isFinite(sizeKb) ? Math.round(sizeKb * 1024) : 0);

    return {
      id: `section-upload-${upload?.id ?? createClientId("section-upload")}`,
      apiId: upload?.id ?? null,
      name,
      size: Number.isFinite(sizeBytes) ? sizeBytes : 0,
      lastModified: upload?.updated_at || upload?.created_at || Date.now(),
      mimeType: upload?.mime_type || "",
      dataUrl: "",
      url: resolveFileHref({
        path: upload?.file_path || upload?.path || upload?.url || "",
      }),
    };
  }, []);

  const fetchSectionUploads = useCallback(async () => {
    if (!contentApiId) {
      setUploadedLectureFiles([]);
      if (canManageLecture) {
        setLectureUploadError(
          "Select a lecture or section first from course details to manage uploads."
        );
      }
      return;
    }

    setIsFetchingSectionUploads(true);
    setLectureUploadError("");

    try {
      const response = await axios.get(uploadCollectionEndpoint, {
        headers: buildApiHeaders(token),
      });
      const payload = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      setUploadedLectureFiles(payload.map(mapSectionUploadToLectureFile));
    } catch (error) {
      setLectureUploadError(
        error?.response?.data?.message || "Failed to load uploads."
      );
      setUploadedLectureFiles([]);
    } finally {
      setIsFetchingSectionUploads(false);
    }
  }, [
    canManageLecture,
    contentApiId,
    mapSectionUploadToLectureFile,
    token,
    uploadCollectionEndpoint,
  ]);

  useEffect(() => {
    fetchSectionUploads();
  }, [fetchSectionUploads]);

  const mapSectionAssignmentToCard = useCallback((assignment) => {
    const attachmentPath = assignment?.file_path || "";
    const attachmentName =
      getApiFileDisplayName(assignment, attachmentPath) || "assignment.pdf";

    return {
      id: `assignment-${assignment.id}`,
      apiId: assignment.id,
      title: assignment.title || attachmentName || "Untitled Assignment",
      description: assignment.description || "",
      dueDate: toDateTimeInputValue(assignment.due_date),
      maxScore: Number(assignment.points) || 100,
      closeSubmissionsAfterDueDate:
        readBooleanValue(
          assignment,
          "close_on_deadline",
          "close_submissions_after_due_date"
        ) ?? false,
      attachments: attachmentPath
        ? [
            {
              name: attachmentName,
              url: resolveFileHref({ path: attachmentPath }),
              path: attachmentPath,
            },
          ]
        : [],
      doneStudentIds:
        assignment?.done_students ||
        assignment?.completed_students ||
        assignment?.doneStudentIds ||
        [],
      missedStudentIds:
        assignment?.missed_students || assignment?.missedStudentIds || [],
    };
  }, []);

  const fetchSectionAssignments = useCallback(async () => {
    const canFetch = Boolean(contentApiId);
    if (!canFetch) {
      if (canManageAssignmentsViaApi && !contentApiId) {
        setSectionAssignmentsError(
          "Select a lecture or section first from course details to manage assignments."
        );
        setLectureData((prev) => ({ ...prev, assignments: [] }));
      }
      return;
    }

    setIsFetchingSectionAssignments(true);
    setSectionAssignmentsError("");

    try {
      const response = await axios.get(assignmentCollectionEndpoint, {
        headers: buildApiHeaders(token),
      });

      const payload = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      const mappedAssignments = payload.map(mapSectionAssignmentToCard);

      setLectureData((prev) => ({
        ...prev,
        assignments: mappedAssignments,
      }));
      return mappedAssignments;
    } catch (error) {
      setSectionAssignmentsError(
        error?.response?.data?.message || "Failed to load assignments."
      );
      setLectureData((prev) => ({ ...prev, assignments: [] }));
      return [];
    } finally {
      setIsFetchingSectionAssignments(false);
    }
  }, [
    assignmentCollectionEndpoint,
    canManageAssignmentsViaApi,
    contentApiId,
    mapSectionAssignmentToCard,
    token,
  ]);

  useEffect(() => {
    fetchSectionAssignments();
  }, [fetchSectionAssignments]);

  const getPersonalStatus = (item) => {
    if (item.doneStudentIds?.includes(currentStudentId)) return "done";
    if (item.missedStudentIds?.includes(currentStudentId)) return "missed";
    return "pending";
  };

  const getPersonalQuizStatus = (quiz) => {
    if (quiz?.status) return normalizeQuizStatus(quiz.status);
    if (quiz?.doneStudentIds?.includes(currentStudentId)) return "done";
    if (quiz?.missedStudentIds?.includes(currentStudentId)) return "missed";
    return "pending";
  };

  const getPersonalQuizScore = (quiz) =>
    quiz?.score ?? quiz?.results?.[currentStudentId] ?? null;

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openEdit = (type, item) => {
    if (!canManageLecture) return;
    if (canManageAssignmentsViaApi && type === "assignment") {
      openAssignmentEditDialog(item);
      return;
    }
    setEditingType(type);
    setEditingId(item.id);
    setEditedTitle(item.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingType("");
    setEditedTitle("");
  };

  const saveEdit = async () => {
    if (!canManageLecture) return;
    const trimmedTitle = editedTitle.trim();
    if (!trimmedTitle || !editingId || !editingType) return;

    if (canManageAssignmentsViaApi && editingType === "assignment") {
      const assignmentToUpdate = lectureData.assignments.find(
        (assignment) => assignment.id === editingId
      );

      if (!assignmentToUpdate?.apiId) return;

      try {
        const formData = new FormData();
        formData.append("title", trimmedTitle);
        formData.append("description", assignmentToUpdate.description || "");

        const uploadedFile = assignmentToUpdate.attachments?.[0]?.file;
        if (uploadedFile instanceof File) {
          formData.append("assignment_file", uploadedFile);
        }

        await axios.post(
          getAssignmentUpdateEndpoint(assignmentToUpdate.apiId),
          formData,
          {
            headers: buildApiHeaders(token),
          }
        );

        await fetchSectionAssignments();
        cancelEdit();
      } catch (error) {
        setSectionAssignmentsError(
          error?.response?.data?.message || "Failed to update assignment."
        );
      }
      return;
    }

    setLectureData((prev) => {
      if (editingType === "section") {
        return {
          ...prev,
          sections: prev.sections.map((section) =>
            section.id === editingId
              ? { ...section, title: trimmedTitle }
              : section
          ),
        };
      }

      if (editingType === "assignment") {
        return {
          ...prev,
          assignments: prev.assignments.map((assignment) =>
            assignment.id === editingId
              ? { ...assignment, title: trimmedTitle }
              : assignment
          ),
        };
      }

      if (editingType === "quiz") {
        return {
          ...prev,
          quizzes: prev.quizzes.map((quiz) =>
            quiz.id === editingId ? { ...quiz, title: trimmedTitle } : quiz
          ),
        };
      }

      return prev;
    });

    cancelEdit();
  };

  const deleteItem = async (type, id) => {
    if (!canManageLecture) return;
    if (!type || !id) return;

    if (canManageAssignmentsViaApi && type === "assignment") {
      const assignmentToDelete = lectureData.assignments.find(
        (assignment) => assignment.id === id
      );

      if (!assignmentToDelete?.apiId) return;

      try {
        await axios.delete(
          getAssignmentDeleteEndpoint(assignmentToDelete.apiId),
          {
            headers: buildApiHeaders(token),
          }
        );
        await fetchSectionAssignments();
        cancelEdit();
      } catch (error) {
        setSectionAssignmentsError(
          error?.response?.data?.message || "Failed to delete assignment."
        );
      }
      return;
    }

    setLectureData((prev) => {
      if (type === "section") {
        return {
          ...prev,
          sections: prev.sections.filter((section) => section.id !== id),
        };
      }

      if (type === "assignment") {
        const assignmentToDelete = prev.assignments.find(
          (assignment) => assignment.id === id
        );

        const attachments = assignmentToDelete?.attachments || [];
        attachments.forEach((attachment) => {
          if (typeof attachment === "object" && attachment?.url) {
            revokeEntryUrl(attachment);
          }
        });
        return {
          ...prev,
          assignments: prev.assignments.filter(
            (assignment) => assignment.id !== id
          ),
        };
      }

      if (type === "quiz") {
        // fire-and-forget API delete
        axios
          .delete(`${API_BASE_URL}/api/delete-quiz/${id}`, {
            headers: buildApiHeaders(token),
          })
          .catch(() => {});
        return {
          ...prev,
          quizzes: prev.quizzes.filter((quiz) => quiz.id !== id),
        };
      }

      return prev;
    });

    cancelEdit();
  };

  const openAssignmentDialog = () => {
    if (!canManageAssignmentsViaApi) return;
    setSectionAssignmentsError("");
    setAssignmentDialogMode("create");
    setAssignmentEditingId(null);
    setAssignmentForm(getDefaultAssignmentForm());
    setAssignmentDialogOpen(true);
  };

  const openAssignmentEditDialog = (assignment) => {
    if (!canManageAssignmentsViaApi || !assignment) return;
    setSectionAssignmentsError("");
    setAssignmentDialogMode("edit");
    setAssignmentEditingId(assignment.id);
    setAssignmentForm({
      title: assignment.title || "",
      description: assignment.description || "",
      dueDate: assignment.dueDate || "",
      maxScore: Number(assignment.maxScore) || 100,
      closeSubmissionsAfterDueDate:
        !!assignment.closeSubmissionsAfterDueDate,
      files: Array.isArray(assignment.attachments)
        ? assignment.attachments.map((attachment) =>
            typeof attachment === "string"
              ? { name: attachment, url: "" }
              : {
                  name: attachment.name || "attachment.pdf",
                  url: attachment.url || "",
                  path: attachment.path || "",
                }
          )
        : [],
    });
    setAssignmentDialogOpen(true);
  };

  const closeAssignmentDialog = ({ keepUploadedFiles = false } = {}) => {
    if (!keepUploadedFiles) {
      revokeManyEntryUrls(assignmentForm.files);
    }

    setAssignmentDialogOpen(false);
    setAssignmentDialogMode("create");
    setAssignmentEditingId(null);
    setAssignmentForm(getDefaultAssignmentForm());
  };

  const updateAssignmentFormValue = (field, value) => {
    setAssignmentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openQuizBuilderPage = (quiz = null) => {
    if (!canManageLecture) return;

    if (!quiz?.id) {
      navigate(addQuizPath);
      return;
    }

    navigate(`${addQuizPath}?quizId=${encodeURIComponent(quiz.id)}`, {
      state: { quiz },
    });
  };

  const closeQuizDialog = () => {
    setQuizDialogOpen(false);
    setQuizDialogMode("create");
    setQuizEditingId(null);
    setQuizForm(getDefaultQuizForm());
  };

  const updateQuizFormValue = (field, value) => {
    setQuizForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openAssignmentDueDatePicker = () => {
    const input = assignmentDueDateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
  };

  const onUploadAssignmentFileInDialog = (event) => {
    if (!canManageLecture) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const fileEntries = files.map((file) => createDownloadEntry(file));

    if (canManageAssignmentsViaApi) {
      setSectionAssignmentsError("");
    }

    setAssignmentForm((prev) => ({
      ...prev,
      files: canManageAssignmentsViaApi
        ? [fileEntries[0]]
        : [...prev.files, ...fileEntries],
    }));

    event.target.value = "";
  };

  const removeAssignmentDialogFile = (index) => {
    if (!canManageLecture) return;
    setAssignmentForm((prev) => {
      const entryToDelete = prev.files[index];
      revokeEntryUrl(entryToDelete);

      return {
        ...prev,
        files: prev.files.filter((_, fileIndex) => fileIndex !== index),
      };
    });
  };

  const addAssignmentFromDialog = async (event) => {
    event.preventDefault();
    if (!canManageLecture) return;
    const trimmed = assignmentForm.title.trim();
    if (!trimmed) return;

    if (canManageAssignmentsViaApi) {
      if (!contentApiId) {
        setSectionAssignmentsError(
          "No active lecture or section selected. Open content details from the course page."
        );
        return;
      }

      const selectedFileEntry = assignmentForm.files[0];
      const selectedFile = selectedFileEntry?.file;
      const isEditMode = assignmentDialogMode === "edit";

      if (!isEditMode && !(selectedFile instanceof File)) {
        setSectionAssignmentsError(
          "Please upload an assignment file before saving."
        );
        return;
      }

      const hasNewFile = selectedFile instanceof File;
      const isSupportedFile = !hasNewFile
        ? true
        : isSectionView
          ? isPdfFile(selectedFile)
          : isSupportedLectureAssignmentFile(selectedFile);

      if (!isSupportedFile) {
        setSectionAssignmentsError(
          isSectionView
            ? "Section assignments must be uploaded as PDF files."
            : "Supported files: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, ZIP, RAR."
        );
        return;
      }

      try {
        const formData = new FormData();
        formData.append("title", trimmed);
        formData.append("description", assignmentForm.description.trim());
        formData.append("points", String(Number(assignmentForm.maxScore) || 100));
        formData.append(
          "close_on_deadline",
          assignmentForm.closeSubmissionsAfterDueDate ? 1 : 0
        );
        formData.append(
          "due_date",
          assignmentForm.dueDate ? toApiDateTime(assignmentForm.dueDate) : ""
        );
        if (hasNewFile) {
          formData.append("assignment_file", selectedFile);
          formData.append("file_name", selectedFile.name);
          formData.append("original_file_name", selectedFile.name);
        }

        if (isEditMode) {
          const assignmentToUpdate = lectureData.assignments.find(
            (assignment) => assignment.id === assignmentEditingId
          );
          if (!assignmentToUpdate?.apiId) {
            setSectionAssignmentsError("Invalid assignment selected for editing.");
            return;
          }

          await axios.post(
            getAssignmentUpdateEndpoint(assignmentToUpdate.apiId),
            formData,
            {
              headers: buildApiHeaders(token),
            }
          );
        } else {
          formData.append(assignmentOwnerField, String(contentApiId));
          await axios.post(createAssignmentEndpoint, formData, {
            headers: buildApiHeaders(token),
          });
        }

        await fetchSectionAssignments();
        closeAssignmentDialog();
      } catch (error) {
        setSectionAssignmentsError(
          error?.response?.data?.message ||
            (isEditMode
              ? "Failed to update assignment."
              : "Failed to create assignment.")
        );
      }
      return;
    }
  };

  const addQuizFromDialog = (event) => {
    event.preventDefault();
    if (!canManageLecture) return;
    const trimmedTitle = quizForm.title.trim();
    if (!trimmedTitle) return;

    const safeTimeLimit = sanitizeQuizNumber(quizForm.timeLimit, 1, 180, 30);
    const safeQuestionCount = sanitizeQuizNumber(
      quizForm.questionCount,
      1,
      200,
      10
    );

    setLectureData((prev) => ({
      ...prev,
      quizzes:
        quizDialogMode === "edit" && quizEditingId
          ? prev.quizzes.map((quiz) =>
              quiz.id === quizEditingId
                ? {
                    ...quiz,
                    title: trimmedTitle,
                    timeLimit: safeTimeLimit,
                    questionCount: safeQuestionCount,
                    shuffleQuestions: !!quizForm.shuffleQuestions,
                  }
                : quiz
            )
          : [
              ...prev.quizzes,
              {
                id: `q-${Date.now()}`,
                title: trimmedTitle,
                timeLimit: safeTimeLimit,
                questionCount: safeQuestionCount,
                shuffleQuestions: !!quizForm.shuffleQuestions,
                doneStudentIds: [],
                missedStudentIds: [],
                results: {},
              },
            ],
    }));

    closeQuizDialog();
  };

  const deleteQuizFromDialog = async () => {
    if (!canManageLecture) return;
    if (quizDialogMode !== "edit" || !quizEditingId) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/delete-quiz/${quizEditingId}`, {
        headers: buildApiHeaders(token),
      });
    } catch {
      // silently ignore — remove from UI regardless
    }

    setLectureData((prev) => ({
      ...prev,
      quizzes: prev.quizzes.filter((quiz) => quiz.id !== quizEditingId),
    }));

    closeQuizDialog();
  };

  const deleteAssignmentFromDialog = async () => {
    if (!canManageAssignmentsViaApi) return;
    if (assignmentDialogMode !== "edit" || !assignmentEditingId) return;

    const assignmentToDelete = lectureData.assignments.find(
      (assignment) => assignment.id === assignmentEditingId
    );

    if (!assignmentToDelete?.apiId) {
      setSectionAssignmentsError("Invalid assignment selected for deletion.");
      return;
    }

    try {
      await axios.delete(
        getAssignmentDeleteEndpoint(assignmentToDelete.apiId),
        {
          headers: buildApiHeaders(token),
        }
      );
      await fetchSectionAssignments();
      closeAssignmentDialog();
    } catch (error) {
      setSectionAssignmentsError(
        error?.response?.data?.message || "Failed to delete assignment."
      );
    }
  };

  const onUploadLectureFile = async (event) => {
    if (!canManageUploadsViaApi) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setIsUploadingLectureFiles(true);
    setLectureUploadError("");

    try {
      if (!contentApiId) {
        setLectureUploadError(
          "No active lecture or section selected. Open content details from the course page."
        );
        return;
      }

      const selectedFile = files[0];
      const formData = new FormData();
      formData.append(uploadOwnerField, String(contentApiId));
      formData.append("upload_file", selectedFile);

      await axios.post(createUploadEndpoint, formData, {
        headers: buildApiHeaders(token),
      });

      await fetchSectionUploads();
    } catch (error) {
      setLectureUploadError(
        error?.response?.data?.message || "Upload failed. Please try again."
      );
    } finally {
      setIsUploadingLectureFiles(false);
      event.target.value = "";
    }
  };

  const removeLectureFile = async (fileId) => {
    if (!canManageUploadsViaApi) return;
    const target = uploadedLectureFiles.find((file) => file.id === fileId);
    if (!target?.apiId) return;

    try {
      setLectureUploadError("");
      await axios.delete(getUploadDeleteEndpoint(target.apiId), {
        headers: buildApiHeaders(token),
      });
      setUploadedLectureFiles((prev) =>
        prev.filter((file) => file.id !== fileId)
      );
    } catch (error) {
      setLectureUploadError(
        error?.response?.data?.message || "Failed to delete file."
      );
    }
  };

  const isAssignmentFormValid = assignmentForm.title.trim().length > 0;
  const isQuizFormValid =
    quizForm.title.trim().length > 0 &&
    sanitizeQuizNumber(quizForm.timeLimit, 1, 180, 0) > 0 &&
    sanitizeQuizNumber(quizForm.questionCount, 1, 200, 0) > 0;
  const handleBackNavigation = () => {
    if (stateCourseId) {
      navigate(`/${role}/courses/${stateCourseId}`);
      return;
    }

    navigate(`/${role}/courses`);
  };

  return (
    <section className="lecture-details-page">
      <div className="lecture-details-shell">
        <button
          type="button"
          className="lecture-details-back-btn"
          onClick={handleBackNavigation}
        >
          <FiArrowLeft />
          Back to {courseTitle || lectureData.course}
        </button>

        <h1 className="lecture-details-title">{pageTitle}</h1>

        <div className="lecture-details-accordion">
          <AccordionSection
            id="lecture"
            icon={<FiFileText size={14} />}
            title={contentBlockTitle}
            open={openSections.lecture}
            onToggle={toggleSection}
          >
            <p className="lecture-content-hint">
              {lectureContentHintText}
            </p>

            {canManageUploadsViaApi && (
              <div className="lecture-details-upload-wrap">
                <input
                  type="file"
                  ref={lectureFileInputRef}
                  className="lecture-details-hidden-file"
                  accept={
                    isSectionView
                      ? ".pdf,.ppt,.pptx,.doc,.docx"
                      : ".pdf,.ppt,.pptx"
                  }
                  onChange={onUploadLectureFile}
                />
                <button
                  type="button"
                  className="lecture-details-outline-btn"
                  onClick={() => lectureFileInputRef.current?.click()}
                >
                  <FiUpload size={14} />
                  {uploadButtonLabel}
                </button>
              </div>
            )}

            {isUploadingLectureFiles && (
              <p className="lecture-content-hint">Uploading file(s)...</p>
            )}
            {isFetchingSectionUploads && (
              <p className="lecture-content-hint">Loading uploaded files...</p>
            )}

            {lectureUploadError && (
              <p className="lecture-content-hint">{lectureUploadError}</p>
            )}

            {uploadedLectureFiles.length > 0 && (
              <ul className="lecture-details-uploaded-list">
                {uploadedLectureFiles.map((file) => (
                  <li key={file.id} className="lecture-file-row">
                    <div className="lecture-file-main">
                      <span className="lecture-file-badge">
                        {getFileExtension(file.name)}
                      </span>

                      <div className="lecture-file-meta">
                        {(() => {
                          const fileHref = resolveFileHref(file);
                          if (!fileHref) {
                            return <span>{file.name}</span>;
                          }

                          return (
                            <a
                              className="lecture-details-file-link"
                              href={fileHref}
                              download={file.name}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Download ${file.name}`}
                            >
                              {file.name}
                            </a>
                          );
                        })()}
                        <p>
                          {formatFileSize(file.size)}{" "}
                          {formatFileDate(file.lastModified)
                            ? `· ${formatFileDate(file.lastModified)}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="lecture-file-actions">
                      {(() => {
                        const fileHref = resolveFileHref(file);
                        if (!fileHref) return null;

                        return (
                          <>
                            <a
                              href={fileHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="lecture-file-action-btn"
                              title={`Open ${file.name}`}
                            >
                              <FiExternalLink />
                              Open
                            </a>
                            <a
                              href={fileHref}
                              download={file.name}
                              className="lecture-file-action-btn"
                              title={`Download ${file.name}`}
                            >
                              <FiDownload />
                              Download
                            </a>
                          </>
                        );
                      })()}
                      {canManageUploadsViaApi && (
                        <button
                          type="button"
                          className="lecture-file-action-btn danger"
                          onClick={() => removeLectureFile(file.id)}
                          title={`Remove ${file.name}`}
                        >
                          <FiTrash2 />
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AccordionSection>

          <AccordionSection
            id="assignments"
            icon={<FiFileText size={14} />}
            title="Assignments"
            count={lectureData.assignments.length}
            open={openSections.assignments}
            onToggle={toggleSection}
          >
            <div className="lecture-details-card-list">
              {isFetchingSectionAssignments && (
                <p className="lecture-content-hint">Loading assignments...</p>
              )}
              {sectionAssignmentsError && (
                <p className="lecture-content-hint">{sectionAssignmentsError}</p>
              )}
              {!isFetchingSectionAssignments &&
                lectureData.assignments.length === 0 && (
                  <p className="lecture-content-hint">No assignments yet.</p>
                )}
              {lectureData.assignments.map((assignment) => (
                <article
                  key={assignment.id}
                  className="lecture-details-card"
                  onClick={() => {
                    const targetId = assignment.apiId ?? assignment.id;
                    
                    if (role === "student") {
                      const base = isSectionView ? "section" : "lecture";
                      navigate(
                      `/student/courses/${courseId}/${base}/${contentApiId}/assignment/${targetId}`
                    );
                    } else if (role === "lecturer") {
                      navigate(`/lecturer/assignmentreview/${targetId}`, {
                        state: {
                          courseId,
                          lectureId,
                          sectionId,
                          courseTitle: courseTitle,
                          lectureTitle: pageTitle,
                          assignmentTitle: assignment.title,
                          maxScore: assignment.maxScore,
                          dueDate: assignment.dueDate || "",
                          closeSubmissionsAfterDueDate:
                            !!assignment.closeSubmissionsAfterDueDate,
                        }
                      });
                    } else if (role === "ta") {
                      navigate(`/ta/assignmentreview/${targetId}`, {
                        state: {
                          courseId,
                          lectureId,
                          sectionId,
                          courseTitle: courseTitle,
                          lectureTitle: pageTitle,
                          assignmentTitle: assignment.title,
                          maxScore: assignment.maxScore,
                          dueDate: assignment.dueDate || "",
                          closeSubmissionsAfterDueDate:
                            !!assignment.closeSubmissionsAfterDueDate,
                        },
                      });
                    }
                  }}
                >
                  {(() => {
                    const personalStatus = getPersonalStatus(assignment);
                    const personalStatusLabel =
                      personalStatus === "done"
                        ? "Done"
                        : personalStatus === "missed"
                          ? "Missed"
                          : "Pending";

                    return (
                      <>
                  <div className="lecture-details-card-head">
                    {editingId === assignment.id && editingType === "assignment" ? (
                      <div className="lecture-details-inline-edit">
                        <input
                          value={editedTitle}
                          onChange={(event) => setEditedTitle(event.target.value)}
                        />
                        <div className="lecture-details-inline-actions">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEdit();
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEdit();
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem("assignment", assignment.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h3>{assignment.title}</h3>
                    )}

                    {canManageAssignmentsViaApi &&
                      editingId !== assignment.id &&
                      editingType !== "assignment" && (
                        <button
                          type="button"
                          className="lecture-details-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit("assignment", assignment);
                          }}
                          aria-label={`Edit ${assignment.title}`}
                        >
                          <FaRegEdit size={12} />
                        </button>
                      )}
                  </div>

                  {canManageAssignmentsViaApi ? (
                    <div className="lecture-details-status-row">
                      <p className="status done">
                        <FiCheckCircle />
                        <strong>Done:</strong>
                        <span>{getNames(assignment.doneStudentIds)}</span>
                      </p>
                      <p className="status missed">
                        <FiMinusCircle />
                        <strong>Missed:</strong>
                        <span>{getNames(assignment.missedStudentIds)}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="lecture-details-student-status-row">
                      <span className={`lecture-details-student-pill ${personalStatus}`}>
                        {personalStatus === "done" ? <FiCheckCircle /> : <FiClock />}
                        {personalStatusLabel}
                      </span>
                    </div>
                  )}

                  {(assignment.maxScore ||
                    assignment.dueDate ||
                    assignment.attachments?.length > 0) && (
                    <div className="lecture-details-assignment-meta">
                      {assignment.maxScore && (
                        <span>Max Score: {assignment.maxScore}</span>
                      )}
                      {assignment.dueDate && (
                        <span>Due: {formatDueDate(assignment.dueDate)}</span>
                      )}
                      {assignment.attachments?.length > 0 && (
                        <span>
                          Files:{" "}
                          {assignment.attachments.map((attachment, index) => {
                            const normalizedAttachment =
                              typeof attachment === "string"
                                ? { name: attachment, url: "" }
                                : attachment;
                            const attachmentHref =
                              resolveFileHref(normalizedAttachment);

                            return (
                              <span key={`${normalizedAttachment.name}-${index}`}>
                                {attachmentHref ? (
                                  <a
                                    className="lecture-details-file-link"
                                    href={attachmentHref}
                                    download={normalizedAttachment.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Download ${normalizedAttachment.name}`}
                                  >
                                    {normalizedAttachment.name}
                                  </a>
                                ) : (
                                  normalizedAttachment.name
                                )}
                                {index < assignment.attachments.length - 1
                                  ? ", "
                                  : ""}
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </div>
                  )}
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>

            {canManageAssignmentsViaApi && (
              <div className="lecture-details-actions-row">
                <div className="lecture-details-inline-add">
                  <button
                    type="button"
                    className="danger"
                    onClick={openAssignmentDialog}
                  >
                    <FiPlus size={14} />
                    Add Assignment
                  </button>
                </div>
              </div>
            )}
          </AccordionSection>

          <AccordionSection
            id="quizzes"
            icon={<FiHelpCircle size={14} />}
            title="Quizzes"
            count={lectureData.quizzes.length}
            open={openSections.quizzes}
            onToggle={toggleSection}
          >
            {quizLoadError && (
              <p className="lecture-content-hint">{quizLoadError}</p>
            )}

            {isLoadingQuizzes && (
              <p className="lecture-content-hint">Loading quizzes...</p>
            )}

            <div className="lecture-details-card-list">
              {lectureData.quizzes.map((quiz) => {
                const contentBasePath = `/${role}/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}`;
                const studentExamPath = `${contentBasePath}/exam/${quiz.id}`;
                const quizReviewPath = `${contentBasePath}/quizreview/${quiz.id}`;
                const displayQuizTitle = `Quiz ${lectureData.quizzes.findIndex((item) => item.id === quiz.id) + 1}: ${quiz.title}`;

                return (
                  <article
                    key={quiz.id}
                    className={`lecture-details-card ${role === "student" ? "is-clickable" : ""}`}
                    onClick={role === "student" ? () => navigate(studentExamPath) : undefined}
                  >
                    {(() => {
                      const personalStatus = getPersonalQuizStatus(quiz);
                      const personalStatusLabel =
                        personalStatus === "done"
                          ? "Completed"
                          : personalStatus === "missed"
                            ? "Missed"
                            : "Upcoming";
                      const personalScore = getPersonalQuizScore(quiz);

                      return (
                        <>
                    <div className="lecture-details-card-head">
                      <h3>
                        {canManageLecture ? (
                          <button
                            type="button"
                            className="lecture-details-title-btn"
                            onClick={() => openQuizBuilderPage(quiz)}
                          >
                            {displayQuizTitle}
                          </button>
                        ) : (
                          displayQuizTitle
                        )}
                        {!canManageLecture && personalScore !== null && (
                          <span className="lecture-details-student-score">
                            Score: {personalScore}%
                          </span>
                        )}
                      </h3>

                      {canManageLecture &&
                        !(quizDialogOpen && quizDialogMode === "edit" && quizEditingId === quiz.id) && (
                          <button
                            type="button"
                            className="lecture-details-icon-btn"
                            onClick={() => openQuizBuilderPage(quiz)}
                            aria-label={`Edit ${displayQuizTitle}`}
                          >
                            <FaRegEdit size={12} />
                          </button>
                        )}
                    </div>

                    {canManageLecture ? (
                      <div className="lecture-details-status-row">
                        <p className="status done">
                          <FiHash />
                          <strong>Questions:</strong>
                          <span>{quiz.questionCount || 0}</span>
                        </p>
                        <p className="status missed">
                          <FiClock />
                          <strong>Time:</strong>
                          <span>
                            {quiz.timeLimit || 30} min
                            {Number(quiz.passingScore) > 0
                              ? ` • Pass ${quiz.passingScore}%`
                              : ""}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="lecture-details-student-status-row">
                        <span className={`lecture-details-student-pill ${personalStatus}`}>
                          {personalStatus === "done" ? (
                            <FiCheckCircle />
                          ) : personalStatus === "missed" ? (
                            <FiMinusCircle />
                          ) : (
                            <FiClock />
                          )}
                          {personalStatusLabel}
                        </span>
                      </div>
                    )}

                    {(canManageLecture || personalScore !== null) && (
                      <button
                        type="button"
                        className={`lecture-details-link-btn ${role !== "lecturer" && role !== "ta" ? "disabled" : ""}`}
                        onClick={
                          canManageLecture
                            ? () =>
                                navigate(quizReviewPath, {
                                  state: { quizTitle: displayQuizTitle },
                                })
                            : (event) => event.stopPropagation()
                        }
                        disabled={!canManageLecture}
                        aria-disabled={!canManageLecture}
                      >
                        View Results <span>&rarr;</span>
                      </button>
                    )}
                        </>
                      );
                    })()}
                  </article>
                );
              })}
            </div>

            {canManageLecture && (
              <div className="lecture-details-actions-row">
                <div className="lecture-details-inline-add">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => openQuizBuilderPage()}
                  >
                    <FiPlus size={14} />
                    Add Quiz
                  </button>
                </div>
              </div>
            )}
          </AccordionSection>
        </div>

        {assignmentDialogOpen && (
          <div
            className="lecture-assignment-dialog-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeAssignmentDialog();
            }}
          >
            <div
              className="lecture-assignment-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={assignmentDialogTitle}
            >
              <div className="lecture-assignment-dialog-header">
                <div className="lecture-assignment-dialog-heading">
                  <span className="lecture-assignment-dialog-icon">
                    <FiFileText />
                  </span>
                  <div>
                    <h2>{assignmentDialogTitle}</h2>
                    <p>{assignmentDialogDescription}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="lecture-assignment-dialog-close"
                  onClick={closeAssignmentDialog}
                  aria-label="Close"
                >
                  <FiX />
                </button>
              </div>

              <form
                className="lecture-assignment-dialog-form"
                onSubmit={addAssignmentFromDialog}
              >
                <div className="lecture-assignment-score-box">
                  <div className="lecture-assignment-score-ring">
                    <strong>{assignmentForm.maxScore}</strong>
                    <small>pts</small>
                  </div>

                  <label>
                    <span>Max Score</span>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={assignmentForm.maxScore}
                      onChange={(event) =>
                        updateAssignmentFormValue(
                          "maxScore",
                          Number(event.target.value || 0)
                        )
                      }
                    />
                  </label>
                </div>

                <label className="lecture-assignment-field">
                  <span>
                    <FiAlignLeft />
                    Title <em>*</em>
                  </span>
                  <input
                    type="text"
                    value={assignmentForm.title}
                    onChange={(event) =>
                      updateAssignmentFormValue("title", event.target.value)
                    }
                    placeholder="e.g. Implement a Caesar Cipher"
                    required
                  />
                </label>

                <label className="lecture-assignment-field">
                  <span>
                    <FiFileText />
                    Instructions
                  </span>
                  <textarea
                    rows={4}
                    value={assignmentForm.description}
                    onChange={(event) =>
                      updateAssignmentFormValue("description", event.target.value)
                    }
                    placeholder="Describe what students should do..."
                  />
                </label>

                <label className="lecture-assignment-field">
                  <span>
                    <FiCalendar />
                    Due Date
                  </span>
                  <input
                    ref={assignmentDueDateInputRef}
                    type="datetime-local"
                    value={assignmentForm.dueDate}
                    onChange={(event) =>
                      updateAssignmentFormValue("dueDate", event.target.value)
                    }
                    onClick={openAssignmentDueDatePicker}
                    onKeyDown={(event) => {
                      if (event.key === "Tab") return;
                      event.preventDefault();
                    }}
                    onPaste={(event) => event.preventDefault()}
                    onDrop={(event) => event.preventDefault()}
                  />
                </label>

                <div className="lecture-assignment-upload-field">
                  <span>
                    <FiPaperclip />
                    Upload Assignment Files
                  </span>
                  <input
                    type="file"
                    ref={assignmentDialogFileInputRef}
                    className="lecture-details-hidden-file"
                    onChange={onUploadAssignmentFileInDialog}
                    accept={assignmentFileAccept}
                    multiple={!canManageAssignmentsViaApi}
                  />
                  <button
                    type="button"
                    className="lecture-details-outline-btn"
                    onClick={() => assignmentDialogFileInputRef.current?.click()}
                  >
                    <FiUpload size={14} />
                    Choose Files
                  </button>

                  {assignmentForm.files.length > 0 && (
                    <ul className="lecture-assignment-files-list">
                      {assignmentForm.files.map((file, index) => (
                        <li key={`${file.name}-${file.url}`}>
                          <a
                            className="lecture-details-file-link"
                            href={file.url}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Download ${file.name}`}
                          >
                            {file.name}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeAssignmentDialogFile(index)}
                            aria-label={`Remove ${file.name}`}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {canManageAssignmentsViaApi && sectionAssignmentsError && (
                    <p className="lecture-content-hint">{sectionAssignmentsError}</p>
                  )}
                </div>

                <label className="lecture-assignment-checkbox">
                  <input
                    type="checkbox"
                    checked={assignmentForm.closeSubmissionsAfterDueDate}
                    onChange={(event) =>
                      updateAssignmentFormValue(
                        "closeSubmissionsAfterDueDate",
                        event.target.checked
                      )
                    }
                  />
                  <span>Close submissions after due date</span>
                </label>

                {isAssignmentFormValid && (
                  <p className="lecture-assignment-status-note">
                    <FiClock />
                    Assignment will be visible to all enrolled students
                    immediately.
                  </p>
                )}

                <div className="lecture-assignment-dialog-actions">
                  {assignmentDialogMode === "edit" && (
                    <button
                      type="button"
                      className="lecture-assignment-danger-btn"
                      onClick={deleteAssignmentFromDialog}
                    >
                      Delete Assignment
                    </button>
                  )}
                  <button
                    type="button"
                    className="lecture-assignment-cancel-btn"
                    onClick={closeAssignmentDialog}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="lecture-assignment-submit-btn"
                    disabled={!isAssignmentFormValid}
                  >
                    {assignmentDialogSubmitLabel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {quizDialogOpen && (
          <div
            className="lecture-assignment-dialog-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeQuizDialog();
            }}
          >
            <div
              className="lecture-assignment-dialog lecture-quiz-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Create quiz"
            >
              <div className="lecture-assignment-dialog-header">
                <div className="lecture-assignment-dialog-heading">
                  <span className="lecture-assignment-dialog-icon quiz">
                    <FiHelpCircle />
                  </span>
                  <div>
                    <h2>{quizDialogMode === "edit" ? "Edit Quiz" : "New Quiz"}</h2>
                    <p>
                      {quizDialogMode === "edit"
                        ? quizEditDescription
                        : quizCreateDescription}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="lecture-assignment-dialog-close"
                  onClick={closeQuizDialog}
                  aria-label="Close"
                >
                  <FiX />
                </button>
              </div>

              <form
                className="lecture-assignment-dialog-form lecture-quiz-dialog-form"
                onSubmit={addQuizFromDialog}
              >
                <div className="lecture-quiz-stats-grid">
                  <div className="lecture-quiz-stat-card time">
                    <label>
                      <span>
                        <FiClock />
                        Time Limit (min)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={quizForm.timeLimit}
                        onChange={(event) =>
                          updateQuizFormValue(
                            "timeLimit",
                            Number(event.target.value || 0)
                          )
                        }
                        onBlur={() =>
                          updateQuizFormValue(
                            "timeLimit",
                            sanitizeQuizNumber(quizForm.timeLimit, 1, 180, 30)
                          )
                        }
                      />
                    </label>
                    <p>
                      {quizForm.timeLimit} minute
                      {quizForm.timeLimit !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="lecture-quiz-stat-card questions">
                    <label>
                      <span>
                        <FiHash />
                        Questions
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={quizForm.questionCount}
                        onChange={(event) =>
                          updateQuizFormValue(
                            "questionCount",
                            Number(event.target.value || 0)
                          )
                        }
                        onBlur={() =>
                          updateQuizFormValue(
                            "questionCount",
                            sanitizeQuizNumber(quizForm.questionCount, 1, 200, 10)
                          )
                        }
                      />
                    </label>
                    <p>
                      {quizForm.questionCount} question
                      {quizForm.questionCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <label className="lecture-assignment-field">
                  <span>
                    <FiLayers />
                    Quiz Title <em>*</em>
                  </span>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(event) =>
                      updateQuizFormValue("title", event.target.value)
                    }
                    placeholder="e.g. Mid-Lecture Check: Encryption Basics"
                    required
                  />
                </label>

                <button
                  type="button"
                  className={`lecture-quiz-toggle ${quizForm.shuffleQuestions ? "is-on" : ""}`}
                  onClick={() =>
                    updateQuizFormValue(
                      "shuffleQuestions",
                      !quizForm.shuffleQuestions
                    )
                  }
                >
                  <span>
                    <FiToggleLeft />
                    Shuffle Questions
                  </span>

                  <span className="lecture-quiz-switch" aria-hidden="true">
                    <span />
                  </span>
                </button>

                {isQuizFormValid && (
                  <p className="lecture-assignment-status-note">
                    <FiHelpCircle />
                    {quizForm.questionCount} questions &middot;{" "}
                    {quizForm.timeLimit} min
                    {quizForm.shuffleQuestions ? " · shuffled" : ""}
                  </p>
                )}

                <div className="lecture-assignment-dialog-actions">
                  {quizDialogMode === "edit" && (
                    <button
                      type="button"
                      className="lecture-assignment-danger-btn"
                      onClick={deleteQuizFromDialog}
                    >
                      Delete Quiz
                    </button>
                  )}
                  <button
                    type="button"
                    className="lecture-assignment-cancel-btn"
                    onClick={closeQuizDialog}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="lecture-assignment-submit-btn"
                    disabled={!isQuizFormValid}
                  >
                    {quizDialogMode === "edit" ? "Save Quiz" : "Create Quiz"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="lecture-details-role-note">
          Viewing as {roleCopy[role] || role}.
        </p>
      </div>
    </section>
  );
};

export default ContentDetails;
