import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Flag,
  Lightbulb,
  Loader2,
  Play,
  Power,
  Send,
  Shield,
  Skull,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import {
  getStudentChallenges,
  launchCTFLab,
  revealCTFHint,
  stopCTFLab,
  submitCTFFlag,
  checkCTFLabStatus,
} from "../../app/ctfApi";
import "../../styles/CTFPage.css";

const difficultyConfig = {
  easy: { label: "Easy", icon: Zap },
  medium: { label: "Medium", icon: Shield },
  hard: { label: "Hard", icon: Skull },
};

const formatTime = (seconds) => {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${secs}`;
  }
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
};

const calculateRemaining = (expiresAt) => {
  if (!expiresAt) return 0;
  // Replace space with T for valid ISO 8601, but keep it in local time
  const timeString = expiresAt.includes("T") ? expiresAt : expiresAt.replace(" ", "T");
  const expires = new Date(timeString).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((expires - now) / 1000));
};

const normalizeLab = (payload = {}) => ({
  id: payload.id,
  url: payload.connection_url || payload.url || payload.lab_url || "",
  expiresAt: payload.expires_at || payload.expiresAt || "",
  description: payload.description || "",
  files: Array.isArray(payload.files) ? payload.files : [],
  fileUrl: payload.file_url || payload.challenge_file || "",
  fileName: payload.file_name || payload.file_original_name || "",
});

const CTFPage = () => {
  const { courseId, ctfId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [flagInput, setFlagInput] = useState("");
  const [solved, setSolved] = useState(false);
  const [earnedScore, setEarnedScore] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [revealedHints, setRevealedHints] = useState({});
  const [notice, setNotice] = useState(null);
  const [labStatus, setLabStatus] = useState("idle");
  const [labSession, setLabSession] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadChallenge = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const challenges = await getStudentChallenges(token);
        const selected = challenges.find((item) => String(item.id) === String(ctfId));

        if (cancelled) return;

        if (!selected) {
          setChallenge(null);
          setLoadError("The CTF challenge you opened is not available.");
          return;
        }

        setChallenge(selected);
        setSolved(selected.isSolved);

        if (!selected.isSolved) {
          try {
            const statusResponse = await checkCTFLabStatus(selected.id, token);
            if (!cancelled && statusResponse?.status === "running") {
              const session = normalizeLab(statusResponse);
              setLabStatus("running");
              setLabSession(session);
              setElapsedSec(calculateRemaining(session.expiresAt) || 3600);
            }
          } catch (statusErr) {
            console.error("Failed to check lab status:", statusErr);
          }
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Could not load this CTF challenge.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (token) {
      loadChallenge();
    } else {
      setLoading(false);
      setLoadError("Please log in to open this CTF challenge.");
    }

    return () => {
      cancelled = true;
    };
  }, [ctfId, token]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 3600);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (labStatus !== "running") return undefined;
    const timer = setInterval(() => setElapsedSec((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [labStatus]);

  const difficultyKey = challenge?.difficulty || "easy";
  const difficulty = difficultyConfig[difficultyKey] || difficultyConfig.easy;
  const DifficultyIcon = difficulty.icon;
  const deductedPoints = useMemo(
    () =>
      Object.values(revealedHints).reduce(
        (total, hint) => total + Number(hint.deductedPoints || 0),
        0,
      ),
    [revealedHints],
  );
  const possiblePoints = Math.max(0, Number(challenge?.points || 0) - deductedPoints);
  const challengeFiles = useMemo(() => {
    if (!challenge) return [];
    const apiFiles = challenge.files || [];
    const labFiles = labSession?.files || [];
    const singleLabFile = labSession?.fileUrl
      ? [{ name: labSession.fileName || "challenge file", url: labSession.fileUrl, size: "" }]
      : [];
    return [...apiFiles, ...labFiles, ...singleLabFile].filter(Boolean);
  }, [challenge, labSession]);

  const showNotice = (type, title, message) => {
    setNotice({ type, title, message });
  };

  const copyToClipboard = async (value, label = "Copied") => {
    try {
      await navigator.clipboard?.writeText(value);
      showNotice("success", label, "The value is now on your clipboard.");
    } catch {
      showNotice("info", label, value);
    }
  };

  const launchLab = async () => {
    if (!challenge || labStatus === "starting") return;

    setLabStatus("starting");
    setElapsedSec(0);
    showNotice("info", "Starting lab", "Preparing your challenge environment.");

    try {
      const response = await launchCTFLab(challenge.id, token);
      const session = normalizeLab(response);
      setLabSession(session);
      setLabStatus("running");
      setElapsedSec(calculateRemaining(session.expiresAt) || 3600);
      showNotice("success", "Lab ready", session.url || "The challenge files are ready.");
    } catch (err) {
      setLabStatus("idle");
      showNotice("danger", "Launch failed", err.message || "Could not launch this lab.");
    }
  };

  const stopLab = async () => {
    if (!challenge || labStatus === "stopping") return;

    setLabStatus("stopping");

    try {
      const response = await stopCTFLab(challenge.id, token);
      setLabStatus("idle");
      setLabSession(null);
      setElapsedSec(0);
      showNotice("info", "Lab stopped", response?.message || "Lab stopped successfully.");
    } catch (err) {
      setLabStatus("running");
      showNotice("danger", "Stop failed", err.message || "Could not stop this lab.");
    }
  };

  const revealHint = async (hint) => {
    if (!hint?.id || revealedHints[hint.id] || solved) return;

    try {
      const response = await revealCTFHint(hint.id, token);
      setRevealedHints((prev) => ({
        ...prev,
        [hint.id]: {
          text: response.hint_text || hint.text,
          deductedPoints: Number(response.deducted_points ?? hint.costPoints ?? 0),
        },
      }));
      showNotice(
        "info",
        "Hint revealed",
        response.message || `${Number(response.deducted_points ?? hint.costPoints ?? 0)} points deducted.`,
      );
    } catch (err) {
      showNotice("danger", "Hint unavailable", err.message || "Could not reveal this hint.");
    }
  };

  const handleSubmitFlag = async (event) => {
    event.preventDefault();
    const submitted = flagInput.trim();
    if (!submitted || !challenge || submitting) return;

    setSubmitting(true);
    setAttempts((value) => value + 1);

    try {
      const response = await submitCTFFlag(challenge.id, submitted, token);
      const success = response?.success === true || response?.status === "success";

      if (success) {
        const score = Number(response.final_score ?? response.score ?? possiblePoints);
        setSolved(true);
        setEarnedScore(score);
        setLabStatus("idle");
        setLabSession(null);
        setElapsedSec(0);
        setFlagInput("");
        showNotice("success", "Flag captured", response.message || `You earned ${score} points.`);
      } else {
        setFlagInput("");
        showNotice("danger", "Incorrect flag", response?.message || "Not quite. Try again.");
      }
    } catch (err) {
      setFlagInput("");
      showNotice("danger", "Submission failed", err.message || "Could not submit this flag.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="ctf-detail-page">
        <div className="ctf-detail-inner narrow">
          <section className="ctf-panel empty">
            <Loader2 className="ctf-empty-icon spin" />
            <h1>Loading challenge</h1>
          </section>
        </div>
      </main>
    );
  }

  if (!challenge) {
    return (
      <main className="ctf-detail-page">
        <div className="ctf-detail-inner narrow">
          <button className="ctf-back-link" onClick={() => navigate(`/student/courses/${courseId}`)}>
            <ArrowLeft className="ctf-icon" /> Back to Course
          </button>
          <section className="ctf-panel empty">
            <Flag className="ctf-empty-icon" />
            <h1>Challenge not found</h1>
            <p>{loadError || "The CTF challenge you opened is not available for this course."}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="ctf-detail-page">
      <div className="ctf-detail-inner">
        <button className="ctf-back-link" onClick={() => navigate(`/student/courses/${courseId}`)}>
          <ArrowLeft className="ctf-icon" /> Back to Course
        </button>

        {notice && (
          <div className={`ctf-notice ${notice.type}`} role="status">
            <strong>{notice.title}</strong>
            <span>{notice.message}</span>
          </div>
        )}

        <section className={`ctf-hero-card ${solved ? "solved" : ""}`}>
          {solved && (
            <div className="ctf-solved-banner">
              <CheckCircle className="ctf-icon" />
              <span>Challenge completed. {earnedScore ?? possiblePoints} points earned.</span>
            </div>
          )}

          <div className="ctf-hero-main">
            <div>
              <div className="ctf-title-row">
                <span className="ctf-title-icon">
                  <Flag className="ctf-icon" />
                </span>
                <h1>{challenge.title}</h1>
                <span className={`ctf-difficulty ${difficultyKey}`}>
                  <DifficultyIcon className="ctf-small-icon" /> {difficulty.label}
                </span>
              </div>
              <span className="ctf-category-pill">{challenge.category}</span>
            </div>
            <div className="ctf-points">
              <Trophy className="ctf-icon" />
              <strong>{earnedScore ?? possiblePoints}</strong>
              <span>pts</span>
            </div>
          </div>

          <p>{challenge.description}</p>
        </section>

        <div className="ctf-workspace-grid">
          <div className="ctf-main-column">
            <section className="ctf-panel">
              <div className="ctf-panel-header">
                <div className="ctf-panel-title">
                  <span className={`ctf-status-dot ${labStatus}`} />
                  <h2>Lab Environment</h2>
                  {labStatus === "running" && (
                    <span className="ctf-uptime">
                      <Clock className="ctf-small-icon" /> {formatTime(elapsedSec)}
                    </span>
                  )}
                </div>

                {labStatus === "idle" && !solved && (
                  <button className="ctf-primary-button" onClick={launchLab}>
                    <Play className="ctf-icon" /> Launch Lab
                  </button>
                )}
                {labStatus === "starting" && (
                  <button className="ctf-secondary-button" disabled>
                    <Loader2 className="ctf-icon spin" /> Starting
                  </button>
                )}
                {labStatus === "running" && (
                  <button className="ctf-secondary-button" onClick={stopLab}>
                    <Power className="ctf-icon" /> Stop Lab
                  </button>
                )}
                {labStatus === "stopping" && (
                  <button className="ctf-secondary-button" disabled>
                    <Loader2 className="ctf-icon spin" /> Stopping
                  </button>
                )}
              </div>

              {labStatus === "idle" && !solved && (
                <div className="ctf-lab-placeholder">
                  <Sparkles className="ctf-empty-icon" />
                  <p>Launch the isolated challenge environment to receive the lab URL and files.</p>
                </div>
              )}

              {solved && (
                <div className="ctf-complete-box">
                  <CheckCircle className="ctf-icon" />
                  <span>This challenge is complete. Any running lab was closed automatically.</span>
                </div>
              )}

              {labStatus === "starting" && (
                <div className="ctf-lab-placeholder active">
                  <Loader2 className="ctf-empty-icon spin" />
                  <p>Starting the container or loading the external lab URL.</p>
                </div>
              )}

              {labStatus === "running" && labSession && (
                <div className="ctf-lab-shell">
                  <div className="ctf-lab-link-card">
                    <div>
                      <h3>Lab URL</h3>
                      <code>{labSession.url || "Files-only challenge"}</code>
                      {labSession.expiresAt && <p>Expires at {labSession.expiresAt}</p>}
                    </div>
                    <div className="ctf-lab-actions">
                      {labSession.url && (
                        <a className="ctf-primary-button" href={labSession.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="ctf-icon" /> Open Lab
                        </a>
                      )}
                      {labSession.url && (
                        <button className="ctf-secondary-button" onClick={() => copyToClipboard(labSession.url, "Lab URL copied")}>
                          <Copy className="ctf-icon" /> Copy URL
                        </button>
                      )}
                    </div>
                  </div>

                  {challengeFiles.length > 0 && (
                    <div className="ctf-file-list">
                      {challengeFiles.map((file, index) => (
                        <div className="ctf-file-row" key={`${file.name || "file"}-${index}`}>
                          <FileText className="ctf-icon" />
                          <span>{file.name || "challenge file"}</span>
                          <small>{file.size || ""}</small>
                          {file.url ? (
                            <a className="ctf-file-action" href={file.url} target="_blank" rel="noreferrer">
                              <Download className="ctf-small-icon" />
                            </a>
                          ) : (
                            <button disabled>
                              <Download className="ctf-small-icon" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="ctf-panel">
              <div className="ctf-panel-title standalone">
                <Target className="ctf-icon cyan" />
                <h2>Submit Flag</h2>
              </div>

              {!solved ? (
                <form className="ctf-submit-row" onSubmit={handleSubmitFlag}>
                  <input
                    value={flagInput}
                    onChange={(event) => setFlagInput(event.target.value)}
                    placeholder="flag{...}"
                    autoComplete="off"
                  />
                  <button className="ctf-primary-button" disabled={!flagInput.trim() || submitting} type="submit">
                    {submitting ? <Loader2 className="ctf-icon spin" /> : <Send className="ctf-icon" />}
                    Submit
                  </button>
                </form>
              ) : (
                <div className="ctf-complete-box">
                  <CheckCircle className="ctf-icon" />
                  <span>Solved for {earnedScore ?? possiblePoints} points</span>
                </div>
              )}

              {attempts > 0 && !solved && <p className="ctf-attempts">Attempts so far: {attempts}</p>}
            </section>
          </div>

          <aside className="ctf-sidebar">
            <section className="ctf-panel">
              <div className="ctf-panel-title standalone">
                <Lightbulb className="ctf-icon yellow" />
                <h2>Hints</h2>
              </div>

              {challenge.hints.length === 0 && (
                <p className="ctf-attempts">No hints are available for this challenge.</p>
              )}

              <div className="ctf-hint-list">
                {challenge.hints.map((hint, index) => {
                  const revealed = revealedHints[hint.id];
                  return (
                    <div className="ctf-hint-box" key={hint.id}>
                      <strong>Hint {index + 1}</strong>
                      {revealed ? (
                        <>
                          <p>{revealed.text}</p>
                          <small>{revealed.deductedPoints} points deducted.</small>
                        </>
                      ) : (
                        <button className="ctf-secondary-button full" onClick={() => revealHint(hint)} disabled={solved}>
                          Reveal for {hint.costPoints} pts
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="ctf-panel">
              <h2 className="ctf-sidebar-heading">Your Stats</h2>
              <dl className="ctf-stats">
                <div>
                  <dt>Status</dt>
                  <dd className={solved ? "green" : ""}>{solved ? "Solved" : "Unsolved"}</dd>
                </div>
                <div>
                  <dt>Attempts</dt>
                  <dd>{attempts}</dd>
                </div>
                <div>
                  <dt>Hint cost</dt>
                  <dd>{deductedPoints}</dd>
                </div>
                <div>
                  <dt>Total solves</dt>
                  <dd>{challenge.solvesCount}</dd>
                </div>
                <div>
                  <dt>Possible pts</dt>
                  <dd className="cyan">{possiblePoints}</dd>
                </div>
              </dl>
            </section>

            <section className="ctf-objective-card">
              <h2>Objective</h2>
              <ol>
                <li>Launch the lab.</li>
                <li>Open the returned URL or download the files.</li>
                <li>Find a value matching flag{"{...}"}.</li>
                <li>Submit it for points.</li>
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default CTFPage;
