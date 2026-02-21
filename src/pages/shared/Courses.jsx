import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Courses.css";
import AddCourse from "../instructor/AddCourse";
import { FaEdit, FaTrash } from "react-icons/fa";

import course1 from "../../images/course1.png";
import course2 from "../../images/course2.png";
import course3 from "../../images/course3.png";

const Courses = ({ role }) => {

  const navigate = useNavigate();

  const [courses, setCourses] = useState([
    { id: 1, title: "Introduction to Cybersecurity", image: course1 },
    { id: 2, title: "Introduction to Cryptography", image: course2 },
    { id: 3, title: "Ethical Hacking", image: course3 },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const isInstructor = role === "instructor";

  const handleDelete = (id) => {
    setCourses(courses.filter(course => course.id !== id));
  };

  const handleSaveCourse = (courseData) => {
    if (editingCourse) {
      setCourses(
        courses.map(c =>
          c.id === editingCourse.id
            ? { ...courseData, id: editingCourse.id }
            : c
        )
      );
    } else {
      setCourses([...courses, { ...courseData, id: Date.now() }]);
    }
  };

  /* 🔥 Navigate To Course Details */
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
            <span className="plus">+</span>
            <span className="btn-text">Add Course</span>
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
                  onClick={() => handleDelete(course.id)}
                >
                  <FaTrash />
                </button>
              </div>
            )}

            <img src={course.image} alt={course.title} />
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

    </div>
  );
};

export default Courses;