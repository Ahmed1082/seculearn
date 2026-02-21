import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/Login.css";
import shield from "../../images/shield.png";
import { FaChevronDown, FaEye, FaEyeSlash } from "react-icons/fa";

const API_URL = "/api/login";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const rawStateRole = location.state?.role;
  const ROLE_MAP = {
    Student: { slug: "student", code: 1 },
    "Lecturer (Instructor)": { slug: "instructor", code: 2 },
    "Teaching Assistant": { slug: "ta", code: 3 },
  };

  const deriveDisplayRole = (r) => {
    if (!r) return "Student";
    // If r already matches a display key, return it
    if (ROLE_MAP[r]) return r;

    // If it's numeric or numeric-string, match by code
    const asNum = Number(r);
    if (!Number.isNaN(asNum)) {
      const found = Object.entries(ROLE_MAP).find(([, v]) => v.code === asNum);
      if (found) return found[0];
    }

    // If it's a slug or other string, try to match slug
    const s = String(r).toLowerCase().trim();
    const foundSlug = Object.entries(ROLE_MAP).find(([, v]) => v.slug === s);
    if (foundSlug) return foundSlug[0];

    // Accept common variants
    if (s.includes("lectur") || s.includes("instructor")) return "Lecturer (Instructor)";
    if (s.includes("teaching") && s.includes("assistant")) return "Teaching Assistant";
    if (s === "ta") return "Teaching Assistant";
    if (s.includes("student") || s.includes("learner")) return "Student";

    return "Student";
  };

  const initialRole = deriveDisplayRole(rawStateRole);

  const [role, setRole] = useState(initialRole);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (value) => {
    setRole(value);
    setOpen(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const selectedRoleMeta = ROLE_MAP[role] || ROLE_MAP.Student;

      const response = await axios.post(
        API_URL,
        {
          user_custom_id: userId,
          password: password,
          role_id: selectedRoleMeta.code,
        },
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      // Backend may return role as slug (string) or as numeric code
      const respRole = response.data.role;

      const roleSlugFromResponse = (() => {
        if (typeof respRole === "number") {
          const found = Object.entries(ROLE_MAP).find(([, v]) => v.code === respRole);
          return found ? found[1].slug : null;
        }
        if (typeof respRole === "string") {
          const r = respRole.toLowerCase().trim();
          // accept common variants from backend and normalize to our slugs
          const NORMALIZE = {
            student: "student",
            learner: "student",
            instructor: "instructor",
            lecturer: "instructor",
            lectuer: "instructor",
            ta: "ta",
            "teaching assistant": "ta",
            "teaching_assistant": "ta",
          };
          return NORMALIZE[r] || r;
        }
        return null;
      })();

      const selectedRoleSlug = selectedRoleMeta.slug;

      if (!roleSlugFromResponse) {
        setError("Unable to determine role from server response.");
        setLoading(false);
        return;
      }

      if (selectedRoleSlug !== roleSlugFromResponse) {
        setError(
          `Role mismatch! You selected "${role}" but your credentials are for "${roleSlugFromResponse.charAt(0).toUpperCase() + roleSlugFromResponse.slice(1)}". Please select the correct role.`
        );
        setLoading(false);
        return;
      }

      // Store token or user data if returned
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
      }
      if (response.data.role) {
        localStorage.setItem("role", roleSlugFromResponse);
      }
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      // Redirect based on normalized role
      if (roleSlugFromResponse === "instructor") {
        navigate("/instructor/dashboard");
      } else if (roleSlugFromResponse === "student") {
        navigate("/student/Courses");
      } else if (roleSlugFromResponse === "ta") {
        navigate("/ta/dashboard");
      } else {
        navigate("/student/Courses"); // fallback
      }
    } catch (err) {
      // Detailed error logging
      console.error("Full error object:", err);
      console.error("Error status:", err.response?.status);
      console.error("Error data:", err.response?.data);
      console.error("Error message:", err.message);

      let errorMessage = "Login failed. Please try again.";
      
      if (err.response?.status === 0) {
        errorMessage = "Network Error - Cannot reach backend. Check if Ngrok tunnel is running.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message === "Network Error") {
        errorMessage = "Network Error - CORS issue or backend unreachable.";
      }
      
      setError(errorMessage);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-section">
      <div className="login-container">
        
        {/* LEFT SIDE */}
        <div className="login-left">
          <h1 className="login-title">LOG IN</h1>

          {/* Custom Dropdown */}
          <div className="custom-select" ref={dropdownRef}>
            <div
              className={`select-box ${open ? "active" : ""}`}
              onClick={() => setOpen(!open)}
            >
              <span>{role}</span>
              <FaChevronDown className={`arrow ${open ? "rotate" : ""}`} />
            </div>

              {open && (
                <div className="options">
                  <div onClick={() => handleSelect("Student")}>Student</div>
                  <div onClick={() => handleSelect("Lecturer (Instructor)")}>Lecturer (Instructor)</div>
                  <div onClick={() => handleSelect("Teaching Assistant")}>Teaching Assistant</div>
                </div>
              )}
            </div>

            {/* ID Field */}
            <label>ID</label>
            <input
              type="text"
              placeholder="Please Enter Your ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loading}
            />

          {/* Password Field */}
          <label>Password</label>
          <div className="password-row">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="********************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {/* Error Message */}
          {error && <p className="error-message">{error}</p>}

          <p className="forgot">Forgot Password ?</p>

          <button 
            className="login-submit-btn" 
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging In..." : "Log In"}
          </button>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-right">
          <div className="image-wrapper">
            <img src={shield} alt="Cyber Security" />
          </div>
        </div>

      </div>
    </section>
  );
};

export default Login;
