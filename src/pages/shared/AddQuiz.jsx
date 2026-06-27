import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createQuiz,
  getQuizzesList,
  getQuizForEdit,
  updateQuiz,
  deleteQuiz as apiDeleteQuiz,
} from "../../app/quizApi";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Eye,
  GripVertical,
  Hash,
  HelpCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import "../../styles/AddQuiz.css";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createOption = (text = "") => ({ id: createId(), text });

const createQuestion = () => ({
  id: createId(),
  text: "",
  type: "multiple_choice",
  options: [createOption(), createOption(), createOption(), createOption()],
  correctOptionId: "",
  explanation: "",
  points: 1,
});

const getInitialQuestions = () => [createQuestion()];

const sanitizeNumber = (value, min, max, fallback) => {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const normalizeQuestion = (question) => {
  const type =
    question?.type === "true-false" ? "true-false" : "multiple_choice";

  let options = Array.isArray(question?.options)
    ? question.options.map((opt, i) => ({
        id: opt?.id || createId(),
        text:
          typeof opt?.text === "string"
            ? opt.text
            : type === "true-false"
              ? i === 0
                ? "True"
                : "False"
              : "",
      }))
    : [];

  if (type === "true-false") {
    options = [
      createOption(options[0]?.text || "True"),
      createOption(options[1]?.text || "False"),
    ];
  }

  if (!options.length) {
    options =
      type === "true-false"
        ? [createOption("True"), createOption("False")]
        : [createOption(), createOption(), createOption(), createOption()];
  }

  if (type === "multiple_choice" && options.length < 4) {
    options = [
      ...options,
      ...Array.from({ length: 4 - options.length }, () => createOption()),
    ];
  }

  const hasCorrect = options.some((o) => o.id === question?.correctOptionId);

  return {
    id: question?.id || createId(),
    text: typeof question?.text === "string" ? question.text : "",
    type,
    options,
    correctOptionId: hasCorrect ? question.correctOptionId : "",
    explanation:
      typeof question?.explanation === "string" ? question.explanation : "",
    points: sanitizeNumber(question?.points, 1, 100, 1),
  };
};

// Map frontend question shape to API payload shape
const toApiQuestion = (question) => {
  return {
    question_text: question.text,
    question_type:
      question.type === "true-false" ? "true_false" : "mcq",
    points: question.points,
    explanation: question.explanation || "",
    options: question.options.map((opt) => ({
      option_text: opt.text,
      is_correct: opt.id === question.correctOptionId,
    })),
  };
};

const isApiQuestionShape = (question) =>
  typeof question?.question_text === "string" ||
  typeof question?.question_type === "string" ||
  (Array.isArray(question?.options) &&
    question.options.some(
      (option) =>
        typeof option?.option_text === "string" ||
        typeof option?.is_correct === "boolean"
    ));

const normalizeBuilderQuestion = (question, index) =>
  isApiQuestionShape(question)
    ? fromApiQuestion(question, index)
    : normalizeQuestion(question);

// Map API response question back to frontend shape
const fromApiQuestion = (apiQ, index) => {
  const options = (apiQ.options || []).map((opt) => ({
    id: String(opt.id),
    text: opt.option_text || opt.text || "",
  }));
  const correctOption = (apiQ.options || []).find(
    (opt) => opt.is_correct
  );
  return {
    id: String(apiQ.id || `q-${index}`),
    text: apiQ.question_text || "",
    type:
      apiQ.question_type === "true_false" ? "true-false" : "multiple_choice",
    options,
    correctOptionId: correctOption ? String(correctOption.id) : "",
    explanation: apiQ.explanation || "",
    points: Number(apiQ.points) || 1,
  };
};

const AddQuiz = ({ role = "lecturer" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, lectureId, sectionId } = useParams();
  const isSectionView = Boolean(sectionId);
  const unitLabel = isSectionView ? "Section" : "Lecture";
  const contentPath = `/${role}/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}`;
  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const editingQuizId = queryParams.get("quizId") || "";
  const isEditingQuiz = Boolean(editingQuizId);

  const token = localStorage.getItem("token");
  const unwrapApiData = (payload) => payload?.data ?? payload;

  const initialQuestions = useMemo(() => getInitialQuestions(), []);
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [questions, setQuestions] = useState(initialQuestions);
  const [expandedQuestion, setExpandedQuestion] = useState(
    initialQuestions[0]?.id || null
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isEditingQuizLoaded, setIsEditingQuizLoaded] = useState(
    !isEditingQuiz
  );

  const totalPoints = useMemo(
    () =>
      questions.reduce(
        (sum, q) => sum + sanitizeNumber(q.points, 1, 100, 1),
        0
      ),
    [questions]
  );

  // Load existing quiz data when editing
  useEffect(() => {
    let isCancelled = false;

    const applyQuizData = (quizData) => {
      const normalizedQuestions = Array.isArray(quizData?.questions)
        ? quizData.questions.map((question, index) =>
            normalizeBuilderQuestion(question, index)
          )
        : [];

      setTitle(quizData?.title || "");
      setTimeLimit(
        sanitizeNumber(
          quizData?.timeLimit ?? quizData?.duration_minutes,
          1,
          180,
          30
        )
      );
      setPassingScore(
        sanitizeNumber(
          quizData?.passingScore ?? quizData?.passing_percentage,
          0,
          100,
          60
        )
      );
      setShuffleQuestions(Boolean(quizData?.shuffleQuestions));
      setShuffleOptions(Boolean(quizData?.shuffleOptions));
      setShowResults(
        typeof quizData?.showResults === "boolean" ? quizData.showResults : true
      );

      if (normalizedQuestions.length > 0) {
        setQuestions(normalizedQuestions);
        setExpandedQuestion(normalizedQuestions[0]?.id || null);
        setIsEditingQuizLoaded(true);
        setStatusMessage("");
        return true;
      }

      const next = getInitialQuestions();
      setQuestions(next);
      setExpandedQuestion(next[0]?.id || null);
      setIsEditingQuizLoaded(false);
      setStatusMessage(
        "Quiz details were not returned by the API, so editing is disabled for this quiz right now."
      );
      return false;
    };

    if (!isEditingQuiz) {
      setTitle("");
      setTimeLimit(30);
      setPassingScore(60);
      setShuffleQuestions(false);
      setShuffleOptions(false);
      setShowResults(true);
      const next = getInitialQuestions();
      setQuestions(next);
      setExpandedQuestion(next[0]?.id || null);
      setStatusMessage("");
      setIsSubmitting(false);
      setIsLoadingQuiz(false);
      setIsEditingQuizLoaded(true);
      return;
    }

    // Try from route state first (passed when navigating to edit)
    const routeQuiz =
      location.state?.quiz &&
      String(location.state.quiz.id) === String(editingQuizId)
        ? location.state.quiz
        : null;

    const hasRouteQuestions =
      Array.isArray(routeQuiz?.questions) && routeQuiz.questions.length > 0;

    if (routeQuiz && hasRouteQuestions) {
      applyQuizData(routeQuiz);
      return;
    }

    const fetchQuizDetails = async () => {
      setIsLoadingQuiz(true);
      setStatusMessage("Loading quiz details...");

      try {
        const detailed = unwrapApiData(await getQuizForEdit(editingQuizId, token));
        applyQuizData(detailed);
      } catch (error) {
        if (isCancelled) return;
        setIsEditingQuizLoaded(false);
        setStatusMessage(error.message || "Failed to load quiz details.");
      } finally {
        if (!isCancelled) {
          setIsLoadingQuiz(false);
        }
      }
    };

    fetchQuizDetails();

    return () => {
      isCancelled = true;
    };
  }, [editingQuizId, isEditingQuiz, lectureId, location.state, sectionId, token]);

  const getQuizValidationMessage = () => {
    if (!title.trim()) return "Please enter the quiz title.";
    if (sanitizeNumber(timeLimit, 1, 180, 30) <= 0)
      return "Please enter a valid time limit.";
    if (questions.length === 0) return "Please add at least one question.";

    const badIndex = questions.findIndex(
      (q) =>
        !q.text.trim() ||
        !q.correctOptionId ||
        q.options.length < 2 ||
        q.options.some((o) => !o.text.trim())
    );

    if (badIndex >= 0)
      return `Please complete question ${badIndex + 1} and choose its correct answer.`;

    return "";
  };

  const quizValidationMessage = getQuizValidationMessage();
  const isQuizValid = !quizValidationMessage;

  const updateQuestion = (questionId, updates) => {
    setStatusMessage("");
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q))
    );
  };

  const updateOption = (questionId, optionId, text) => {
    setStatusMessage("");
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, text } : o
              ),
            }
          : q
      )
    );
  };

  const addOption = (questionId) => {
    setStatusMessage("");
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, createOption()] }
          : q
      )
    );
  };

  const removeOption = (questionId, optionId) => {
    setStatusMessage("");
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const nextOptions = q.options.filter((o) => o.id !== optionId);
        return {
          ...q,
          options: nextOptions,
          correctOptionId:
            q.correctOptionId === optionId ? "" : q.correctOptionId,
        };
      })
    );
  };

  const addQuestion = () => {
    const next = createQuestion();
    setQuestions((prev) => [...prev, next]);
    setExpandedQuestion(next.id);
    setStatusMessage("");
  };

  const duplicateQuestion = (questionId) => {
    const src = questions.find((q) => q.id === questionId);
    if (!src) return;
    const nextOptions = src.options.map((o) => createOption(o.text));
    const dup = {
      ...src,
      id: createId(),
      options: nextOptions,
      correctOptionId: src.correctOptionId
        ? nextOptions[
            src.options.findIndex((o) => o.id === src.correctOptionId)
          ]?.id || ""
        : "",
    };
    const srcIndex = questions.findIndex((q) => q.id === questionId);
    const next = [...questions];
    next.splice(srcIndex + 1, 0, dup);
    setQuestions(next);
    setExpandedQuestion(dup.id);
    setStatusMessage("");
  };

  const removeQuestion = (questionId) => {
    if (questions.length <= 1) {
      setStatusMessage("Quiz must contain at least one question.");
      return;
    }
    const next = questions.filter((q) => q.id !== questionId);
    setQuestions(next);
    setStatusMessage("");
    if (expandedQuestion === questionId) setExpandedQuestion(next[0]?.id || null);
  };

  const changeQuestionType = (questionId, nextType) => {
    if (nextType === "true-false") {
      const t = createOption("True");
      const f = createOption("False");
      updateQuestion(questionId, {
        type: nextType,
        options: [t, f],
        correctOptionId: "",
      });
      return;
    }
    updateQuestion(questionId, {
      type: nextType,
      options: [createOption(), createOption(), createOption(), createOption()],
      correctOptionId: "",
    });
  };

  const togglePreviewMode = () => {
    setPreviewIndex(0);
    setPreviewAnswers({});
    setPreviewMode((prev) => !prev);
    setStatusMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isEditingQuiz && !isEditingQuizLoaded) {
      setStatusMessage(
        "This quiz cannot be updated until its full question details are loaded from the API."
      );
      return;
    }

    if (!isQuizValid) {
      setStatusMessage(quizValidationMessage);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");

    const payload = {
      title: title.trim(),
      duration_minutes: sanitizeNumber(timeLimit, 1, 180, 30),
      passing_percentage: sanitizeNumber(passingScore, 0, 100, 60),
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      shuffleQuestions: shuffleQuestions,
      shuffleOptions: shuffleOptions,
      ...(sectionId
        ? { section_id: Number(sectionId) }
        : { lecture_id: Number(lectureId) }),
      questions: questions.map(toApiQuestion),
    };

    try {
      if (isEditingQuiz) {
        await updateQuiz(editingQuizId, payload, token);
      } else {
        await createQuiz(payload, token);
      }
      navigate(contentPath);
    } catch (err) {
      setStatusMessage(err.message || "Failed to save quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!isEditingQuiz || !editingQuizId) return;

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      await apiDeleteQuiz(editingQuizId, token);
      navigate(contentPath);
    } catch (err) {
      setStatusMessage(err.message || "Failed to delete quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPreviewQuestion = questions[previewIndex];

  if (previewMode && currentPreviewQuestion) {
    return (
      <section className="add-quiz-page">
        <div className="add-quiz-shell add-quiz-shell-preview">
          <div className="add-quiz-preview-topbar">
            <button
              type="button"
              className="add-quiz-back-btn"
              onClick={togglePreviewMode}
            >
              <ArrowLeft size={16} />
              Exit Preview
            </button>
            <span className="add-quiz-preview-badge">Preview Mode</span>
          </div>

          <div className="add-quiz-preview-hero">
            <h1>{title || "Untitled Quiz"}</h1>
            <div className="add-quiz-preview-meta">
              <span>
                <Clock3 size={14} />
                {sanitizeNumber(timeLimit, 1, 180, 30)} min
              </span>
              <span>
                <Hash size={14} />
                {questions.length} question{questions.length !== 1 ? "s" : ""}
              </span>
              <span>
                {totalPoints} point{totalPoints !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="add-quiz-preview-card">
            <div className="add-quiz-preview-question-head">
              <span className="add-quiz-preview-pill">
                Question {previewIndex + 1} of {questions.length}
              </span>
              <span className="add-quiz-preview-points">
                {currentPreviewQuestion.points} pt
                {currentPreviewQuestion.points !== 1 ? "s" : ""}
              </span>
            </div>

            <h2>{currentPreviewQuestion.text || "Question text..."}</h2>

            <div className="add-quiz-preview-options">
              {currentPreviewQuestion.options.map((option, optionIndex) => {
                const optionLabel = String.fromCharCode(65 + optionIndex);
                const isSelected =
                  previewAnswers[currentPreviewQuestion.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`add-quiz-preview-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() =>
                      setPreviewAnswers((prev) => ({
                        ...prev,
                        [currentPreviewQuestion.id]: option.id,
                      }))
                    }
                  >
                    <span className="add-quiz-preview-option-letter">
                      {optionLabel}
                    </span>
                    <span>{option.text || "Option..."}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="add-quiz-preview-footer">
            <button
              type="button"
              className="add-quiz-secondary-btn"
              onClick={() => setPreviewIndex((prev) => Math.max(prev - 1, 0))}
              disabled={previewIndex === 0}
            >
              Previous
            </button>

            <div className="add-quiz-preview-pagination">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  type="button"
                  className={`add-quiz-preview-page-dot ${index === previewIndex ? "is-active" : ""} ${previewAnswers[q.id] ? "is-answered" : ""}`}
                  onClick={() => setPreviewIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {previewIndex < questions.length - 1 ? (
              <button
                type="button"
                className="add-quiz-primary-btn"
                onClick={() =>
                  setPreviewIndex((prev) =>
                    Math.min(prev + 1, questions.length - 1)
                  )
                }
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="add-quiz-finish-btn"
                onClick={togglePreviewMode}
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="add-quiz-page">
      <div className="add-quiz-shell">
        <button
          type="button"
          className="add-quiz-back-btn"
          onClick={() => navigate(contentPath)}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <form className="add-quiz-layout" onSubmit={handleSubmit}>
          <div className="add-quiz-main">
            <div className="add-quiz-panel add-quiz-intro-panel">
              <div className="add-quiz-heading-row">
                <span className="add-quiz-heading-icon">
                  <HelpCircle size={16} />
                </span>
                <div>
                  <h1>{isEditingQuiz ? "Edit Quiz" : "Create New Quiz"}</h1>
                  <p>
                    {isEditingQuiz
                      ? `Update this ${unitLabel.toLowerCase()} quiz and save your changes.`
                      : `Configure and launch a quiz for this ${unitLabel.toLowerCase()}.`}
                  </p>
                </div>
              </div>

              <label className="add-quiz-field">
                <span>
                  Quiz Title <em>*</em>
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setStatusMessage("");
                  }}
                  placeholder="e.g. Midterm Quiz: Network Security Fundamentals"
                  required
                />
              </label>

              <div className="add-quiz-settings-grid">
                <label className="add-quiz-field">
                  <span>
                    <Clock3 size={14} />
                    Time Limit (minutes)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={timeLimit}
                    onChange={(e) => {
                      setTimeLimit(Number(e.target.value || 0));
                      setStatusMessage("");
                    }}
                    onBlur={() =>
                      setTimeLimit(sanitizeNumber(timeLimit, 1, 180, 30))
                    }
                  />
                </label>

                <label className="add-quiz-field">
                  <span>Passing Score (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passingScore}
                    onChange={(e) => {
                      setPassingScore(Number(e.target.value || 0));
                      setStatusMessage("");
                    }}
                    onBlur={() =>
                      setPassingScore(sanitizeNumber(passingScore, 0, 100, 60))
                    }
                  />
                </label>
              </div>
            </div>

            <section className="add-quiz-question-section">
              <div className="add-quiz-question-toolbar">
                <h2>
                  Questions
                  <span className="add-quiz-count-badge">{questions.length}</span>
                </h2>

                <div className="add-quiz-toolbar-actions">
                  <button
                    type="button"
                    className="add-quiz-secondary-btn"
                    onClick={togglePreviewMode}
                    disabled={questions.length === 0}
                  >
                    <Eye size={15} />
                    Preview
                  </button>
                  <button
                    type="button"
                    className="add-quiz-primary-btn"
                    onClick={addQuestion}
                  >
                    <Plus size={15} />
                    Add Question
                  </button>
                </div>
              </div>

              <div className="add-quiz-question-list">
                {questions.map((question, index) => {
                  const isExpanded = expandedQuestion === question.id;
                  const hasCorrect = Boolean(question.correctOptionId);
                  const isComplete =
                    question.text.trim() &&
                    hasCorrect &&
                    question.options.every((o) => o.text.trim());

                  return (
                    <article
                      key={question.id}
                      className={`add-quiz-question-card ${isExpanded ? "is-expanded" : ""}`}
                    >
                      <button
                        type="button"
                        className="add-quiz-question-header"
                        onClick={() =>
                          setExpandedQuestion(isExpanded ? null : question.id)
                        }
                      >
                        <GripVertical size={15} className="add-quiz-drag-icon" />
                        <span
                          className={`add-quiz-question-index ${isComplete ? "is-complete" : ""}`}
                        >
                          {isComplete ? <CheckCircle2 size={15} /> : index + 1}
                        </span>

                        <div className="add-quiz-question-summary">
                          <strong>
                            {question.text || `Question ${index + 1}`}
                          </strong>
                          <span>
                            {question.type === "true-false"
                              ? "True / False"
                              : `${question.options.length} options`}{" "}
                            - {question.points} pt
                            {question.points !== 1 ? "s" : ""}
                            {!hasCorrect ? " - No correct answer" : ""}
                          </span>
                        </div>

                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="add-quiz-question-body">
                          <div className="add-quiz-question-meta">
                            <label className="add-quiz-field">
                              <span>Question Type</span>
                              <select
                                value={question.type}
                                onChange={(e) =>
                                  changeQuestionType(question.id, e.target.value)
                                }
                              >
                                <option value="multiple_choice">
                                  Multiple Choice
                                </option>
                                <option value="true-false">True / False</option>
                              </select>
                            </label>

                            <label className="add-quiz-field add-quiz-points-field">
                              <span>Points</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={question.points}
                                onChange={(e) =>
                                  updateQuestion(question.id, {
                                    points: Number(e.target.value || 0),
                                  })
                                }
                                onBlur={() =>
                                  updateQuestion(question.id, {
                                    points: sanitizeNumber(
                                      question.points,
                                      1,
                                      100,
                                      1
                                    ),
                                  })
                                }
                              />
                            </label>
                          </div>

                          <label className="add-quiz-field">
                            <span>
                              Question Text <em>*</em>
                            </span>
                            <textarea
                              rows={4}
                              value={question.text}
                              onChange={(e) =>
                                updateQuestion(question.id, { text: e.target.value })
                              }
                              placeholder="Enter your question here..."
                            />
                          </label>

                          <div className="add-quiz-options-block">
                            <div className="add-quiz-options-heading">
                              <span>
                                Answer Options <em>*</em>
                              </span>
                              <small>
                                Click the circle to mark the correct answer
                              </small>
                            </div>

                            <div className="add-quiz-options-list">
                              {question.options.map((option, optionIndex) => {
                                const label = String.fromCharCode(
                                  65 + optionIndex
                                );
                                const isCorrect =
                                  question.correctOptionId === option.id;

                                return (
                                  <div
                                    key={option.id}
                                    className={`add-quiz-option-row ${isCorrect ? "is-correct" : ""}`}
                                  >
                                    <button
                                      type="button"
                                      className={`add-quiz-option-marker ${isCorrect ? "is-correct" : ""}`}
                                      onClick={() =>
                                        updateQuestion(question.id, {
                                          correctOptionId: option.id,
                                        })
                                      }
                                      aria-label={
                                        isCorrect
                                          ? "Correct answer"
                                          : "Mark as correct"
                                      }
                                    >
                                      {isCorrect ? (
                                        <Check size={15} />
                                      ) : (
                                        label
                                      )}
                                    </button>

                                    <input
                                      type="text"
                                      value={option.text}
                                      onChange={(e) =>
                                        updateOption(
                                          question.id,
                                          option.id,
                                          e.target.value
                                        )
                                      }
                                      placeholder={`Option ${label}`}
                                      disabled={question.type === "true-false"}
                                    />

                                    {question.type === "multiple_choice" &&
                                      question.options.length > 2 && (
                                        <button
                                          type="button"
                                          className="add-quiz-icon-btn"
                                          onClick={() =>
                                            removeOption(question.id, option.id)
                                          }
                                          aria-label={`Remove option ${label}`}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                  </div>
                                );
                              })}
                            </div>

                            {question.type === "multiple_choice" &&
                              question.options.length < 6 && (
                                <button
                                  type="button"
                                  className="add-quiz-text-btn"
                                  onClick={() => addOption(question.id)}
                                >
                                  <Plus size={14} />
                                  Add Option
                                </button>
                              )}
                          </div>

                          <label className="add-quiz-field">
                            <span>Explanation (shown after submission)</span>
                            <textarea
                              rows={3}
                              value={question.explanation}
                              onChange={(e) =>
                                updateQuestion(question.id, {
                                  explanation: e.target.value,
                                })
                              }
                              placeholder="Explain why this answer is correct..."
                            />
                          </label>

                          <div className="add-quiz-question-actions">
                            <button
                              type="button"
                              className="add-quiz-text-btn"
                              onClick={() => duplicateQuestion(question.id)}
                            >
                              <Copy size={14} />
                              Duplicate
                            </button>

                            <button
                              type="button"
                              className="add-quiz-danger-btn"
                              onClick={() => removeQuestion(question.id)}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}

                <button
                  type="button"
                  className="add-quiz-add-card"
                  onClick={addQuestion}
                >
                  <span className="add-quiz-add-card-icon">
                    <Plus size={18} />
                  </span>
                  <span>Add Question</span>
                </button>
              </div>
            </section>
          </div>

          <aside className="add-quiz-sidebar">
            <div className="add-quiz-panel add-quiz-sticky-panel">
              <h3>Quiz Summary</h3>
              <div className="add-quiz-summary-list">
                <div>
                  <span>Title</span>
                  <strong>{title || "--"}</strong>
                </div>
                <div>
                  <span>Questions</span>
                  <strong>{questions.length}</strong>
                </div>
                <div>
                  <span>Total Points</span>
                  <strong>{totalPoints}</strong>
                </div>
                <div>
                  <span>Time Limit</span>
                  <strong>{sanitizeNumber(timeLimit, 1, 180, 30)} min</strong>
                </div>
                <div>
                  <span>Passing</span>
                  <strong>{sanitizeNumber(passingScore, 0, 100, 60)}%</strong>
                </div>
              </div>

              <div className="add-quiz-completion-block">
                <p>Completion</p>
                <div className="add-quiz-completion-list">
                  {questions.map((q, index) => {
                    const isDone =
                      q.text.trim() &&
                      q.correctOptionId &&
                      q.options.every((o) => o.text.trim());
                    return (
                      <button
                        key={q.id}
                        type="button"
                        className="add-quiz-completion-item"
                        onClick={() => setExpandedQuestion(q.id)}
                      >
                        <span
                          className={`add-quiz-completion-indicator ${isDone ? "is-done" : ""}`}
                        >
                          {isDone ? <CheckCircle2 size={13} /> : index + 1}
                        </span>
                        <span className="add-quiz-completion-text">
                          Q{index + 1}: {q.text || "Untitled"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="add-quiz-panel">
              <h3>Settings</h3>
              <div className="add-quiz-toggle-list">
                <button
                  type="button"
                  className={`add-quiz-toggle-row ${shuffleQuestions ? "is-on" : ""}`}
                  onClick={() => setShuffleQuestions((prev) => !prev)}
                >
                  <span>Shuffle Questions</span>
                  <span className="add-quiz-switch" aria-hidden="true">
                    <span />
                  </span>
                </button>

                <button
                  type="button"
                  className={`add-quiz-toggle-row ${shuffleOptions ? "is-on" : ""}`}
                  onClick={() => setShuffleOptions((prev) => !prev)}
                >
                  <span>Shuffle Options</span>
                  <span className="add-quiz-switch" aria-hidden="true">
                    <span />
                  </span>
                </button>

                <button
                  type="button"
                  className={`add-quiz-toggle-row ${showResults ? "is-on" : ""}`}
                  onClick={() => setShowResults((prev) => !prev)}
                >
                  <span>Show Results</span>
                  <span className="add-quiz-switch" aria-hidden="true">
                    <span />
                  </span>
                </button>
              </div>
            </div>

            <div className="add-quiz-sidebar-actions">
              <button
                type="submit"
                className="add-quiz-submit-btn"
                disabled={
                  isSubmitting ||
                  isLoadingQuiz ||
                  (isEditingQuiz && !isEditingQuizLoaded)
                }
              >
                <Save size={15} />
                {isLoadingQuiz
                  ? "Loading..."
                  : isSubmitting
                  ? "Saving..."
                  : isEditingQuiz
                    ? "Save Quiz"
                    : "Create Quiz"}
              </button>

              <button
                type="button"
                className="add-quiz-cancel-btn"
                onClick={() => navigate(contentPath)}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              {isEditingQuiz && (
                <button
                  type="button"
                  className="add-quiz-delete-btn"
                  onClick={handleDeleteQuiz}
                  disabled={isSubmitting || isLoadingQuiz}
                >
                  <Trash2 size={15} />
                  {isSubmitting ? "Deleting..." : "Delete Quiz"}
                </button>
              )}

              {statusMessage && (
                <p className="add-quiz-status-message">{statusMessage}</p>
              )}
            </div>
          </aside>
        </form>
      </div>
    </section>
  );
};

export default AddQuiz;
