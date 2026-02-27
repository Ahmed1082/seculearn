import "../../styles/SubmitSectionAssignment.css";
import { FaPlus } from "react-icons/fa";
import { useRef, useState } from "react";

const SubmitSectionAssignment = () => {
  const fileInputRef = useRef(null);

  const studentName = "Student X"; // later replace with logged-in user

  const [privateComment, setPrivateComment] = useState("");
  const [privateComments, setPrivateComments] = useState([]);

  const [classComment, setClassComment] = useState("");
  const [classComments, setClassComments] = useState([]);
  const [showClassInput, setShowClassInput] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  /* ===== FILE UPLOAD ===== */
  const handleAddOrCreate = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!selectedFile) return;

    // Later here you will call your API
    console.log("Submitting:", selectedFile);

    // For now just clear it
    setSelectedFile(null);
    fileInputRef.current.value = "";
  };

  /* ===== PRIVATE COMMENT ===== */
  const handlePrivatePost = () => {
    if (privateComment.trim() === "") return;

    setPrivateComments([...privateComments, privateComment]);
    setPrivateComment("");
  };

  /* ===== CLASS COMMENT ===== */
  const handleClassPost = () => {
    if (classComment.trim() === "") return;

    const newComment = {
      name: studentName,
      text: classComment,
    };

    setClassComments([...classComments, newComment]);
    setClassComment("");
  };

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
              <h2>Assignment_1</h2>
              <span className="due-date">Due 20 Feb</span>
            </div>

            <p>Assigned: 100 points</p>
            <p>Assignment last updated: 19 Feb</p>

            <div className="divider" />

            <a href="#" className="file-link">
              Assignment_1.pdf
            </a>

            <p>Please submit work as pdf</p>

            <div className="divider" />

            <a
              href="#"
              className="file-link"
              onClick={(e) => {
                e.preventDefault();
                setShowClassInput(!showClassInput);
              }}
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
                <button
                  className="primary-btn"
                  onClick={handleClassPost}
                >
                  Post
                </button>

                <div className="comments-list">
                  {classComments.map((comment, index) => (
                    <p key={index} className="comment-item">
                      <strong>{comment.name}:</strong> {comment.text}
                    </p>
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

              <button
                className="primary-btn full"
                onClick={handleAddOrCreate}
              >
                <FaPlus /> Add or Create
              </button>

              {/* FILE PREVIEW + REMOVE */}
              {selectedFile && (
                <div className="uploaded-file">
                  <span>{selectedFile.name}</span>
                  <button
                    className="remove-btn"
                    onClick={handleRemoveFile}
                  >
                    X
                  </button>
                </div>
              )}

              <button
                className="primary-btn full"
                onClick={handleSubmit}
              >
                Submit
              </button>
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
                  <p key={index} className="comment-item">
                    {comment}
                  </p>
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