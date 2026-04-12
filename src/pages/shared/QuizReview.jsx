import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiHelpCircle,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import "../../styles/QuizReview.css";

const students = [
  { id: "s1", name: "Ahmed Ali", studentId: "STU001" },
  { id: "s2", name: "Sara Hassan", studentId: "STU002" },
  { id: "s3", name: "Omar Khalil", studentId: "STU003" },
  { id: "s4", name: "Fatima Nour", studentId: "STU004" },
  { id: "s5", name: "Youssef Amin", studentId: "STU005" },
  { id: "s6", name: "Layla Ibrahim", studentId: "STU006" },
  { id: "s7", name: "Kareem Fahmy", studentId: "STU007" },
  { id: "s8", name: "Nadia Sayed", studentId: "STU008" },
  { id: "s9", name: "Tarek Mostafa", studentId: "STU009" },
  { id: "s10", name: "Hana Zaki", studentId: "STU010" },
];

const courses = [
  { id: "c1", name: "Introduction to Cybersecurity" },
  { id: "c2", name: "Introduction to Cryptography" },
  { id: "c3", name: "Ethical Hacking" },
];

const lectures = [
  { id: "l1", courseId: "c1", title: "Lecture 1: Threat Landscape Overview" },
  { id: "l2", courseId: "c1", title: "Lecture 2: Common Attack Vectors" },
  { id: "l3", courseId: "c2", title: "Lecture 1: Classical Ciphers" },
  { id: "l4", courseId: "c3", title: "Lecture 1: Reconnaissance" },
];

const quizzes = [
  {
    id: "q1",
    lectureId: "l1",
    title: "Quiz 1: Threat Basics",
    doneStudentIds: ["s1", "s2", "s3", "s4", "s5", "s6"],
    missedStudentIds: ["s7", "s8"],
    results: { s1: 90, s2: 85, s3: 78, s4: 92, s5: 88, s6: 70 },
  },
  {
    id: "q2",
    lectureId: "l2",
    title: "Quiz 2: Attack Types",
    doneStudentIds: ["s1", "s2", "s3", "s4", "s6"],
    missedStudentIds: ["s7"],
    results: { s1: 94, s2: 84, s3: 73, s4: 91, s6: 69 },
  },
  {
    id: "q3",
    lectureId: "l3",
    title: "Quiz 3: Defense Strategies",
    doneStudentIds: ["s1", "s4", "s5"],
    missedStudentIds: ["s2", "s8"],
    results: { s1: 96, s4: 90, s5: 86 },
  },
];

const quizQuestions = {
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
    },
    {
      id: "q1_2",
      question: "Which of the following is an example of a social engineering attack?",
      options: ["SQL injection", "Phishing email", "Buffer overflow", "DDoS attack"],
      correctAnswer: 1,
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
    },
    {
      id: "q1_4",
      question: "Which type of malware encrypts files and demands payment?",
      options: ["Trojan", "Worm", "Ransomware", "Adware"],
      correctAnswer: 2,
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
    },
    {
      id: "q2_3",
      question: "Which attack targets web forms with malicious scripts?",
      options: ["XSS", "ARP spoofing", "Port scanning", "Brute force only"],
      correctAnswer: 0,
    },
    {
      id: "q2_4",
      question: "Which protocol should replace HTTP for secure communication?",
      options: ["FTP", "SMTP", "HTTPS", "SNMP"],
      correctAnswer: 2,
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
    },
    {
      id: "q3_3",
      question: "Which control is preventive?",
      options: ["Forensic investigation", "Backup validation", "Firewall policy", "Incident report"],
      correctAnswer: 2,
    },
    {
      id: "q3_4",
      question: "What is the first step in incident response?",
      options: ["Containment", "Recovery", "Preparation", "Eradication"],
      correctAnswer: 2,
    },
  ],
};

