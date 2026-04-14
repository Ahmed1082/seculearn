import "../../styles/SubmitAssignment.css";
import { FaEdit, FaEllipsisV, FaPlus, FaRegCommentDots, FaTrash } from "react-icons/fa";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://cary-nontumorous-unimpedingly.ngrok-free.dev";

const toAbsoluteApiUrl = (path = "") => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
};

const getNameFromPath = (path = "") => {
  const value = String(path || "").trim();
  if (!value) return "";
  const cleanValue = value.split("?")[0];
  const parts = cleanValue.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
};

const getApiFileDisplayName = (fileLike = {}, fallbackPath = "") => {
  return (
    fileLike?.original_name ||
    fileLike?.original_file_name ||
    fileLike?.file_name ||
    fileLike?.submission_file_name ||
    fileLike?.filename ||
    getNameFromPath(fallbackPath) ||
    ""
  );
};

const getDisplayName = () => {
  try {
    const stored = localStorage.getItem("user");
    const role = localStorage.getItem("role") || "student";
    const fallback =
      role === "ta" ? "TA" : role === "lecturer" ? "Lecturer" : "Student";
    if (!stored) return fallback;
    const user = JSON.parse(stored);
    return (
      user.name ||
      user.full_name ||
      user.username ||
      (user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : null) ||
      user.first_name ||
      fallback
    );
  } catch {
    return "Student";
  }
};

const getCurrentUserId = () => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return "";
    const user = JSON.parse(stored);
    return String(
      user.id ||
      user.user_id ||
      user.student_id ||
      user.lecturer_id ||
      user.instructor_id ||
      user.ta_id ||
      user.username ||
      ""
    );
  } catch {
    return "";
  }
};

const getCurrentUserRole = () => {
  try {
    const role = localStorage.getItem("role") || "student";
    return String(role).toLowerCase();
  } catch {
    return "student";
  }
};

const createClientId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildApiHeaders = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  "ngrok-skip-browser-warning": "true",
});

