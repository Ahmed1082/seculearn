import "../../styles/SubmitAssignment.css";
import { FaPlus, FaEllipsisV } from "react-icons/fa";
import { useRef, useState } from "react";
import { FaRegCommentDots } from "react-icons/fa";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const getDisplayName = () => {
  try {
    const stored = localStorage.getItem("user");
    const role = localStorage.getItem("role") || "student";
    const fallback = role === "ta" ? "TA" : role === "lecturer" ? "Lecturer" : "Student";
    if (!stored) return fallback;
    const user = JSON.parse(stored);
    return (
      user.name ||
      user.full_name ||
      user.username ||
      (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) ||
      user.first_name ||
      fallback
    );
  } catch {
    return "Student";
  }
};

const SubmitSectionAssignment = () => {
  const fileInputRef = useRef(null);

  const displayName = getDisplayName();

  const [privateComment, setPrivateComment] = useState("");
  const [privateComments, setPrivateComments] = useState([]);

  const [classComment, setClassComment] = useState("");
  const [classComments, setClassComments] = useState([]);
  const [showClassInput, setShowClassInput] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [activeMenu, setActiveMenu] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editedText, setEditedText] = useState("");

  const [activeClassMenu, setActiveClassMenu] = useState(null);
  const [editingClassId, setEditingClassId] = useState(null);
  const [editedClassText, setEditedClassText] = useState("");
 

  const { assignmentId } = useParams();
  const token = localStorage.getItem("token");

  const currentUserId = (() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return null;
      const u = JSON.parse(stored);
      return u?.id ?? null;
    } catch {
      return null;
    }
  })();

  const [assignment, setAssignment] = useState(null);

  /* ===== FILE UPLOAD ===== */
  const handleAddWork = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index) => {
    if (isSubmitted) return;

    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!token) return setSubmitError("Not authenticated.");
    if (selectedFiles.length === 0) return setSubmitError("No file selected.");

    const file = selectedFiles[0];
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return setSubmitError("Only PDF files are allowed.");
    }
    if (file.size > maxBytes) {
      return setSubmitError("File exceeds 10MB size limit.");
    }

    try {
      const formData = new FormData();
      formData.append("assignment_id", String(assignmentId));
      formData.append("submission_file", file);

      const res = await axios.post(
        "/api/submit-section-work",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      const data = res?.data?.data || null;
      if (data && data.id) {
        setSubmissionId(data.id);
      }
      setSelectedFiles([]);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error?.response?.data?.message || "Failed to submit work.");
      console.error("Submit error:", error);
    }
  };

  const handleUnsubmit = async () => {
    if (!submissionId) return;
    try {
      await axios.delete(`/api/unsubmit-section-work/${submissionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      setIsSubmitted(false);
      setSubmissionId(null);
      setSelectedFiles([]);
    } catch (error) {
      console.error("Unsubmit error:", error);
    }
  };

  /* ===== PRIVATE COMMENT ===== */
  const handlePrivatePost = async () => {
    setCommentError("");
    if (privateComment.trim() === "") return setCommentError("Message is required.");

    try {
      const formData = new FormData();
      formData.append("assignment_id", String(assignmentId));
      formData.append("message", privateComment.trim());
      formData.append("is_private", String(1));

      await axios.post("/api/add-section-assignment-comment", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      setPrivateComment("");
      await fetchComments();
    } catch (error) {
      setCommentError(error?.response?.data?.message || "Failed to post comment.");
      console.error("Private comment error:", error);
    }
  };

  const toggleMenu = (id) => {
    setActiveMenu(prev =>
      String(prev) === String(id) ? null : id
    );
  };

  const handleDelete = async (id) => {
    const target = privateComments.find((c) => String(c.id) === String(id));
    if (!target || !target.id) return;
    try {
      await axios.delete(`/api/delete-section-assignment-comment/${target.id}`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });
      setActiveMenu(null);
      await fetchComments();
    } catch (error) {
      console.error("Delete private comment error:", error);
    }
  };

  // 🔥 تعديل داخلي بدل prompt
  const handleEdit = (id) => {
    const target = privateComments.find((c) => String(c.id) === String(id));
    setEditingId(id);
    setEditedText(target?.message || "");
    setActiveMenu(null);
  };

  const handleSaveEdit = async () => {
    if (editedText.trim() === "") return;
    const target = privateComments.find((c) => String(c.id) === String(editingId));
    if (!target || !target.id) return;

    try {
      const formData = new FormData();
      formData.append("message", editedText.trim());

      await axios.post(`/api/update-section-assignment-comment/${target.id}`, formData, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });

      setEditingId(null);
      await fetchComments();
    } catch (error) {
      console.error("Update private comment error:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  /* ===== CLASS COMMENT ===== */
  const handleClassPost = async () => {
    setCommentError("");
    if (classComment.trim() === "") return setCommentError("Message is required.");

    try {
      const formData = new FormData();
      formData.append("assignment_id", String(assignmentId));
      formData.append("message", classComment.trim());
      formData.append("is_private", String(0));

      await axios.post("/api/add-section-assignment-comment", formData, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });

      setClassComment("");
      await fetchComments();
    } catch (error) {
      setCommentError(error?.response?.data?.message || "Failed to post comment.");
      console.error("Class comment error:", error);
    }
  };
  const toggleClassMenu = (id) => {
    setActiveClassMenu(prev =>
      String(prev) === String(id) ? null : id
    );
  };

  const handleDeleteClass = async (id) => {
    const target = classComments.find((c) => String(c.id) === String(id));
    if (!target || !target.id) return;
    try {
      await axios.delete(`/api/delete-section-assignment-comment/${target.id}`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });
      setActiveClassMenu(null);
      await fetchComments();
    } catch (error) {
      console.error("Delete class comment error:", error);
    }
  };

  const handleEditClass = (id) => {
    const target = classComments.find((c) => String(c.id) === String(id));
    setEditingClassId(id);
    setEditedClassText(target?.message || "");
    setActiveClassMenu(null);
  };

  const handleSaveClassEdit = async () => {
    if (editedClassText.trim() === "") return;
    const target = classComments.find((c) => String(c.id) === String(editingClassId));
    if (!target || !target.id) return;

    try {
      const formData = new FormData();
      formData.append("message", editedClassText.trim());

      await axios.post(`/api/update-section-assignment-comment/${target.id}`, formData, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });

      setEditingClassId(null);
      await fetchComments();
    } catch (error) {
      console.error("Update class comment error:", error);
    }
  };

  const handleCancelClassEdit = () => {
    setEditingClassId(null);
  };

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await axios.get(
          `/api/get-section-assignments/${assignmentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.data.data.length > 0) {
          setAssignment(res.data.data[0]);
        }

      } catch (error) {
        console.error("Error fetching assignments:", error);
      }
    };

    if (assignmentId && token) {
      fetchAssignments();
    }

  }, [assignmentId, token]);

  async function fetchComments() {
    if (!assignmentId || !token) return;
    setIsLoadingComments(true);
    try {
      const [classRes, privateRes] = await Promise.all([
        axios.get(`/api/get-class-section-comments/${assignmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/get-private-section-comments/${assignmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const classData = Array.isArray(classRes?.data?.data) ? classRes.data.data : [];
      const privateData = Array.isArray(privateRes?.data?.data) ? privateRes.data.data : [];

      setClassComments(classData);
      setPrivateComments(privateData);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (assignmentId && token) {
      fetchComments();
    }
  }, [assignmentId, token]);

  return (
    <div className="sectionassignments">
      <div className="assignment-container">

        <h1 className="course-title">
          Introduction to Cybersecurity
        </h1>

        <div className="assignment-path">
          <button>Section 1</button>
          <span>›</span>
          <button>Assignments</button>
          <span>›</span>
          <button>Assignment 1</button>
        </div>

        <div className="assignment-grid">

          {/* LEFT SIDE */}
          <div className="assignment-card large">

            <div className="card-header">
              <h2>{assignment?.title}</h2>
              <span className="due-date">
                Due {assignment?.due_date?.split(" ")[0]}
              </span>
            </div>

            <p>Assigned: {assignment?.points} points</p>
            <p>Assignment last updated: 19 Feb</p>

            <div className="divider" />

            <a
              href={`https://cary-nontumorous-unimpedingly.ngrok-free.dev/storage/${assignment?.file_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="file-link"
            >
              {assignment?.file_path?.split("/").pop()}
            </a>

            <p>Please submit work as pdf</p>

            <div className="divider" />

            <a
              href="#"
              className="file-link class-comment-link"
              onClick={(e) => {
                e.preventDefault();
                setShowClassInput(!showClassInput);
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
                  onChange={(e) => setClassComment(e.target.value)}
                  placeholder="Add a class comment..."
                  className="comment-input"
                />
                <button
                  className="primary-btn"
                  onClick={handleClassPost}
                >
                  Post
                </button>
                {commentError && (
                  <p className="form-error" style={{ color: "#e17055", marginTop: 8 }}>
                    {commentError}
                  </p>
                )}

                <div className="comments-list">
                  {classComments.map((comment, index) => (
                    <div key={comment?.id || index} className="comment-item">

                      {editingClassId === comment?.id ? (
                        <div className="edit-area">
                          <input
                            type="text"
                            value={editedClassText}
                            onChange={(e) => setEditedClassText(e.target.value)}
                            className="comment-input"
                          />
                          <div className="edit-actions">
                            <button className="menu-btn" onClick={handleSaveClassEdit}>
                              Save
                            </button>
                            <button className="menu-btn" onClick={handleCancelClassEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="comment-content">
                            <strong>{comment?.user?.name || comment?.user?.username || 'User'}</strong>
                            <span className="comment-text">{comment?.message}</span>
                          </div>

                          <div className="comment-menu">
                            <button
                              className="menu-btn"
                              onClick={() => toggleClassMenu(comment?.id)}
                            >
                              <FaEllipsisV />
                            </button>

                            {String(activeClassMenu) === String(comment?.id) && (
                              <div className="menu-dropdown">
                                <>
                                  <button onClick={() => handleEditClass(comment?.id)}>
                                    <FaEdit className="dropdown-icon" />
                                    Edit
                                  </button>

                                  <button onClick={() => handleDeleteClass(comment?.id)}>
                                    <FaTrash className="dropdown-icon" />
                                    Delete
                                  </button>
                                </>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* RIGHT SIDE */}
          <div className="right-column">

            {/* YOUR WORK */}
            <div className="assignment-card">
              <div className="card-header">
                <h2>Your Work</h2>
                  <span className="status">
                    {isSubmitted ? "Submitted" : "Assigned"}
                  </span>
              </div>

              <input
                type="file"
                multiple
                          accept=".pdf"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {selectedFiles.map((file, index) => (
                <div key={index} className="uploaded-file">
                  <span>
                    <a
                      href={URL.createObjectURL(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      >
                      {file.name}
                    </a>
                  </span>
                  {!isSubmitted && (
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveFile(index)}
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
                  >
                    <FaPlus /> Add Work
                  </button>

                  <button
                    className="primary-btn full"
                    onClick={handleSubmit}
                  >
                    Submit
                  </button>
                  {submitError && (
                    <p className="form-error" style={{ color: "#e17055", marginTop: 8 }}>
                      {submitError}
                    </p>
                  )}
                </>
              ) : (
                <button
                  className="primary-btn full"
                  onClick={handleUnsubmit}
                >
                  Unsubmit
                </button>
              )}
            </div>

            {/* PRIVATE COMMENTS */}
            <div className="assignment-card">
              <h2>Private Comments</h2>

              <input
                type="text"
                value={privateComment}
                onChange={(e) => setPrivateComment(e.target.value)}
                placeholder="+ Add a private comment..."
                className="comment-input"
              />

              {commentError && (
                <p className="form-error" style={{ color: "#e17055", marginTop: 8 }}>
                  {commentError}
                </p>
              )}

              <button
                className="primary-btn full"
                onClick={handlePrivatePost}
              >
                Post
              </button>

              <div className="comments-list">
                {privateComments.map((comment, index) => (
                  <div key={comment?.id || index} className="comment-item">

                    {editingId === comment?.id ? (
                      <div className="edit-area">
                        <input
                          type="text"
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="comment-input"
                        />
                        <div className="edit-actions">
                          <button className="menu-btn" onClick={handleSaveEdit}>
                            Save
                          </button>
                          <button className="menu-btn" onClick={handleCancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="comment-content">
                          <strong>{comment?.user?.name || 'Student'}</strong>
                          <span className="comment-text">{comment?.message}</span>
                        </div>

                        <div className="comment-menu">
                          <button
                            className="menu-btn"
                            onClick={() => toggleMenu(comment?.id)}
                          >
                            <FaEllipsisV />
                          </button>

                          {String(activeMenu) === String(comment?.id) && (
                            <div className="menu-dropdown">
                                <>
                                  <button onClick={() => handleEdit(comment?.id)}>
                                    <FaEdit className="dropdown-icon" />
                                    Edit
                                  </button>                              
                                  <button onClick={() => handleDelete(comment?.id)}>
                                    <FaTrash className="dropdown-icon" />
                                    Delete
                                  </button>
                                </>
                              
                            </div>
                          )}
                        </div>
                      </>
                    )}

                  </div>
                ))}
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitSectionAssignment;