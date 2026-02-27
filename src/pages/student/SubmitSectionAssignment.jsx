import "../../styles/SubmitSectionAssignment.css";
import { FaPlus } from "react-icons/fa";

const SubmitSectionAssignment = () => {
  return (
    <div className="sectionassignments">

      <div className="assignment-container">

        {/* COURSE TITLE */}
        <h1 className="course-title">
          Introduction to Cybersecurity
        </h1>

        {/* PATH */}
        <div className="assignment-path">
          <button>Section 1</button>
          <span>›</span>
          <button>Assignments</button>
          <span>›</span>
          <button>Assignment 1</button>
        </div>

        {/* GRID */}
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

            <a href="#" className="file-link">
              Class Comments...
            </a>

          </div>

          {/* RIGHT SIDE */}
          <div className="right-column">

            {/* YOUR WORK */}
            <div className="assignment-card">
              <div className="card-header">
                <h2>Your Work</h2>
                <span className="status">Assigned</span>
              </div>

              <button className="primary-btn full">
                <FaPlus /> Add or Create
              </button>

              <button className="primary-btn full">
                Submit
              </button>
            </div>

            {/* PRIVATE COMMENTS */}
            <div className="assignment-card">
              <h2>Private Comments</h2>

              <input
                type="text"
                placeholder="+ Add a private comment..."
                className="comment-input"
              />

              <button className="primary-btn full">
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