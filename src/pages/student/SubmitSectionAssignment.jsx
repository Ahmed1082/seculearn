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

  const [activeMenu, setActiveMenu] = useState(null);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");

  const [activeClassMenu, setActiveClassMenu] = useState(null);
  const [editingClassIndex, setEditingClassIndex] = useState(null);
  const [editedClassText, setEditedClassText] = useState("");
 

  const { assignmentId } = useParams();
  const token = localStorage.getItem("token");

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

  const handleSubmit = () => {
    if (selectedFiles.length === 0) return;

    console.log("Submitting:", selectedFiles);
    setIsSubmitted(true);
  };

  const handleUnsubmit = () => {
    setIsSubmitted(false);
  };

  /* ===== PRIVATE COMMENT ===== */
  const handlePrivatePost = () => {
    if (privateComment.trim() === "") return;
    setPrivateComments([...privateComments, privateComment]);
    setPrivateComment("");
  };

  const toggleMenu = (index) => {
    setActiveMenu(activeMenu === index ? null : index);
  };

  const handleDelete = (index) => {
    const updated = privateComments.filter((_, i) => i !== index);
    setPrivateComments(updated);
    setActiveMenu(null);
  };

  // 🔥 تعديل داخلي بدل prompt
  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditedText(privateComments[index]);
    setActiveMenu(null);
  };

  const handleSaveEdit = () => {
    if (editedText.trim() === "") return;

    const updated = [...privateComments];
    updated[editingIndex] = editedText;

    setPrivateComments(updated);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  /* ===== CLASS COMMENT ===== */
  const handleClassPost = () => {
    if (classComment.trim() === "") return;

    const newComment = {
      name: displayName,
      text: classComment,
    };

    setClassComments([...classComments, newComment]);
    setClassComment("");
  };
  const toggleClassMenu = (index) => {
    setActiveClassMenu(activeClassMenu === index ? null : index);
  };

  const handleDeleteClass = (index) => {
    const updated = classComments.filter((_, i) => i !== index);
    setClassComments(updated);
    setActiveClassMenu(null);
  };

  const handleEditClass = (index) => {
    setEditingClassIndex(index);
    setEditedClassText(classComments[index].text);
    setActiveClassMenu(null);
  };

  const handleSaveClassEdit = () => {
    if (editedClassText.trim() === "") return;

    const updated = [...classComments];
    updated[editingClassIndex].text = editedClassText;

    setClassComments(updated);
    setEditingClassIndex(null);
  };

  const handleCancelClassEdit = () => {
    setEditingClassIndex(null);
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

                <div className="comments-list">
                  {classComments.map((comment, index) => (
                    <div key={index} className="comment-item">

                      {editingClassIndex === index ? (
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
                            <strong>{comment.name}</strong>
                            <span className="comment-text">{comment.text}</span>
                          </div>

                          <div className="comment-menu">
                            <button
                              className="menu-btn"
                              onClick={() => toggleClassMenu(index)}
                            >
                              <FaEllipsisV />
                            </button>

                            {activeClassMenu === index && (
                              <div className="menu-dropdown">
                                <button onClick={() => handleEditClass(index)}>
                                  <FaEdit className="dropdown-icon" />
                                  Edit
                                </button>

                                <button onClick={() => handleDeleteClass(index)}>
                                  <FaTrash className="dropdown-icon" />
                                  Delete
                                </button>
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
                accept=".pdf,image/*,video/*"
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

              <button
                className="primary-btn full"
                onClick={handlePrivatePost}
              >
                Post
              </button>

              <div className="comments-list">
                {privateComments.map((comment, index) => (
                  <div key={index} className="comment-item">

                    {editingIndex === index ? (
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
                        <span>{comment}</span>

                        <div className="comment-menu">
                          <button
                            className="menu-btn"
                            onClick={() => toggleMenu(index)}
                          >
                            <FaEllipsisV />
                          </button>

                          {activeMenu === index && (
                            <div className="menu-dropdown">
                              <button onClick={() => handleEdit(index)}>
                                <FaEdit className="dropdown-icon" />
                                Edit
                              </button>

                              <button onClick={() => handleDelete(index)}>
                                <FaTrash className="dropdown-icon" />
                                Delete
                              </button>
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