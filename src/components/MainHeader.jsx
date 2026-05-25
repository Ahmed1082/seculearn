import { NavLink } from "react-router-dom";
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
              <NavLink to="/lecturer" end>Overview</NavLink>
              <NavLink to="/lecturer/courses">Courses</NavLink>
              <NavLink to="/lecturer/members">Members</NavLink>
              <NavLink to="/lecturer/ai-assistant">AI Assistant</NavLink>
            </>
          )}

          {role === "ta" && (
            <>
              <NavLink to="/ta" end>Overview</NavLink>
              <NavLink to="/ta/courses">Courses</NavLink>
              <NavLink to="/ta/members">Members</NavLink>
              <NavLink to="/ta/ai-assistant">AI Assistant</NavLink>
            </>
          )}

          {role === "student" && (
            <>
              <NavLink to="/student/allAssignments">Assignments</NavLink>
              <NavLink to="/student/courses">Courses</NavLink>
              <NavLink to="/student/allQuizzes">Quizzes</NavLink>
              <NavLink to="/student/members">Members</NavLink>
              <NavLink to="/student/ai-assistant">AI Assistant</NavLink>
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
