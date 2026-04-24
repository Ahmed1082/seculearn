import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Flag, Trophy, Shield, Zap, Skull, Users, CheckCircle2, Eye, EyeOff } from "lucide-react";
import "../../styles/CTFReview.css";

const difficultyConfig = {
  easy: { label: "Easy", icon: Zap, className: "ctfr-badge-easy" },
  medium: { label: "Medium", icon: Shield, className: "ctfr-badge-medium" },
  hard: { label: "Hard", icon: Skull, className: "ctfr-badge-hard" },
};

const mockChallenge = {
  id: "1",
  title: "Hidden in Plain Sight",
  difficulty: "easy",
  category: "Network Analysis",
  points: 100,
  description: "A suspicious packet capture contains a secret message. Analyze the PCAP file and extract the hidden flag.",
  hint: "Look at the HTTP headers carefully.",
  flag: "flag{http_h3ad3rs_ar3_fun}",
};

const mockSolvers = [
  { id: "s1", name: "Ahmed Ali", studentId: "STU001" },
  { id: "s2", name: "Sara Hassan", studentId: "STU002" },
  { id: "s3", name: "Omar Khalil", studentId: "STU003" },
  { id: "s4", name: "Youssef Amin", studentId: "STU005" },
];

const mockNonSolvers = [
  { id: "s5", name: "Fatima Nour", studentId: "STU004" },
  { id: "s6", name: "Layla Ibrahim", studentId: "STU006" },
  { id: "s7", name: "Kareem Fahmy", studentId: "STU007" },
  { id: "s8", name: "Nadia Sayed", studentId: "STU008" },
  { id: "s9", name: "Tarek Mostafa", studentId: "STU009" },
  { id: "s10", name: "Hana Zaki", studentId: "STU010" },
];

const CTFReview = () => {
  const { courseId, ctfId } = useParams();
  const navigate = useNavigate();
  const [showFlag, setShowFlag] = useState(false);

  // In a real app, you would fetch the challenge and student details using ctfId.
  const challenge = mockChallenge;
  const diff = difficultyConfig[challenge.difficulty] || difficultyConfig.easy;
  const DiffIcon = diff.icon;

  return (
    <div className="ctfr-container">
      <div className="ctfr-layout">
        <button
          className="ctfr-back-btn"
          onClick={() => navigate(-1)} // Or navigate(`/lecturer/courses/${courseId}`)
        >
          <ArrowLeft className="ctf-icon-sm mr-2" style={{ marginRight: '0.5rem', width: '1.25rem', height: '1.25rem' }} />
          Back to Course
        </button>

        {/* Challenge Header Card */}
        <div className="ctfr-card">
          <div className="ctfr-header-row">
            <div className="ctfr-title-group">
              <div className="ctfr-title-line">
                <div className="ctfr-icon-box">
                  <Flag style={{ width: '1rem', height: '1rem' }} className="text-primary" />
                </div>
                <h1 className="ctfr-title">{challenge.title}</h1>
                <span className={`ctfr-badge ${diff.className}`}>
                  <DiffIcon style={{ width: '0.75rem', height: '0.75rem', marginRight: '0.25rem' }} />
                  {diff.label}
                </span>
              </div>
              <span className="ctfr-badge ctfr-badge-outline">{challenge.category}</span>
            </div>

            <div className="ctfr-points-box">
              <Trophy style={{ width: '1rem', height: '1rem', color: '#00b8d9' }} />
              <span className="ctfr-points-val">{challenge.points}</span>
              <span className="ctfr-points-label">pts</span>
            </div>
          </div>

          <p className="ctfr-desc">{challenge.description}</p>

          {challenge.hint && (
            <div className="ctfr-hint">
              <p>
                <strong>Hint:</strong> {challenge.hint}
              </p>
            </div>
          )}

          <div className="ctfr-reveal-row">
            <button className="ctfr-reveal-btn" onClick={() => setShowFlag(!showFlag)}>
              {showFlag ? <EyeOff style={{ width: '1rem', height: '1rem' }} /> : <Eye style={{ width: '1rem', height: '1rem' }} />}
              {showFlag ? "Hide Flag" : "Show Flag"}
            </button>
            {showFlag && <code className="ctfr-flag-code">{challenge.flag}</code>}
          </div>
        </div>

        {/* Solved / Unsolved Grid */}
        <div className="ctfr-grid">
          {/* Solved Box */}
          <div className="ctfr-solved-card">
            <div className="ctfr-box-header">
              <CheckCircle2 style={{ width: '1.25rem', height: '1.25rem', color: '#22c55e' }} />
              <h2 className="ctfr-box-title">Solved ({mockSolvers.length})</h2>
            </div>
            <div className="ctfr-list">
              {mockSolvers.map((student) => (
                <div key={student.id} className="ctfr-student-item">
                  <div className="ctfr-student-info">
                    <div className="ctfr-avatar-solved">{student.name.charAt(0)}</div>
                    <span className="ctfr-student-name">{student.name}</span>
                  </div>
                  <span className="ctfr-student-id">{student.studentId}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Unsolved Box */}
          <div className="ctfr-unsolved-card">
            <div className="ctfr-box-header">
              <Users style={{ width: '1.25rem', height: '1.25rem', color: '#94a3b8' }} />
              <h2 className="ctfr-box-title">Not Solved ({mockNonSolvers.length})</h2>
            </div>
            <div className="ctfr-list">
              {mockNonSolvers.map((student) => (
                <div key={student.id} className="ctfr-student-item">
                  <div className="ctfr-student-info">
                    <div className="ctfr-avatar-unsolved">{student.name.charAt(0)}</div>
                    <span className="ctfr-student-name">{student.name}</span>
                  </div>
                  <span className="ctfr-student-id">{student.studentId}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTFReview;