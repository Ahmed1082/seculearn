import { useState, useEffect } from "react";
import "../styles/AddItemModal.css";

const AddItemModal = ({
  type,
  editingItem,
  nextNumber,
  onClose,
  onAdd
}) => {

  const isLecture = type === "lecture";

  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
    } else {
      setTitle(
        isLecture
          ? `Lec ${nextNumber}`
          : `Sec ${nextNumber}`
      );
    }
  }, [editingItem, nextNumber, isLecture]);

  const handleSubmit = () => {

    if (!title.trim()) {
      setError("This field cannot be empty");
      return;
    }

    onAdd(title.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="add-item-modal">

        <div className="modal-header">
          <h2>
            {editingItem
              ? `Edit ${isLecture ? "Lecture" : "Section"}`
              : `Add New ${isLecture ? "Lecture" : "Section"}`
            }
          </h2>

          <span className="close-btn" onClick={onClose}>
            ×
          </span>
        </div>

        <div className="modal-body">

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <label>
            {isLecture ? "Lecture Title" : "Section Title"}
          </label>

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
          />

        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>

          <button className="add-btn-modal" onClick={handleSubmit}>
            {editingItem
              ? "Save Changes"
              : isLecture
                ? "Add Lecture"
                : "Add Section"
            }
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddItemModal;