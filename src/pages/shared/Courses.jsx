import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/Courses.css";
import AddCourse from "../instructor/AddCourse";
import { FaEdit, FaTrash } from "react-icons/fa";

const Courses = ({ role }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deletePopupData, setDeletePopupData] = useState(null);

  const isInstructor = role === "instructor";

  /* ================= GET COURSES ================= */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get("/api/get-courses", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setCourses(res.data.courses || []);
      } catch (err) {
        console.error("Error fetching courses:", err);
      }
    };

    if (token) fetchCourses();
  }, [token]);

  /* ================= ADD / EDIT COURSE ================= */
  const handleSaveCourse = async (courseData) => {
    try {
      const formData = new FormData();
      formData.append("title", courseData.title);

      if (courseData.image) {
        formData.append("cover_image", courseData.image);
      }

      let res;

      if (editingCourse) {
        // EDIT
        res = await axios.post(
          `/api/edit-course/${editingCourse.id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setCourses((prev) =>
          prev.map((c) =>
            c.id === editingCourse.id ? res.data.course : c
          )
        );

      } else {
        // ADD
        res = await axios.post(
          "/api/add-courses",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setCourses((prev) => [...prev, res.data.course]);
      }

      setShowModal(false);
      setEditingCourse(null);

    } catch (err) {
      console.error("Save error:", err.response?.data || err);
    }
  };

  /* ================= DELETE COURSE ================= */
  const confirmCourseDelete = async () => {
    if (!deletePopupData) return;

    try {
      await axios.delete(
        `/api/delete-course/${deletePopupData.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCourses((prev) =>
        prev.filter((course) => course.id !== deletePopupData.id)
      );

      setDeletePopupData(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleOpenCourse = (id) => {
    navigate(`/${role}/courses/${id}`);
  };

  return (
    <div className="courses-content">
      <div className="courses-header">
        <h2 className="courses-title">
          <span className="title-text">Courses</span>
          <span className="course-count">{courses.length}</span>
        </h2>

        {isInstructor && (
          <button
            className="add-course-btn"
            onClick={() => {
              setEditingCourse(null);
              setShowModal(true);
            }}
          >
            <span className="btn-plus">+</span>
            <span className="btn-txt">Add Course</span>
          </button>
        )}
      </div>

      <div className="courses-grid">
        {courses.map((course) => (
          <div
            className="course-card"
            key={course.id}
            onClick={() => handleOpenCourse(course.id)}
          >
            {isInstructor && (
              <div
                className="card-actions"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="icon-btn edit"
                  onClick={() => {
                    setEditingCourse(course);
                    setShowModal(true);
                  }}
                >
                  <FaEdit />
                </button>

                <button
                  className="icon-btn delete"
                  onClick={() =>
                    setDeletePopupData({
                      id: course.id,
                      title: course.title,
                    })
                  }
                >
                  <FaTrash />
                </button>
              </div>
            )}

            <img
              src={course.image_url} 
              alt={course.title}
            />

            <h3>{course.title}</h3>
          </div>
        ))}
      </div>

      {isInstructor && showModal && (
        <AddCourse
          onClose={() => {
            setShowModal(false);
            setEditingCourse(null);
          }}
          onSave={handleSaveCourse}
          editingCourse={editingCourse}
        />
      )}

      {deletePopupData && (
        <div className="course-delete-overlay">
          <div className="course-delete-box">

            <h3 className="course-delete-title">
              Delete
              <span className="course-delete-highlight">
                {" "}{deletePopupData.title}{" "}
              </span>
              ?
            </h3>

            <p className="course-delete-sub">
              This action cannot be undone.
            </p>

            <div className="course-delete-actions">

              <button
                className="course-cancel-btn"
                onClick={() => setDeletePopupData(null)}
              >
                Cancel
              </button>

              <button
                className="course-delete-btn"
                onClick={confirmCourseDelete}
              >
                Delete
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;