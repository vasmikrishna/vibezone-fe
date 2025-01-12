import React, { useState } from "react";
import "./TagInput.css"; // Add custom styles for your tag input here


export default function TagInput({ onTagsChange }) {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && inputValue.trim() !== "") {
      if (!tags.includes(inputValue.trim())) {
        const newTags = [...tags, inputValue.trim()];
        setTags(newTags);
        onTagsChange(newTags);
      }
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags);
    onTagsChange(updatedTags);
  };

  return (
    <div className="tag-input-container">
      <div className="tags-container">
        {tags.map((tag, index) => (
          <div key={index} className="tag">
            {tag}
            <button
              className="remove-tag-btn"
              onClick={() => removeTag(tag)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder="Enter a tag and press Enter"
        className="tag-input"
      />
    </div>
  );
}
