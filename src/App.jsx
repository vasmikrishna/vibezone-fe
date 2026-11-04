import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import VideoPage from './VideoPage';
import Consent from './Consent';
import { Terms, Privacy } from './Legal';
import Home from './Home';
import About from './About';
import Contact from './Contact';
import Login from './Login';
import Profile from './Profile';
import Rooms from './Rooms';
import RoomPage from './RoomPage';
import Dashboard from './Dashboard';
import Friends from './Friends';
import AppLayout, { AppPage, RequireAuth } from './AppLayout';
import AdminOverview from './admin/Overview';
import AdminReports from './admin/Reports';
import AdminUsers from './admin/Users';
import AdminBans from './admin/Bans';
import AdminRooms from './admin/Rooms';
import { isIOS } from './Layout';
import { Capacitor } from '@capacitor/core';

const CONSENT_VERSION = 2;

function Chat() {
  const [consented, setConsented] = useState(
    Number(localStorage.getItem('vibezoneConsent')) === CONSENT_VERSION
  );
  const accept = () => {
    localStorage.setItem('vibezoneConsent', String(CONSENT_VERSION));
    setConsented(true);
  };
  return consented ? <VideoPage /> : <AppPage title="Video chat"><Consent onAccept={accept} /></AppPage>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={isIOS ? <Navigate to="/rooms" replace /> : Capacitor.isNativePlatform() ? <Navigate to="/chat" replace /> : <Home />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/chat" element={isIOS ? <Navigate to="/rooms" replace /> : <Chat />} />
          <Route path="/rooms" element={<RequireAuth><Rooms /></RequireAuth>} />
          <Route path="/rooms/:id" element={<RequireAuth><RoomPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/friends" element={<RequireAuth><Friends /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><Outlet /></RequireAuth>}>
            <Route index element={<AdminOverview />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="bans" element={<AdminBans />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
