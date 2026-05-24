import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  Shield,
  Skull,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { getChallengeForEdit, getChallengeStats } from "../../app/ctfApi";
import "../../styles/CTFReview.css";

const difficultyConfig = {
  easy: { label: "Easy", icon: Zap, className: "ctfr-badge-easy" },
  medium: { label: "Medium", icon: Shield, className: "ctfr-badge-medium" },
  hard: { label: "Hard", icon: Skull, className: "ctfr-badge-hard" },
};

const normalizeStudent = (student = {}, index = 0) => ({
  id: student.student_id || student.id || `student-${index}`,
  name: student.student_name || student.name || student.full_name || "Student",
  customId: student.custom_id || student.studentId || student.student_id || "",
  solvedAt: student.solved_at || null,
  points: Number(student.points || student.final_points || 0),
});

const CTFReview = () => {
  const { courseId, ctfId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const role = location.pathname.startsWith("/ta/") ? "ta" : "lecturer";
  const [challenge, setChallenge] = useState(null);
  const [solvedStudents, setSolvedStudents] = useState([]);
  const [notSolvedStudents, setNotSolvedStudents] = useState([]);
  const [showFlag, setShowFlag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadReview = async () => {
      setLoading(true);
      setError("");

      try {
        const [challengeData, statsData] = await Promise.all([
          getChallengeForEdit(ctfId, token),
          getChallengeStats(ctfId, token),
        ]);

        if (cancelled) return;

        setChallenge(challengeData);
        setSolvedStudents(
          (statsData.solved_students || []).map(normalizeStudent),
        );
        setNotSolvedStudents(
          (statsData.not_solved_students || []).map(normalizeStudent),
        );
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load CTF statistics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (token) loadReview();

    return () => {
      cancelled = true;
    };
  }, [ctfId, token]);

  if (loading) {
    return (
      <div className="ctfr-container">
        <div className="ctfr-layout">
          <div className="ctfr-card">
            <div className="ctfr-box-header">
              <Loader2 className="ctf-icon-sm spin" />
              <h1 className="ctfr-title">Loading CTF review</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="ctfr-container">
        <div className="ctfr-layout">
          <button className="ctfr-back-btn" onClick={() => navigate(`/${role}/courses/${courseId}`)}>
            <ArrowLeft className="ctf-icon-sm mr-2" />
            Back to Course
          </button>
          <div className="ctfr-card">
            <h1 className="ctfr-title">Challenge unavailable</h1>
            <p className="ctfr-desc">{error || "This CTF challenge could not be loaded."}</p>
          </div>
        </div>
      </div>
    );
  }

  const diff = difficultyConfig[challenge.difficulty] || difficultyConfig.easy;
  const DiffIcon = diff.icon;

  return (
    <div className="ctfr-container">
      <div className="ctfr-layout">
        <button className="ctfr-back-btn" onClick={() => navigate(`/${role}/courses/${courseId}`)}>
          <ArrowLeft className="ctf-icon-sm mr-2" />
          Back to Course
        </button>

        <div className="ctfr-card">
          <div className="ctfr-header-row">
            <div className="ctfr-title-group">
              <div className="ctfr-title-line">
                <div className="ctfr-icon-box">
                  <Flag className="text-primary" style={{ width: "1rem", height: "1rem" }} />
                </div>
                <h1 className="ctfr-title">{challenge.title}</h1>
                <span className={`ctfr-badge ${diff.className}`}>
                  <DiffIcon style={{ width: "0.75rem", height: "0.75rem", marginRight: "0.25rem" }} />
                  {diff.label}
                </span>
              </div>
              <span className="ctfr-badge ctfr-badge-outline">{challenge.category}</span>
            </div>

            <div className="ctfr-points-box">
              <Trophy style={{ width: "1rem", height: "1rem", color: "#00b8d9" }} />
              <span className="ctfr-points-val">{challenge.points}</span>
              <span className="ctfr-points-label">pts</span>
            </div>
          </div>

          <p className="ctfr-desc">{challenge.description}</p>

          <div className="ctfr-lab-details">
            <strong>Lab environment</strong>
            {challenge.labType === "external" ? (
              <a href={challenge.externalUrl} target="_blank" rel="noreferrer">
                {challenge.externalUrl || "External hosted lab"}
              </a>
            ) : (
              <code>{challenge.dockerImage || challenge.determinedImage || "Docker lab"}</code>
            )}
          </div>

          {challenge.hints.length > 0 && (
            <div className="ctfr-hint">
              {challenge.hints.map((hint, index) => (
                <p key={hint.id}>
                  <strong>Hint {index + 1}:</strong> {hint.text} ({hint.costPoints} pts)
                </p>
              ))}
            </div>
          )}

          <div className="ctfr-reveal-row">
            <button className="ctfr-reveal-btn" onClick={() => setShowFlag((value) => !value)}>
              {showFlag ? <EyeOff style={{ width: "1rem", height: "1rem" }} /> : <Eye style={{ width: "1rem", height: "1rem" }} />}
              {showFlag ? "Hide Flag" : "Show Flag"}
            </button>
            {showFlag && <code className="ctfr-flag-code">{challenge.flag}</code>}
          </div>
        </div>

        <div className="ctfr-grid">
          <div className="ctfr-solved-card">
            <div className="ctfr-box-header">
              <CheckCircle2 style={{ width: "1.25rem", height: "1.25rem", color: "#22c55e" }} />
              <h2 className="ctfr-box-title">Solved ({solvedStudents.length})</h2>
            </div>
            <div className="ctfr-list">
              {solvedStudents.length === 0 && (
                <p className="ctfr-empty-text">No students solved this challenge yet.</p>
              )}
              {solvedStudents.map((student) => (
                <div key={student.id} className="ctfr-student-item">
                  <div className="ctfr-student-info">
                    <div className="ctfr-avatar-solved">{student.name.charAt(0)}</div>
                    <div>
                      <span className="ctfr-student-name">{student.name}</span>
                      {student.solvedAt && <small className="ctfr-student-meta">{student.solvedAt}</small>}
                    </div>
                  </div>
                  <span className="ctfr-student-id">{student.customId || `${student.points} pts`}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ctfr-unsolved-card">
            <div className="ctfr-box-header">
              <Users style={{ width: "1.25rem", height: "1.25rem", color: "#94a3b8" }} />
              <h2 className="ctfr-box-title">Not Solved ({notSolvedStudents.length})</h2>
            </div>
            <div className="ctfr-list">
              {notSolvedStudents.length === 0 && (
                <p className="ctfr-empty-text">Everyone has solved this challenge.</p>
              )}
              {notSolvedStudents.map((student) => (
                <div key={student.id} className="ctfr-student-item">
                  <div className="ctfr-student-info">
                    <div className="ctfr-avatar-unsolved">{student.name.charAt(0)}</div>
                    <span className="ctfr-student-name">{student.name}</span>
                  </div>
                  <span className="ctfr-student-id">{student.customId}</span>
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
