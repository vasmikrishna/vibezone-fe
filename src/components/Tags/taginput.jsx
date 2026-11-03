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

  const add = (parts) => {
    const next = [...tags];
    for (const part of parts) {
      const tag = part.trim().toLowerCase().slice(0, MAX_TAG_LENGTH).trim();
      if (tag && !next.includes(tag) && next.length < MAX_TAGS) next.push(tag);
    }
    if (next.length !== tags.length) update(next);
  };

  // A typed or pasted comma adds the words before it; this also covers mobile keyboards that send no key code.
  const handleChange = (e) => {
    const parts = e.target.value.split(",");
    const rest = parts.pop();
    if (parts.length) add(parts);
    setInputValue(rest.slice(0, MAX_TAG_LENGTH));
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    add([inputValue]);
    setInputValue("");
  };

  return (
    <div className="tag-input-container">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={tags.length >= MAX_TAGS}
        placeholder="Key Words"
        aria-label="Key words: type an interest, then press Enter or comma"
        className="tag-input"
        data-testid="tag-input"
      />
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
    </div>
  );
}
