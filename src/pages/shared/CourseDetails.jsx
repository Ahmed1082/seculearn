import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import "../../styles/CourseDetails.css";
import AddItemModal from "../../components/AddItemModal";
import axios from "axios";

const CourseDetails = ({ role }) => {
  const { courseId } = useParams();
  const token = localStorage.getItem("token");

  const isInstructor = role === "instructor";
  const isTA = role === "ta";
  const isStudent = role === "student";

  const [course, setCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [sections, setSections] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [confirmData, setConfirmData] = useState(null);

  const [serverError, setServerError] = useState("");

  /* ================= GET COURSE DATA ================= */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get("/api/get-courses", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const selectedCourse = res.data.courses.find(
          (c) => c.id == courseId
        );

        setCourse(selectedCourse);
        setLectures(selectedCourse?.lectures || []);
        setSections(selectedCourse?.sections || []);
      } catch (err) {
        console.error("Error fetching course:", err);
      }
    };

    if (token) fetchCourses();
  }, [courseId, token]);

  /* ================= AUTO NUMBERING ================= */
  const getNextLectureNumber = () => {
    if (lectures.length === 0) return 1;

    const numbers = lectures.map((l) => {
      const match = l.title.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });

    return Math.max(...numbers) + 1;
  };

  const getNextSectionNumber = () => {
    if (sections.length === 0) return 1;

    const numbers = sections.map((s) => {
      const match = s.title.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });

    return Math.max(...numbers) + 1;
  };

  /* ================= ADD / EDIT ================= */
  const handleAddItem = async (title) => {
    setServerError("");
    try {
      let res;

      // ===== LECTURE (Instructor only) =====
      if (modalType === "lecture" && isInstructor) {
        if (editingItem) {
          res = await axios.post(
            `/api/edit-lecture/${editingItem.id}`,
            { title: title },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setLectures((prev) =>
            prev.map((l) =>
              l.id === editingItem.id ? res.data.lecture : l
            )
          );
        } else {
          res = await axios.post(
            "/api/add-lecture",
            {
              title: title,
              course_id: courseId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setLectures((prev) => [...prev, res.data]);
        }
      }

      // ===== SECTION (TA only) =====
      if (modalType === "section" && isTA) {
        if (editingItem) {
          res = await axios.post(
            `/api/edit-section/${editingItem.id}`,
            { title: title },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setSections((prev) =>
            prev.map((s) =>
              s.id === editingItem.id ? res.data.section : s
            )
          );
        } else {
          res = await axios.post(
            "/api/add-section",
            {
              title: title,
              course_id: courseId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setSections((prev) => [...prev, res.data]);
        }
      }

      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      if (err.response?.status === 422) {
        setServerError(`${title} already exists`);
      } else {
        setServerError("Something went wrong");
      }
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    if (!confirmData) return;

    try {
      // Lecture delete (Instructor only)
      if (confirmData.type === "lecture" && isInstructor) {
        await axios.delete(
          `/api/delete-lecture/${confirmData.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setLectures((prev) =>
          prev.filter((l) => l.id !== confirmData.id)
        );
      }

      // Section delete (TA only)
      if (confirmData.type === "section" && isTA) {
        await axios.delete(
          `/api/delete-section/${confirmData.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setSections((prev) =>
          prev.filter((s) => s.id !== confirmData.id)
        );
      }

      setConfirmData(null);
    } catch (err) {
      console.error("Delete error:", err.response?.data || err);
    }
  };

  return (
    <div className="course-details">

      <div className="course-header">
        <h1>{course?.title || "Course"}</h1>

        {isInstructor && (
          <button
            className="add-btn"
            onClick={() => {
              setServerError("");
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
              setServerError("");
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
                    className="icon-btn"
                    onClick={() => {
                      setServerError("");
                      setModalType("lecture");
                      setEditingItem(lecture);
                      setShowModal(true);
                    }}
                  >
                    <FaEdit />
                  </button>

                  <button
                    className="icon-btn delete"
                    onClick={() =>
                      setConfirmData({
                        id: lecture.id,
                        title: lecture.title,
                        type: "lecture",
                      })
                    }
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
                    className="icon-btn"
                    onClick={() => {
                      setServerError("");
                      setModalType("section");
                      setEditingItem(section);
                      setShowModal(true);
                    }}
                  >
                    <FaEdit />
                  </button>

                  <button
                    className="icon-btn delete"
                    onClick={() =>
                      setConfirmData({
                        id: section.id,
                        title: section.title,
                        type: "section",
                      })
                    }
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

      {/* ================= CONFIRM DELETE ================= */}
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
      {showModal &&
        ((modalType === "lecture" && isInstructor) ||
          (modalType === "section" && isTA)) && (
          <AddItemModal
            type={modalType}
            editingItem={editingItem}
            nextNumber={
              modalType === "lecture"
                ? getNextLectureNumber()
                : getNextSectionNumber()
            }
            onClose={() => {
              setShowModal(false);
              setEditingItem(null);
              setServerError("");
            }}
            onAdd={handleAddItem}
            serverError={serverError}
          />
        )}
    </div>
  );
};

export default CourseDetails;