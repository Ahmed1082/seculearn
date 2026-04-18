import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiAward,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiHash,
  FiHelpCircle,
  FiPlay,
  FiShield,
  FiTarget,
  FiTrendingUp,
  FiXCircle,
} from "react-icons/fi";
import "../../styles/ExamPage.css";

const fallbackCourses = {
  c1: { id: "c1", name: "Introduction to Cybersecurity" },
  c2: { id: "c2", name: "Introduction to Cryptography" },
  c3: { id: "c3", name: "Ethical Hacking" },
};

const fallbackLectures = {
  l1: { id: "l1", courseId: "c1", title: "Lecture 1: Threat Landscape Overview" },
  l2: { id: "l2", courseId: "c1", title: "Lecture 2: Common Attack Vectors" },
  l3: { id: "l3", courseId: "c2", title: "Lecture 1: Classical Ciphers" },
  l4: { id: "l4", courseId: "c3", title: "Lecture 1: Reconnaissance" },
};

const fallbackSections = {
  ls1: { id: "ls1", title: "Section A: Introduction to Threats" },
  ls2: { id: "ls2", title: "Section B: Common Attack Vectors" },
};

const fallbackQuizzes = [
  {
    id: "q1",
    lectureId: "l1",
    title: "Quiz 1: Threat Basics",
    timeLimit: 30,
    passingScore: 60,
    questionCount: 5,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    doneStudentIds: ["s2", "s3", "s4", "s5", "s6"],
    missedStudentIds: ["s7", "s8"],
    results: { s2: 85, s3: 78, s4: 92, s5: 88, s6: 70 },
  },
  {
    id: "q2",
    lectureId: "l2",
    title: "Quiz 2: Attack Types",
    timeLimit: 25,
    passingScore: 70,
    questionCount: 4,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    doneStudentIds: ["s2", "s3", "s4", "s6"],
    missedStudentIds: ["s7"],
    results: { s2: 84, s3: 73, s4: 91, s6: 69 },
  },
  {
    id: "q3",
    lectureId: "l3",
    title: "Quiz 3: Defense Strategies",
    timeLimit: 20,
    passingScore: 65,
    questionCount: 4,
    shuffleQuestions: true,
    shuffleOptions: false,
    showResults: true,
    doneStudentIds: ["s4", "s5"],
    missedStudentIds: ["s2", "s8"],
    results: { s4: 90, s5: 86 },
  },
];

