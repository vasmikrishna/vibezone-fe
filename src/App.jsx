import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import VideoPage from './VideoPage';
import Consent from './Consent';
import { Terms, Privacy } from './Legal';
import Home from './Home';
import About from './About';
import Contact from './Contact';
import { usePageTitle } from './usePageTitle';

const CONSENT_VERSION = 1;

function Chat() {
  usePageTitle('Start chatting - Vibezone');
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
        <Route path="/" element={Capacitor.isNativePlatform() ? <Navigate to="/chat" replace /> : <Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
