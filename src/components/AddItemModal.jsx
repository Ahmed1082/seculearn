import { useState } from "react";
import "../styles/AddItemModal.css";

const AddItemModal = ({
  type,
  defaultTitle,
  existingItems,
  onClose,
  onAdd
}) => {

  const [title, setTitle] = useState(defaultTitle || "");
  const [error, setError] = useState("");

  const handleSubmit = () => {

    if (!title.trim()) {
      setError("Title cannot be empty");
      return;
    }

    const alreadyExists = existingItems.some(
      item => item.title.toLowerCase() === title.trim().toLowerCase()
    );

    if (alreadyExists) {
      setError("This title already exists");
      return;
    }

    setError("");
    onAdd(title.trim());
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="add-item-modal">

        <div className="modal-header">
          <h2>
            Add New {type === "lecture" ? "Lecture" : "Section"}
          </h2>

          <span className="close-btn" onClick={onClose}>
            ×
          </span>
        </div>

        <div className="modal-body">

          {error && (
            <div className="modal-error">
              {error}
            </div>
          )}

          <label>
            {type === "lecture" ? "Lecture Title" : "Section Title"}
          </label>

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError("");
            }}
          />

        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>

          <button className="add-btn-modal" onClick={handleSubmit}>
            Add {type === "lecture" ? "Lecture" : "Section"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddItemModal;