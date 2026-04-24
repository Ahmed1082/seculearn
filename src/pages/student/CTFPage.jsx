import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  Download,
  FileText,
  Flag,
  Globe,
  Lightbulb,
  Loader2,
  Paperclip,
  Play,
  Power,
  Send,
  Shield,
  Skull,
  Sparkles,
  Target,
  Terminal,
  Trophy,
  Zap,
} from "lucide-react";
import { formatCTFFlag, getCTFChallengeById } from "../../data/ctfChallenges";
import "../../styles/CTFPage.css";

const difficultyConfig = {
  easy: { label: "Easy", icon: Zap },
  medium: { label: "Medium", icon: Shield },
  hard: { label: "Hard", icon: Skull },
};

const initialTerminalLines = [
  "student@lab-01:~/ctf$ Welcome to the CTF lab.",
  "student@lab-01:~/ctf$ Type 'help' for commands.",
];

const baseUsers = [
  { id: 1, username: "guest", password: "guest123", role: "user" },
  { id: 2, username: "alice", password: "qwerty", role: "user" },
  { id: 3, username: "bob", password: "letmein", role: "user" },
];

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
};

const CTFPage = () => {
  const { courseId, ctfId } = useParams();
  const navigate = useNavigate();
  const terminalRef = useRef(null);
  const launchTimerRef = useRef(null);

  const challenge = getCTFChallengeById(ctfId);
  const expectedFlag = useMemo(() => formatCTFFlag(challenge?.flag || ""), [challenge]);
  const mockUsers = useMemo(
    () => [
      ...baseUsers,
      {
        id: 4,
        username: "admin",
        password: "S3cur3_Passw0rd!",
        role: "admin",
        secret: expectedFlag,
      },
    ],
    [expectedFlag],
  );

  const [flagInput, setFlagInput] = useState("");
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [notice, setNotice] = useState(null);

  const [labStatus, setLabStatus] = useState("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [activeTab, setActiveTab] = useState("webapp");

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginResult, setLoginResult] = useState(null);

  const [terminalLines, setTerminalLines] = useState(initialTerminalLines);
  const [terminalCmd, setTerminalCmd] = useState("");

  const difficultyKey = challenge?.difficulty?.toLowerCase() || "easy";
  const difficulty = difficultyConfig[difficultyKey] || difficultyConfig.easy;
  const DifficultyIcon = difficulty.icon;
  const earnedPoints = hintRevealed ? Math.floor((challenge?.points || 0) / 2) : challenge?.points || 0;

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  useEffect(() => {
    if (labStatus !== "running") return undefined;
    const timer = setInterval(() => setElapsedSec((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [labStatus]);

  useEffect(() => {
    return () => {
      if (launchTimerRef.current) clearTimeout(launchTimerRef.current);
    };
  }, []);

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
            <p>The CTF challenge you opened is not available for this course.</p>
          </section>
        </div>
      </main>
    );
  }

  const showNotice = (type, title, message) => {
    setNotice({ type, title, message });
  };

  const launchLab = () => {
    setLabStatus("starting");
    setElapsedSec(0);
    setActiveTab("webapp");
    showNotice("info", "Starting lab", "Allocating the target environment.");

    launchTimerRef.current = setTimeout(() => {
      setLabStatus("running");
      showNotice("success", "Lab ready", "The vulnerable target is live at http://lab-01.ctf:8080");
    }, 1200);
  };

  const stopLab = () => {
    if (launchTimerRef.current) clearTimeout(launchTimerRef.current);
    setLabStatus("idle");
    setElapsedSec(0);
    setLoginResult(null);
    setUsernameInput("");
    setPasswordInput("");
    setTerminalLines(initialTerminalLines);
    setTerminalCmd("");
    showNotice("info", "Lab stopped", "The temporary environment was reset.");
  };

  const copyToFlag = async (value) => {
    setFlagInput(value);
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      // The input is still filled even when clipboard access is blocked.
    }
    showNotice("success", "Flag copied", "Review it, then submit to claim the points.");
  };

  const tryLogin = (event) => {
    event?.preventDefault();

    const username = usernameInput.trim();
    const password = passwordInput.trim();
    const sqliPattern = /'\s*OR\s+['"]?1['"]?\s*=\s*['"]?1['"]?\s*(--)?/i;
    const looseOrPattern = /'\s*OR\s*['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/i;
    const unionPattern = /UNION\s+SELECT/i;

    if (sqliPattern.test(username) || sqliPattern.test(password) || looseOrPattern.test(username) || looseOrPattern.test(password)) {
      const admin = mockUsers.find((user) => user.role === "admin");
      setLoginResult({
        ok: true,
        message: `Authentication bypassed. Logged in as ${admin.username}.`,
        rows: [admin],
      });
      showNotice("success", "SQL injection successful", "You reached the admin account.");
      return;
    }

    if (unionPattern.test(username) || unionPattern.test(password)) {
      setLoginResult({
        ok: true,
        message: "UNION query executed. Users table preview:",
        rows: mockUsers.map((user) => ({
          ...user,
          password: "***",
          secret: user.secret ? "[hidden]" : undefined,
        })),
      });
      return;
    }

    const match = mockUsers.find((user) => user.username === username && user.password === password);

    if (match) {
      setLoginResult({
        ok: true,
        message: `Welcome ${match.username}. Role: ${match.role}.`,
        rows: [match],
      });
      return;
    }

    setLoginResult({
      ok: false,
      message: "Invalid credentials. The query is built directly from the submitted values.",
    });
  };

  const runTerminalCmd = (event) => {
    event.preventDefault();
    const cmd = terminalCmd.trim();
    if (!cmd) return;

    if (cmd === "clear") {
      setTerminalLines(["student@lab-01:~/ctf$"]);
      setTerminalCmd("");
      return;
    }

    const nextLines = [...terminalLines, `student@lab-01:~/ctf$ ${cmd}`];

    if (cmd === "help") {
      nextLines.push(
        "Available commands:",
        "  help        Show commands",
        "  ls          List files",
        "  cat <file>  Read a file",
        "  curl <url>  Fetch a URL",
        "  whoami      Print current user",
        "  hint        Show a nudge",
        "  clear       Clear terminal",
      );
    } else if (cmd === "ls") {
      nextLines.push("README.txt  app.py  users.db  notes.md");
    } else if (cmd === "whoami") {
      nextLines.push("student");
    } else if (cmd === "cat README.txt") {
      nextLines.push(
        "Target: http://lab-01.ctf:8080/login",
        "Goal: Bypass authentication as admin and retrieve the flag.",
        "Input is concatenated into a SQL query without parameterization.",
      );
    } else if (cmd === "cat notes.md") {
      nextLines.push(
        "Try a classic OR-true payload.",
        "The app accepts guest / guest123 for a normal login.",
        "Admin-only responses can reveal the challenge flag.",
      );
    } else if (cmd === "cat app.py") {
      nextLines.push(
        "# vulnerable snippet",
        "query = \"SELECT * FROM users WHERE username='\" + u + \"' AND password='\" + p + \"'\"",
        "cursor.execute(query)",
      );
    } else if (cmd === "cat users.db") {
      nextLines.push("Permission denied. Try the web app.");
    } else if (cmd.startsWith("curl ")) {
      const url = cmd.slice(5).trim();
      if (url.includes("lab-01.ctf:8080")) {
        nextLines.push("<html><body><h1>Login</h1><form method='POST'></form></body></html>");
      } else {
        nextLines.push(`curl: could not resolve host: ${url}`);
      }
    } else if (cmd === "hint") {
      nextLines.push("The login query trusts whatever is typed into the form.");
    } else {
      nextLines.push(`bash: ${cmd}: command not found`);
    }

    setTerminalLines(nextLines);
    setTerminalCmd("");
  };

  const handleSubmitFlag = (event) => {
    event.preventDefault();
    const submitted = flagInput.trim();
    if (!submitted) return;

    setAttempts((value) => value + 1);

    if (submitted === expectedFlag || submitted === challenge.flag) {
      setSolved(true);
      setFlagInput("");
      showNotice("success", "Flag captured", `You earned ${earnedPoints} points.`);
      return;
    }

    setFlagInput("");
    showNotice("danger", "Incorrect flag", "Not quite. Keep digging through the lab output.");
  };

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
              <span>Challenge completed. {earnedPoints} points earned.</span>
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
              <strong>{earnedPoints}</strong>
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

                {labStatus === "idle" && (
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
              </div>

              {labStatus === "idle" && (
                <div className="ctf-lab-placeholder">
                  <Sparkles className="ctf-empty-icon" />
                  <p>Launch the isolated challenge environment to access the target app, terminal, and files.</p>
                </div>
              )}

              {labStatus === "starting" && (
                <div className="ctf-lab-placeholder active">
                  <Loader2 className="ctf-empty-icon spin" />
                  <p>Allocating container, preparing target app, and binding ports.</p>
                </div>
              )}

              {labStatus === "running" && (
                <div className="ctf-lab-shell">
                  <div className="ctf-tabs" role="tablist">
                    <button className={activeTab === "webapp" ? "active" : ""} onClick={() => setActiveTab("webapp")}>
                      <Globe className="ctf-small-icon" /> Web App
                    </button>
                    <button className={activeTab === "terminal" ? "active" : ""} onClick={() => setActiveTab("terminal")}>
                      <Terminal className="ctf-small-icon" /> Terminal
                    </button>
                    <button className={activeTab === "files" ? "active" : ""} onClick={() => setActiveTab("files")}>
                      <Paperclip className="ctf-small-icon" /> Files
                    </button>
                  </div>

                  {activeTab === "webapp" && (
                    <div className="ctf-browser">
                      <div className="ctf-browser-bar">
                        <span className="red" />
                        <span className="yellow" />
                        <span className="green" />
                        <code>http://lab-01.ctf:8080/login</code>
                      </div>

                      <div className="ctf-webapp-body">
                        <div className="ctf-webapp-heading">
                          <Shield className="ctf-icon" />
                          <h3>SecureCorp Admin Portal</h3>
                          <p>Authorized personnel only</p>
                        </div>

                        <form className="ctf-login-form" onSubmit={tryLogin}>
                          <input
                            value={usernameInput}
                            onChange={(event) => setUsernameInput(event.target.value)}
                            placeholder="username"
                            autoComplete="off"
                          />
                          <input
                            value={passwordInput}
                            onChange={(event) => setPasswordInput(event.target.value)}
                            placeholder="password"
                            autoComplete="off"
                          />
                          <button type="submit">Sign In</button>
                        </form>

                        {loginResult && (
                          <div className={`ctf-login-result ${loginResult.ok ? "ok" : "bad"}`}>
                            <p>{loginResult.message}</p>
                            {loginResult.rows?.map((row) => (
                              <div className="ctf-result-row" key={row.id}>
                                <span>
                                  {row.username} ({row.role})
                                </span>
                                {row.secret && row.secret.startsWith("flag{") && (
                                  <button onClick={() => copyToFlag(row.secret)}>
                                    <Copy className="ctf-small-icon" /> Copy flag
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="ctf-webapp-footnote">
                          Normal login: <code>guest</code> / <code>guest123</code>
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "terminal" && (
                    <div className="ctf-terminal">
                      <div className="ctf-terminal-title">
                        <Terminal className="ctf-small-icon" />
                        <span>student@lab-01: ~/ctf</span>
                      </div>
                      <div className="ctf-terminal-output" ref={terminalRef}>
                        {terminalLines.map((line, index) => (
                          <div key={`${line}-${index}`}>{line}</div>
                        ))}
                      </div>
                      <form className="ctf-terminal-input" onSubmit={runTerminalCmd}>
                        <span>$</span>
                        <input
                          value={terminalCmd}
                          onChange={(event) => setTerminalCmd(event.target.value)}
                          placeholder="type a command"
                          autoComplete="off"
                        />
                      </form>
                    </div>
                  )}

                  {activeTab === "files" && (
                    <div className="ctf-file-list">
                      {challenge.files.map((file) => (
                        <div className="ctf-file-row" key={file.name}>
                          <FileText className="ctf-icon" />
                          <span>{file.name}</span>
                          <small>{file.size}</small>
                          <button onClick={() => showNotice("info", "Download started", file.name)}>
                            <Download className="ctf-small-icon" />
                          </button>
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
                  <button className="ctf-primary-button" disabled={!flagInput.trim()} type="submit">
                    <Send className="ctf-icon" /> Submit
                  </button>
                </form>
              ) : (
                <div className="ctf-complete-box">
                  <CheckCircle className="ctf-icon" />
                  <span>Solved with {expectedFlag}</span>
                </div>
              )}

              {attempts > 0 && !solved && <p className="ctf-attempts">Attempts so far: {attempts}</p>}
            </section>
          </div>

          <aside className="ctf-sidebar">
            <section className="ctf-panel">
              <div className="ctf-panel-title standalone">
                <Lightbulb className="ctf-icon yellow" />
                <h2>Hint</h2>
              </div>

              {!showHint ? (
                <button
                  className="ctf-secondary-button full"
                  onClick={() => {
                    setShowHint(true);
                    setHintRevealed(true);
                  }}
                  disabled={solved}
                >
                  Reveal Hint (-50% points)
                </button>
              ) : (
                <div className="ctf-hint-box">
                  <p>{challenge.hint}</p>
                  <small>Reward reduced to {Math.floor(challenge.points / 2)} points.</small>
                </div>
              )}
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
                  <dt>Hint used</dt>
                  <dd>{hintRevealed ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt>Total solves</dt>
                  <dd>{challenge.solves}</dd>
                </div>
                <div>
                  <dt>Possible pts</dt>
                  <dd className="cyan">{earnedPoints}</dd>
                </div>
              </dl>
            </section>

            <section className="ctf-objective-card">
              <h2>Objective</h2>
              <ol>
                <li>Launch the lab.</li>
                <li>Explore the Web App or Terminal tab.</li>
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
