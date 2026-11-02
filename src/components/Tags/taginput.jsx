import { useState } from "react";
import "./TagInput.css";

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

export default function TagInput({ onTagsChange }) {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const update = (newTags) => {
    setTags(newTags);
    onTagsChange(newTags);
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const tag = inputValue.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) update([...tags, tag]);
    setInputValue("");
  };

  return (
    <div className="tag-input-container">
      <div className="tags-container">
        {tags.map((tag) => (
          <div key={tag} className="tag">
            {tag}
            <button
              className="remove-tag-btn"
              onClick={() => update(tags.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              data-testid={`remove-tag-${tag}`}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={MAX_TAG_LENGTH}
        disabled={tags.length >= MAX_TAGS}
        placeholder="Add an interest and press Enter"
        aria-label="Add an interest tag"
        className="tag-input"
        data-testid="tag-input"
      />
    </div>
  );
}
