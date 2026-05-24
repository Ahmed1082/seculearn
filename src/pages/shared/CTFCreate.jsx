import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Lightbulb,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Shield,
  Skull,
  Sparkles,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  buildCTFFormData,
  createCTFChallenge,
  deleteCTFChallenge,
  getChallengeForEdit,
  updateCTFChallenge,
} from "../../app/ctfApi";
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

const createId = (prefix) =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyHint = () => ({
  id: createId("hint"),
  hint_text: "",
  cost_points: 10,
});

const formatBytes = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const normalizeFlag = (value) => value.trim();

const CTFCreate = () => {
  const { courseId, ctfId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const isEditMode = Boolean(ctfId);
  const role = location.pathname.startsWith("/ta/") ? "ta" : "lecturer";
  const coursePath = `/${role}/courses/${courseId}`;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [points, setPoints] = useState(100);
  const [flag, setFlag] = useState("flag{}");
  const [showFlag, setShowFlag] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [labType, setLabType] = useState("docker");
  const [labUrl, setLabUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [hints, setHints] = useState([emptyHint()]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const finalCategory = category === "__custom" ? customCategory.trim() : category;
  const cleanHints = useMemo(
    () =>
      hints
        .map((hint) => ({
          hint_text: hint.hint_text.trim(),
          cost_points: Number(hint.cost_points || 0),
        }))
        .filter((hint) => hint.hint_text),
    [hints],
  );
  const flagValid = /^flag\{.+\}$/i.test(normalizeFlag(flag));
  const isValid =
    title.trim().length > 0 &&
    description.trim().length >= 10 &&
    finalCategory.length > 0 &&
    flagValid &&
    Number(points) > 0 &&
    (labType !== "external" || labUrl.trim().length > 0) &&
    hints.every((hint) => !hint.hint_text.trim() || Number(hint.cost_points) >= 0);

  const diff = difficultyConfig[difficulty] || difficultyConfig.easy;
  const DiffIcon = diff.icon;

  const selectDifficulty = (key) => {
    const selectedDifficulty = difficultyConfig[key] || difficultyConfig.easy;
    setDifficulty(key);
    setPoints(selectedDifficulty.suggestedPoints);
  };

  useEffect(() => {
    if (!isEditMode || !token) return undefined;

    let cancelled = false;

    const loadChallenge = async () => {
      setLoading(true);
      setError("");

      try {
        const challenge = await getChallengeForEdit(ctfId, token);
        if (cancelled) return;

        const matchingCategory = categoryOptions.includes(challenge.category)
          ? challenge.category
          : "__custom";

        setTitle(challenge.title);
        setDescription(challenge.description);
        setCategory(matchingCategory);
        setCustomCategory(matchingCategory === "__custom" ? challenge.category : "");
        setDifficulty(challenge.difficulty);
        setPoints(challenge.points || 100);
        setFlag(challenge.flag || "flag{}");
        setIsCaseSensitive(challenge.isCaseSensitive);
        setMaxAttempts(challenge.maxAttempts);
        setLabType(challenge.labType);
        setLabUrl(challenge.externalUrl || "");
        setFiles(
          challenge.files.map((file) => ({
            id: createId("file"),
            name: file.name,
            size: file.size,
            url: file.url,
          })),
        );
        setHints(
          challenge.hints.length
            ? challenge.hints.map((hint) => ({
                id: hint.id,
                hint_text: hint.text,
                cost_points: hint.costPoints,
              }))
            : [emptyHint()],
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load this CTF challenge.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadChallenge();

    return () => {
      cancelled = true;
    };
  }, [ctfId, isEditMode, token]);

  const handleAddFile = (event) => {
    const fileList = event.target.files;
    if (!fileList) return;

    const newFiles = Array.from(fileList).map((file) => ({
      id: createId("file"),
      name: file.name,
      size: file.size,
      file,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    event.target.value = "";
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const updateHint = (id, field, value) => {
    setHints((prev) =>
      prev.map((hint) =>
        hint.id === id
          ? { ...hint, [field]: field === "cost_points" ? Number(value) : value }
          : hint,
      ),
    );
  };

  const removeHint = (id) => {
    setHints((prev) => (prev.length === 1 ? [emptyHint()] : prev.filter((hint) => hint.id !== id)));
  };

  const buildPayload = () =>
    buildCTFFormData({
      title: title.trim(),
      description: description.trim(),
      category: finalCategory,
      difficulty,
      points: Number(points),
      flag: normalizeFlag(flag),
      dockerImage: null,
      isCaseSensitive,
      maxAttempts: Number(maxAttempts || 0),
      labType,
      labUrl: labUrl.trim(),
      files,
      hints: cleanHints,
    });

  const handleSubmit = async () => {
    if (!isValid || saving) return;

    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      if (isEditMode) {
        await updateCTFChallenge(ctfId, payload, token);
      } else {
        await createCTFChallenge(payload, token);
      }
      navigate(coursePath);
    } catch (err) {
      setError(err.message || "Could not save the CTF challenge.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || deleting) return;
    const confirmed = window.confirm("Delete this CTF challenge permanently?");
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      await deleteCTFChallenge(ctfId, token);
      navigate(coursePath);
    } catch (err) {
      setError(err.message || "Could not delete the CTF challenge.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="ctf-container">
        <div className="ctf-layout">
          <div className="ctf-card ctf-border-glow">
            <div className="ctf-card-header">
              <Loader2 className="ctf-icon text-primary spin" />
              <h1 className="ctf-h1">Loading challenge</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

            {labType === "external" && labUrl && (
              <a href={labUrl} target="_blank" rel="noreferrer" className="ctf-lab-link mb-4">
                <Sparkles className="ctf-icon-sm" /> Open External Lab
              </a>
            )}

            {files.length > 0 && (
              <div className="ctf-files-sec mb-4">
                <p className="ctf-files-title">Challenge Files</p>
                {files.map((file) => (
                  <div key={file.id} className="ctf-file-item">
                    <Paperclip className="ctf-icon-sm text-muted" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="ctf-file-size">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {cleanHints.length > 0 && (
              <div className="ctf-hint-preview mb-4">
                <Lightbulb className="ctf-icon-sm text-yellow shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="ctf-hint-text">{cleanHints.length} hint(s) configured.</p>
                  <p className="ctf-hint-cost">
                    Students reveal them one at a time for their configured point cost.
                  </p>
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
        <button className="ctf-btn ctf-btn-ghost mb-4 text-muted hover-text-foreground" onClick={() => navigate(coursePath)}>
          <ArrowLeft className="ctf-icon mr-2" /> Back to Course
        </button>

        {error && (
          <div className="ctf-form-message error">
            <AlertTriangle className="ctf-icon-sm" />
            <span>{error}</span>
          </div>
        )}

        <div className="ctf-grid">
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
                  <input className="ctf-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. SQL Injection 101" />
                </div>

                <div className="ctf-field">
                  <label className="ctf-label">Description <span className="text-dest">*</span></label>
                  <textarea className="ctf-textarea min-h-140" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the scenario, objective, and constraints..." />
                  <p className="ctf-helper">{description.length} chars / min 10</p>
                </div>

                <div className="ctf-split-2">
                  <div className="ctf-field">
                    <label className="ctf-label">Category <span className="text-dest">*</span></label>
                    <select className="ctf-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                      <option value="">Choose a category</option>
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                      <option value="__custom">Custom category</option>
                    </select>
                    {category === "__custom" && (
                      <input className="ctf-input mt-2" value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder="Enter custom category" />
                    )}
                  </div>

                  <div className="ctf-field">
                    <label className="ctf-label">Difficulty</label>
                    <div className="ctf-split-3">
                      {Object.entries(difficultyConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        const active = difficulty === key;
                        return (
                          <button key={key} type="button" onClick={() => selectDifficulty(key)} className={`ctf-diff-btn ${active ? `${config.className} active` : ""}`}>
                            <Icon className="ctf-icon-sm" /> {config.label}
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
                <h2 className="ctf-h2">Solution Flag <span className="text-dest">*</span></h2>
              </div>
              <div className="ctf-space-y-3 mt-4">
                <label className="ctf-helper block">Students must submit this exact flag. Format: <code className="text-primary ctf-mono">flag{"{...}"}</code> or <code className="text-primary ctf-mono">FLAG{"{...}"}</code></label>
                <div className="ctf-rel">
                  <input type={showFlag ? "text" : "password"} value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="flag{your_secret_here}" className="ctf-input ctf-mono pr-10" />
                  <button type="button" onClick={() => setShowFlag((value) => !value)} className="ctf-eye-btn">
                    {showFlag ? <EyeOff className="ctf-icon-sm" /> : <Eye className="ctf-icon-sm" />}
                  </button>
                </div>
                {!flagValid && flag.length > 0 && (
                  <p className="ctf-warn-text"><AlertTriangle className="ctf-icon-xs" /> Flag must follow the format flag{"{...}"} or FLAG{"{...}"}</p>
                )}
                <div className="ctf-switch-row mt-4">
                  <div>
                    <p className="ctf-switch-label">Case-sensitive matching</p>
                    <p className="ctf-switch-helper">If off, FLAG{"{x}"} equals flag{"{x}"}</p>
                  </div>
                  <label className="ctf-switch">
                    <input type="checkbox" checked={isCaseSensitive} onChange={(event) => setIsCaseSensitive(event.target.checked)} />
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
                <div className="ctf-switch-row">
                  <div>
                    <p className="ctf-switch-label">External hosted lab</p>
                    <p className="ctf-switch-helper">Use this only when the lab runs on another website.</p>
                  </div>
                  <label className="ctf-switch">
                    <input type="checkbox" checked={labType === "external"} onChange={(event) => setLabType(event.target.checked ? "external" : "docker")} />
                    <span className="ctf-slider"></span>
                  </label>
                </div>

                {labType === "external" && (
                  <div className="ctf-field">
                    <label className="ctf-label text-muted">External Lab URL <span className="text-dest">*</span></label>
                    <input className="ctf-input" value={labUrl} onChange={(event) => setLabUrl(event.target.value)} placeholder="https://lab.example.com/challenge-1" />
                  </div>
                )}

                <div className="ctf-field">
                  <label className="ctf-label text-muted">Challenge File (optional)</label>
                  <label className="ctf-file-drop">
                    <Paperclip className="ctf-icon-sm text-muted" />
                    <span>Click to attach files</span>
                    <input type="file" multiple className="hidden" onChange={handleAddFile} />
                  </label>
                  {files.length > 0 && (
                    <div className="ctf-files-list pt-2">
                      {files.map((file) => (
                        <div key={file.id} className="ctf-file-item">
                          <FileText className="ctf-icon-sm text-primary" />
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="ctf-file-size">{formatBytes(file.size)}</span>
                          <button type="button" onClick={() => removeFile(file.id)} className="ctf-file-del">
                            <X className="ctf-icon-sm" />
                          </button>
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
                  <h2 className="ctf-h2 ml-2">Hints</h2>
                </div>
                <button type="button" className="ctf-btn ctf-btn-outline px-3" onClick={() => setHints((prev) => [...prev, emptyHint()])}>
                  <Plus className="ctf-icon-sm mr-1" /> Add
                </button>
              </div>

              <div className="ctf-space-y-3 mt-4">
                {hints.map((hint, index) => (
                  <div className="ctf-hint-editor" key={hint.id}>
                    <div className="ctf-field">
                      <label className="ctf-label text-muted">Hint {index + 1}</label>
                      <textarea className="ctf-textarea min-h-60" value={hint.hint_text} onChange={(event) => updateHint(hint.id, "hint_text", event.target.value)} placeholder="A nudge in the right direction..." />
                    </div>
                    <div className="ctf-hint-editor-actions">
                      <label className="ctf-field">
                        <span className="ctf-label text-muted">Cost</span>
                        <input type="number" min={0} max={points} value={hint.cost_points} onChange={(event) => updateHint(hint.id, "cost_points", event.target.value)} className="ctf-input w-32" />
                      </label>
                      <button type="button" className="ctf-file-del" onClick={() => removeHint(hint.id)}>
                        <X className="ctf-icon-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ctf-card ctf-border-glow">
              <div className="ctf-card-header">
                <AlertTriangle className="ctf-icon text-yellow" />
                <h2 className="ctf-h2">Attempt Limit</h2>
              </div>
              <label className="ctf-field mt-4">
                <span className="ctf-label text-muted">Max Attempts (0 = unlimited)</span>
                <input type="number" min={0} value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} className="ctf-input w-32" />
              </label>
            </div>
          </div>

          <div className="ctf-sidebar-col">
            <div className="ctf-card border-primary-30 ctf-border-glow">
              <div className="ctf-card-header mb-3">
                <Trophy className="ctf-icon text-primary" />
                <h3 className="ctf-h3">Reward</h3>
              </div>
              <div className="ctf-reward-center">
                <p className="ctf-reward-big">{Number(points) || 0}</p>
                <p className="ctf-helper mt-1">points on solve</p>
              </div>
              <input type="number" min={1} max={9999} value={points} onChange={(event) => setPoints(Number(event.target.value))} className="ctf-input text-center mt-4" />
              <p className="ctf-helper text-center mt-2">
                Suggested for {diff.label}: <span className="text-primary">{diff.suggestedPoints} pts</span>
              </p>
            </div>

            <div className="ctf-card ctf-border-glow">
              <h3 className="ctf-h3">Lab Type</h3>
              <p className="ctf-helper mt-2">
                {labType === "external"
                  ? "External hosted URL. Students receive it when they launch the lab."
                  : "Docker image is selected automatically when the challenge is published."}
              </p>
            </div>

            <div className="ctf-space-y-2 mt-2">
              <button className="ctf-btn ctf-btn-outline w-full" onClick={() => setPreviewMode(true)}>
                <Eye className="ctf-icon-sm mr-2" /> Preview as Student
              </button>
              <button disabled={!isValid || saving} onClick={handleSubmit} className="ctf-btn ctf-btn-primary w-full">
                {saving ? <Loader2 className="ctf-icon-sm mr-2 spin" /> : <Save className="ctf-icon-sm mr-2" />}
                {isEditMode ? "Save Changes" : "Publish Challenge"}
              </button>
              <button className="ctf-btn ctf-btn-ghost w-full text-muted" onClick={() => navigate(coursePath)}>
                Cancel
              </button>
              {isEditMode && (
                <button className="ctf-btn ctf-btn-dest w-full" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="ctf-icon-sm mr-2 spin" /> : <Trash2 className="ctf-icon-sm mr-2" />}
                  Delete Challenge
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
