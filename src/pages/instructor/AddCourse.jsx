import { useState, useEffect } from "react";
import "../../styles/AddCourse.css";

const AddCourse = ({ onClose, onSave, editingCourse }) => {

  const [courseName, setCourseName] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingCourse) {
      setCourseName(editingCourse.title);
      setPreview(editingCourse.image);
    }
  }, [editingCourse]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = () => {
    if (!courseName || !preview) {
      setError("Please fill all fields");
      return;
    }

    setError("");

    onSave({
      title: courseName,
      image: preview,
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">

        <div className="modal-header">
          <h2>{editingCourse ? "Edit Course" : "Add New Course"}</h2>
          <span className="close-btn" onClick={onClose}>×</span>
        </div>

        <div className="modal-body">

          {error && <div className="error-message">{error}</div>}

          <label>Course Name *</label>
          <input
            type="text"
            placeholder="e.g. Introduction to Cybersecurity"
            value={courseName}
            onChange={(e) => {
              setCourseName(e.target.value);
              setError("");
            }}
          />

          <label>Cover Image *</label>

          <label className="upload-box">
            Click to Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
          </label>

          {preview && (
            <div className="image-preview">
              <img src={preview} alt="Preview" />
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="create-btn" onClick={handleSubmit}>
            {editingCourse ? "Update Course" : "Create Course"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddCourse;