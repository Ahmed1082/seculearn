import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/MainHeader.css";
import logo from "../images/logo.png";
import secuText from "../images/SecuLearn.png";
import { useNavigate } from "react-router-dom";
// import { FaSignOutAlt } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
const MainHeader = ({ role }) => {
  const [userName, setUserName] = useState("");
  const [userInitial, setUserInitial] = useState("");
  const navigate = useNavigate();
  const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");

  navigate("/"); // دي صفحة الـ Welcome
};
  useEffect(() => {
    // Fetch user data from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Try multiple possible name properties from the API
        const name = user.name || user.full_name || user.username || 
                     (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : "") ||
                     user.first_name || "User";
        setUserName(name);
        setUserInitial(name.charAt(0).toUpperCase());
      } catch (error) {
        console.error("Error parsing user data:", error);
        // Fallback to role if name unavailable
        const fallbackName = role === "student" ? "Student" : role === "ta" ? "TA" : "Lecturer";
        setUserName(fallbackName);
        setUserInitial(fallbackName.charAt(0));
      }
    } else {
      // Fallback to role if no user data
      const fallbackName = role === "student" ? "Student" : role === "ta" ? "TA" : "Lecturer";
      setUserName(fallbackName);
      setUserInitial(fallbackName.charAt(0));
    }
  }, [role]);

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

          {role === "lecturer" && (
            <>
              <Link to="/lecturer">Overview</Link>
              <Link to="/lecturer/courses">Courses</Link>
              <Link to="/lecturer/members">Members</Link>
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
          <span className="user-name">{userName}</span>
          <div className="avatar">{userInitial}</div>

          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut />
          </button>
        </div>

      </div>

      <div className="header-line"></div>
    </header>
  );
};

export default MainHeader;
