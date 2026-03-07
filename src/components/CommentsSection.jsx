import { useState } from "react";

const CommentsSection = ({ variant, comments, currentUserName, onSend }) => {
  const [newComment, setNewComment] = useState("");

  const handleSend = () => {
    if (newComment.trim()) {
      onSend(newComment);
      setNewComment("");
    }
  };

  return (
    <div className="comments-section">
      <h3>Comments</h3>
      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <strong>{comment.authorName}:</strong> {comment.text}
          </div>
        ))}
      </div>
      <div className="comment-input">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default CommentsSection;