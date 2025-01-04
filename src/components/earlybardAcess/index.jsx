import React, { useState } from 'react';
import './index.css';

export default function FreeAccessForm({ handleFormSubmitFreeAccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    gender: '',
    dob: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(''); // Clear previous errors

    try {
      const response = await fetch('https://vibezone.in/api/early-bird-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Form submitted successfully:', data);
        handleFormSubmitFreeAccess();
        setSubmitted(true);
      } else {
        console.error('Error submitting form:', data.error);
        setErrorMessage(data.error || 'Failed to submit. Please try again.');
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrorMessage('Network error. Please try again later.');
    }
  };

  return (
    <div className="form-container">
      <div style={ { color: '#007bff'}}>
      <h2>Get Lifetime Free Access!</h2>
      <p>Sign up now to claim your lifetime free access. Limited to the first 1000 users.</p>
      </div>
      
      {submitted ? (
        <div className="success-message">
          <h3>Thank you!</h3>
          <p>You have successfully signed up for lifetime free access.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="free-access-form">
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              placeholder="Enter your phone number"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="dob">Date of Birth</label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="submit-btn">
            Claim Free Access
          </button>
        </form>
      )}
    </div>
  );
}
