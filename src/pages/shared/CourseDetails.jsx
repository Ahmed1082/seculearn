import { useState } from "react";
import { useParams } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import "../../styles/CourseDetails.css";
import AddItemModal from "../../components/AddItemModal";

const CourseDetails = ({ role }) => {

  const { courseId } = useParams();

  const isInstructor = role === "instructor";
  const isTA = role === "ta";

  const courseTitles = {
    1: "Introduction to Cybersecurity",
    2: "Introduction to Cryptography",
    3: "Ethical Hacking",
  };

  const courseTitle = courseTitles[courseId] || "Course";

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
  const [editingItem, setEditingItem] = useState(null);
  const [confirmData, setConfirmData] = useState(null);

  /* ================= SMART NUMBER ================= */

  const getNextNumber = (items) => {
    if (items.length === 0) return 1;

    const numbers = items.map(item => {
      const match = item.title.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });

    return Math.max(...numbers) + 1;
  };

  /* ================= ADD / EDIT ================= */

  const handleAddOrEdit = (title) => {

    if (modalType === "lecture") {

      if (editingItem) {
        setLectures(prev =>
          prev.map(l =>
            l.id === editingItem.id ? { ...l, title } : l
          )
        );
      } else {
        setLectures(prev => [
          ...prev,
          { id: Date.now(), title }
        ]);
      }
    }

    if (modalType === "section") {

      if (editingItem) {
        setSections(prev =>
          prev.map(s =>
            s.id === editingItem.id ? { ...s, title } : s
          )
        );
      } else {
        setSections(prev => [
          ...prev,
          { id: Date.now(), title }
        ]);
      }
    }

    setShowModal(false);
    setEditingItem(null);
  };

  /* ================= DELETE ================= */

  const handleDelete = () => {
    if (!confirmData) return;

    if (confirmData.type === "lecture") {
      setLectures(prev =>
        prev.filter(l => l.id !== confirmData.id)
      );
    }

    if (confirmData.type === "section") {
      setSections(prev =>
        prev.filter(s => s.id !== confirmData.id)
      );
    }

    setConfirmData(null);
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
              setEditingItem(null);
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
              setEditingItem(null);
              setShowModal(true);
            }}
          >
            <span className="plus">+</span>
            <span className="btn-text">Add Section</span>
          </button>
        )}
      </div>

      {/* ================= LECTURES ================= */}
      <div className="section-block">
        <div className="block-title">
          <h2 className="block-txt">Lectures</h2>
        </div>

        <div className="circle-grid">
          {lectures.map((lecture) => (
            <div className="circle-card" key={lecture.id}>

              {isInstructor && (
                <div className="circle-actions">
                  <button
                    className="icon-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalType("lecture");
                      setEditingItem(lecture);
                      setShowModal(true);
                    }}
                  >
                    <FaEdit />
                  </button>

                  <button
                    className="icon-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmData({
                        id: lecture.id,
                        type: "lecture",
                        title: lecture.title
                      });
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              )}

              <span>{lecture.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= SECTIONS ================= */}
      <div className="section-block">
        <div className="block-title">
          <h2 className="block-txt">Sections</h2>
        </div>

        <div className="circle-grid">
          {sections.map((section) => (
            <div className="circle-card" key={section.id}>

              {isTA && (
                <div className="circle-actions">
                  <button
                    className="icon-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalType("section");
                      setEditingItem(section);
                      setShowModal(true);
                    }}
                  >
                    <FaEdit />
                  </button>

                  <button
                    className="icon-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmData({
                        id: section.id,
                        type: "section",
                        title: section.title
                      });
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              )}

              <span>{section.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= CONFIRM DELETE BOX ================= */}
      {confirmData && (
        <div className="confirm-overlay">
          <div className="confirm-box">

            <h3 className="confirm-title">
              Delete
              <span className="highlight"> {confirmData.title} </span>?
            </h3>

            <p className="confirm-sub">
              This action cannot be undone.
            </p>

            <div className="confirm-buttons">

              <button
                className="cancel-btn"
                onClick={() => setConfirmData(null)}
              >
                Cancel
              </button>

              <button
                className="confirm-delete-btn"
                onClick={handleDelete}
              >
                Delete
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL ================= */}
      {showModal && (
        <AddItemModal
          type={modalType}
          editingItem={editingItem}
          nextNumber={
            modalType === "lecture"
              ? getNextNumber(lectures)
              : getNextNumber(sections)
          }
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onAdd={handleAddOrEdit}
        />
      )}

    </div>
  );
};

export default CourseDetails;