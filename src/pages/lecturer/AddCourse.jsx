import { useState, useEffect } from "react";
import "../../styles/AddCourse.css";

const AddCourse = ({ onClose, onSave, editingCourse }) => {
  const [courseName, setCourseName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingCourse) {
      setCourseName(editingCourse.title);
      setPreview(editingCourse.image_url);
    }
  }, [editingCourse]);

  const resolveImageUrl = (path = "") => {
    if (!path) return "";
    if (path.startsWith("blob:") || path.startsWith("data:")) return path;

    let cleanPath = path;
    try {
      if (/^https?:\/\//i.test(path)) {
        const urlObj = new URL(path);
        cleanPath = urlObj.pathname + urlObj.search;
      }
    } catch (e) {
      cleanPath = path.replace(/^https?:\/\/[^/]+/, "");
    }

    return "/" + cleanPath.replace(/^\/+/, "");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = () => {
    if (!courseName.trim()) {
      setError("Title is required");
      return;
    }

    if (!editingCourse && !imageFile) {
      setError("Image is required");
      return;
    }

    onSave({
      title: courseName,
      image: imageFile,
    });
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
            value={courseName}
            onChange={(e) => {
              setCourseName(e.target.value);
              setError("");
            }}
          />

          <label>Cover Image {editingCourse ? "" : "*"}</label>

          <label className="upload-box">
            Click to Upload Image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageChange}
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