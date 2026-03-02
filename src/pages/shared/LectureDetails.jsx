import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
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

const students = [
  { id: "s1", name: "Ahmed Ali" },
  { id: "s2", name: "Sara Hassan" },
  { id: "s3", name: "Omar Khalil" },
  { id: "s4", name: "Fatima Nour" },
  { id: "s5", name: "Youssef Amin" },
  { id: "s6", name: "Layla Ibrahim" },
  { id: "s7", name: "Kareem Fahmy" },
  { id: "s8", name: "Nadia Sayed" },
  { id: "s9", name: "Tarek Mostafa" },
  { id: "s10", name: "Hana Zaki" },
];

const lectureSeed = {
  id: "l1",
  title: "Lecture 1: Threat Landscape Overview",
  course: "Introduction to Cybersecurity",
  sections: [
    { id: "ls1", title: "Section A: Introduction to Threats" },
    { id: "ls2", title: "Section B: Common Attack Vectors" },
  ],
  assignments: [
    {
      id: "a1",
      title: "Assignment 1: Threat Report",
      doneStudentIds: ["s1", "s2", "s3", "s4", "s5"],
      missedStudentIds: ["s6", "s7"],
    },
    {
      id: "a2",
      title: "Assignment 2: Vulnerability Scan",
      doneStudentIds: ["s1", "s2", "s3"],
      missedStudentIds: ["s8", "s9"],
    },
    {
      id: "a3",
      title: "Assignment 3: Risk Assessment",
      doneStudentIds: ["s1", "s4", "s5", "s6", "s7", "s8"],
      missedStudentIds: ["s10"],
    },
  ],
  quizzes: [
    {
      id: "q1",
      title: "Quiz 1: Threat Basics",
      doneStudentIds: ["s1", "s2", "s3", "s4", "s5", "s6"],
      missedStudentIds: ["s7", "s8"],
      results: { s1: 90, s2: 85, s3: 78 },
    },
    {
      id: "q2",
      title: "Quiz 2: Attack Types",
      doneStudentIds: ["s1", "s2", "s3"],
      missedStudentIds: ["s9", "s10"],
      results: { s1: 88, s2: 82, s3: 75 },
    },
    {
      id: "q3",
      title: "Quiz 3: Defense Strategies",
      doneStudentIds: ["s1", "s4", "s5"],
      missedStudentIds: [],
      results: { s1: 95, s4: 91, s5: 84 },
    },
  ],
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
});

const getDefaultQuizForm = () => ({
  title: "",
  timeLimit: 30,
  questionCount: 10,
  shuffleQuestions: false,
});

const mockStudentIds = new Set([
  ...lectureSeed.assignments.flatMap((assignment) => [
    ...assignment.doneStudentIds.map((id) => String(id)),
    ...assignment.missedStudentIds.map((id) => String(id)),
  ]),
  ...lectureSeed.quizzes.flatMap((quiz) => [
    ...quiz.doneStudentIds.map((id) => String(id)),
    ...quiz.missedStudentIds.map((id) => String(id)),
    ...Object.keys(quiz.results || {}).map((id) => String(id)),
  ]),
]);

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

const sanitizeQuizNumber = (value, min, max, fallback) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
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

const toAbsoluteApiUrl = (path = "") => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
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

const LectureDetails = ({ role = "lecturer" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSectionView = !!location.state?.sectionId;
  const lectureId = location.state?.lectureId;
  const lectureTitleFromState = location.state?.lectureTitle;
  const lectureFileInputRef = useRef(null);
  const assignmentDialogFileInputRef = useRef(null);
  const assignmentDueDateInputRef = useRef(null);
  const objectUrlsRef = useRef(new Set());
  const token = localStorage.getItem("token");

  const canManageLecture = role === "lecturer" || role === "ta";
  const isTA = role === "ta";

  const [lectureData, setLectureData] = useState(() => {
    const sectionView = !!location.state?.sectionId;
    const base = {
      ...lectureSeed,
      id: lectureId || lectureSeed.id,
      title: lectureTitleFromState || lectureSeed.title,
    };
    if (role === "student" && sectionView) {
      return { ...base, assignments: [] };
    }
    return base;
  });
  const [openSections, setOpenSections] = useState({
    lecture: true,
    assignments: true,
    quizzes: true,
  });

  const [uploadedLectureFiles, setUploadedLectureFiles] = useState([]);
  const [hasLoadedLectureFiles, setHasLoadedLectureFiles] = useState(false);
  const [isUploadingLectureFiles, setIsUploadingLectureFiles] = useState(false);
  const [lectureUploadError, setLectureUploadError] = useState("");
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState(
    getDefaultAssignmentForm()
  );
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizForm, setQuizForm] = useState(getDefaultQuizForm());
  const [quizDialogMode, setQuizDialogMode] = useState("create");
  const [quizEditingId, setQuizEditingId] = useState(null);
  const [isFetchingSectionAssignments, setIsFetchingSectionAssignments] =
    useState(false);
  const [sectionAssignmentsError, setSectionAssignmentsError] = useState("");
  const [activeSectionId, setActiveSectionId] = useState(() =>
    role === "ta" ? localStorage.getItem("ta_active_section_id") || "" : ""
  );
  const [activeSectionTitle, setActiveSectionTitle] = useState(() =>
    role === "ta" ? localStorage.getItem("ta_active_section_title") || "" : ""
  );

  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const lectureFilesStorageKey = `lecture-files:${lectureData.id}`;


  const studentNameById = useMemo(() => {
    const map = {};

    students.forEach((student) => {
      map[student.id] = student.name;
    });

    return map;
  }, []);

  const getNames = (ids) => {
    if (!Array.isArray(ids) || !ids.length) return "None";
    return ids.map((id) => studentNameById[id] || id).join(", ");
  };

  const currentStudentId = useMemo(
    () => resolveStudentIdForMockData(getCurrentStudentId()),
    []
  );
  const isStudentSectionView = role === "student" && isSectionView;
  const unitLabel = isTA || isStudentSectionView ? "Section" : "Lecture";
  const unitLabelLower = unitLabel.toLowerCase();
  const resolvedTitle = activeSectionTitle || lectureData.title;
  const pageTitle =
    isTA || isStudentSectionView
      ? resolvedTitle.replace(/^lecture\b/i, "Section")
      : lectureData.title;
  const contentBlockTitle = `${unitLabel} Content`;
  const uploadButtonLabel = `Upload ${unitLabel} File`;
  const lectureContentHintText = canManageLecture
    ? `Upload ${unitLabelLower} material files (PDF, slides, docs) for students.`
    : `${unitLabel} materials uploaded by your instructor appear below.`;
  const assignmentDialogDescription = `Create an assignment for this ${unitLabelLower}'s students.`;
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
    if (!isSectionView && !isTA) return;

    const stateSectionId = location.state?.sectionId || location.state?.id;
    const stateSectionTitle =
      location.state?.sectionTitle || location.state?.title;

    if (stateSectionId !== undefined && stateSectionId !== null) {
      const normalizedSectionId = String(stateSectionId);
      setActiveSectionId(normalizedSectionId);
      if (isTA) {
        localStorage.setItem("ta_active_section_id", normalizedSectionId);
      }
    }

    if (stateSectionTitle) {
      const normalizedSectionTitle = String(stateSectionTitle);
      setActiveSectionTitle(normalizedSectionTitle);
      if (isTA) {
        localStorage.setItem("ta_active_section_title", normalizedSectionTitle);
      }
    }
  }, [isTA, isSectionView, location.state]);

  useEffect(() => {
    try {
      const rawStoredFiles = localStorage.getItem(lectureFilesStorageKey);
      if (!rawStoredFiles) {
        setUploadedLectureFiles([]);
        setHasLoadedLectureFiles(true);
        return;
      }

      const parsedFiles = JSON.parse(rawStoredFiles);
      setUploadedLectureFiles(normalizeLectureFileEntries(parsedFiles));
    } catch {
      setUploadedLectureFiles([]);
    } finally {
      setHasLoadedLectureFiles(true);
    }
  }, [lectureFilesStorageKey]);

  useEffect(() => {
    if (!hasLoadedLectureFiles) return;

    const serializableFiles = uploadedLectureFiles.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      mimeType: file.mimeType,
      dataUrl: file.dataUrl || "",
      url: file.url || "",
    }));

    localStorage.setItem(
      lectureFilesStorageKey,
      JSON.stringify(serializableFiles)
    );
  }, [hasLoadedLectureFiles, lectureFilesStorageKey, uploadedLectureFiles]);

  useEffect(() => {
    const handleStorageSync = (event) => {
      if (event.key !== lectureFilesStorageKey) return;
      if (!event.newValue) {
        setUploadedLectureFiles([]);
        return;
      }

      try {
        const parsedFiles = JSON.parse(event.newValue);
        setUploadedLectureFiles(normalizeLectureFileEntries(parsedFiles));
      } catch {
        setUploadedLectureFiles([]);
      }
    };

    window.addEventListener("storage", handleStorageSync);
    return () => window.removeEventListener("storage", handleStorageSync);
  }, [lectureFilesStorageKey]);

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

  const normalizeLectureFileEntries = (entries) => {
    if (!Array.isArray(entries)) return [];

    return entries
      .filter((entry) => entry && entry.name && (entry.dataUrl || entry.url))
      .map((entry) => ({
        id: entry.id || createClientId("lecture-file"),
        name: entry.name,
        size: Number(entry.size) || 0,
        lastModified: entry.lastModified || Date.now(),
        mimeType: entry.mimeType || "",
        dataUrl: entry.dataUrl || "",
        url: entry.url || "",
      }));
  };

  const mapSectionAssignmentToCard = useCallback((assignment) => {
    const attachmentPath = assignment?.file_path || "";
    const attachmentName =
      attachmentPath.split("/").filter(Boolean).pop() || "assignment.pdf";

    return {
      id: `section-assignment-${assignment.id}`,
      apiId: assignment.id,
      title:
        attachmentName !== "assignment.pdf"
          ? attachmentName
          : assignment.title || "Untitled Assignment",
      description: assignment.description || "",
      dueDate: toDateTimeInputValue(assignment.due_date),
      maxScore: Number(assignment.points) || 100,
      attachments: attachmentPath
        ? [
            {
              name: attachmentName,
              url: toAbsoluteApiUrl(attachmentPath),
              path: attachmentPath,
            },
          ]
        : [],
      doneStudentIds: [],
      missedStudentIds: [],
    };
  }, []);

  const fetchSectionAssignments = useCallback(async () => {
    const canFetch =
      (isTA || (role === "student" && isSectionView)) && activeSectionId;
    if (!canFetch) {
      if (isTA && !activeSectionId) {
        setSectionAssignmentsError(
          "Select a section first from course details to manage assignments."
        );
        setLectureData((prev) => ({ ...prev, assignments: [] }));
      }
      return;
    }

    setIsFetchingSectionAssignments(true);
    setSectionAssignmentsError("");

    try {
      const response = await axios.get(
        `/api/get-section-assignments/${activeSectionId}`,
        {
          headers: buildApiHeaders(token),
        }
      );

      const payload = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

      setLectureData((prev) => ({
        ...prev,
        assignments: payload.map(mapSectionAssignmentToCard),
      }));
    } catch (error) {
      setSectionAssignmentsError(
        error?.response?.data?.message || "Failed to load section assignments."
      );
      setLectureData((prev) => ({ ...prev, assignments: [] }));
    } finally {
      setIsFetchingSectionAssignments(false);
    }
  }, [activeSectionId, isTA, isSectionView, role, mapSectionAssignmentToCard, token]);

  useEffect(() => {
    fetchSectionAssignments();
  }, [fetchSectionAssignments]);

  const getPersonalStatus = (item) => {
    if (item.doneStudentIds?.includes(currentStudentId)) return "done";
    if (item.missedStudentIds?.includes(currentStudentId)) return "missed";
    return "pending";
  };

  const getPersonalQuizScore = (quiz) =>
    quiz.results?.[currentStudentId] ?? null;

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openEdit = (type, item) => {
    if (!canManageLecture) return;
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

    if (isTA && editingType === "assignment") {
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
          `/api/update-section-assignment/${assignmentToUpdate.apiId}`,
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

    if (isTA && type === "assignment") {
      const assignmentToDelete = lectureData.assignments.find(
        (assignment) => assignment.id === id
      );

      if (!assignmentToDelete?.apiId) return;

      try {
        await axios.delete(
          `/api/delete-section-assignment/${assignmentToDelete.apiId}`,
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
    if (!canManageLecture) return;
    setSectionAssignmentsError("");
    setAssignmentForm(getDefaultAssignmentForm());
    setAssignmentDialogOpen(true);
  };

  const closeAssignmentDialog = ({ keepUploadedFiles = false } = {}) => {
    if (!keepUploadedFiles) {
      revokeManyEntryUrls(assignmentForm.files);
    }

    setAssignmentDialogOpen(false);
    setAssignmentForm(getDefaultAssignmentForm());
  };

  const updateAssignmentFormValue = (field, value) => {
    setAssignmentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openQuizDialog = () => {
    if (!canManageLecture) return;
    setQuizDialogMode("create");
    setQuizEditingId(null);
    setQuizForm(getDefaultQuizForm());
    setQuizDialogOpen(true);
  };

  const openQuizEditDialog = (quiz) => {
    if (!canManageLecture) return;
    setQuizDialogMode("edit");
    setQuizEditingId(quiz.id);
    setQuizForm({
      title: quiz.title || "",
      timeLimit: sanitizeQuizNumber(quiz.timeLimit, 1, 180, 30),
      questionCount: sanitizeQuizNumber(quiz.questionCount, 1, 200, 10),
      shuffleQuestions: !!quiz.shuffleQuestions,
    });
    setQuizDialogOpen(true);
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

    if (isTA) {
      setSectionAssignmentsError("");
    }

    setAssignmentForm((prev) => ({
      ...prev,
      files: isTA ? [fileEntries[0]] : [...prev.files, ...fileEntries],
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

    if (isTA) {
      if (!activeSectionId) {
        setSectionAssignmentsError(
          "No active section selected. Open section details from the course page."
        );
        return;
      }

      const selectedFileEntry = assignmentForm.files[0];
      const selectedFile = selectedFileEntry?.file;

      if (!(selectedFile instanceof File)) {
        setSectionAssignmentsError("Please upload a PDF file for the assignment.");
        return;
      }

      const isPdf =
        selectedFile.type === "application/pdf" ||
        selectedFile.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        setSectionAssignmentsError("Only PDF files are allowed.");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("title", trimmed);
        formData.append("section_id", String(activeSectionId));
        formData.append("description", assignmentForm.description.trim());
        formData.append("points", String(Number(assignmentForm.maxScore) || 100));
        if (assignmentForm.dueDate) {
          formData.append("due_date", toApiDateTime(assignmentForm.dueDate));
        }
        formData.append("assignment_file", selectedFile);

        await axios.post("/api/create-section-assignment", formData, {
          headers: buildApiHeaders(token),
        });

        await fetchSectionAssignments();
        closeAssignmentDialog();
      } catch (error) {
        setSectionAssignmentsError(
          error?.response?.data?.message || "Failed to create assignment."
        );
      }
      return;
    }

    setLectureData((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        {
          id: `a-${Date.now()}`,
          title: trimmed,
          description: assignmentForm.description.trim(),
          dueDate: assignmentForm.dueDate,
          maxScore: Number(assignmentForm.maxScore) || 100,
          attachments: assignmentForm.files.map((file) => ({
            name: file.name,
            url: file.url,
          })),
          doneStudentIds: [],
          missedStudentIds: [],
        },
      ],
    }));

    closeAssignmentDialog({ keepUploadedFiles: true });
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

  const deleteQuizFromDialog = () => {
    if (!canManageLecture) return;
    if (quizDialogMode !== "edit" || !quizEditingId) return;

    setLectureData((prev) => ({
      ...prev,
      quizzes: prev.quizzes.filter((quiz) => quiz.id !== quizEditingId),
    }));

    closeQuizDialog();
  };

  const onUploadLectureFile = async (event) => {
    if (!canManageLecture) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setIsUploadingLectureFiles(true);
    setLectureUploadError("");

    try {
      const fileEntries = await Promise.all(
        files.map(async (file) => ({
          id: createClientId("lecture-file"),
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          mimeType: file.type || "",
          dataUrl: await readFileAsDataUrl(file),
          url: "",
        }))
      );

      setUploadedLectureFiles((prev) => {
        const existingFiles = new Set(
          prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
        );
        const uniqueEntries = fileEntries.filter(
          (file) =>
            !existingFiles.has(`${file.name}-${file.size}-${file.lastModified}`)
        );
        return [...prev, ...uniqueEntries];
      });
    } catch {
      setLectureUploadError("Upload failed. Please try again.");
    } finally {
      setIsUploadingLectureFiles(false);
      event.target.value = "";
    }
  };

  const removeLectureFile = (fileId) => {
    setUploadedLectureFiles((prev) => {
      const target = prev.find((file) => file.id === fileId);

      if (target?.url?.startsWith("blob:")) {
        revokeEntryUrl(target);
      }

      return prev.filter((file) => file.id !== fileId);
    });
  };

  const isAssignmentFormValid = assignmentForm.title.trim().length > 0;
  const isQuizFormValid =
    quizForm.title.trim().length > 0 &&
    sanitizeQuizNumber(quizForm.timeLimit, 1, 180, 0) > 0 &&
    sanitizeQuizNumber(quizForm.questionCount, 1, 200, 0) > 0;

  return (
    <section className="lecture-details-page">
      <div className="lecture-details-shell">
        <button
          type="button"
          className="lecture-details-back-btn"
          onClick={() => navigate(`/${role}/courses`)}
        >
          <FiArrowLeft />
          Back to {lectureData.course}
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

            {canManageLecture && (
              <div className="lecture-details-upload-wrap">
                <input
                  type="file"
                  ref={lectureFileInputRef}
                  className="lecture-details-hidden-file"
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
                          const fileHref = file.dataUrl || file.url;
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
                        const fileHref = file.dataUrl || file.url;
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
                      {canManageLecture && (
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
              {isTA && isFetchingSectionAssignments && (
                <p className="lecture-content-hint">Loading section assignments...</p>
              )}
              {isTA && sectionAssignmentsError && (
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
                    if (role !== "student") return;
                    const targetId = assignment.apiId ?? assignment.id;
                    navigate(`/student/section/${targetId}`);
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
                          <button type="button" onClick={saveEdit}>
                            Save
                          </button>
                          <button type="button" onClick={cancelEdit}>
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="delete"
                            onClick={() =>
                              deleteItem("assignment", assignment.id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h3>{assignment.title}</h3>
                    )}

                    {canManageLecture &&
                      editingId !== assignment.id &&
                      editingType !== "assignment" && (
                        <button
                          type="button"
                          className="lecture-details-icon-btn"
                          onClick={() => openEdit("assignment", assignment)}
                          aria-label={`Edit ${assignment.title}`}
                        >
                          <FaRegEdit size={12} />
                        </button>
                      )}
                  </div>

                  {canManageLecture ? (
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

                            return (
                              <span key={`${normalizedAttachment.name}-${index}`}>
                                {normalizedAttachment.url ? (
                                  <a
                                    className="lecture-details-file-link"
                                    href={normalizedAttachment.url}
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

            {canManageLecture && (
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
            <div className="lecture-details-card-list">
              {lectureData.quizzes.map((quiz) => (
                <article key={quiz.id} className="lecture-details-card">
                  {(() => {
                    const personalStatus = getPersonalStatus(quiz);
                    const personalStatusLabel =
                      personalStatus === "done"
                        ? "Done"
                        : personalStatus === "missed"
                          ? "Missed"
                          : "Pending";
                    const personalScore = getPersonalQuizScore(quiz);

                    return (
                      <>
                  <div className="lecture-details-card-head">
                    <h3>
                      {quiz.title}
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
                          onClick={() => openQuizEditDialog(quiz)}
                          aria-label={`Edit ${quiz.title}`}
                        >
                          <FaRegEdit size={12} />
                        </button>
                      )}
                  </div>

                  {canManageLecture ? (
                    <div className="lecture-details-status-row">
                      <p className="status done">
                        <FiCheckCircle />
                        <strong>Done:</strong>
                        <span>{getNames(quiz.doneStudentIds)}</span>
                      </p>
                      <p className="status missed">
                        <FiMinusCircle />
                        <strong>Missed:</strong>
                        <span>{getNames(quiz.missedStudentIds)}</span>
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

                  {(quiz.timeLimit || quiz.questionCount || quiz.shuffleQuestions) && (
                    <div className="lecture-details-quiz-meta">
                      {quiz.timeLimit && <span>Time: {quiz.timeLimit} min</span>}
                      {quiz.questionCount && (
                        <span>Questions: {quiz.questionCount}</span>
                      )}
                      {quiz.shuffleQuestions && <span>Shuffled</span>}
                    </div>
                  )}

                  {(canManageLecture
                    ? Object.keys(quiz.results || {}).length > 0
                    : personalScore !== null) && (
                    <button type="button" className="lecture-details-link-btn">
                      View Results <span>&rarr;</span>
                    </button>
                  )}
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>

            {canManageLecture && (
              <div className="lecture-details-actions-row">
                <div className="lecture-details-inline-add">
                  <button
                    type="button"
                    className="primary"
                    onClick={openQuizDialog}
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
              aria-label="Create assignment"
            >
              <div className="lecture-assignment-dialog-header">
                <div className="lecture-assignment-dialog-heading">
                  <span className="lecture-assignment-dialog-icon">
                    <FiFileText />
                  </span>
                  <div>
                    <h2>New Assignment</h2>
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
                    accept={isTA ? ".pdf,application/pdf" : ".pdf,.doc,.docx,.txt,.zip,.rar"}
                    multiple={!isTA}
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

                  {isTA && sectionAssignmentsError && (
                    <p className="lecture-content-hint">{sectionAssignmentsError}</p>
                  )}
                </div>

                {isAssignmentFormValid && (
                  <p className="lecture-assignment-status-note">
                    <FiClock />
                    Assignment will be visible to all enrolled students
                    immediately.
                  </p>
                )}

                <div className="lecture-assignment-dialog-actions">
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
                    Create Assignment
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

export default LectureDetails;