import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaTrash, FaEdit } from "react-icons/fa";
import "../../styles/CourseDetails.css";
import AddItemModal from "../../components/AddItemModal";
import axios from "axios";
import { ctfChallenges } from "../../data/ctfChallenges";

const CourseDetails = ({ role }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const permissions = {
    canManageLectures: role === "lecturer",
    canManageSections: role === "ta",
    canManageCTF: role === "lecturer" || role === "ta",
  };

  const [course, setCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [sections, setSections] = useState([]);
  const [ctfs, setCtfs] = useState(ctfChallenges);

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
          (c) => c.id === Number(courseId)
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

      // ===== LECTURE (Lecturer only) =====
      if (modalType === "lecture" && permissions.canManageLectures) {
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
      if (modalType === "section" && permissions.canManageSections) {
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
      
      // ===== CTF =====
      if (modalType === "ctf" && permissions.canManageCTF) {
        const newCTF = {
          id: Date.now(),
          title: title,
          description: "New Challenge",
          difficulty: "Easy",
          points: 100,
          solved: false,
        };

        setCtfs((prev) => [...prev, newCTF]);
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
      // Lecture delete (Lecturer only)
      if (confirmData.type === "lecture" && permissions.canManageLectures) {
        await axios.delete(
          `/api/delete-lecture/${confirmData.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setLectures((prev) =>
          prev.filter((l) => l.id !== confirmData.id)
        );
      }

      // Section delete (TA only)
      if (confirmData.type === "section" && permissions.canManageSections) {
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

  const getShortCircleTitle = (title = "") => {
    const match = title.match(/lec(ture)?\s*\d+/i);
    if (!match) return title;
    return match[0].replace(/lecture/i, "Lec");
  };

  const getShortSectionTitle = (title = "") => {
    const match = title.match(/sec(tion)?\s*\d+/i);
    if (!match) return title;
    return match[0].replace(/section/i, "Sec");
  };

  return (
    <div className="course-details">

      <div className="course-header">
        <h1>{course?.title || "Course"}</h1>

        {permissions.canManageLectures && (
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

        {permissions.canManageSections && (
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
            <div
              className="circle-card"
              key={lecture.id}
              onClick={() =>
                navigate(`/${role}/courses/${courseId}/lecture/${lecture.id}`, {
                  state: {
                    lectureTitle: lecture.title,
                    courseTitle: course?.title
                  }
                })
              }
              style={{ cursor: "pointer" }}
            >

              {permissions.canManageLectures && (
                <div className="circle-actions">
                  <button
                    className="icon-btn"
                    onClick={(event) => {
                      event.stopPropagation();
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
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmData({
                        id: lecture.id,
                        title: lecture.title,
                        type: "lecture",
                      })
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              )}

              <span>{getShortCircleTitle(lecture.title)}</span>
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
            <div
              className="circle-card"
              key={section.id}
              onClick={() => {
                if (permissions.canManageSections) {
                  localStorage.setItem("ta_active_section_id", String(section.id));
                  localStorage.setItem("ta_active_section_title", section.title || "");
                }

                navigate(`/${role}/courses/${courseId}/section/${section.id}`, {
                  state: {
                    sectionTitle: section.title,
                    courseTitle: course?.title
                  }
                });
              }}
            >

              {permissions.canManageSections && (
                <div className="circle-actions">
                  <button
                    className="icon-btn"
                    onClick={(event) => {
                      event.stopPropagation();
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
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmData({
                        id: section.id,
                        title: section.title,
                        type: "section",
                      })
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              )}

              <span>{getShortSectionTitle(section.title)}</span>
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
        ((modalType === "lecture" && permissions.canManageLectures) ||
         (modalType === "section" && permissions.canManageSections) ||
         (modalType === "ctf" && permissions.canManageCTF)) && (
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

        {/* ================= CTF ================= */}
      <div className="section-block">

        <div className="ctf-header-row">
          <div className="block-title ctf-block-title">
            <h2 className="block-txt">CTF Challenges</h2>
          </div>

          {permissions.canManageCTF && (
            <button
              className="add-btn"
              onClick={() => {
                navigate(`/${role}/courses/${courseId}/ctf/create`);
              }}
            >
              <span className="plus">+</span>
              <span className="btn-text">Add CTF</span>
            </button>
          )}
        </div>

        <div className="ctf-grid">
          {ctfs.map((ctf) => (
            <div
              key={ctf.id}
              className={`ctf-card ${
                !permissions.canManageCTF && ctf.solved ? "solved" : ""
              }`}
              onClick={() => {
                if (permissions.canManageCTF) {
                  navigate(`/${role}/courses/${courseId}/ctf/${ctf.id}`);
                } else {
                  navigate(`/student/courses/${courseId}/ctf/${ctf.id}`);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="ctf-header">
                <div className="title-row">
                  <h3>{ctf.title}</h3>

                  <span className={`badge ${ctf.difficulty.toLowerCase()}`}>
                    {ctf.difficulty}
                  </span>
                </div>

                <div className="points-row">
                  <span className="points">🏆 {ctf.points} pts</span>
                  {permissions.canManageCTF && (
                    <button
                      className="ctf-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/${role}/courses/${courseId}/ctf/edit/${ctf.id}`);
                      }}
                    >
                      <FaEdit />
                    </button>
                  )}
                </div>
              </div>

              <p className="ctf-category">{ctf.category || "Network Security"}</p>

              <p className="ctf-desc">
                {ctf.description || ctf.shortDescription}
              </p>

              <div className="ctf-footer">
                {!permissions.canManageCTF && (
                  <>
                    {ctf.solved ? (
                      /* 🟢 SOLVED */
                      <>
                        <div className="row hint-row">
                          <span className="hint">💡 Show Hint (-50% points)</span>
                        </div>

                        <div className="row bottom-row">
                          <span className="solves">🏳 1 solve</span>

                          <span className="completed">
                            ✔ Challenge completed — {ctf.points} points earned
                          </span>
                        </div>
                      </>
                    ) : (
                      /* 🔵 NOT SOLVED */
                      <>
                        <div className="row hint-row">
                          <span className="hint">💡 Show Hint (-50% points)</span>
                        </div>

                        <div className="row bottom-row">
                          <span className="solves">🏳 1 solve</span>

                          <button
                            className="open-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/courses/${courseId}/ctf/${ctf.id}`);
                            }}
                          >
                            Open challenge →
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* 👨‍🏫 Doctor */}
                {permissions.canManageCTF && (
                  <div className="row instructor-row">
                    <span className="solves">🏳 1 solve</span>
                    <span className="flag">flag{`{${ctf.flag}}`}</span>
                  </div>
                )}

              </div>
            </div>        
          ))}
          
        </div>
      </div>
      
    </div>
  );
};

export default CourseDetails;
