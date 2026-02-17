import React from "react";
import "../../styles/Welcome.css";
import Mainheader from "../../components/Mainheader";
import shield from "../../assets/shield.png";

const Welcome = () => {
  return (
    <>
 
      <section className="welcome-hero">
        <div className="welcome-container">
          
          {/* LEFT CONTENT */}
          <div className="welcome-left">
            <h1>
              Welcome to <br />
              <span>SecuLearn</span> Portal For <br />
              Educational Services
            </h1>

            <p>
              Empowering learners through knowledge, <br />
              creativity, and connection.
            </p>

            <div className="welcome-buttons">
              <button className="btn-primary">Instructor</button>
              <button className="btn-outline">Student</button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="welcome-right">
            <div className="image-wrapper">
              <img src={shield} alt="Shield" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat">
            <h2>10+</h2>
            <p>Years of Experience</p>
          </div>

          <div className="stat">
            <h2>900+</h2>
            <p>Satisfied customers</p>
          </div>

          <div className="stat">
            <h2>100%</h2>
            <p>Secured</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Welcome;
