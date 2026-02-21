import { useState } from "react";
import { useParams } from "react-router-dom";
import "../../styles/CourseDetails.css";
import AddItemModal from "../../components/AddItemModal";

const CourseDetails = ({ role }) => {

  const { courseId } = useParams();

  const isInstructor = role === "instructor";
  const isTA = role === "ta";

  /* ================= COURSE TITLE ================= */

  const courseTitles = {
    1: "Introduction to Cybersecurity",
    2: "Introduction to Cryptography",
    3: "Ethical Hacking",
  };

  const courseTitle = courseTitles[courseId] || "Course";

  /* ================= STATE (SAME FOR ALL) ================= */

  const [lectures, setLectures] = useState([
    { id: 1, title: "Lec 1" },
    { id: 2, title: "Lec 2" },
    { id: 3, title: "Lec 3" },
    { id: 4, title: "Lec 4" },
  ]);

  const [sections, setSections] = useState([
    { id: 1, title: "Sec 1" },
    { id: 2, title: "Sec 2" },
    { id: 3, title: "Sec 3" },
    { id: 4, title: "Sec 4" },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");

  /* ================= SMART NUMBER ================= */

  const getNextLectureNumber = () => {
    const numbers = lectures.map(l =>
      parseInt(l.title.replace(/\D/g, "")) || 0
    );
    return Math.max(...numbers) + 1;
  };

  const getNextSectionNumber = () => {
    const numbers = sections.map(s =>
      parseInt(s.title.replace(/\D/g, "")) || 0
    );
    return Math.max(...numbers) + 1;
  };

  /* ================= ADD HANDLER ================= */

  const handleAdd = (newTitle) => {

    if (modalType === "lecture") {
      setLectures([
        ...lectures,
        { id: Date.now(), title: newTitle }
      ]);
    }

    if (modalType === "section") {
      setSections([
        ...sections,
        { id: Date.now(), title: newTitle }
      ]);
    }
  };

  return (
    <div className="course-details">

      {/* HEADER */}
      <div className="course-header">
        <h1>{courseTitle}</h1>

        {isInstructor && (
          <button
            className="add-btn"
            onClick={() => {
              setModalType("lecture");
              setShowModal(true);
            }}
          >
            <span className="plus">+</span>
            <span className="btn-text">Add Lecture</span>
          </button>
        )}

        {isTA && (
          <button
            className="add-btn"
            onClick={() => {
              setModalType("section");
              setShowModal(true);
            }}
          >
            <span className="plus">+</span>
            <span className="btn-text">Add Section</span>
          </button>
        )}
      </div>

      {/* LECTURES */}
      <div className="section-block">
        <div className="block-title">
          <h2 className="block-txt">Lectures</h2>
        </div>

        <div className="circle-grid">
          {lectures.map((lecture) => (
            <div className="circle-card" key={lecture.id}>
              <span>{lecture.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTIONS */}
      <div className="section-block">
        <div className="block-title">
          <h2 className="block-txt">Sections</h2>
        </div>

        <div className="circle-grid">
          {sections.map((section) => (
            <div className="circle-card" key={section.id}>
              <span>{section.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MEMBERS */}
      <div className="members-counter">
        <div className="members-circle">
          <div className="members-icon">
            <span>10</span>
            <p>Members</p>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <AddItemModal
          type={modalType}
          defaultTitle={
            modalType === "lecture"
              ? `Lec ${getNextLectureNumber()}`
              : `Sec ${getNextSectionNumber()}`
          }
          existingItems={
            modalType === "lecture" ? lectures : sections
          }
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}

    </div>
  );
};

export default CourseDetails;