const fallbackQuestionsByQuizId = {
  q1: [
    {
      id: "q1_1",
      question: "What is the primary goal of a threat actor performing reconnaissance?",
      options: [
        "Destroying data",
        "Gathering information about the target",
        "Installing ransomware",
        "Creating backdoors",
      ],
      correctAnswer: 1,
      points: 1,
    },
    {
      id: "q1_2",
      question: "Which of the following is an example of a social engineering attack?",
      options: ["SQL injection", "Phishing email", "Buffer overflow", "DDoS attack"],
      correctAnswer: 1,
      points: 1,
    },
    {
      id: "q1_3",
      question: "What does APT stand for in cybersecurity?",
      options: [
        "Advanced Persistent Threat",
        "Automated Penetration Testing",
        "Active Protocol Transfer",
        "Application Protection Technology",
      ],
      correctAnswer: 0,
      points: 1,
    },
    {
      id: "q1_4",
      question: "Which type of malware encrypts files and demands payment?",
      options: ["Trojan", "Worm", "Ransomware", "Adware"],
      correctAnswer: 2,
      points: 1,
    },
    {
      id: "q1_5",
      question: "What is a zero-day vulnerability?",
      options: [
        "A bug found on day zero of development",
        "A vulnerability with no available patch",
        "A vulnerability that lasts zero days",
        "A harmless software bug",
      ],
      correctAnswer: 1,
      points: 1,
    },
  ],
  q2: [
    {
      id: "q2_1",
      question: "What is credential stuffing?",
      options: [
        "Changing passwords frequently",
        "Reusing leaked credentials on many sites",
        "Encrypting login traffic",
        "A type of firewall rule",
      ],
      correctAnswer: 1,
      points: 1,
    },
    {
      id: "q2_2",
      question: "What is the main purpose of MFA?",
      options: [
        "Increase password length",
        "Allow guest access",
        "Reduce login friction",
        "Add more than one verification factor",
      ],
      correctAnswer: 3,
      points: 1,
    },
    {
      id: "q2_3",
      question: "Which attack targets web forms with malicious scripts?",
      options: ["XSS", "ARP spoofing", "Port scanning", "Brute force only"],
      correctAnswer: 0,
      points: 1,
    },
    {
      id: "q2_4",
      question: "Which protocol should replace HTTP for secure communication?",
      options: ["FTP", "SMTP", "HTTPS", "SNMP"],
      correctAnswer: 2,
      points: 1,
    },
  ],
  q3: [
    {
      id: "q3_1",
      question: "What is least privilege?",
      options: [
        "Users get all access by default",
        "Users get only required permissions",
        "Admins have no restrictions",
        "Disable account auditing",
      ],
      correctAnswer: 1,
      points: 1,
    },
    {
      id: "q3_2",
      question: "What is a common indicator of compromise?",
      options: [
        "Unexpected outbound traffic",
        "Updated antivirus definitions",
        "Low CPU usage",
        "Stable login patterns",
      ],
      correctAnswer: 0,
      points: 1,
    },
    {
      id: "q3_3",
      question: "Which control is preventive?",
      options: ["Forensic investigation", "Backup validation", "Firewall policy", "Incident report"],
      correctAnswer: 2,
      points: 1,
    },
    {
      id: "q3_4",
      question: "What is the first step in incident response?",
      options: ["Containment", "Recovery", "Preparation", "Eradication"],
      correctAnswer: 2,
      points: 1,
    },
  ],
};

const mockStudentIds = new Set(
  fallbackQuizzes.flatMap((quiz) => [
    ...quiz.doneStudentIds.map((id) => String(id)),
    ...quiz.missedStudentIds.map((id) => String(id)),
    ...Object.keys(quiz.results || {}).map((id) => String(id)),
  ])
);

const getQuizStorageKey = ({ courseId, lectureId, sectionId }) => {
  const unitType = sectionId ? "section" : "lecture";
  const unitId = sectionId || lectureId || "unknown";
  return `seculearn-quizzes:${courseId || "unknown"}:${unitType}:${unitId}`;
};

const getAttemptStorageKey = ({ courseId, lectureId, sectionId }) => {
  const unitType = sectionId ? "section" : "lecture";
  const unitId = sectionId || lectureId || "unknown";
  return `seculearn-quiz-attempts:${courseId || "unknown"}:${unitType}:${unitId}`;
};

const readStoredItems = (storageKey) => {
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

const writeStoredItems = (storageKey, items) => {
  if (!storageKey) return;
  localStorage.setItem(storageKey, JSON.stringify(items));
};

const getCurrentStudentId = () => {
  const fallbackId = "s1";
  const stored = localStorage.getItem("user");

  if (!stored) return fallbackId;

  try {
    const user = JSON.parse(stored);
    const id = user.id || user.student_id || user.user_id || fallbackId;
    return String(id);
  } catch {
    return fallbackId;
  }
};

const resolveStudentIdForMockData = (studentId) => {
  if (mockStudentIds.has(studentId)) return studentId;
  if (mockStudentIds.has("s1")) return "s1";
  return studentId;
};

const shuffleArray = (items = []) => {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
};

const scoreColor = (score) => {
  if (score >= 90) return "#54f4fc";
  if (score >= 75) return "#7fe1ff";
  if (score >= 60) return "#c084fc";
  return "#ff8ea1";
};

const scoreLabel = (score) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Average";
  return "Needs Work";
};

