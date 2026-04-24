import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Flag, Trophy, Shield, Zap, Skull, Eye, EyeOff,
  Lightbulb, Paperclip, X, Plus, Tag, FileText, Sparkles,
  CheckCircle2, AlertTriangle, Save, Trash2,
} from "lucide-react";
import "../../styles/CTFCreate.css";

const difficultyConfig = {
  easy: { label: "Easy", icon: Zap, className: "diff-easy", suggestedPoints: 100 },
  medium: { label: "Medium", icon: Shield, className: "diff-medium", suggestedPoints: 250 },
  hard: { label: "Hard", icon: Skull, className: "diff-hard", suggestedPoints: 500 },
};

const categoryOptions = [
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

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CTFCreate = () => {
  const { courseId, ctfId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(ctfId);

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [points, setPoints] = useState(100);
  const [flag, setFlag] = useState("flag{}");
  const [showFlag, setShowFlag] = useState(false);

  // Hint
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hint, setHint] = useState("");
  const [hintCost, setHintCost] = useState(10);

  // Lab / resources
  const [labUrl, setLabUrl] = useState("");
  const [files, setFiles] = useState([]);

  // Tags
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // Settings
  const [maxAttempts, setMaxAttempts] = useState(0); // 0 = unlimited
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      // Simulate loading existing CTF data (since the backend endpoint might not be ready)
      if (ctfId === "1") {
        setTitle("Hidden in Plain Sight");
        setDescription("Analyze PCAP file to find the hidden endpoint.");
        setDifficulty("easy");
        setPoints(100);
        setFlag("flag{pcap_master_2024}");
        setCategory("Network Security");
      } else if (ctfId === "2") {
        setTitle("Firewall Bypass");
        setDescription("Find a way to bypass the misconfigured firewall rules and access the restricted endpoint.");
        setDifficulty("medium");
        setPoints(250);
        setFlag("flag{firewall_bypass_2024}");
        setCategory("Network Security");
      } else {
        setTitle("Existing CTF Challenge");
      }
    }
  }, [isEditMode, ctfId]);

  const finalCategory = category === "__custom" ? customCategory.trim() : category;
  const flagValid = flag.trim().startsWith("flag{") && flag.trim().endsWith("}") && flag.trim().length > 6;
  const isValid =
    title.trim().length > 0 &&
    description.trim().length >= 10 &&
    finalCategory.length > 0 &&
    flagValid &&
    points > 0 &&
    (!hintEnabled || hint.trim().length > 0);

  const handleDifficultyChange = (d) => {
    setDifficulty(d);
    setPoints(difficultyConfig[d].suggestedPoints);
  };

  const handleAddFile = (e) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const newFiles = Array.from(fileList).map((f) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `file-${Date.now()}`,
      name: f.name,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  };

  const handleSubmit = () => {
    if (!isValid) return;
    console.log(isEditMode ? "CTF updated:" : "CTF created:", {
      ctfId: isEditMode ? ctfId : undefined,
      courseId, title: title.trim(), description: description.trim(),
      category: finalCategory, difficulty, points, flag: flag.trim(),
      hint: hintEnabled ? hint.trim() : undefined,
      hintCost: hintEnabled ? hintCost : undefined,
      labUrl: labUrl.trim() || undefined,
      files, tags, maxAttempts, caseSensitive,
    });
    // toast.success("CTF challenge published!");
    navigate(`/lecturer/courses/${courseId}`);
  };

  const handleDelete = () => {
    console.log("CTF deleted:", ctfId);
    // toast.success("CTF challenge deleted!");
    navigate(`/lecturer/courses/${courseId}`);
  };

  const diff = difficultyConfig[difficulty];
  const DiffIcon = diff.icon;

  if (previewMode) {
    return (
      <div className="ctf-container">
        <div className="ctf-preview-wrapper">
          <div className="ctf-preview-header-nav">
            <button className="ctf-btn ctf-btn-ghost text-muted" onClick={() => setPreviewMode(false)}>
              <ArrowLeft className="ctf-icon mr-2" /> Exit Preview
            </button>
            <div className="ctf-badge ctf-badge-outline text-primary gap-1">
              <Eye className="ctf-icon-sm" /> Student Preview
            </div>
          </div>

          <div className="ctf-card ctf-border-glow">
            <div className="ctf-preview-title-row">
              <div className="flex-1">
                <div className="ctf-preview-title-wrap">
                  <div className="ctf-icon-circle bg-primary-10 border-primary-30">
                    <Flag className="ctf-icon text-primary" />
                  </div>
                  <h1 className="ctf-preview-h1">{title || "Untitled Challenge"}</h1>
                  <div className={`ctf-badge ${diff.className}`}>
                    <DiffIcon className="ctf-icon-sm mr-1" />
                    {diff.label}
                  </div>
                </div>
                {finalCategory && (
                  <div className="ctf-badge ctf-badge-outline text-muted mt-2">
                    {finalCategory}
                  </div>
                )}
              </div>
              <div className="ctf-reward-box">
                <Trophy className="ctf-icon text-primary" />
                <span className="ctf-reward-points">{points}</span>
                <span className="ctf-reward-label">pts</span>
              </div>
            </div>

            <p className="ctf-preview-desc">
              {description || "Challenge description will appear here..."}
            </p>

            {tags.length > 0 && (
              <div className="ctf-tags-wrap mb-4">
                {tags.map((t) => (
                  <div key={t} className="ctf-badge ctf-badge-outline text-muted">
                    #{t}
                  </div>
                ))}
              </div>
            )}

            {labUrl && (
              <a href={labUrl} target="_blank" rel="noreferrer" className="ctf-lab-link mb-4">
                <Sparkles className="ctf-icon-sm" /> Open Lab Environment
              </a>
            )}

            {files.length > 0 && (
              <div className="ctf-files-sec mb-4">
                <p className="ctf-files-title">Challenge Files</p>
                {files.map((f) => (
                  <div key={f.id} className="ctf-file-item">
                    <Paperclip className="ctf-icon-sm text-muted" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="ctf-file-size">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {hintEnabled && (
              <div className="ctf-hint-preview mb-4">
                <Lightbulb className="ctf-icon-sm text-yellow shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="ctf-hint-text">{hint || "(Hint hidden)"}</p>
                  <p className="ctf-hint-cost">Costs {hintCost} pts to reveal</p>
                </div>
              </div>
            )}

            <div className="ctf-submit-sec mt-6">
              <label className="ctf-label">Submit Flag</label>
              <input disabled placeholder="flag{...}" className="ctf-input ctf-mono" />
              <button disabled className="ctf-btn ctf-btn-primary">
                <Flag className="ctf-icon-sm mr-2" /> Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ctf-container">
      <div className="ctf-layout">
        <button className="ctf-btn ctf-btn-ghost mb-4 text-muted hover-text-foreground" onClick={() => navigate(`/lecturer/courses/${courseId}`)}>
          <ArrowLeft className="ctf-icon mr-2" /> Back to Course
        </button>

        <div className="ctf-grid">
          {/* Main Column */}
          <div className="ctf-main-col">
            
            <div className="ctf-card ctf-border-glow">
              <div className="ctf-card-header">
                <div className="ctf-icon-sq bg-primary-15 border-primary-30">
                  <Flag className="ctf-icon text-primary" />
                </div>
                <h1 className="ctf-h1">{isEditMode ? "Edit CTF Challenge" : "Create CTF Challenge"}</h1>
              </div>

              <div className="ctf-space-y-4">
                <div className="ctf-field">
                  <label className="ctf-label">Challenge Title <span className="text-dest">*</span></label>
                  <input className="ctf-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. SQL Injection 101" />
                </div>

                <div className="ctf-field">
                  <label className="ctf-label">Description <span className="text-dest">*</span></label>
                  <textarea className="ctf-textarea min-h-140" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the scenario, objective, and any constraints..." />
                  <p className="ctf-helper">{description.length} chars · min 10</p>
                </div>

                <div className="ctf-split-2">
                  <div className="ctf-field">
                    <label className="ctf-label">Category <span className="text-dest">*</span></label>
                    <select className="ctf-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">Choose a category</option>
                      {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                      <option value="__custom">+ Custom category…</option>
                    </select>
                    {category === "__custom" && (
                      <input className="ctf-input mt-2" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Enter custom category" />
                    )}
                  </div>
                  <div className="ctf-field">
                    <label className="ctf-label">Difficulty</label>
                    <div className="ctf-split-3">
                      {Object.keys(difficultyConfig).map((d) => {
                        const cfg = difficultyConfig[d];
                        const Icon = cfg.icon;
                        const active = difficulty === d;
                        return (
                          <button key={d} type="button" onClick={() => handleDifficultyChange(d)} className={`ctf-diff-btn ${active ? cfg.className + " active" : ""}`}>
                            <Icon className="ctf-icon-sm" /> {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ctf-card ctf-border-glow">
              <div className="ctf-card-header">
                <Flag className="ctf-icon text-primary" />
                <h2 className="ctf-h2">Solution Flag</h2>
              </div>
              <div className="ctf-space-y-3 mt-4">
                <label className="ctf-helper block">The flag students must submit to solve. Format: <code className="text-primary ctf-mono">flag{"{...}"}</code></label>
                <div className="ctf-rel">
                  <input type={showFlag ? "text" : "password"} value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="flag{your_secret_here}" className="ctf-input ctf-mono pr-10" />
                  <button type="button" onClick={() => setShowFlag(!showFlag)} className="ctf-eye-btn">
                    {showFlag ? <EyeOff className="ctf-icon-sm" /> : <Eye className="ctf-icon-sm" />}
                  </button>
                </div>
                {!flagValid && flag.length > 0 && (
                  <p className="ctf-warn-text"><AlertTriangle className="ctf-icon-xs" /> Flag must follow the format flag{"{...}"}</p>
                )}
                <div className="ctf-switch-row mt-4">
                  <div>
                    <p className="ctf-switch-label">Case-sensitive matching</p>
                    <p className="ctf-switch-helper">If off, FLAG{"{x}"} = flag{"{x}"}</p>
                  </div>
                  <label className="ctf-switch">
                    <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
                    <span className="ctf-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="ctf-card ctf-border-glow">
              <div className="ctf-card-header">
                <Sparkles className="ctf-icon text-primary" />
                <h2 className="ctf-h2">Lab Environment & Files</h2>
              </div>
              <div className="ctf-space-y-4 mt-4">
                <div className="ctf-field">
                  <label className="ctf-label text-muted">Lab URL (optional)</label>
                  <input className="ctf-input" value={labUrl} onChange={(e) => setLabUrl(e.target.value)} placeholder="https://lab.example.com/challenge-1" />
                </div>
                <div className="ctf-field">
                  <label className="ctf-label text-muted">Challenge Files (optional)</label>
                  <label className="ctf-file-drop">
                    <Paperclip className="ctf-icon-sm text-muted" />
                    <span>Click to attach files</span>
                    <input type="file" multiple className="hidden" onChange={handleAddFile} />
                  </label>
                  {files.length > 0 && (
                    <div className="ctf-files-list pt-2">
                      {files.map((f) => (
                        <div key={f.id} className="ctf-file-item">
                          <FileText className="ctf-icon-sm text-primary" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <span className="ctf-file-size">{formatBytes(f.size)}</span>
                          <button onClick={() => removeFile(f.id)} className="ctf-file-del"><X className="ctf-icon-sm" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="ctf-card ctf-border-glow">
              <div className="ctf-card-header justify-between">
                <div className="flex-row">
                  <Lightbulb className="ctf-icon text-yellow" />
                  <h2 className="ctf-h2 ml-2">Hint</h2>
                  <div className="ctf-badge ctf-badge-outline text-muted ml-2 font-normal text-xs">Optional</div>
                </div>
                <label className="ctf-switch">
                  <input type="checkbox" checked={hintEnabled} onChange={(e) => setHintEnabled(e.target.checked)} />
                  <span className="ctf-slider"></span>
                </label>
              </div>
              {hintEnabled && (
                <div className="ctf-space-y-3 mt-4">
                  <div className="ctf-field">
                    <label className="ctf-label text-muted">Hint Text</label>
                    <textarea className="ctf-textarea min-h-60" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="A nudge in the right direction..." />
                  </div>
                  <div className="ctf-field">
                    <label className="ctf-label text-muted">Point Cost to Reveal Hint</label>
                    <input type="number" min={0} max={points} value={hintCost} onChange={(e) => setHintCost(Number(e.target.value))} className="ctf-input w-32" />
                  </div>
                </div>
              )}
            </div>

            <div className="ctf-card ctf-border-glow">
              <div className="ctf-card-header">
                <Tag className="ctf-icon text-primary" />
                <h2 className="ctf-h2">Tags & Limits</h2>
              </div>
              <div className="ctf-space-y-4 mt-4">
                <div className="ctf-field">
                  <label className="ctf-label text-muted">Tags (helps students filter)</label>
                  <div className="flex-row gap-2">
                    <input className="ctf-input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="e.g. xss, beginner, owasp" />
                    <button type="button" className="ctf-btn ctf-btn-outline px-3" onClick={addTag}><Plus className="ctf-icon-sm" /></button>
                  </div>
                  {tags.length > 0 && (
                    <div className="ctf-tags-wrap pt-2">
                      {tags.map((t) => (
                        <div key={t} className="ctf-badge ctf-badge-outline text-primary gap-1">
                          #{t}
                          <button onClick={() => setTags(tags.filter((x) => x !== t))} className="ctf-tag-del"><X className="ctf-icon-xs" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ctf-field">
                  <label className="ctf-label text-muted">Max Attempts (0 = unlimited)</label>
                  <input type="number" min={0} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} className="ctf-input w-32" />
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="ctf-sidebar-col">
            <div className="ctf-card border-primary-30 ctf-border-glow">
              <div className="ctf-card-header mb-3">
                <Trophy className="ctf-icon text-primary" />
                <h3 className="ctf-h3">Reward</h3>
              </div>
              <div className="ctf-reward-center">
                <p className="ctf-reward-big">{points}</p>
                <p className="ctf-helper mt-1">points on solve</p>
              </div>
              <input type="number" min={1} max={9999} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="ctf-input text-center mt-4" />
              <p className="ctf-helper text-center mt-2">
                Suggested for {diff.label}: <span className="text-primary">{diff.suggestedPoints} pts</span>
              </p>
            </div>



            <div className="ctf-space-y-2 mt-2">
              <button className="ctf-btn ctf-btn-outline w-full" onClick={() => setPreviewMode(true)}>
                <Eye className="ctf-icon-sm mr-2" /> Preview as Student
              </button>
              <button disabled={!isValid} onClick={handleSubmit} className="ctf-btn ctf-btn-primary w-full">
                <Save className="ctf-icon-sm mr-2" /> {isEditMode ? "Save Changes" : "Publish Challenge"}
              </button>
              <button className="ctf-btn ctf-btn-ghost w-full text-muted" onClick={() => navigate(`/lecturer/courses/${courseId}`)}>
                Cancel
              </button>
              {isEditMode && (
                <button className="ctf-btn ctf-btn-dest w-full" onClick={handleDelete}>
                  <Trash2 className="ctf-icon-sm mr-2" /> Delete Challenge
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CTFCreate;