const quizAttempts = [
  {
    quizId: "q1",
    studentId: "s1",
    answers: { q1_1: 1, q1_2: 1, q1_3: 0, q1_4: 2, q1_5: 1 },
  },
  {
    quizId: "q1",
    studentId: "s2",
    answers: { q1_1: 1, q1_2: 1, q1_3: 0, q1_4: 2, q1_5: 0 },
  },
  {
    quizId: "q1",
    studentId: "s3",
    answers: { q1_1: 1, q1_2: 1, q1_3: 1, q1_4: 2, q1_5: 0 },
  },
  {
    quizId: "q1",
    studentId: "s4",
    answers: { q1_1: 1, q1_2: 1, q1_3: 0, q1_4: 2, q1_5: 1 },
  },
  {
    quizId: "q1",
    studentId: "s5",
    answers: { q1_1: 1, q1_2: 0, q1_3: 0, q1_4: 2, q1_5: 1 },
  },
  {
    quizId: "q1",
    studentId: "s6",
    answers: { q1_1: 0, q1_2: 1, q1_3: 0, q1_4: 2, q1_5: 1 },
  },
  {
    quizId: "q2",
    studentId: "s1",
    answers: { q2_1: 1, q2_2: 3, q2_3: 0, q2_4: 2 },
  },
  {
    quizId: "q2",
    studentId: "s2",
    answers: { q2_1: 0, q2_2: 3, q2_3: 0, q2_4: 2 },
  },
  {
    quizId: "q2",
    studentId: "s3",
    answers: { q2_1: 1, q2_2: 2, q2_3: 0, q2_4: 1 },
  },
  {
    quizId: "q3",
    studentId: "s1",
    answers: { q3_1: 1, q3_2: 0, q3_3: 2, q3_4: 2 },
  },
  {
    quizId: "q3",
    studentId: "s4",
    answers: { q3_1: 1, q3_2: 0, q3_3: 2, q3_4: 1 },
  },
];

const scoreColor = (score) => {
  if (score >= 90) return "#54f4fc";
  if (score >= 75) return "#2d8ff0";
  if (score >= 60) return "#c084fc";
  return "#ff6e8d";
};

const getBarColorClass = (percent) => {
  if (percent >= 75) return "is-strong";
  if (percent >= 50) return "is-mid";
  return "is-weak";
};

