import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../../styles/Login.css";
import shield from "../../assets/shield.png";
import { FaChevronDown } from "react-icons/fa";

const Login = () => {
  const location = useLocation();
  const initialRole = location.state?.role || "Student";
  const [role, setRole] = useState(initialRole);
  const [open, setOpen] = useState(false);
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
                <div onClick={() => handleSelect("Instructor")}>
                  Instructor
                </div>
                <div onClick={() => handleSelect("Student")}>
                  Student
                </div>
              </div>
            )}
          </div>

          {/* ID Field */}
          <label>ID</label>
          <input
            type="text"
            placeholder="Please Enter Your ID"
          />

          {/* Password Field */}
          <label>Password</label>
          <input
            type="password"
            placeholder="********************"
          />

          <p className="forgot">Forgot Password ?</p>

          <button className="login-submit-btn">Log In</button>
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
