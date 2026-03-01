import "../../styles/SubmitSectionAssignment.css";
import { FaPlus } from "react-icons/fa";
import { useRef, useState, useEffect } from "react";

const CommentItem = ({ comment, isClass, onEdit, onDelete, onCopy }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="comment-item">
      <span className="comment-text">
        {isClass ? <><strong>{comment.name}:</strong> {comment.text}</> : comment}
      </span>
      <div className="comment-menu-wrapper" ref={menuRef}>
        <button
          className="three-dot-btn"
          onClick={() => setMenuOpen((prev) => !prev)}
          title="Options"
        >
          &#8942;
        </button>
        {menuOpen && (
          <div className="comment-dropdown">
            <button onClick={() => { onEdit(); setMenuOpen(false); }}>✏️ Edit</button>
            <button onClick={() => { onCopy(); setMenuOpen(false); }}>📋 Copy</button>
            <button className="delete-option" onClick={() => { onDelete(); setMenuOpen(false); }}>🗑️ Delete</button>
          </div>
        )}
      </div>
    </div>
  );
};

const SubmitSectionAssignment = () => {
  const fileInputRef = useRef(null);

  const studentName = "Student X";

  const [privateComment, setPrivateComment] = useState("");
  const [privateComments, setPrivateComments] = useState([]);
  const [editingPrivateIndex, setEditingPrivateIndex] = useState(null);
  const [editingPrivateValue, setEditingPrivateValue] = useState("");

  const [classComment, setClassComment] = useState("");
  const [classComments, setClassComments] = useState([]);
  const [showClassInput, setShowClassInput] = useState(false);
  const [editingClassIndex, setEditingClassIndex] = useState(null);
  const [editingClassValue, setEditingClassValue] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);

  /* ===== FILE UPLOAD ===== */
  const handleAddOrCreate = () => fileInputRef.current.click();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    console.log("Submitting:", selectedFile);
    setSelectedFile(null);
    fileInputRef.current.value = "";
  };

  /* ===== PRIVATE COMMENT ===== */
  const handlePrivatePost = () => {
    if (privateComment.trim() === "") return;
    setPrivateComments([...privateComments, privateComment]);
    setPrivateComment("");
  };

  const handlePrivateEdit = (index) => {
    setEditingPrivateIndex(index);
    setEditingPrivateValue(privateComments[index]);
  };

  const handlePrivateSaveEdit = (index) => {
    const updated = [...privateComments];
    updated[index] = editingPrivateValue;
    setPrivateComments(updated);
    setEditingPrivateIndex(null);
    setEditingPrivateValue("");
  };

  const handlePrivateDelete = (index) => {
    setPrivateComments(privateComments.filter((_, i) => i !== index));
  };

  const handlePrivateCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  /* ===== CLASS COMMENT ===== */
  const handleClassPost = () => {
    if (classComment.trim() === "") return;
    setClassComments([...classComments, { name: studentName, text: classComment }]);
    setClassComment("");
  };

  const handleClassEdit = (index) => {
    setEditingClassIndex(index);
    setEditingClassValue(classComments[index].text);
  };

  const handleClassSaveEdit = (index) => {
    const updated = [...classComments];
    updated[index] = { ...updated[index], text: editingClassValue };
    setClassComments(updated);
    setEditingClassIndex(null);
    setEditingClassValue("");
  };

  const handleClassDelete = (index) => {
    setClassComments(classComments.filter((_, i) => i !== index));
  };

  const handleClassCopy = (comment) => {
    navigator.clipboard.writeText(comment.text);
  };

  return (
    <div className="sectionassignments">
      <div className="assignment-container">

        <h1 className="course-title">Introduction to Cybersecurity</h1>

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
              <h2>Assignment_1</h2>
              <span className="due-date">Due 20 Feb</span>
            </div>

            <p>Assigned: 100 points</p>
            <p>Assignment last updated: 19 Feb</p>

            <div className="divider" />

            <a href="#" className="file-link">Assignment_1.pdf</a>
            <p>Please submit work as pdf</p>

            <div className="divider" />

            <a
              href="#"
              className="file-link"
              onClick={(e) => { e.preventDefault(); setShowClassInput(!showClassInput); }}
            >
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
                <button className="primary-btn" onClick={handleClassPost}>Post</button>

                <div className="comments-list">
                  {classComments.map((comment, index) => (
                    editingClassIndex === index ? (
                      <div key={index} className="comment-edit-row">
                        <input
                          className="comment-input edit-inline"
                          value={editingClassValue}
                          onChange={(e) => setEditingClassValue(e.target.value)}
                        />
                        <button className="save-edit-btn" onClick={() => handleClassSaveEdit(index)}>Save</button>
                      </div>
                    ) : (
                      <CommentItem
                        key={index}
                        comment={comment}
                        isClass={true}
                        onEdit={() => handleClassEdit(index)}
                        onDelete={() => handleClassDelete(index)}
                        onCopy={() => handleClassCopy(comment)}
                      />
                    )
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
                <span className="status">Assigned</span>
              </div>

              <input
                type="file"
                accept=".pdf,image/*,video/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              <button className="primary-btn full" onClick={handleAddOrCreate}>
                <FaPlus /> Add or Create
              </button>

              {selectedFile && (
                <div className="uploaded-file">
                  <span>{selectedFile.name}</span>
                  <button className="remove-btn" onClick={handleRemoveFile}>X</button>
                </div>
              )}

              <button className="primary-btn full" onClick={handleSubmit}>Submit</button>
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

              <button className="primary-btn full" onClick={handlePrivatePost}>Post</button>

              <div className="comments-list">
                {privateComments.map((comment, index) => (
                  editingPrivateIndex === index ? (
                    <div key={index} className="comment-edit-row">
                      <input
                        className="comment-input edit-inline"
                        value={editingPrivateValue}
                        onChange={(e) => setEditingPrivateValue(e.target.value)}
                      />
                      <button className="save-edit-btn" onClick={() => handlePrivateSaveEdit(index)}>Save</button>
                    </div>
                  ) : (
                    <CommentItem
                      key={index}
                      comment={comment}
                      isClass={false}
                      onEdit={() => handlePrivateEdit(index)}
                      onDelete={() => handlePrivateDelete(index)}
                      onCopy={() => handlePrivateCopy(comment)}
                    />
                  )
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