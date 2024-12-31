import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import VideoPage from './VideoPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VideoPage />} />
        {/* Redirect all undefined routes to `/` */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
