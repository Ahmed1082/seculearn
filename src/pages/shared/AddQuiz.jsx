import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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

const createOption = (text = "") => ({
  id: createId(),
  text,
});

const createQuestion = () => ({
  id: createId(),
  text: "",
  type: "multiple-choice",
  options: [
    createOption(),
    createOption(),
    createOption(),
    createOption(),
  ],
  correctOptionId: "",
  explanation: "",
  points: 1,
});

const getInitialQuestions = () => {
  const firstQuestion = createQuestion();
  return [firstQuestion];
};

const sanitizeNumber = (value, min, max, fallback) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
};

const getQuizStorageKey = ({ courseId, lectureId, sectionId }) => {
  const unitType = sectionId ? "section" : "lecture";
  const unitId = sectionId || lectureId || "unknown";
  return `seculearn-quizzes:${courseId || "unknown"}:${unitType}:${unitId}`;
};

const readStoredQuizzes = (storageKey) => {
  if (!storageKey) return [];

  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const writeStoredQuizzes = (storageKey, quizzes) => {
  if (!storageKey) return;
  localStorage.setItem(storageKey, JSON.stringify(quizzes));
};

const buildDeletedQuizRecord = (quizId) => ({
  id: quizId,
  deleted: true,
  updatedAt: Date.now(),
});

const normalizeQuestion = (question) => {
  const normalizedType =
    question?.type === "true-false" ? "true-false" : "multiple-choice";

  let normalizedOptions = Array.isArray(question?.options)
    ? question.options.map((option, index) => ({
        id: option?.id || createId(),
        text:
          typeof option?.text === "string"
            ? option.text
            : normalizedType === "true-false"
              ? index === 0
                ? "True"
                : "False"
              : "",
      }))
    : [];

  if (normalizedType === "true-false") {
    normalizedOptions = [
      createOption(normalizedOptions[0]?.text || "True"),
      createOption(normalizedOptions[1]?.text || "False"),
    ];
  }

  if (!normalizedOptions.length) {
    normalizedOptions =
      normalizedType === "true-false"
        ? [createOption("True"), createOption("False")]
        : [createOption(), createOption(), createOption(), createOption()];
  }

  if (normalizedType === "multiple-choice" && normalizedOptions.length < 4) {
    normalizedOptions = [
      ...normalizedOptions,
      ...Array.from({ length: 4 - normalizedOptions.length }, () =>
        createOption()
      ),
    ];
  }

  const hasCorrectOption = normalizedOptions.some(
    (option) => option.id === question?.correctOptionId
  );

  return {
    id: question?.id || createId(),
    text: typeof question?.text === "string" ? question.text : "",
    type: normalizedType,
    options: normalizedOptions,
    correctOptionId: hasCorrectOption ? question.correctOptionId : "",
    explanation:
      typeof question?.explanation === "string" ? question.explanation : "",
    points: sanitizeNumber(question?.points, 1, 100, 1),
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
  const quizStorageKey = useMemo(
    () => getQuizStorageKey({ courseId, lectureId, sectionId }),
    [courseId, lectureId, sectionId]
  );

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

  const totalPoints = useMemo(
    () =>
      questions.reduce(
        (sum, question) =>
          sum + sanitizeNumber(question.points, 1, 100, 1),
        0
      ),
    [questions]
  );

  const getQuizValidationMessage = () => {
    if (!title.trim()) return "Please enter the quiz title.";
    if (sanitizeNumber(timeLimit, 1, 180, 30) <= 0) {
      return "Please enter a valid time limit.";
    }
    if (questions.length === 0) return "Please add at least one question.";

    const invalidQuestionIndex = questions.findIndex((question) => {
      if (!question.text.trim()) return true;
      if (!question.correctOptionId) return true;
      if (question.options.length < 2) return true;
      return question.options.some((option) => !option.text.trim());
    });

    if (invalidQuestionIndex >= 0) {
      return `Please complete question ${invalidQuestionIndex + 1} and choose its correct answer.`;
    }

    return "";
  };

  const quizValidationMessage = getQuizValidationMessage();
  const isQuizValid = !quizValidationMessage;
  const isEditingQuiz = Boolean(editingQuizId);

  useEffect(() => {
    const storedQuiz = readStoredQuizzes(quizStorageKey).find(
      (quiz) => String(quiz?.id) === String(editingQuizId)
    );
    const routeQuiz =
      location.state && typeof location.state === "object"
        ? location.state.quiz
        : null;
    const sourceQuiz =
      storedQuiz ||
      (routeQuiz && String(routeQuiz?.id) === String(editingQuizId)
        ? routeQuiz
        : null);

    if (!sourceQuiz) {
      setTitle("");
      setTimeLimit(30);
      setPassingScore(60);
      setShuffleQuestions(false);
      setShuffleOptions(false);
      setShowResults(true);
      const nextQuestions = getInitialQuestions();
      setQuestions(nextQuestions);
      setExpandedQuestion(nextQuestions[0]?.id || null);
      setStatusMessage("");
      return;
    }

    const normalizedQuestions = Array.isArray(sourceQuiz.questions)
      ? sourceQuiz.questions.map((question) => normalizeQuestion(question))
      : getInitialQuestions();

    setTitle(sourceQuiz.title || "");
    setTimeLimit(sanitizeNumber(sourceQuiz.timeLimit, 1, 180, 30));
    setPassingScore(sanitizeNumber(sourceQuiz.passingScore, 0, 100, 60));
    setShuffleQuestions(Boolean(sourceQuiz.shuffleQuestions));
    setShuffleOptions(Boolean(sourceQuiz.shuffleOptions));
    setShowResults(
      typeof sourceQuiz.showResults === "boolean" ? sourceQuiz.showResults : true
    );
    setQuestions(normalizedQuestions);
    setExpandedQuestion(normalizedQuestions[0]?.id || null);
    setStatusMessage("");
  }, [editingQuizId, location.state, quizStorageKey]);

  const updateQuestion = (questionId, updates) => {
    setStatusMessage("");
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, ...updates } : question
      )
    );
  };

  const updateOption = (questionId, optionId, text) => {
    setStatusMessage("");
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, text } : option
              ),
            }
          : question
      )
    );
  };

  const addOption = (questionId) => {
    setStatusMessage("");
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: [...question.options, createOption()],
            }
          : question
      )
    );
  };

  const removeOption = (questionId, optionId) => {
    setStatusMessage("");
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        const nextOptions = question.options.filter(
          (option) => option.id !== optionId
        );

        return {
          ...question,
          options: nextOptions,
          correctOptionId:
            question.correctOptionId === optionId
              ? ""
              : question.correctOptionId,
        };
      })
    );
  };

  const addQuestion = () => {
    const nextQuestion = createQuestion();
    setQuestions((prev) => [...prev, nextQuestion]);
    setExpandedQuestion(nextQuestion.id);
    setStatusMessage("");
  };

  const duplicateQuestion = (questionId) => {
    const sourceQuestion = questions.find((question) => question.id === questionId);
    if (!sourceQuestion) return;

    const nextOptions = sourceQuestion.options.map((option) =>
      createOption(option.text)
    );
    const duplicatedQuestion = {
      ...sourceQuestion,
      id: createId(),
      options: nextOptions,
      correctOptionId:
        sourceQuestion.correctOptionId && sourceQuestion.options.length
          ? nextOptions[sourceQuestion.options.findIndex(
              (option) => option.id === sourceQuestion.correctOptionId
            )]?.id || ""
          : "",
    };

    const sourceIndex = questions.findIndex(
      (question) => question.id === questionId
    );
    const nextQuestions = [...questions];
    nextQuestions.splice(sourceIndex + 1, 0, duplicatedQuestion);
    setQuestions(nextQuestions);
    setExpandedQuestion(duplicatedQuestion.id);
    setStatusMessage("");
  };

  const removeQuestion = (questionId) => {
    if (questions.length <= 1) {
      setStatusMessage("Quiz must contain at least one question.");
      return;
    }

    const nextQuestions = questions.filter(
      (question) => question.id !== questionId
    );
    setQuestions(nextQuestions);
    setStatusMessage("");

    if (expandedQuestion === questionId) {
      setExpandedQuestion(nextQuestions[0]?.id || null);
    }
  };

  const changeQuestionType = (questionId, nextType) => {
    if (nextType === "true-false") {
      const trueOption = createOption("True");
      const falseOption = createOption("False");
      updateQuestion(questionId, {
        type: nextType,
        options: [trueOption, falseOption],
        correctOptionId: "",
      });
      return;
    }

    updateQuestion(questionId, {
      type: nextType,
      options: [
        createOption(),
        createOption(),
        createOption(),
        createOption(),
      ],
      correctOptionId: "",
    });
  };

  const togglePreviewMode = () => {
    setPreviewIndex(0);
    setPreviewAnswers({});
    setPreviewMode((prev) => !prev);
    setStatusMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isQuizValid) {
      setStatusMessage(quizValidationMessage);
      return;
    }

    const safeQuestions = questions.map((question) => ({
      ...question,
      points: sanitizeNumber(question.points, 1, 100, 1),
    }));
    const storedQuizzes = readStoredQuizzes(quizStorageKey);
    const existingQuiz = storedQuizzes.find(
      (quiz) => String(quiz?.id) === String(editingQuizId)
    );
    const nextQuizId =
      editingQuizId ||
      existingQuiz?.id ||
      (location.state?.quiz?.id ? String(location.state.quiz.id) : createId());
    const quizRecord = {
      ...(existingQuiz || {}),
      id: nextQuizId,
      title: title.trim(),
      timeLimit: sanitizeNumber(timeLimit, 1, 180, 30),
      passingScore: sanitizeNumber(passingScore, 0, 100, 60),
      shuffleQuestions: Boolean(shuffleQuestions),
      shuffleOptions: Boolean(shuffleOptions),
      showResults: Boolean(showResults),
      questionCount: safeQuestions.length,
      questions: safeQuestions,
      totalPoints,
      doneStudentIds: Array.isArray(existingQuiz?.doneStudentIds)
        ? existingQuiz.doneStudentIds
        : [],
      missedStudentIds: Array.isArray(existingQuiz?.missedStudentIds)
        ? existingQuiz.missedStudentIds
        : [],
      results:
        existingQuiz && typeof existingQuiz.results === "object"
          ? existingQuiz.results
          : {},
      updatedAt: Date.now(),
    };

    const nextStoredQuizzes = existingQuiz
      ? storedQuizzes.map((quiz) =>
          String(quiz?.id) === String(nextQuizId) ? quizRecord : quiz
        )
      : [...storedQuizzes, quizRecord];

    writeStoredQuizzes(quizStorageKey, nextStoredQuizzes);

    navigate(contentPath);
  };

  const handleDeleteQuiz = () => {
    if (!isEditingQuiz || !editingQuizId) return;

    const storedQuizzes = readStoredQuizzes(quizStorageKey);
    const storedQuizIndex = storedQuizzes.findIndex(
      (quiz) => String(quiz?.id) === String(editingQuizId)
    );

    const nextStoredQuizzes =
      storedQuizIndex >= 0
        ? storedQuizzes.map((quiz, index) =>
            index === storedQuizIndex
              ? {
                  ...quiz,
                  deleted: true,
                  updatedAt: Date.now(),
                }
              : quiz
          )
        : [...storedQuizzes, buildDeletedQuizRecord(editingQuizId)];

    writeStoredQuizzes(quizStorageKey, nextStoredQuizzes);
    navigate(contentPath);
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
              <span>{totalPoints} point{totalPoints !== 1 ? "s" : ""}</span>
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
              {questions.map((question, index) => {
                const isActive = index === previewIndex;
                const isAnswered = Boolean(previewAnswers[question.id]);

                return (
                  <button
                    key={question.id}
                    type="button"
                    className={`add-quiz-preview-page-dot ${isActive ? "is-active" : ""} ${isAnswered ? "is-answered" : ""}`}
                    onClick={() => setPreviewIndex(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
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
                  onChange={(event) => {
                    setTitle(event.target.value);
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
                    onChange={(event) => {
                      setTimeLimit(Number(event.target.value || 0));
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
                    onChange={(event) => {
                      setPassingScore(Number(event.target.value || 0));
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
                  const hasCorrectAnswer = Boolean(question.correctOptionId);
                  const isQuestionComplete =
                    question.text.trim() &&
                    hasCorrectAnswer &&
                    question.options.every((option) => option.text.trim());

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
                          className={`add-quiz-question-index ${isQuestionComplete ? "is-complete" : ""}`}
                        >
                          {isQuestionComplete ? (
                            <CheckCircle2 size={15} />
                          ) : (
                            index + 1
                          )}
                        </span>

                        <div className="add-quiz-question-summary">
                          <strong>{question.text || `Question ${index + 1}`}</strong>
                          <span>
                            {question.type === "true-false"
                              ? "True / False"
                              : `${question.options.length} options`}{" "}
                            - {question.points} pt
                            {question.points !== 1 ? "s" : ""}
                            {!hasCorrectAnswer ? " - No correct answer" : ""}
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
                                onChange={(event) =>
                                  changeQuestionType(question.id, event.target.value)
                                }
                              >
                                <option value="multiple-choice">
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
                                onChange={(event) =>
                                  updateQuestion(question.id, {
                                    points: Number(event.target.value || 0),
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
                              onChange={(event) =>
                                updateQuestion(question.id, {
                                  text: event.target.value,
                                })
                              }
                              placeholder="Enter your question here..."
                            />
                          </label>

                          <div className="add-quiz-options-block">
                            <div className="add-quiz-options-heading">
                              <span>
                                Answer Options <em>*</em>
                              </span>
                              <small>Click the circle to mark the correct answer</small>
                            </div>

                            <div className="add-quiz-options-list">
                              {question.options.map((option, optionIndex) => {
                                const optionLabel = String.fromCharCode(
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
                                      {isCorrect ? <Check size={15} /> : optionLabel}
                                    </button>

                                    <input
                                      type="text"
                                      value={option.text}
                                      onChange={(event) =>
                                        updateOption(
                                          question.id,
                                          option.id,
                                          event.target.value
                                        )
                                      }
                                      placeholder={`Option ${optionLabel}`}
                                      disabled={question.type === "true-false"}
                                    />

                                    {question.type === "multiple-choice" &&
                                      question.options.length > 2 && (
                                        <button
                                          type="button"
                                          className="add-quiz-icon-btn"
                                          onClick={() =>
                                            removeOption(question.id, option.id)
                                          }
                                          aria-label={`Remove option ${optionLabel}`}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                  </div>
                                );
                              })}
                            </div>

                            {question.type === "multiple-choice" &&
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
                              onChange={(event) =>
                                updateQuestion(question.id, {
                                  explanation: event.target.value,
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
                  {questions.map((question, index) => {
                    const isDone =
                      question.text.trim() &&
                      question.correctOptionId &&
                      question.options.every((option) => option.text.trim());

                    return (
                      <button
                        key={question.id}
                        type="button"
                        className="add-quiz-completion-item"
                        onClick={() => setExpandedQuestion(question.id)}
                      >
                        <span
                          className={`add-quiz-completion-indicator ${isDone ? "is-done" : ""}`}
                        >
                          {isDone ? <CheckCircle2 size={13} /> : index + 1}
                        </span>
                        <span className="add-quiz-completion-text">
                          Q{index + 1}: {question.text || "Untitled"}
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
              >
                <Save size={15} />
                {isEditingQuiz ? "Save Quiz" : "Create Quiz"}
              </button>

              <button
                type="button"
                className="add-quiz-cancel-btn"
                onClick={() => navigate(contentPath)}
              >
                Cancel
              </button>

              {isEditingQuiz && (
                <button
                  type="button"
                  className="add-quiz-delete-btn"
                  onClick={handleDeleteQuiz}
                >
                  <Trash2 size={15} />
                  Delete Quiz
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