const QuizReview = ({ role = "lecturer" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, lectureId, sectionId, quizId } = useParams();
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const isSectionView = Boolean(sectionId);
  const stateQuizTitle = location.state?.quizTitle;
  const basePath = courseId
    ? `/${role}/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}`
    : `/${role}/courses`;

  const selectedQuiz = useMemo(() => {
    const foundQuiz = quizzes.find((quiz) => quiz.id === quizId);
    if (foundQuiz) return foundQuiz;

    const fallbackQuiz = quizzes[0];
    return {
      ...fallbackQuiz,
      id: quizId || fallbackQuiz.id,
      lectureId: lectureId || fallbackQuiz.lectureId,
      title: stateQuizTitle || `Quiz ${quizId || fallbackQuiz.id}`,
    };
  }, [lectureId, quizId, stateQuizTitle]);

  const questions = useMemo(
    () => quizQuestions[selectedQuiz.id] || quizQuestions.q1,
    [selectedQuiz.id]
  );

  const attempts = useMemo(
    () =>
      quizAttempts.filter((attempt) => String(attempt.quizId) === String(selectedQuiz.id)),
    [selectedQuiz.id]
  );

  const doneStudents = useMemo(
    () =>
      students.filter((student) =>
        (selectedQuiz.doneStudentIds || []).includes(student.id)
      ),
    [selectedQuiz.doneStudentIds]
  );

  const missedStudents = useMemo(
    () =>
      students.filter((student) =>
        (selectedQuiz.missedStudentIds || []).includes(student.id)
      ),
    [selectedQuiz.missedStudentIds]
  );

  const pendingStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          !(selectedQuiz.doneStudentIds || []).includes(student.id) &&
          !(selectedQuiz.missedStudentIds || []).includes(student.id)
      ),
    [selectedQuiz.doneStudentIds, selectedQuiz.missedStudentIds]
  );

  const scores = useMemo(
    () => Object.values(selectedQuiz.results || {}).map((score) => Number(score)),
    [selectedQuiz.results]
  );

  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;
  const highScore = scores.length ? Math.max(...scores) : null;
  const lowScore = scores.length ? Math.min(...scores) : null;

  const questionStats = useMemo(
    () =>
      questions.map((question) => {
        let total = 0;
        let correct = 0;

        attempts.forEach((attempt) => {
          if (
            Object.prototype.hasOwnProperty.call(attempt.answers || {}, question.id)
          ) {
            total += 1;
            if (attempt.answers[question.id] === question.correctAnswer) {
              correct += 1;
            }
          }
        });

        if (!total) {
          return { ...question, correct: 1, total: 1, pct: 100 };
        }

        return {
          ...question,
          correct,
          total,
          pct: Math.round((correct / total) * 100),
        };
      }),
    [attempts, questions]
  );

  const selectedStudent = selectedStudentId
    ? students.find((student) => student.id === selectedStudentId) || null
    : null;

  const selectedAttempt = selectedStudentId
    ? attempts.find((attempt) => attempt.studentId === selectedStudentId) || null
    : null;

  const selectedScore =
    selectedStudentId && selectedQuiz.results
      ? selectedQuiz.results[selectedStudentId]
      : null;

  const lectureFromQuiz =
    lectures.find((lecture) => lecture.id === (lectureId || selectedQuiz.lectureId)) ||
    lectures.find((lecture) => lecture.id === selectedQuiz.lectureId) ||
    null;

  const courseName =
    location.state?.courseTitle ||
    courses.find((course) => course.id === courseId)?.name ||
    courses.find((course) => course.id === lectureFromQuiz?.courseId)?.name ||
    "Introduction to Cybersecurity";

  const lectureTitle =
    location.state?.lectureTitle ||
    lectureFromQuiz?.title ||
    (isSectionView ? "Section 1" : "Lecture 1");

  const handleBack = () => {
    if (courseId) {
      navigate(basePath);
      return;
    }
    navigate(-1);
  };

  return (
    <section className="quiz-review-page">
      <div className="quiz-review-shell">
        <button type="button" className="quiz-review-back-btn" onClick={handleBack}>
          <FiArrowLeft />
          Back
        </button>

        <header className="quiz-review-header-card">
          <span className="quiz-review-header-icon" aria-hidden="true">
            <FiHelpCircle />
          </span>

          <div className="quiz-review-header-copy">
            <h1>{selectedQuiz.title}</h1>
            <p>
              {courseName} | {lectureTitle.split(":")[0]} | {questions.length} questions
            </p>
          </div>
        </header>

        <section className="quiz-review-stats-grid">
          <article className="quiz-review-stat-card completed">
            <strong>{doneStudents.length}</strong>
            <span>Completed</span>
          </article>

          <article className="quiz-review-stat-card missed">
            <strong>{missedStudents.length}</strong>
            <span>Missed</span>
          </article>

          <article className="quiz-review-stat-card pending">
            <strong>{pendingStudents.length}</strong>
            <span>Pending</span>
          </article>

          <article className="quiz-review-stat-card average">
            <strong style={{ color: avgScore === null ? "#8ea4c8" : scoreColor(avgScore) }}>
              {avgScore === null ? "-" : `${avgScore}%`}
            </strong>
            <span>Average</span>
          </article>

          <article className="quiz-review-stat-card high-low">
            <strong>{highScore === null ? "-" : `${highScore}/${lowScore}`}</strong>
            <span>High / Low</span>
          </article>
        </section>

        <div className="quiz-review-main-grid">
          <aside className="quiz-review-students-card">
            <header className="quiz-review-students-header">
              <div>
                <FiUsers />
                <h2>Students</h2>
              </div>
              <span>{students.length}</span>
            </header>

            <div className="quiz-review-students-list">
              {students.map((student) => {
                const isDone = (selectedQuiz.doneStudentIds || []).includes(student.id);
                const isMissed = (selectedQuiz.missedStudentIds || []).includes(student.id);
                const isSelected = selectedStudentId === student.id;
                const studentScore = selectedQuiz.results?.[student.id];

                return (
                  <button
                    key={student.id}
                    type="button"
                    className={`quiz-review-student-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <span className="quiz-review-student-info">
                      <strong>{student.name}</strong>
                      <small>{student.studentId}</small>
                    </span>

                    <span className="quiz-review-student-state">
                      {isDone && typeof studentScore === "number" && (
                        <span
                          className="quiz-review-student-score"
                          style={{ color: scoreColor(studentScore) }}
                        >
                          {studentScore}%
                        </span>
                      )}

                      {isDone ? (
                        <FiCheckCircle className="state-done" />
                      ) : isMissed ? (
                        <FiXCircle className="state-missed" />
                      ) : (
                        <FiClock className="state-pending" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="quiz-review-detail-panel">
            {!selectedStudentId ? (
              <div className="quiz-review-empty-card">
                <FiEye />
                <p>Select a student to view their answers</p>
              </div>
            ) : !selectedAttempt ? (
              <div className="quiz-review-no-attempt-card">
                <FiHelpCircle />
                <strong>{selectedStudent?.name}</strong>
                <p>
                  {(selectedQuiz.missedStudentIds || []).includes(selectedStudentId)
                    ? "This student missed the quiz."
                    : "This student has not taken the quiz yet."}
                </p>
              </div>
            ) : (
              <div className="quiz-review-student-detail">
                <header className="quiz-review-selected-header">
                  <div className="quiz-review-selected-copy">
                    <strong>{selectedStudent?.name}</strong>
                    <small>{selectedStudent?.studentId}</small>
                  </div>

                  {typeof selectedScore === "number" && (
                    <div className="quiz-review-score-ring">
                      <svg viewBox="0 0 36 36" aria-hidden="true">
                        <circle cx="18" cy="18" r="16" className="ring-track" />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          className="ring-progress"
                          style={{
                            stroke: scoreColor(selectedScore),
                            strokeDasharray: `${Math.min(Math.max(selectedScore, 0), 100) * 1.005} 100.5`,
                          }}
                        />
                      </svg>
                      <span style={{ color: scoreColor(selectedScore) }}>{selectedScore}%</span>
                    </div>
                  )}
                </header>

                <div className="quiz-review-answers-list">
                  {questions.map((question, questionIndex) => {
                    const selectedAnswer = selectedAttempt.answers?.[question.id];
                    const isQuestionCorrect = selectedAnswer === question.correctAnswer;

                    return (
                      <article
                        key={question.id}
                        className={`quiz-review-question-card ${isQuestionCorrect ? "is-correct" : "is-wrong"}`}
                      >
                        <div className="quiz-review-question-top">
                          <span className="quiz-review-question-number">
                            {questionIndex + 1}
                          </span>
                          <p>{question.question}</p>
                        </div>

                        <div className="quiz-review-options-list">
                          {question.options.map((option, optionIndex) => {
                            const isSelected = selectedAnswer === optionIndex;
                            const isAnswer = question.correctAnswer === optionIndex;
                            const rowClassName = [
                              "quiz-review-option-row",
                              isAnswer ? "is-answer" : "",
                              isSelected && !isAnswer ? "is-selected-wrong" : "",
                            ]
                              .filter(Boolean)
                              .join(" ");

                            return (
                              <div key={`${question.id}-${optionIndex}`} className={rowClassName}>
                                {isAnswer ? (
                                  <FiCheckCircle />
                                ) : isSelected ? (
                                  <FiXCircle />
                                ) : (
                                  <span className="option-placeholder" />
                                )}
                                <span>{option}</span>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="quiz-review-analysis-card">
          <header>
            <FiBarChart2 />
            <h2>Question Analysis</h2>
          </header>

          <div className="quiz-review-analysis-list">
            {questionStats.map((stat, index) => (
              <article key={stat.id} className="quiz-review-analysis-item">
                <span className="quiz-review-analysis-label">Q{index + 1}</span>

                <span className="quiz-review-analysis-track">
                  <span
                    className={`quiz-review-analysis-fill ${getBarColorClass(stat.pct)}`}
                    style={{ width: `${stat.pct}%` }}
                  />
                </span>

                <span className="quiz-review-analysis-score">
                  {stat.correct}/{stat.total}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export default QuizReview;
