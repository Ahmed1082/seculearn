import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiClock,
  FiHash,
  FiHelpCircle,
  FiLayers,
  FiToggleLeft,
} from "react-icons/fi";
import "../../styles/AddQuiz.css";

const getDefaultQuizForm = () => ({
  title: "",
  timeLimit: 30,
  questionCount: 10,
  shuffleQuestions: false,
});

const sanitizeQuizNumber = (value, min, max, fallback) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
};

const AddQuiz = ({ role = "lecturer" }) => {
  const navigate = useNavigate();
  const { courseId, lectureId, sectionId } = useParams();
  const isSectionView = Boolean(sectionId);
  const unitLabel = isSectionView ? "Section" : "Lecture";
  const contentPath = `/${role}/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}`;

  const [quizForm, setQuizForm] = useState(getDefaultQuizForm());

  const isQuizFormValid =
    quizForm.title.trim().length > 0 &&
    sanitizeQuizNumber(quizForm.timeLimit, 1, 180, 30) > 0 &&
    sanitizeQuizNumber(quizForm.questionCount, 1, 200, 10) > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate(contentPath);
  };

  const updateQuizFormValue = (field, value) => {
    setQuizForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const formDescription = `Configure and launch a quiz for this ${unitLabel.toLowerCase()}.`;

  return (
    <section className="add-quiz-page">
      <div className="add-quiz-shell">
        <button
          type="button"
          className="add-quiz-back-btn"
          onClick={() => navigate(contentPath)}
        >
          <FiArrowLeft />
          Back to {unitLabel}
        </button>

        <div className="add-quiz-card">
          <div className="add-quiz-card-header">
            <div>
              <h1>New Quiz</h1>
              <p>{formDescription}</p>
            </div>
          </div>

          <form className="add-quiz-form" onSubmit={handleSubmit}>
            <div className="add-quiz-stats-grid">
              <div className="add-quiz-stat-card time">
                <label>
                  <span>
                    <FiClock />
                    Time Limit (min)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={quizForm.timeLimit}
                    onChange={(event) =>
                      updateQuizFormValue(
                        "timeLimit",
                        Number(event.target.value || 0)
                      )
                    }
                    onBlur={() =>
                      updateQuizFormValue(
                        "timeLimit",
                        sanitizeQuizNumber(quizForm.timeLimit, 1, 180, 30)
                      )
                    }
                  />
                </label>
                <p>
                  {quizForm.timeLimit} minute
                  {quizForm.timeLimit !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="add-quiz-stat-card questions">
                <label>
                  <span>
                    <FiHash />
                    Questions
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={quizForm.questionCount}
                    onChange={(event) =>
                      updateQuizFormValue(
                        "questionCount",
                        Number(event.target.value || 0)
                      )
                    }
                    onBlur={() =>
                      updateQuizFormValue(
                        "questionCount",
                        sanitizeQuizNumber(quizForm.questionCount, 1, 200, 10)
                      )
                    }
                  />
                </label>
                <p>
                  {quizForm.questionCount} question
                  {quizForm.questionCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <label className="add-quiz-field">
              <span>
                <FiLayers />
                Quiz Title <em>*</em>
              </span>
              <input
                type="text"
                value={quizForm.title}
                onChange={(event) =>
                  updateQuizFormValue("title", event.target.value)
                }
                placeholder="e.g. Mid-Lecture Check: Encryption Basics"
                required
              />
            </label>

            <button
              type="button"
              className={`add-quiz-toggle ${quizForm.shuffleQuestions ? "is-on" : ""}`}
              onClick={() =>
                updateQuizFormValue("shuffleQuestions", !quizForm.shuffleQuestions)
              }
            >
              <span>
                <FiToggleLeft />
                Shuffle Questions
              </span>
              <span className="add-quiz-switch" aria-hidden="true">
                <span />
              </span>
            </button>

            {isQuizFormValid && (
              <p className="add-quiz-status-note">
                <FiHelpCircle />
                {quizForm.questionCount} questions · {quizForm.timeLimit} min
                {quizForm.shuffleQuestions ? " · shuffled" : ""}
              </p>
            )}

            <div className="add-quiz-actions-row">
              <button
                type="button"
                className="add-quiz-cancel-btn"
                onClick={() => navigate(contentPath)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="add-quiz-submit-btn"
                disabled={!isQuizFormValid}
              >
                Create Quiz
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AddQuiz;
