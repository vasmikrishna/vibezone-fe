import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import VideoPage from './VideoPage';
import Consent from './Consent';
import { Terms, Privacy } from './Legal';

const CONSENT_VERSION = 1;

function Home() {
  const [consented, setConsented] = useState(
    Number(localStorage.getItem('vibezoneConsent')) === CONSENT_VERSION
  );
  const accept = () => {
    localStorage.setItem('vibezoneConsent', String(CONSENT_VERSION));
    setConsented(true);
  };
  return consented ? <VideoPage /> : <Consent onAccept={accept} />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