const toAssignmentFileUrl = (path = "") => {
  const cleanPath = String(path || "").trim();
  if (!cleanPath) return "";
  if (/^https?:\/\//i.test(cleanPath)) return cleanPath;
  const normalized = cleanPath.replace(/^\/+/, "");
  if (normalized.startsWith("storage/") || normalized.startsWith("uploads/")) {
    return toAbsoluteApiUrl(normalized);
  }
  return toAbsoluteApiUrl(`storage/${normalized}`);
};

const extractSubmissionMeta = (payload) => {
  if (!payload) return null;

  const candidates = [
    payload,
    payload?.data,
    payload?.submission,
    payload?.student_submission,
    payload?.my_submission,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const filePath =
      candidate?.submission_file_path ||
      candidate?.file_path ||
      candidate?.submission_path ||
      candidate?.path ||
      candidate?.submission_file ||
      candidate?.file_url ||
      candidate?.url ||
      "";

    const fileName =
      getApiFileDisplayName(candidate, filePath) || "";

    const id = candidate?.id || candidate?.submission_id || null;

    if (filePath || fileName || id) {
      return {
        id,
        url: filePath ? toAbsoluteApiUrl(filePath) : "",
        name: fileName,
      };
    }
  }

  return null;
};

const extractExistingSubmissionMeta = (assignment) => {
  if (!assignment) return null;

  const candidates = [
    assignment?.submission,
    assignment?.student_submission,
    assignment?.my_submission,
    assignment?.data?.submission,
    assignment?.data?.student_submission,
    assignment?.data?.my_submission,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const meta = extractSubmissionMeta(candidate);
    if (meta?.url || meta?.id || meta?.name) {
      return meta;
    }
  }

  return null;
};

const hasSubmissionBinding = (assignment) =>
  !!assignment &&
  (Object.prototype.hasOwnProperty.call(assignment, "submission") ||
    Object.prototype.hasOwnProperty.call(assignment, "student_submission") ||
    Object.prototype.hasOwnProperty.call(assignment, "my_submission"));

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseAssignmentDate = (value) => {
  if (!value) return null;
  const parsed = new Date(String(value).trim().replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const readAssignmentBoolean = (assignment, ...keys) => {
  for (const key of keys) {
    if (typeof assignment?.[key] === "boolean") return assignment[key];
    if (assignment?.[key] === 1 || assignment?.[key] === "1") return true;
    if (assignment?.[key] === 0 || assignment?.[key] === "0") return false;
  }
  return null;
};

const formatGradeDate = (value) => {
  if (!value) return "";

  const normalized = String(value).replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

const extractGradeMeta = (assignment) => {
  if (!assignment) {
    return {
      value: null,
      gradedAt: "",
    };
  }

  const candidates = [
    assignment?.my_submission,
    assignment?.student_submission,
    assignment?.submission,
    assignment?.data?.my_submission,
    assignment?.data?.student_submission,
    assignment?.data?.submission,
    assignment,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const value =
      toNumberOrNull(candidate?.grade) ??
      toNumberOrNull(candidate?.score) ??
      toNumberOrNull(candidate?.points_awarded) ??
      toNumberOrNull(candidate?.awarded_points) ??
      toNumberOrNull(candidate?.mark);

    const gradedAt =
      candidate?.graded_at ||
      candidate?.returned_at ||
      candidate?.updated_at ||
      "";

    if (value !== null || gradedAt) {
      return {
        value,
        gradedAt,
      };
    }
  }

  return {
    value: null,
    gradedAt: "",
  };
};

const normalizeComment = (
  comment,
  fallbackName = "User",
  fallbackRole = "student"
) => {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

  const currentUserId =
    storedUser.id ||
    storedUser.user_id ||
    storedUser.student_id ||
    storedUser.lecturer_id ||
    storedUser.instructor_id ||
    storedUser.ta_id ||
    null;

  const userId =
    comment?.user_id ??
    comment?.user?.id ??
    currentUserId;

  return {
    id: comment?.id ?? createClientId("comment"),
    message: comment?.message || comment?.text || "",
    user_id: userId,
    user: {
      id: userId,
      role: String(
        comment?.user?.role ||
        comment?.role ||
        fallbackRole ||
        "student"
      ).toLowerCase(),
      name:
        comment?.user?.name ||
        comment?.user?.username ||
        comment?.name ||
        fallbackName,
    },
  };
};

const findAssignmentById = (payload, assignmentId) => {
  const candidates = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : payload?.data && typeof payload.data === "object"
        ? [payload.data]
        : payload && typeof payload === "object"
          ? [payload]
          : [];

  return (
    candidates.find(
      (entry) => String(entry?.id ?? entry?.assignment_id ?? "") === String(assignmentId)
    ) || null
  );
};

const SubmitAssignment = ({ unitType = "lecture" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const objectUrlsRef = useRef(new Set());
  const { assignmentId, lectureId, sectionId } = useParams();
  const token = localStorage.getItem("token");
  const displayName = useMemo(() => getDisplayName(), []);
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const currentUserRole = useMemo(() => getCurrentUserRole(), []);

  const isSection = unitType === "section";
  const scope = isSection ? "section" : "lecture";
  const unitLabel = isSection ? "Section" : "Lecture";
  const contentId = isSection ? sectionId : lectureId;
  const stateLectureTitle = location.state?.lectureTitle || location.state?.title || "";
  const stateSectionTitle = location.state?.sectionTitle || location.state?.title || "";
  const stateCourseId = location.state?.courseId || "";
  const submissionCacheKey = useMemo(
    () =>
      `student-submission:${scope}:${String(contentId || "unknown")}:${String(
        assignmentId || "unknown"
      )}:${currentUserId}`,
    [assignmentId, contentId, currentUserId, scope]
  );

  const [privateComment, setPrivateComment] = useState("");
  const [privateComments, setPrivateComments] = useState([]);

  const [classComment, setClassComment] = useState("");
  const [classComments, setClassComments] = useState([]);
  const [showClassInput, setShowClassInput] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submittedFile, setSubmittedFile] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [commentError, setCommentError] = useState("");

  const [activeMenu, setActiveMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editedText, setEditedText] = useState("");

  const [activeClassMenu, setActiveClassMenu] = useState(null);
  const [editingClassId, setEditingClassId] = useState(null);
  const [editedClassText, setEditedClassText] = useState("");

  const [assignment, setAssignment] = useState(null);

  const isCommentOwnedByCurrentUser = useCallback((comment) => {
    if (!comment) return false;

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    const currentId = String(
      storedUser.id ||
      storedUser.user_id ||
      storedUser.student_id ||
      storedUser.lecturer_id ||
      storedUser.instructor_id ||
      storedUser.ta_id ||
      ""
    );

    const currentName = String(
      storedUser.name ||
      storedUser.full_name ||
      storedUser.username ||
      ""
    )
      .trim()
      .toLowerCase();

    const ownerId = String(comment?.user_id ?? comment?.user?.id ?? "").trim();
    const ownerName = String(
      comment?.user?.name || comment?.name || ""
    )
      .trim()
      .toLowerCase();

    if (ownerId && currentId && ownerId === currentId) {
      return true;
    }

    if (ownerName && currentName && ownerName === currentName) {
      return true;
    }

    return false;
  }, []);
  const createObjectUrl = useCallback((file) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeObjectUrl = useCallback((url) => {
    if (!url || !objectUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  }, []);

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    },
    []
  );

  const fetchAssignmentComments = useCallback(async () => {
    if (!assignmentId || !token) return;

    try {
      const [classRes, privateRes] = await Promise.all([
        axios.get(`/api/get-class-comments/${assignmentId}`, {
          headers: buildApiHeaders(token),
        }),
        axios.get(`/api/get-private-comments/${assignmentId}`, {
          headers: buildApiHeaders(token),
        }),
      ]);

      const classData = Array.isArray(classRes?.data?.data)
        ? classRes.data.data
        : [];
      const privateData = Array.isArray(privateRes?.data?.data)
        ? privateRes.data.data
        : [];

      setClassComments(classData.map((comment) => normalizeComment(comment)));
      setPrivateComments(
        privateData.map((comment) =>
          normalizeComment(comment, displayName, currentUserRole)
        )
      );
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  }, [assignmentId, currentUserRole, displayName, token]);

  const readCachedSubmission = useCallback(() => {
    if (!submissionCacheKey) return null;

    try {
      const raw = localStorage.getItem(submissionCacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.url && !parsed.name && !parsed.id) {
        localStorage.removeItem(submissionCacheKey);
        return null;
      }

      return {
        id: parsed.id || null,
        name: parsed.name || "Submitted file",
        url: parsed.url || "",
      };
    } catch {
      localStorage.removeItem(submissionCacheKey);
      return null;
    }
  }, [submissionCacheKey]);

  const cacheSubmittedFile = useCallback(
    (entry, id = null) => {
      if (!submissionCacheKey || !entry) return;

      const payload = {
        id: id || null,
        name: entry.name || "Submitted file",
        url: entry.url || "",
      };

      if (!payload.id && !payload.name && !payload.url) return;
      localStorage.setItem(submissionCacheKey, JSON.stringify(payload));
    },
    [submissionCacheKey]
  );

  const clearCachedSubmission = useCallback(() => {
    if (!submissionCacheKey) return;
    localStorage.removeItem(submissionCacheKey);
  }, [submissionCacheKey]);

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!assignmentId) return;

      if (!token) {
        setAssignment({
          id: assignmentId,
          title: `${unitLabel} Assignment`,
          points: 100,
          due_date: "",
          file_path: "",
          updated_at: "",
        });
        return;
      }

      try {
        if (!contentId) {
          setAssignment({
            id: assignmentId,
            title: `${unitLabel} Assignment`,
            points: 100,
            due_date: "",
            file_path: "",
            updated_at: "",
          });
          await fetchAssignmentComments();
          return;
        }

        const res = await axios.get(`/api/get-${scope}-assignments/${contentId}`, {
          headers: buildApiHeaders(token),
        });

        const loadedAssignment = findAssignmentById(res?.data, assignmentId);
        setAssignment(loadedAssignment);

        const existingSubmission = extractExistingSubmissionMeta(loadedAssignment);
        if (existingSubmission?.url || existingSubmission?.id) {
          if (existingSubmission?.id) setSubmissionId(existingSubmission.id);
          const nextSubmittedFile = {
            name: existingSubmission.name || "Submitted file",
            url: existingSubmission.url || "",
            isLocal: false,
          };
          setSubmittedFile(nextSubmittedFile);
          setIsSubmitted(true);
          cacheSubmittedFile(nextSubmittedFile, existingSubmission.id);
        } else if (!hasSubmissionBinding(loadedAssignment)) {
          const cachedSubmission = readCachedSubmission();
          if (cachedSubmission?.url || cachedSubmission?.name || cachedSubmission?.id) {
            if (cachedSubmission?.id) setSubmissionId(cachedSubmission.id);
            setSubmittedFile({
              name: cachedSubmission.name || "Submitted file",
              url: cachedSubmission.url || "",
              isLocal: false,
            });
            setIsSubmitted(true);
          } else {
            setSubmittedFile(null);
            setSubmissionId(null);
            setIsSubmitted(false);
          }
        } else {
          clearCachedSubmission();
          setSubmittedFile(null);
          setSubmissionId(null);
          setIsSubmitted(false);
        }

        await fetchAssignmentComments();
      } catch (error) {
        console.error(`Error fetching ${scope} assignment:`, error);
      }
    };

    fetchAssignment();
  }, [
    assignmentId,
    cacheSubmittedFile,
    clearCachedSubmission,
    contentId,
    fetchAssignmentComments,
    readCachedSubmission,
    scope,
    token,
    unitLabel,
  ]);

  const handleAddWork = () => {
    if (isSubmissionClosed) {
      setSubmitError(submissionClosedMessage || "Submissions are closed.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleNavigateToAssignments = () => {
    navigate("/student/allAssignments");
  };

  const handleNavigateToUnit = () => {
    if (!contentId) {
      handleNavigateToAssignments();
      return;
    }

    if (isSection) {
      navigate("/student/contentDetails", {
        state: {
          sectionId: contentId,
          id: contentId,
          sectionTitle: stateSectionTitle || `${unitLabel} ${contentId}`,
          ...(stateCourseId ? { courseId: stateCourseId } : {}),
        },
      });
      return;
    }

    navigate("/student/contentDetails", {
      state: {
        lectureId: contentId,
        id: contentId,
        lectureTitle: stateLectureTitle || `${unitLabel} ${contentId}`,
        ...(stateCourseId ? { courseId: stateCourseId } : {}),
      },
    });
  };

  const handleFileChange = (event) => {
    if (isSubmissionClosed) {
      setSubmitError(submissionClosedMessage || "Submissions are closed.");
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files || []).map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: createObjectUrl(file),
      isLocal: true,
    }));
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
    event.target.value = "";
  };

  const clearSelectedFiles = useCallback(
    (preserveUrl = "") => {
      setSelectedFiles((prev) => {
        prev.forEach((entry) => {
          if (entry?.isLocal && entry.url && entry.url !== preserveUrl) {
            revokeObjectUrl(entry.url);
          }
        });
        return [];
      });
    },
    [revokeObjectUrl]
  );

  const handleRemoveFile = (index) => {
    if (isSubmitted) return;

    setSelectedFiles((prev) => {
      const target = prev[index];
      if (target?.isLocal) revokeObjectUrl(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (isSubmissionClosed) {
      setSubmitError(submissionClosedMessage || "Submissions are closed.");
      return;
    }
    if (selectedFiles.length === 0) {
      setSubmitError("No file selected.");
      return;
    }

    const selectedEntry = selectedFiles[0];
    const file = selectedEntry?.file;
    if (!file) {
      setSubmitError("No file selected.");
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setSubmitError("Only PDF files are allowed.");
      return;
    }
    if (file.size > maxBytes) {
      setSubmitError("File exceeds 10MB size limit.");
      return;
    }

    if (!token) {
      const nextSubmittedFile = {
        name: selectedEntry.name,
        url: selectedEntry.url,
        isLocal: true,
      };
      setSubmittedFile(nextSubmittedFile);
      clearSelectedFiles(selectedEntry.url);
      setIsSubmitted(true);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("assignment_id", String(assignmentId));
      formData.append("submission_file", file);

      const res = await axios.post("/api/submit-work", formData, {
        headers: buildApiHeaders(token),
      });

      const payload = res?.data?.data || res?.data || null;
      const meta = extractSubmissionMeta(payload);
      if (meta?.id) setSubmissionId(meta.id);

      const submittedEntry = meta?.url
        ? { name: meta.name || file.name, url: meta.url, isLocal: false }
        : { name: selectedEntry.name, url: selectedEntry.url, isLocal: true };

      setSubmittedFile(submittedEntry);
      clearSelectedFiles(submittedEntry.isLocal ? submittedEntry.url : "");
      setIsSubmitted(true);
      cacheSubmittedFile(submittedEntry, meta?.id || null);
    } catch (error) {
      setSubmitError(error?.response?.data?.message || "Failed to submit work.");
      console.error("Submit error:", error);
    }
  };

  const handleUnsubmit = async () => {
    if (!token) {
      if (submittedFile?.isLocal) revokeObjectUrl(submittedFile.url);
      setSubmittedFile(null);
      setSubmissionId(null);
      setIsSubmitted(false);
      return;
    }

    if (!submissionId) return;
    try {
      await axios.delete(`/api/unsubmit-work/${submissionId}`, {
        headers: buildApiHeaders(token),
      });
      clearCachedSubmission();
      setIsSubmitted(false);
      setSubmissionId(null);
      setSubmittedFile(null);
    } catch (error) {
      console.error("Unsubmit error:", error);
    }
  };

  const handlePrivatePost = async () => {
    setCommentError("");
    const message = privateComment.trim();
    if (!message) {
      setCommentError("Message is required.");
      return;
    }

    if (!token) {
      setPrivateComments((prev) => [
        ...prev,
        normalizeComment(
          {
            id: createClientId("private"),
            message,
            user: { id: currentUserId, role: currentUserRole, name: displayName },
            user_id: currentUserId,
          },
          displayName,
          currentUserRole
        ),
      ]);
      setPrivateComment("");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("assignment_id", String(assignmentId));
      formData.append("message", message);
      formData.append("is_private", String(1));

      await axios.post("/api/add-comment", formData, {
        headers: buildApiHeaders(token),
      });

      setPrivateComment("");
      await fetchAssignmentComments();
    } catch (error) {
      setCommentError(error?.response?.data?.message || "Failed to post comment.");
      console.error("Private comment error:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!token) {
      setPrivateComments((prev) =>
        prev.filter((comment) => String(comment.id) !== String(id))
      );
      setActiveMenu(null);
      return;
    }

    const target = privateComments.find((comment) => String(comment.id) === String(id));
    if (!target?.id) return;
    if (!isCommentOwnedByCurrentUser(target)) return;

    try {
      await axios.delete(`/api/delete-comment/${target.id}`, {
        headers: buildApiHeaders(token),
      });
      setActiveMenu(null);
      await fetchAssignmentComments();
    } catch (error) {
      console.error("Delete private comment error:", error);
    }
  };

  const handleEdit = (id) => {
    const target = privateComments.find((comment) => String(comment.id) === String(id));
    if (!isCommentOwnedByCurrentUser(target)) return;
    setEditingId(id);
    setEditedText(target?.message || "");
    setActiveMenu(null);
  };

  const handleSaveEdit = async () => {
    const message = editedText.trim();
    if (!message) return;

    if (!token) {
      setPrivateComments((prev) =>
        prev.map((comment) =>
          String(comment.id) === String(editingId)
            ? { ...comment, message }
            : comment
        )
      );
      setEditingId(null);
      return;
    }

    const target = privateComments.find(
      (comment) => String(comment.id) === String(editingId)
    );
    if (!target?.id) return;
    if (!isCommentOwnedByCurrentUser(target)) return;

    try {
      const formData = new FormData();
      formData.append("message", message);
      formData.append("is_private", String(1));

      await axios.post(`/api/update-comment/${target.id}`, formData, {
        headers: buildApiHeaders(token),
      });

      setEditingId(null);
      await fetchAssignmentComments();
    } catch (error) {
      console.error("Update private comment error:", error);
    }
  };

  const handleClassPost = async () => {
    setCommentError("");
    const message = classComment.trim();
    if (!message) {
      setCommentError("Message is required.");
      return;
    }

    if (!token) {
      setClassComments((prev) => [
        ...prev,
        normalizeComment(
          {
            id: createClientId("class"),
            message,
            user: { id: currentUserId, role: currentUserRole, name: displayName },
            user_id: currentUserId,
          },
          displayName,
          currentUserRole
        ),
      ]);
      setClassComment("");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("assignment_id", String(assignmentId));
      formData.append("message", message);
      formData.append("is_private", String(0));

      await axios.post("/api/add-comment", formData, {
        headers: buildApiHeaders(token),
      });

      setClassComment("");
      await fetchAssignmentComments();
    } catch (error) {
      setCommentError(error?.response?.data?.message || "Failed to post comment.");
      console.error("Class comment error:", error);
    }
  };

  const handleDeleteClass = async (id) => {
    if (!token) {
      setClassComments((prev) =>
        prev.filter((comment) => String(comment.id) !== String(id))
      );
      setActiveClassMenu(null);
      return;
    }

    const target = classComments.find((comment) => String(comment.id) === String(id));
    if (!target?.id) return;
    if (!isCommentOwnedByCurrentUser(target)) return;

    try {
      await axios.delete(`/api/delete-comment/${target.id}`, {
        headers: buildApiHeaders(token),
      });
      setActiveClassMenu(null);
      await fetchAssignmentComments();
    } catch (error) {
      console.error("Delete class comment error:", error);
    }
  };

  const handleEditClass = (id) => {
    const target = classComments.find((comment) => String(comment.id) === String(id));
    if (!isCommentOwnedByCurrentUser(target)) return;
    setEditingClassId(id);
    setEditedClassText(target?.message || "");
    setActiveClassMenu(null);
  };

  const handleSaveClassEdit = async () => {
    const message = editedClassText.trim();
    if (!message) return;

    if (!token) {
      setClassComments((prev) =>
        prev.map((comment) =>
          String(comment.id) === String(editingClassId)
            ? { ...comment, message }
            : comment
        )
      );
      setEditingClassId(null);
      return;
    }

    const target = classComments.find(
      (comment) => String(comment.id) === String(editingClassId)
    );
    if (!target?.id) return;
    if (!isCommentOwnedByCurrentUser(target)) return;

    try {
      const formData = new FormData();
      formData.append("message", message);
      formData.append("is_private", String(0));

      await axios.post(`/api/update-comment/${target.id}`, formData, {
        headers: buildApiHeaders(token),
      });

      setEditingClassId(null);
      await fetchAssignmentComments();
    } catch (error) {
      console.error("Update class comment error:", error);
    }
  };

  const toggleMenu = (id) => {
    setActiveMenu((prev) => (String(prev) === String(id) ? null : id));
  };

  const toggleClassMenu = (id) => {
    setActiveClassMenu((prev) => (String(prev) === String(id) ? null : id));
  };

  const isShowingSelectedFiles = selectedFiles.length > 0;
  const workFiles = isShowingSelectedFiles
    ? selectedFiles
    : submittedFile
      ? [submittedFile]
      : [];

  const dueDateValue = assignment?.due_date
    ? String(assignment.due_date).replace("T", " ").split(" ")[0]
    : "";
  const assignmentTitle = assignment?.title || `${unitLabel} Assignment`;
  const assignmentPoints = Number(assignment?.points) || 100;
  const gradeMeta = useMemo(() => extractGradeMeta(assignment), [assignment]);
  const hasGrade = gradeMeta.value !== null;
  const gradePercent = assignmentPoints
    ? Math.max(0, Math.min(100, Math.round((Math.max(0, gradeMeta.value || 0) / assignmentPoints) * 100)))
    : 0;
  const gradeDisplay = hasGrade
    ? `${Math.round((gradeMeta.value || 0) * 10) / 10}/${assignmentPoints}`
    : `--/${assignmentPoints}`;
  const gradeDateLabel = formatGradeDate(gradeMeta.gradedAt);
  const assignmentFilePath = assignment?.file_path || "";
  const assignmentFileName = getApiFileDisplayName(assignment, assignmentFilePath);
  const assignmentFileUrl = toAssignmentFileUrl(assignmentFilePath);
  const isAcceptingSubmissions =
    readAssignmentBoolean(assignment, "is_accepting", "accepting_submissions") ??
    true;
  const closeOnDeadline =
    readAssignmentBoolean(
      assignment,
      "close_on_deadline",
      "close_submissions_after_due_date"
    ) ?? false;
  const parsedDueDate = parseAssignmentDate(assignment?.due_date);
  const isDueDatePassed = parsedDueDate
    ? parsedDueDate.getTime() < Date.now()
    : false;
  const isSubmissionClosed =
    !isAcceptingSubmissions || (closeOnDeadline && isDueDatePassed);
  const submissionClosedMessage = !isAcceptingSubmissions
    ? "Submissions are currently closed for this assignment."
    : closeOnDeadline && isDueDatePassed
      ? "Submissions are closed because the deadline has passed."
      : "";

  return (
    <div className={isSection ? "sectionassignments" : "lectureassignments"}>
      <div className="assignment-container">
        <h1 className="course-title">Introduction to Cybersecurity</h1>

        <div className="assignment-path">
          <button type="button" onClick={handleNavigateToUnit}>
            {unitLabel} {contentId || 1}
          </button>
          <span>&gt;</span>
          <button type="button" onClick={handleNavigateToAssignments}>
            Assignments
          </button>
          <span>&gt;</span>
          <button type="button" aria-current="page">
            {assignmentTitle}
          </button>
        </div>

        <div className="assignment-grid">
          <div className="assignment-card large">
            <div className="card-header">
              <h2>{assignmentTitle}</h2>
              <span className="due-date">{dueDateValue ? `Due ${dueDateValue}` : ""}</span>
            </div>

            <p>Assigned: {assignmentPoints} points</p>
            <p>
              Assignment last updated:{" "}
              {assignment?.updated_at
                ? String(assignment.updated_at).replace("T", " ").split(" ")[0]
                : "N/A"}
            </p>

            <div className="divider" />

            {assignmentFileUrl ? (
              <a
                href={assignmentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="file-link"
              >
                {assignmentFileName || "Assignment file"}
              </a>
            ) : (
              <span className="file-link">{assignmentFileName || "No attached file"}</span>
            )}

            <p>Please submit work as pdf</p>

            <div className="divider" />

            <a
              href="#"
              className="file-link class-comment-link"
              onClick={(event) => {
                event.preventDefault();
                setShowClassInput((prev) => !prev);
              }}
            >
              <FaRegCommentDots className="comment-icon" />
              Class Comments...
            </a>

            {showClassInput && (
              <>
                <input
                  type="text"
                  value={classComment}
                  onChange={(event) => setClassComment(event.target.value)}
                  placeholder="Add a class comment..."
                  className="comment-input"
                />
                <button className="primary-btn" onClick={handleClassPost}>
                  Post
                </button>
                {commentError && (
                  <p className="form-error" style={{ color: "#e17055", marginTop: 8 }}>
                    {commentError}
                  </p>
                )}

                <div className="comments-list">
                  {classComments.map((comment) => {
                    const canManageComment = isCommentOwnedByCurrentUser(comment);
                    return (
                    <div key={comment.id} className="comment-item">
                    {String(editingClassId) === String(comment.id) ? (
                      <div className="edit-area">
                          <input
                            type="text"
                            value={editedClassText}
                            onChange={(event) => setEditedClassText(event.target.value)}
                            className="comment-input"
                          />
                          <div className="edit-actions">
                            <button className="menu-btn" onClick={handleSaveClassEdit}>
                              Save
                            </button>
                            <button
                              className="menu-btn"
                              onClick={() => setEditingClassId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="comment-content">
                            <strong>{comment?.user?.name || "User"}</strong>
                            <span className="comment-text">{comment?.message}</span>
                          </div>

                          {canManageComment && (
                            <div className="comment-menu">
                              <button
                                className="menu-btn"
                                onClick={() => toggleClassMenu(comment.id)}
                              >
                                <FaEllipsisV />
                              </button>

                              {String(activeClassMenu) === String(comment.id) && (
                                <div className="menu-dropdown">
                                  <button onClick={() => handleEditClass(comment.id)}>
                                    <FaEdit className="dropdown-icon" />
                                    Edit
                                  </button>

                                  <button onClick={() => handleDeleteClass(comment.id)}>
                                    <FaTrash className="dropdown-icon" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="right-column">
            <div className="assignment-card">
              <div className="card-header">
                <h2>Your Work</h2>
                <span className="status">{isSubmitted ? "Submitted" : "Assigned"}</span>
              </div>

              <input
                type="file"
                multiple
                accept=".pdf"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {workFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="uploaded-file">
                  <span>
                    {file?.url ? (
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        {file.name}
                      </a>
                    ) : (
                      file.name
                    )}
                  </span>
                  {!isSubmitted && (
                    <button
                      className="remove-btn"
                      onClick={() => {
                        if (isShowingSelectedFiles) {
                          handleRemoveFile(index);
                          return;
                        }

                        if (submittedFile?.isLocal) {
                          revokeObjectUrl(submittedFile.url);
                        }
                        setSubmittedFile(null);
                      }}
                    >
                      X
                    </button>
                  )}
                </div>
              ))}

              {!isSubmitted ? (
                <>
                  <button
                    className="primary-btn full"
                    onClick={handleAddWork}
                    disabled={isSubmissionClosed}
                  >
                    <FaPlus /> Add Work
                  </button>

                  <button
                    className="primary-btn full"
                    onClick={handleSubmit}
                    disabled={isSubmissionClosed}
                  >
                    Submit
                  </button>
                  {isSubmissionClosed && (
                    <p className="form-error" style={{ color: "#e17055", marginTop: 8 }}>
                      {submissionClosedMessage}
                    </p>
                  )}
                  {submitError && (
                    <p className="form-error" style={{ color: "#e17055", marginTop: 8 }}>
                      {submitError}
                    </p>
                  )}
                </>
              ) : (
                <button className="primary-btn full" onClick={handleUnsubmit}>
                  Unsubmit
                </button>
              )}
            </div>

            <div className={`assignment-card assignment-grade-card ${hasGrade ? "is-graded" : "is-pending"}`}>
              <div className="assignment-grade-header">
                <div>
                  <p className="assignment-grade-eyebrow">Evaluation</p>
                  <h2>Grade</h2>
                </div>
                <span className={`assignment-grade-pill ${hasGrade ? "is-graded" : "is-pending"}`}>
                  {hasGrade ? "Returned" : "Not Graded Yet"}
                </span>
              </div>

              <div className="assignment-grade-body">
                <div
                  className={`assignment-grade-ring ${hasGrade ? "is-graded" : "is-pending"}`}
                  style={{ "--grade-progress": `${gradePercent}%` }}
                >
                  <strong>{gradeDisplay}</strong>
                  <span>{hasGrade ? "Score" : "Pending"}</span>
                </div>
              </div>
              <p className="assignment-grade-meta">
                Max score: {assignmentPoints} points
                {gradeDateLabel ? ` - Updated ${gradeDateLabel}` : ""}
              </p>
            </div>

            <div className="assignment-card">
              <h2>Private Comments</h2>

              <input
                type="text"
                value={privateComment}
                onChange={(event) => setPrivateComment(event.target.value)}
                placeholder="+ Add a private comment..."
                className="comment-input"
              />

              {commentError && (
                <p className="form-error" style={{ color: "#e17055", marginTop: 8 }}>
                  {commentError}
                </p>
              )}

              <button className="primary-btn full" onClick={handlePrivatePost}>
                Post
              </button>

              <div className="comments-list">
                {privateComments.map((comment) => {
                  const canManageComment = isCommentOwnedByCurrentUser(comment);
                  return (
                  <div key={comment.id} className="comment-item">
                    {String(editingId) === String(comment.id) ? (
                      <div className="edit-area">
                        <input
                          type="text"
                          value={editedText}
                          onChange={(event) => setEditedText(event.target.value)}
                          className="comment-input"
                        />
                        <div className="edit-actions">
                          <button className="menu-btn" onClick={handleSaveEdit}>
                            Save
                          </button>
                          <button className="menu-btn" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="comment-content">
                          <strong>{comment?.user?.name || displayName}</strong>
                          <span className="comment-text">{comment?.message}</span>
                        </div>

                        {canManageComment && (
                          <div className="comment-menu">
                            <button className="menu-btn" onClick={() => toggleMenu(comment.id)}>
                              <FaEllipsisV />
                            </button>

                            {String(activeMenu) === String(comment.id) && (
                              <div className="menu-dropdown">
                                <button onClick={() => handleEdit(comment.id)}>
                                  <FaEdit className="dropdown-icon" />
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(comment.id)}>
                                  <FaTrash className="dropdown-icon" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitAssignment;

