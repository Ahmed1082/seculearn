import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Flag,
  Trophy,
  Shield,
  Zap,
  Skull,
  Eye,
  EyeOff,
  Lightbulb,
  Paperclip,
  X,
  Plus,
  Tag,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Save,
} from "lucide-react";
import "../../styles/CTFCreate.css";

const categories = [
  "Web Exploitation",
  "Network Security",
  "Network Analysis",
  "Reverse Engineering",
  "Forensics",
  "Classical Crypto",
  "Public Key",
  "Hash Functions",
  "Symmetric Crypto",
  "System Hacking",
  "Recon",
  "OSINT",
  "Pwn / Binary Exploitation",
];

const difficultySettings = {
  easy: { label: "Easy", icon: Zap, accent: "green" },
  medium: { label: "Medium", icon: Shield, accent: "yellow" },
  hard: { label: "Hard", icon: Skull, accent: "red" },
};

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CTFCreate = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [points, setPoints] = useState(100);
  const [flag, setFlag] = useState("flag{}");
  const [showFlag, setShowFlag] = useState(false);
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hint, setHint] = useState("");
  const [hintCost, setHintCost] = useState(10);
  const [labUrl, setLabUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const selectedCategory = category === "__custom" ? customCategory.trim() : category;
  const flagValid =
    flag.trim().startsWith("flag{") &&
    flag.trim().endsWith("}") &&
    flag.trim().length > 6;

  const completionItems = [
    { label: "Title set", done: title.trim().length > 0 },
    { label: "Description (10+ chars)", done: description.trim().length >= 10 },
    { label: "Category chosen", done: selectedCategory.length > 0 },
    { label: "Valid flag (flag{...})", done: flagValid },
    { label: "Points assigned", done: points > 0 },
  ];

  const completedCount = completionItems.filter((item) => item.done).length;
  const completionPercent = Math.round((completedCount / completionItems.length) * 100);

  const handleFileChange = (event) => {
    const fileList = event.target.files;
    if (!fileList?.length) return;
    const newFiles = Array.from(fileList).map((file) => ({
      id: generateId(),
      name: file.name,
      size: file.size,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    event.target.value = "";
  };

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((item) => item.id !== fileId));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  };

  const isFormValid =
    title.trim().length > 0 &&
    description.trim().length >= 10 &&
    selectedCategory.length > 0 &&
    flagValid &&
    points > 0 &&
    (!hintEnabled || hint.trim().length > 0);

  const currentDifficulty = difficultySettings[difficulty];
  const DifficultyIcon = currentDifficulty.icon;

  const handleSubmit = () => {
    if (!isFormValid) return;
    const payload = {
      courseId,
      title: title.trim(),
      description: description.trim(),
      category: selectedCategory,
      difficulty,
      points,
      flag: flag.trim(),
      caseSensitive,
      hint: hintEnabled ? hint.trim() : undefined,
      hintCost: hintEnabled ? hintCost : undefined,
      labUrl: labUrl.trim() || undefined,
      files,
      tags,
      maxAttempts,
    };
    console.log("Publish CTF", payload);
    navigate(-1);
  };

  if (previewMode) {
    return (
      <div className="ctf-create-page">
        <div className="ctf-create-inner ctf-preview-page">
          <button className="back-link" onClick={() => setPreviewMode(false)}>
            <ArrowLeft className="icon" /> Back to Builder
          </button>

          <section className="preview-card">
            <div className="preview-header">
              <div className="preview-badge">
                <Flag className="icon" />
                <span>Create CTF Challenge</span>
              </div>
              <div className="reward-box">
                <span className="reward-value">{points}</span>
                <span className="reward-label">points on solve</span>
              </div>
            </div>

            <div className="preview-meta">
              <div>
                <h1>{title || "Untitled Challenge"}</h1>
                <div className="preview-pill-row">
                  <span className="preview-pill">{selectedCategory || "Uncategorized"}</span>
                  <span className={`preview-pill difficulty ${difficulty}`}>
                    <DifficultyIcon className="small-icon" /> {currentDifficulty.label}
                  </span>
                </div>
              </div>
            </div>

            <p className="preview-description">
              {description || "Describe the scenario, objective, and any constraints. Markdown supported in the rendered view..."}
            </p>

            {tags.length > 0 && (
              <div className="tag-row">
                {tags.map((tag) => (
                  <span key={tag} className="tag-pill">#{tag}</span>
                ))}
              </div>
            )}

            {labUrl && (
              <a href={labUrl} className="link-button" target="_blank" rel="noreferrer">
                <Sparkles className="small-icon" /> Open Lab Environment
              </a>
            )}

            {files.length > 0 && (
              <div className="file-list">
                <p className="file-list-title">Challenge Files</p>
                {files.map((file) => (
                  <div key={file.id} className="file-item">
                    <Paperclip className="small-icon" />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {hintEnabled && (
              <div className="hint-panel">
                <Lightbulb className="small-icon" />
                <div>
                  <p>{hint || "(Hint hidden)"}</p>
                  <span>Costs {hintCost} pts to reveal</span>
                </div>
              </div>
            )}

            <div className="flag-preview-row">
              <label>Submit Flag</label>
              <div className="submit-flag-row">
                <input type="text" placeholder="flag{...}" disabled />
                <button type="button" disabled>
                  <Flag className="icon" /> Submit
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="ctf-create-page">
      <div className="ctf-create-inner">
        <div className="page-top-row">
          <button className="back-link" onClick={() => navigate(-1)}>
            <ArrowLeft className="icon" /> Back to Course
          </button>
          <span className="page-title">Create CTF Challenge</span>
        </div>

        <div className="ctf-grid">
          <div className="main-column">
            <section className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <div className="title-icon">
                    <Flag className="icon" />
                  </div>
                  <div>
                    <h2>Create CTF Challenge</h2>
                    <p>Build a challenge with category, points, and flag settings.</p>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div className="field-group">
                  <label>
                    Challenge Title <span>*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. SQL Injection 101"
                  />
                </div>
                <div className="field-group">
                  <label>
                    Description <span>*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the scenario, objective, and any constraints. Markdown supported in the rendered view..."
                  />
                  <div className="field-hint">{description.length} chars � min 10</div>
                </div>
                <div className="split-grid">
                  <div className="field-group">
                    <label>
                      Category <span>*</span>
                    </label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">Choose a category</option>
                      {categories.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                      <option value="__custom">+ Custom category�</option>
                    </select>
                    {category === "__custom" && (
                      <input
                        className="mt-10"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Enter custom category"
                      />
                    )}
                  </div>
                  <div className="field-group">
                    <label>Difficulty</label>
                    <div className="difficulty-row">
                      {Object.entries(difficultySettings).map(([key, item]) => {
                        const Icon = item.icon;
                        const active = difficulty === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`difficulty-pill ${key} ${active ? "active" : ""}`}
                            onClick={() => {
                              setDifficulty(key);
                              const defaultPoints = key === "easy" ? 100 : key === "medium" ? 250 : 500;
                              setPoints(defaultPoints);
                            }}
                          >
                            <Icon className="small-icon" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Flag className="icon" />
                  <div>
                    <h3>Solution Flag</h3>
                    <p>Flag students must submit to solve. Format: flag{'{...}'}</p>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div className="field-group">
                  <div className="flag-input-wrapper">
                    <input
                      type={showFlag ? "text" : "password"}
                      value={flag}
                      onChange={(e) => setFlag(e.target.value)}
                      placeholder="flag{your_secret_here}"
                    />
                    <button
                      type="button"
                      className="flag-toggle"
                      onClick={() => setShowFlag((prev) => !prev)}
                    >
                      {showFlag ? <EyeOff className="icon" /> : <Eye className="icon" />}
                    </button>
                  </div>
                  {!flagValid && flag.length > 0 && (
                    <div className="validation-note">
                      <AlertTriangle className="small-icon" /> Flag must follow the format flag{'{...}'}
                    </div>
                  )}
                </div>
                <div className="toggle-row">
                  <div>
                    <strong>Case-sensitive matching</strong>
                    <p>If off, FLAG{'{x}'} = flag{'{x}'}</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(e) => setCaseSensitive(e.target.checked)}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </div>
            </section>
            <section className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Sparkles className="icon" />
                  <div>
                    <h3>Lab Environment & Files</h3>
                    <p>Lab URL and optional challenge attachments.</p>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div className="field-group">
                  <label>Lab URL (optional)</label>
                  <input
                    value={labUrl}
                    onChange={(e) => setLabUrl(e.target.value)}
                    placeholder="https://lab.example.com/challenge-1"
                  />
                </div>
                <div className="field-group">
                  <label>Challenge Files (optional)</label>
                  <label className="file-dropzone">
                    <Paperclip className="icon" />
                    <span>Click to attach files</span>
                    <input type="file" multiple onChange={handleFileChange} />
                  </label>
                  {files.length > 0 && (
                    <div className="file-list">
                      {files.map((file) => (
                        <div key={file.id} className="file-item">
                          <FileText className="icon" />
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">{formatBytes(file.size)}</span>
                          <button type="button" onClick={() => removeFile(file.id)}>
                            <X className="icon" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
            <section className="section-card">
              <div className="section-header space-between">
                <div className="section-title">
                  <Lightbulb className="icon yellow" />
                  <div>
                    <h3>Hint</h3>
                    <p>Optional</p>
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={hintEnabled}
                    onChange={(e) => setHintEnabled(e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>
              {hintEnabled && (
                <div className="section-body">
                  <div className="field-group">
                    <label>Hint Text</label>
                    <textarea
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="A nudge in the right direction..."
                    />
                  </div>
                  <div className="field-group small-width">
                    <label>Point Cost to Reveal Hint</label>
                    <input
                      type="number"
                      min="0"
                      max={points}
                      value={hintCost}
                      onChange={(e) => setHintCost(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </section>
            <section className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Tag className="icon" />
                  <div>
                    <h3>Tags & Limits</h3>
                    <p>Tags help students filter and find your challenge.</p>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div className="field-group">
                  <label>Tags (helps students filter)</label>
                  <div className="tag-input-row">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="e.g. xss, beginner, owasp"
                    />
                    <button type="button" className="tag-add-button" onClick={addTag}>
                      <Plus className="icon" />
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="tag-row">
                      {tags.map((tag) => (
                        <span key={tag} className="tag-pill small">
                          #{tag}
                          <button type="button" onClick={() => setTags(tags.filter((item) => item !== tag))}>
                            <X className="small-icon" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="field-group small-width">
                  <label>Max Attempts (0 = unlimited)</label>
                  <input
                    type="number"
                    min="0"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  />
                </div>
              </div>
            </section>
          </div>
          <aside className="sidebar-column">
            <section className="sidebar-card">
              <div className="side-heading">
                <Trophy className="icon" />
                <span>Reward</span>
              </div>
              <div className="reward-preview">
                <span className="reward-number">{points}</span>
                <span className="reward-text">points on solve</span>
              </div>
              <input
                type="number"
                min="1"
                max="9999"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="points-input"
              />
              <p className="hint-text">
                Suggested for {currentDifficulty.label}: <strong>{difficulty === "easy" ? 100 : difficulty === "medium" ? 250 : 500} pts</strong>
              </p>
            </section>
            <section className="sidebar-card">
              <div className="side-heading justify-between">
                <span>Setup Progress</span>
                <span className="progress-value">{completionPercent}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${completionPercent}%` }} />
              </div>
              <ul className="progress-list">
                {completionItems.map((item) => (
                  <li key={item.label}>
                    <CheckCircle2 className={`progress-icon ${item.done ? "done" : "pending"}`} />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="sidebar-card action-card">
              <button type="button" className="btn-outline" onClick={() => setPreviewMode(true)}>
                <Eye className="icon" /> Preview as Student
              </button>
              <button type="button" className="btn-primary" disabled={!isFormValid} onClick={handleSubmit}>
                <Save className="icon" /> Publish Challenge
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CTFCreate;