const getStatus = (quiz, studentId) => {
  if (quiz?.doneStudentIds?.includes(studentId)) return "done";
  if (quiz?.missedStudentIds?.includes(studentId)) return "missed";
  return "pending";
};

const normalizeQuestions = (questions = []) =>
  questions.map((question, index) => {
    const baseId = question?.id || `question-${index + 1}`;
    const rawOptions = Array.isArray(question?.options) ? question.options : [];
    const normalizedOptions = rawOptions.map((option, optionIndex) => {
      if (typeof option === "string") {
        return {
          id: `${baseId}-option-${optionIndex + 1}`,
          text: option,
        };
      }

      return {
        id: option?.id || `${baseId}-option-${optionIndex + 1}`,
        text: option?.text || "",
      };
    });

    const fallbackCorrectOptionId =
      typeof question?.correctAnswer === "number"
        ? normalizedOptions[question.correctAnswer]?.id || ""
        : "";

    return {
      id: baseId,
      text: question?.text || question?.question || `Question ${index + 1}`,
      type: question?.type === "true-false" ? "true-false" : "multiple-choice",
      options: normalizedOptions,
      correctOptionId: question?.correctOptionId || fallbackCorrectOptionId,
      explanation: question?.explanation || "",
      points: Number(question?.points) > 0 ? Number(question.points) : 1,
    };
  });

const buildStatusConfig = (status) => {
  if (status === "done") {
    return {
      label: "Completed",
      icon: FiCheckCircle,
      accent: "#54f4fc",
      className: "status-done",
    };
  }

  if (status === "missed") {
    return {
      label: "Missed",
      icon: FiXCircle,
      accent: "#ff8ea1",
      className: "status-missed",
    };
  }

  return {
    label: "Ready",
    icon: FiClock,
    accent: "#c084fc",
    className: "status-pending",
  };
};

const ExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, lectureId, sectionId, quizId } = useParams();
  const isSectionView = Boolean(sectionId);
  const currentStudentId = useMemo(
    () => resolveStudentIdForMockData(getCurrentStudentId()),
    []
  );
  const quizStorageKey = useMemo(
    () => getQuizStorageKey({ courseId, lectureId, sectionId }),
    [courseId, lectureId, sectionId]
  );
  const attemptStorageKey = useMemo(
    () => getAttemptStorageKey({ courseId, lectureId, sectionId }),
    [courseId, lectureId, sectionId]
  );
  const backPath = `/student/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}`;

  const resolvedQuiz = useMemo(() => {
    const routeQuiz =
      location.state?.quiz && String(location.state.quiz.id) === String(quizId)
        ? location.state.quiz
        : null;
    const storedQuiz = readStoredItems(quizStorageKey).find(
      (quiz) => String(quiz?.id) === String(quizId)
    );
    const fallbackQuiz = fallbackQuizzes.find(
      (quiz) => String(quiz.id) === String(quizId)
    );

    return {
      ...fallbackQuiz,
      ...routeQuiz,
      ...storedQuiz,
      id: quizId,
      title:
        storedQuiz?.title ||
        routeQuiz?.title ||
        location.state?.quizTitle ||
        fallbackQuiz?.title ||
        `Quiz ${quizId}`,
    };
  }, [location.state, quizId, quizStorageKey]);

  const [quizData, setQuizData] = useState(resolvedQuiz);

  useEffect(() => {
    setQuizData(resolvedQuiz);
  }, [resolvedQuiz]);

  const resolvedAttempt = useMemo(() => {
    const storedAttempts = readStoredItems(attemptStorageKey);

    return (
      storedAttempts.find(
        (attempt) =>
          String(attempt?.quizId) === String(quizId) &&
          String(attempt?.studentId) === String(currentStudentId)
      ) || null
    );
  }, [attemptStorageKey, currentStudentId, quizId]);

  const [attemptData, setAttemptData] = useState(resolvedAttempt);
  const [selectedAnswers, setSelectedAnswers] = useState(
    resolvedAttempt?.answers || {}
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const initialTime = Number(quizData?.timeLimit) > 0 ? Number(quizData.timeLimit) * 60 : 30 * 60;
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    setAttemptData(resolvedAttempt);
    setSelectedAnswers(resolvedAttempt?.answers || {});
  }, [resolvedAttempt]);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setTimeLeft(initialTime);
  }, [quizId, initialTime]);

  const preparedQuestions = useMemo(() => {
    const sourceQuestions =
      Array.isArray(quizData?.questions) && quizData.questions.length > 0
        ? quizData.questions
        : fallbackQuestionsByQuizId[String(quizId)] || [];

    const normalizedQuestions = normalizeQuestions(sourceQuestions).map(
      (question) => ({
        ...question,
        options: quizData?.shuffleOptions
          ? shuffleArray(question.options)
          : question.options,
      })
    );

    return quizData?.shuffleQuestions
      ? shuffleArray(normalizedQuestions)
      : normalizedQuestions;
  }, [quizData, quizId]);

  const status = getStatus(quizData, currentStudentId);
  const statusConfig = buildStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const quizScore = attemptData?.score ?? quizData?.results?.[currentStudentId] ?? null;
  const totalPoints = preparedQuestions.reduce(
    (sum, question) => sum + (question.points || 1),
    0
  );
  const answeredCount = preparedQuestions.filter(
    (question) => selectedAnswers[question.id]
  ).length;
  const progressValue = preparedQuestions.length
    ? Math.round((answeredCount / preparedQuestions.length) * 100)
    : 0;
  const showResults =
    typeof quizData?.showResults === "boolean" ? quizData.showResults : true;
  const isSubmitted = Boolean(attemptData);
  const isReviewMode = isSubmitted && showResults;
  const isTimedOut = timeLeft <= 0 && !isSubmitted;
  const isLocked =
    status === "missed" ||
    (status === "done" && !isSubmitted) ||
    isTimedOut;
  const isReadyToSubmit =
    !isLocked &&
    preparedQuestions.length > 0 &&
    answeredCount === preparedQuestions.length &&
    !isSubmitted;
  const passingScore = Number(quizData?.passingScore) > 0 ? quizData.passingScore : 60;

  useEffect(() => {
    if (isSubmitted || status === "missed") return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isSubmitted, status]);

  const activeQuestion = preparedQuestions[currentQuestionIndex] || null;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${minutes}:${String(sec).padStart(2, "0")}`;
  };

  const handlePrevQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prev) =>
      Math.min(prev + 1, preparedQuestions.length - 1)
    );
  };

  const jumpToQuestion = (index) => {
    if (index < 0 || index >= preparedQuestions.length) return;
    setCurrentQuestionIndex(index);
  };
  const courseName =
    fallbackCourses[courseId]?.name ||
    fallbackCourses[fallbackLectures[lectureId]?.courseId]?.name ||
    "Selected Course";
  const unitTitle = isSectionView
    ? fallbackSections[sectionId]?.title || `Section ${sectionId}`
    : fallbackLectures[lectureId]?.title || `Lecture ${lectureId}`;

  const statCards = [
    {
      label: "Questions",
      value: preparedQuestions.length || quizData?.questionCount || 0,
      accent: "#c084fc",
      className: "exam-stat-card total",
      icon: FiHash,
    },
    {
      label: "Time Limit",
      value: `${Number(quizData?.timeLimit) > 0 ? quizData.timeLimit : 30} min`,
      accent: "#54f4fc",
      className: "exam-stat-card completed",
      icon: FiClock,
    },
    {
      label: "Passing Score",
      value: `${passingScore}%`,
      accent: "#7fe1ff",
      className: "exam-stat-card average",
      icon: FiTarget,
    },
    {
      label: isSubmitted ? "Your Score" : "Status",
      value: isSubmitted && quizScore !== null ? `${quizScore}%` : statusConfig.label,
      accent: isSubmitted && quizScore !== null ? scoreColor(quizScore) : statusConfig.accent,
      className: "exam-stat-card best",
      icon: isSubmitted ? FiAward : statusConfig.icon,
    },
  ];

  const handleSelectAnswer = (questionId, optionId) => {
    if (isLocked || isSubmitted) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitQuiz = () => {
    if (!isReadyToSubmit) return;

    const earnedPoints = preparedQuestions.reduce((sum, question) => {
      const isCorrect = selectedAnswers[question.id] === question.correctOptionId;
      return sum + (isCorrect ? question.points || 1 : 0);
    }, 0);
    const nextScore = totalPoints
      ? Math.round((earnedPoints / totalPoints) * 100)
      : 0;
    const nextAttempt = {
      quizId: String(quizId),
      studentId: String(currentStudentId),
      answers: selectedAnswers,
      score: nextScore,
      submittedAt: Date.now(),
    };

    const storedAttempts = readStoredItems(attemptStorageKey);
    const nextAttempts = [
      ...storedAttempts.filter(
        (attempt) =>
          !(
            String(attempt?.quizId) === String(quizId) &&
            String(attempt?.studentId) === String(currentStudentId)
          )
      ),
      nextAttempt,
    ];

    writeStoredItems(attemptStorageKey, nextAttempts);

    const storedQuizzes = readStoredItems(quizStorageKey);
    const existingQuiz = storedQuizzes.find(
      (quiz) => String(quiz?.id) === String(quizId)
    );
    const nextQuizRecord = {
      ...(existingQuiz || quizData || {}),
      id: quizId,
      title: quizData?.title || `Quiz ${quizId}`,
      lectureId: quizData?.lectureId || lectureId || "",
      timeLimit: Number(quizData?.timeLimit) > 0 ? quizData.timeLimit : 30,
      passingScore,
      shuffleQuestions: Boolean(quizData?.shuffleQuestions),
      shuffleOptions: Boolean(quizData?.shuffleOptions),
      showResults,
      questionCount: preparedQuestions.length || quizData?.questionCount || 0,
      questions:
        Array.isArray(quizData?.questions) && quizData.questions.length > 0
          ? quizData.questions
          : preparedQuestions,
      totalPoints,
      doneStudentIds: Array.from(
        new Set([...(quizData?.doneStudentIds || []), currentStudentId].map(String))
      ),
      missedStudentIds: (quizData?.missedStudentIds || []).filter(
        (studentId) => String(studentId) !== String(currentStudentId)
      ),
      results: {
        ...(quizData?.results || {}),
        [currentStudentId]: nextScore,
      },
      updatedAt: Date.now(),
    };
    const nextStoredQuizzes = existingQuiz
      ? storedQuizzes.map((quiz) =>
          String(quiz?.id) === String(quizId) ? nextQuizRecord : quiz
        )
      : [...storedQuizzes, nextQuizRecord];

    writeStoredItems(quizStorageKey, nextStoredQuizzes);
    setAttemptData(nextAttempt);
    setQuizData(nextQuizRecord);
  };

  const renderQuestionState = (question, option) => {
    const isSelected = selectedAnswers[question.id] === option.id;
    const isCorrect = option.id === question.correctOptionId;

    if (!isReviewMode) {
      return isSelected ? "is-selected" : "";
    }

    if (isCorrect) return "is-correct";
    if (isSelected && !isCorrect) return "is-selected-wrong";
    return "";
  };

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
              <h1>{quizData?.title || `Quiz ${quizId}`}</h1>

              <div className="exam-header-actions">
                <div className={`exam-status-pill ${statusConfig.className}`}>
                  <StatusIcon size={12} />
                  <span>{statusConfig.label}</span>
                </div>
                <div className="exam-timer-pill">
                  <FiClock size={14} />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>

            <p>
              {courseName} &middot; {unitTitle.split(":")[0]} &middot; Student exam
            </p>
          </div>
        </header>

        <section className="exam-progress-panel">
          <div className="exam-progress-meta">
            <div className="exam-progress-title">
              Question {Math.min(currentQuestionIndex + 1, preparedQuestions.length)} of {preparedQuestions.length}
            </div>
            <div className="exam-progress-subtitle">
              {answeredCount}/{preparedQuestions.length} answered
            </div>
          </div>

          <div className="exam-progress-steps">
            {preparedQuestions.map((question, index) => {
              const selected = Boolean(selectedAnswers[question.id]);
              const completed = index < currentQuestionIndex || selected;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => jumpToQuestion(index)}
                  className={`exam-progress-step ${index === currentQuestionIndex ? "is-active" : ""} ${selected ? "is-answered" : ""}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </section>

        {preparedQuestions.length === 0 ? (
          <section className="exam-empty-card">
            <FiHelpCircle size={24} />
            <p>This quiz does not have questions yet. Add questions from the quiz builder first.</p>
          </section>
        ) : isReviewMode ? (
          <section className="exam-questions-list">
            {preparedQuestions.map((question, index) => (
              <article key={question.id} className="exam-question-card">
                <div className="exam-question-top">
                  <span className="exam-question-number">Q{index + 1}</span>

                  <div className="exam-question-meta">
                    <span>{question.points} pt</span>
                    <span
                      className={
                        selectedAnswers[question.id] === question.correctOptionId
                          ? "is-correct"
                          : "is-wrong"
                      }
                    >
                      {selectedAnswers[question.id] === question.correctOptionId
                        ? "Correct"
                        : "Incorrect"}
                    </span>
                  </div>
                </div>

                <h3>{question.text}</h3>

                <div className="exam-options-list">
                  {question.options.map((option, optionIndex) => {
                    const optionState = renderQuestionState(question, option);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`exam-option-row ${optionState}`}
                        disabled
                      >
                        <span className="exam-option-letter">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span className="exam-option-text">{option.text}</span>
                      </button>
                    );
                  })}
                </div>

                {question.explanation && (
                  <p className="exam-explanation">{question.explanation}</p>
                )}
              </article>
            ))}
          </section>
        ) : (
          <section className="exam-questions-list">
            <article className="exam-question-card">
              <div className="exam-question-top">
                <span className="exam-question-number">Q{currentQuestionIndex + 1}</span>

                <div className="exam-question-meta">
                  <span>{activeQuestion?.points || 0} pt</span>
                  <span>{answeredCount}/{preparedQuestions.length} answered</span>
                </div>
              </div>

              <h3>{activeQuestion?.text}</h3>

              <div className="exam-options-list">
                {activeQuestion?.options?.map((option, optionIndex) => {
                  const optionState = renderQuestionState(activeQuestion, option);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`exam-option-row ${optionState}`}
                      onClick={() => handleSelectAnswer(activeQuestion.id, option.id)}
                      disabled={isLocked || isSubmitted}
                    >
                      <span className="exam-option-letter">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="exam-option-text">{option.text}</span>
                    </button>
                  );
                })}
              </div>
            </article>

            <div className="exam-question-footer">
              <div className="exam-question-nav">
                {preparedQuestions.map((question, index) => {
                  const answered = Boolean(selectedAnswers[question.id]);
                  return (
                    <button
                      key={question.id}
                      type="button"
                      className={`exam-nav-step ${index === currentQuestionIndex ? "is-active" : ""} ${answered ? "is-answered" : ""}`}
                      onClick={() => jumpToQuestion(index)}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="exam-question-actions">
                <button
                  type="button"
                  className="exam-secondary-btn"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="exam-primary-btn"
                  onClick={
                    currentQuestionIndex === preparedQuestions.length - 1
                      ? handleSubmitQuiz
                      : handleNextQuestion
                  }
                  disabled={
                    currentQuestionIndex === preparedQuestions.length - 1
                      ? !isReadyToSubmit
                      : false
                  }
                >
                  {currentQuestionIndex === preparedQuestions.length - 1
                    ? `Submit Quiz (${answeredCount}/${preparedQuestions.length})`
                    : "Next"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  );
};

export default ExamPage;
