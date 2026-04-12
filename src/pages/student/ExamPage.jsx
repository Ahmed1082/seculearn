import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiClipboard, FiClock } from "react-icons/fi";
import "../../styles/ExamPage.css";

const ExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, lectureId, sectionId, quizId } = useParams();
  const isSectionView = Boolean(sectionId);
  const quizTitle = location.state?.quizTitle || `Quiz ${quizId}`;
  const backPath = `/student/courses/${courseId}/${isSectionView ? `section/${sectionId}` : `lecture/${lectureId}`}`;

  const subtitle = useMemo(
    () => (isSectionView ? "Section Exam" : "Lecture Exam"),
    [isSectionView]
  );

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

        <div className="exam-card">
          <header className="exam-card-header">
            <div>
              <h1>{quizTitle}</h1>
              <p>{subtitle} for student review and submission.</p>
            </div>
          </header>

          <div className="exam-meta">
            <div className="exam-meta-item">
              <FiClipboard />
              <div>
                <strong>Quiz</strong>
                <span>{quizId}</span>
              </div>
            </div>
            <div className="exam-meta-item">
              <FiClock />
              <div>
                <strong>Time</strong>
                <span>Not set yet</span>
              </div>
            </div>
          </div>

          <div className="exam-placeholder">
            <p>هذه الصفحة مخصصة لبدء الامتحان أو للاطلاع على تفاصيله.</p>
            <p>يمكن إضافة أسئلة ومحتوى الامتحان هنا لاحقاً.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExamPage;
