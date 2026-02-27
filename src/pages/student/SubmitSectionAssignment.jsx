// =============================
// Imports
// =============================
import "../../styles/SubmitSectionAssignment.css";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

// =============================
// Component: SubmitSectionAssignment
// Handles:
// - Fetching assignment details
// - Submitting assignment file
// - Posting private comments
// =============================
const SubmitSectionAssignment = () => {

  // =============================
  // Route Parameters
  // Extract dynamic IDs from URL
  // =============================
  const { courseId, sectionId, assignmentId } = useParams();

  // =============================
  // State Management
  // =============================
  const [assignment, setAssignment] = useState(null); // Assignment data
  const [comment, setComment] = useState("");         // Private comment input
  const [file, setFile] = useState(null);             // Selected file
  const [loading, setLoading] = useState(true);       // Loading state

  const token = localStorage.getItem("token"); // Auth token

  // =============================
  // Fetch Assignment Data
  // Runs when component mounts
  // =============================
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const res = await axios.get(
          `/api/courses/${courseId}/sections/${sectionId}/assignments/${assignmentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setAssignment(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [courseId, sectionId, assignmentId, token]);

  // =============================
  // Submit Assignment File
  // =============================
  const handleSubmit = async () => {
    if (!file) return alert("Please choose a file");

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        `/api/assignments/${assignmentId}/submit`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("Assignment submitted successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  // =============================
  // Post Private Comment
  // =============================
  const handleCommentPost = async () => {
    if (!comment.trim()) return;

    try {
      await axios.post(
        `/api/assignments/${assignmentId}/comments`,
        { comment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setComment("");
      alert("Comment posted!");
    } catch (err) {
      console.error(err);
    }
  };

  // =============================
  // Conditional Rendering
  // =============================
  if (loading) return <div className="loading">Loading...</div>;
  if (!assignment) return <div className="loading">Assignment not found</div>;

  // =============================
  // UI Layout
  // =============================
  return (
    <div className="sectionassignments">
      <div className="assignment-container">

        {/* =============================
            Course Title Section
        ============================== */}
        <h1 className="course-title">
          {assignment.courseName}
        </h1>

        {/* =============================
            Breadcrumb / Path Navigation
        ============================== */}
        <div className="assignment-path">
          <button>{assignment.sectionName}</button>
          <span>›</span>
          <button>Assignments</button>
          <span>›</span>
          <button>{assignment.title}</button>
        </div>

        <div className="assignment-grid">

          {/* =============================
              LEFT SIDE
              Assignment Details
          ============================== */}
          <div className="assignment-card large">
            <div className="card-header">
              <h2>{assignment.title}</h2>
              <span className="due-date">
                Due {assignment.dueDate}
              </span>
            </div>

            <p>Assigned: {assignment.points} points</p>
            <p>
              Assignment last updated: {assignment.lastUpdated}
            </p>

            <div className="divider" />

            {/* Downloadable File */}
            {assignment.fileUrl && (
              <a
                href={assignment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="file-link"
              >
                Download Assignment
              </a>
            )}

            <p>{assignment.description}</p>
          </div>

          {/* =============================
              RIGHT SIDE
              Submission + Comments
          ============================== */}
          <div className="right-column">

            {/* ---------- Your Work Section ---------- */}
            <div className="assignment-card">
              <div className="card-header">
                <h2>Your Work</h2>
                <span className="status">
                  {assignment.status || "Assigned"}
                </span>
              </div>

              {/* File Upload Input */}
              <input
                type="file"
                className="file-input"
                onChange={(e) => setFile(e.target.files[0])}
              />

              {/* Submit Button */}
              <button
                className="primary-btn full"
                onClick={handleSubmit}
              >
                Submit
              </button>
            </div>

            {/* ---------- Private Comments Section ---------- */}
            <div className="assignment-card">
              <h2>Private Comments</h2>

              {/* Comment Input */}
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="+ Add a private comment..."
                className="comment-input"
              />

              {/* Post Comment Button */}
              <button
                className="primary-btn full"
                onClick={handleCommentPost}
              >
                Post
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitSectionAssignment;