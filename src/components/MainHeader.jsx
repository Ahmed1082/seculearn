import { Link } from "react-router-dom";
import "../styles/MainHeader.css";
import logo from "../images/logo.png";
import secuText from "../images/SecuLearn.png";

const MainHeader = ({ role }) => {
  return (
    <header className="main-header">
      <div className="header-container">

        {/* Logo */}
        <div className="logo">
          <img src={logo} alt="Shield" className="logo-icon" />
          <img src={secuText} alt="SecuLearn" className="logo-text" />
        </div>

        {/* Navbar */}
        <nav className="header-nav">

          {role === "instructor" && (
            <>
              <Link to="/instructor">Overview</Link>
              <Link to="/instructor/courses">Courses</Link>
              <Link to="/instructor/members">Members</Link>
            </>
          )}

          {role === "ta" && (
            <>
              <Link to="/ta">Overview</Link>
              <Link to="/ta/courses">Courses</Link>
              <Link to="/ta/members">Members</Link>
            </>
          )}

          {role === "student" && (
            <>
              <Link to="/student/allAssignments">Assignments</Link>
              <Link to="/student/courses">Courses</Link>
              <Link to="/student/allQuizzes">Quizzes</Link>
              <Link to="/student/members">Members</Link>
            </>
          )}

        </nav>

        {/* Profile */}
        <div className="profile">
          <span className="user-name">
            {role === "student"
              ? "Student"
              : role === "ta"
              ? "TA"
              : "Instructor"}
          </span>
          <div className="avatar">
            {(role === "student"
              ? "Student"
              : role === "ta"
              ? "TA"
              : "Instructor"
            ).charAt(0)}
          </div>
        </div>

      </div>

      <div className="header-line"></div>
    </header>
  );
};

export default MainHeader;
