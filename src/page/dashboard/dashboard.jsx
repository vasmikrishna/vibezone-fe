// Dashboard.jsx
import React, { useEffect, useState } from 'react';
// import './Dashboard.css'; 

export default function Dashboard() {
  const [userData, setUserData] = useState({
    "user": {
      "name": "John Doe",
      "email": "johndoe@example.com",
      "lastLogin": "2025-01-01T12:34:56Z",
      "stats": {
        "totalActivities": 120,
        "completedTasks": 85,
        "activeSessions": 3
      }
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user-specific data from API
    const fetchData = async () => {
      try {
        // const response = await fetch('/api/user'); // Example API endpoint
        // const data = await response.json();
        const data = {
          "user": {
            "name": "John Doe",
            "email": "johndoe@example.com",
            "lastLogin": "2025-01-01T12:34:56Z",
            "stats": {
              "totalActivities": 120,
              "completedTasks": 85,
              "activeSessions": 3
            }
          }
        }
        
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  if (!userData) {
    return <div className="dashboard-error">Failed to load user data. Please try again.</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Welcome, {userData.name}</h1>
   

      <button className="logout-button" onClick={() => handleLogout()}>Logout</button>
    </div>
  );

  function handleLogout() {
    // Add logout logic
    console.log('Logging out...');
    // Redirect to login or landing page after logout
    window.location.href = '/';
  }
}