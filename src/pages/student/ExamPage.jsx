import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { startQuiz as apiStartQuiz, submitQuiz, getMyQuizResult } from "../../app/quizApi";
import {
  FiArrowLeft,
  FiAward,
  FiCheckCircle,
  FiClock,
  FiHelpCircle,
  FiXCircle,
} from "react-icons/fi";
import "../../styles/ExamPage.css";

const scoreColor = (score) => {
  if (score >= 90) return "#54f4fc";
  if (score >= 75) return "#7fe1ff";
  if (score >= 60) return "#c084fc";
  return "#ff8ea1";
};

// Normalize API question shape → internal shape
const normalizeApiQuestion = (apiQ) => {
  const options = (apiQ.options || []).map((opt) => ({
    id: String(opt.id),
    text: opt.option_text || opt.text || "",
  }));
  return {
    id: String(apiQ.id),
    text: apiQ.question_text || apiQ.text || "",
    type:
      apiQ.question_type === "true_false" ? "true-false" : "multiple-choice",
    options,
    explanation: apiQ.explanation || "",
    points: Number(apiQ.points) || 1,
  };
};

const shouldLoadResultFromStartError = (err) => {
  const msg = String(err?.message || "").toLowerCase();
  const looksLikeAlreadySubmitted =
    msg.includes("already submitted") ||
    (msg.includes("already") && msg.includes("submit")) ||
    msg.includes("submitted");
  const looksLikeExpired =
    msg.includes("expired") ||
    msg.includes("time over") ||
    msg.includes("time is over") ||
    msg.includes("time ended");

  return (
    [409, 422].includes(err?.status) ||
    ((err?.status === 403 || err?.status === 400) &&
      (looksLikeAlreadySubmitted || looksLikeExpired)) ||
    looksLikeAlreadySubmitted ||
    looksLikeExpired
  );
};

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const ExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, lectureId, sectionId, quizId } = useParams();
  const isSectionView = Boolean(sectionId);
  const backPath = `/student/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}`;

  const token = localStorage.getItem("token");

  // ── state ──────────────────────────────────────────────
  const [loadState, setLoadState] = useState("idle"); // idle | loading | ready | error | submitted | result
  const [errorMsg, setErrorMsg] = useState("");
  const [quizMeta, setQuizMeta] = useState(null); // title, duration_minutes, passing_percentage
  const [questions, setQuestions] = useState([]); // normalized questions
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: optionId }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitResult, setSubmitResult] = useState(null); // { score, message }
  const [myResult, setMyResult] = useState(null); // from API #47 after submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef(null);

  const unwrapApiData = (payload) => payload?.data ?? payload;

  // ── load my result (API #47) ────────────────────────────
  const loadMyResult = useCallback(async () => {
    setLoadState("loading");
    try {
      const data = unwrapApiData(await getMyQuizResult(quizId, token));
      setMyResult(data);
      setLoadState("result");
    } catch (err) {
      setErrorMsg(err.message || "Failed to load quiz result.");
      setLoadState("error");
    }
  }, [quizId, token]);

  // ── start quiz (API #45) ────────────────────────────────
  const startQuiz = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg("");
    try {
      const data = unwrapApiData(await apiStartQuiz(quizId, token));
      const rawQuestions = data.questions || [];
      let normalized = rawQuestions.map(normalizeApiQuestion);

      const shouldShuffleQuestions = Boolean(data.shuffle_questions) || Boolean(data.shuffleQuestions);
      const shouldShuffleOptions = Boolean(data.shuffle_options) || Boolean(data.shuffleOptions);

      if (shouldShuffleOptions) {
        normalized = normalized.map((q) => ({
          ...q,
          options: shuffleArray(q.options),
        }));
      }

      if (shouldShuffleQuestions) {
        normalized = shuffleArray(normalized);
      }

      setQuizMeta({
        title: data.quiz_title || data.title || `Quiz ${quizId}`,
        duration_minutes: data.duration_minutes || 30,
        passing_percentage: data.passing_percentage || 60,
      });
      setQuestions(normalized);
      const remainingSeconds = Number(data.remaining_seconds) > 0
        ? Math.floor(Number(data.remaining_seconds))
        : (data.duration_minutes || 30) * 60;
      setTimeLeft(remainingSeconds);
      setSelectedAnswers({});
      setCurrentIndex(0);
      setLoadState("ready");
    } catch (err) {
      if (shouldLoadResultFromStartError(err)) {
        loadMyResult();
        return;
      }

      setErrorMsg(err.message || "Failed to load quiz.");
      setLoadState("error");
    }
  }, [loadMyResult, quizId, token]);

  useEffect(() => {
    const isCompleted = location.state?.personalStatus === "done" || location.state?.status === "done";
    if (isCompleted) {
      loadMyResult();
    } else {
      startQuiz();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startQuiz, loadMyResult, location.state]);

  const handleAutoSubmit = useCallback(() => {
    if (loadState !== "ready" || isSubmitting) return;
    clearInterval(timerRef.current);
    setErrorMsg("");
    startQuiz();
  }, [isSubmitting, loadState, startQuiz]);

  // ── countdown timer ─────────────────────────────────────
  useEffect(() => {
    if (loadState !== "ready") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [handleAutoSubmit, loadState]);

  // ── submit quiz (API #46) ───────────────────────────────
  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    clearInterval(timerRef.current);
    setIsSubmitting(true);
    // Build answers payload: { "question_id": "option_id", ... }
    const answersPayload = {};
    Object.entries(selectedAnswers).forEach(([qId, optId]) => {
      answersPayload[qId] = optId;
    });
    try {
      const res = await submitQuiz(quizId, answersPayload, token);
      setSubmitResult({
        score: res.score ?? res.percentage ?? null,
        message: res.message || "Quiz submitted successfully.",
      });
      setLoadState("submitted");
      // Fetch detailed result for review
      loadMyResult();
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const answeredCount = questions.filter((q) => selectedAnswers[q.id]).length;
  const isReadyToSubmit =
    answeredCount === questions.length && questions.length > 0;
  const activeQuestion = questions[currentIndex] || null;

  // ── result review data from API #47 ────────────────────
  const resultQuestions = useMemo(() => {
    if (!myResult) return [];
    const raw = myResult.details || myResult.questions || myResult.answers || [];
    return raw.map((item) => ({
      id: String(item.question_id || item.id),
      text: item.question_text || item.text || "",
      options: (item.options || []).map((opt) => ({
        id: String(opt.id),
        text: opt.option_text || opt.text || "",
        isCorrect: Boolean(opt.is_correct),
      })),
      selectedOptionId: String(
        item.student_answer_id ||
          item.selected_option_id ||
          selectedAnswers[String(item.question_id || item.id)] ||
          ""
      ),
      isCorrect: Boolean(item.is_correct),
      explanation: item.explanation || "",
    }));
  }, [myResult, selectedAnswers]);

  // ── loading ─────────────────────────────────────────────
  if (loadState === "idle" || loadState === "loading") {
    return (
      <section className="exam-page">
        <div className="exam-shell">
          <button
            type="button"
            className="exam-back-btn"
            onClick={() => navigate(backPath)}
          >
            <FiArrowLeft />
            Back to {isSectionView ? "Section" : "Lecture"}
          </button>
          <div className="exam-empty-card">
            <FiHelpCircle size={24} />
            <p>Loading quiz...</p>
          </div>
        </div>
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <section className="exam-page">
        <div className="exam-shell">
          <button
            type="button"
            className="exam-back-btn"
            onClick={() => navigate(backPath)}
          >
            <FiArrowLeft />
            Back to {isSectionView ? "Section" : "Lecture"}
          </button>
          <div className="exam-empty-card">
            <FiHelpCircle size={24} />
            <p>{errorMsg || "Something went wrong."}</p>
            <button
              type="button"
              className="exam-primary-btn"
              style={{ marginTop: 16 }}
              onClick={startQuiz}
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── result / review view (after submission, uses API #47 data) ──
  if (loadState === "result" || (loadState === "submitted" && myResult)) {
    const rawScore =
      submitResult?.score ??
      myResult?.score ??
      myResult?.student_score ??
      myResult?.percentage ??
      null;

    const correctCount = myResult?.correct_answers_count ?? 0;
    const totalCount = myResult?.total_questions_count ?? 0;

    let score = rawScore;
    if (totalCount > 0) {
      if (correctCount === totalCount) {
        score = 100;
      } else if (correctCount === 0 && rawScore !== null && rawScore > totalCount) {
        score = rawScore;
      } else {
        score = Math.round((correctCount / totalCount) * 100);
      }
    }

    const passing = quizMeta?.passing_percentage || myResult?.passing_percentage || 60;
    const passed =
      typeof myResult?.is_passed === "boolean"
        ? myResult.is_passed
        : myResult?.is_passed === 1 || myResult?.is_passed === "1"
          ? true
          : score !== null && score >= passing;

    return (
      <section className="exam-page">
        <div className="exam-shell">
          <button
            type="button"
            className="exam-back-btn"
            onClick={() => navigate(backPath)}
          >
            <FiArrowLeft />
            Back to {isSectionView ? "Section" : "Lecture"}
          </button>

          <header className="exam-header">
            <div className="exam-header-icon">
              <FiHelpCircle size={16} />
            </div>
            <div className="exam-header-copy">
              <div className="exam-header-top">
                <h1>{quizMeta?.title || myResult?.quiz_title || `Quiz ${quizId}`}</h1>
                <div className="exam-header-actions">
                  <div className={`exam-status-pill ${passed ? "status-done" : "status-missed"}`}>
                    {passed ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}
                    <span>{passed ? "Passed" : "Failed"}</span>
                  </div>
                  {score !== null && (
                    <div
                      className="exam-timer-pill"
                      style={{ color: scoreColor(score) }}
                    >
                      <FiAward size={14} />
                      <span>{score}%</span>
                    </div>
                  )}
                </div>
              </div>
              <p>Quiz completed &middot; Review your answers below</p>
            </div>
          </header>

          {resultQuestions.length > 0 ? (
            <section className="exam-questions-list">
              {resultQuestions.map((q, index) => (
                <article key={q.id} className="exam-question-card">
                  <div className="exam-question-top">
                    <span className="exam-question-number">Q{index + 1}</span>
                    <div className="exam-question-meta">
                      <span className={q.isCorrect ? "is-correct" : "is-wrong"}>
                        {q.isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                  </div>

                  <h3>{q.text}</h3>

                  <div className="exam-options-list">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = q.selectedOptionId === opt.id;
                      const isCorrect = opt.isCorrect;
                      let cls = "exam-option-row";
                      if (isCorrect) cls += " is-correct";
                      else if (isSelected && !isCorrect) cls += " is-selected-wrong";

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={cls}
                          disabled
                        >
                          <span className="exam-option-letter">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="exam-option-text">{opt.text}</span>
                          {(isSelected || isCorrect) && (
                            <span className="exam-option-review-badge">
                              {isSelected && isCorrect
                                ? "Your correct answer"
                                : isSelected
                                  ? "Your answer"
                                  : "Correct answer"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="exam-explanation">{q.explanation}</p>
                  )}
                </article>
              ))}
            </section>
          ) : (
            <div className="exam-empty-card">
              <FiAward size={24} />
              <p>
                {score !== null
                  ? `Your score: ${score}%`
                  : submitResult?.message || "Quiz submitted."}
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ── submitted but still waiting for result data ──────────
  if (loadState === "submitted") {
    return (
      <section className="exam-page">
        <div className="exam-shell">
          <button
            type="button"
            className="exam-back-btn"
            onClick={() => navigate(backPath)}
          >
            <FiArrowLeft />
            Back
          </button>
          <div className="exam-empty-card">
            <FiAward size={24} />
            <p>
              {submitResult?.message || "Quiz submitted!"}{" "}
              {submitResult?.score !== null && submitResult?.score !== undefined
                ? `Score: ${submitResult.score}%`
                : ""}
            </p>
            <p style={{ marginTop: 8, opacity: 0.6 }}>Loading review...</p>
          </div>
        </div>
      </section>
    );
  }

  // ── active exam view ─────────────────────────────────────
  return (
    <section className="exam-page">
      <div className="exam-shell">
        <button
          type="button"
          className="exam-back-btn"
          onClick={() => navigate(backPath)}
        >
          <FiArrowLeft />
          Back to {isSectionView ? "Section" : "Lecture"}
        </button>

        <header className="exam-header">
          <div className="exam-header-icon">
            <FiHelpCircle size={16} />
          </div>
          <div className="exam-header-copy">
            <div className="exam-header-top">
              <h1>{quizMeta?.title || `Quiz ${quizId}`}</h1>
              <div className="exam-header-actions">
                <div className="exam-status-pill status-pending">
                  <FiClock size={12} />
                  <span>In Progress</span>
                </div>
                <div
                  className="exam-timer-pill"
                  style={{ color: timeLeft < 60 ? "#ff8ea1" : undefined }}
                >
                  <FiClock size={14} />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
            <p>Student exam</p>
          </div>
        </header>

        <section className="exam-progress-panel">
          <div className="exam-progress-meta">
            <div className="exam-progress-title">
              Question {Math.min(currentIndex + 1, questions.length)} of{" "}
              {questions.length}
            </div>
            <div className="exam-progress-subtitle">
              {answeredCount}/{questions.length} answered
            </div>
          </div>

          <div className="exam-progress-steps">
            {questions.map((q, index) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`exam-progress-step ${index === currentIndex ? "is-active" : ""} ${selectedAnswers[q.id] ? "is-answered" : ""}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </section>

        {questions.length === 0 ? (
          <section className="exam-empty-card">
            <FiHelpCircle size={24} />
            <p>This quiz has no questions.</p>
          </section>
        ) : (
          <section className="exam-questions-list">
            <article className="exam-question-card">
              <div className="exam-question-top">
                <span className="exam-question-number">
                  Q{currentIndex + 1}
                </span>
                <div className="exam-question-meta">
                  <span>{activeQuestion?.points || 1} pt</span>
                  <span>
                    {answeredCount}/{questions.length} answered
                  </span>
                </div>
              </div>

              <h3>{activeQuestion?.text}</h3>

              <div className="exam-options-list">
                {activeQuestion?.options?.map((option, optIdx) => {
                  const isSelected = selectedAnswers[activeQuestion.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`exam-option-row ${isSelected ? "is-selected" : ""}`}
                      onClick={() =>
                        setSelectedAnswers((prev) => ({
                          ...prev,
                          [activeQuestion.id]: option.id,
                        }))
                      }
                    >
                      <span className="exam-option-letter">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="exam-option-text">{option.text}</span>
                    </button>
                  );
                })}
              </div>
            </article>

            <div className="exam-question-footer">
              <div className="exam-question-nav">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    type="button"
                    className={`exam-nav-step ${index === currentIndex ? "is-active" : ""} ${selectedAnswers[q.id] ? "is-answered" : ""}`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="exam-question-actions">
                <button
                  type="button"
                  className="exam-secondary-btn"
                  onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={currentIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="exam-primary-btn"
                  onClick={
                    currentIndex === questions.length - 1
                      ? handleSubmitQuiz
                      : () =>
                          setCurrentIndex((prev) =>
                            Math.min(prev + 1, questions.length - 1)
                          )
                  }
                  disabled={
                    currentIndex === questions.length - 1
                      ? !isReadyToSubmit || isSubmitting
                      : false
                  }
                >
                  {currentIndex === questions.length - 1
                    ? isSubmitting
                      ? "Submitting..."
                      : `Submit Quiz (${answeredCount}/${questions.length})`
                    : "Next"}
                </button>
              </div>

              {errorMsg && (
                <p
                  style={{
                    color: "#ff8ea1",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  {errorMsg}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </section>
  );
};

export default ExamPage;
