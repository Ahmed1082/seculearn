import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiHelpCircle } from "react-icons/fi";
import "../../styles/QuizReview.css";

const QuizReview = ({ role = "lecturer" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, lectureId, sectionId, quizId } = useParams();
  const isSectionView = Boolean(sectionId);
  const quizTitle = location.state?.quizTitle || `Quiz ${quizId}`;
  const backPath = `/${role}/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}`;

  const showHeader = useMemo(
    () => `${isSectionView ? "Section" : "Lecture"} Quiz Review`,
    [isSectionView]
  );

  return (
    <section className="quiz-review-page">
      <div className="quiz-review-shell">
        <button
          type="button"
          className="quiz-review-back-btn"
          onClick={() => navigate(backPath)}
        >
          <FiArrowLeft />
          Back to {isSectionView ? "Section" : "Lecture"}
        </button>

        <div className="quiz-review-card">
          <header className="quiz-review-card-header">
            <div>
              <h1>{showHeader}</h1>
              <p>Review the quiz results and student performance details.</p>
            </div>
          </header>

          <div className="quiz-review-summary">
            <div className="quiz-review-summary-item">
              <FiHelpCircle size={18} />
              <div>
                <strong>{quizTitle}</strong>
                <p>Quiz ID: {quizId}</p>
              </div>
            </div>
            <div className="quiz-review-summary-item">
              <FiCheckCircle size={18} />
              <div>
                <strong>Role</strong>
                <p>{role}</p>
              </div>
            </div>
          </div>

          <div className="quiz-review-placeholder">
            <p>هذه الصفحة مخصصة لعرض نتائج الاختبار.</p>
            <p>يمكنك هنا إضافة تفاصيل النتائج والمراجعة لاحقاً.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuizReview;
