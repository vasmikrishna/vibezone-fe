import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import AlternateEmail from '@mui/icons-material/AlternateEmail';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import MeetingRoomOutlined from '@mui/icons-material/MeetingRoomOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import Logout from '@mui/icons-material/Logout';
import { api, getToken, clearToken } from './api';
import { isIOS } from './Layout';
import BadgesDialog from './BadgesDialog';

// ponytail: Notifications, Billing, Plans/Upgrade and photo upload from Figma are skipped; those features don't exist.
export default function AccountSidebar() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    api('/me').then(setMe).catch(() => setMe(null));
  }, [token]);

  if (!token || !me) return null;

  const badges = me.badges || [];
  const earned = badges.filter((b) => b.earned).length;
  const contact = me.phone
    ? { Icon: PhoneOutlined, value: me.phone, label: 'Phone' }
    : me.email && { Icon: AlternateEmail, value: me.email, label: 'Email' };
  const details = [contact, { Icon: InfoOutlined, value: `${me.calls ?? 0} calls`, label: 'Video calls' }].filter(Boolean);
  const links = [
    !isIOS && { to: '/chat', label: 'Video chat', Icon: VideocamOutlined, id: 'video-chat' },
    { to: '/rooms', label: 'Rooms', Icon: MeetingRoomOutlined, id: 'rooms' },
    { to: '/profile', label: 'Profile', Icon: TuneOutlined, id: 'profile' },
    { to: '/privacy', label: 'Privacy and Security', Icon: LockOutlined, id: 'privacy' },
  ].filter(Boolean);

  const signOut = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="account-sidebar" aria-label="Your account" data-testid="account-sidebar">
      <div className="account-head">
        <span className="account-avatar" aria-hidden="true">{(me.name || '?').charAt(0).toUpperCase()}</span>
        <div className="account-who">
          <strong className="account-name" data-testid="sidebar-name">{me.name}</strong>
          <span className="account-muted" data-testid="sidebar-streak">🔥 {me.streak?.count ?? 0}-day streak</span>
        </div>
      </div>
      <ul className="account-details">
        {details.map(({ Icon, value, label }) => (
          <li key={label}>
            <Icon fontSize="small" aria-hidden="true" />
            <span>
              <span className="account-value">{value}</span>
              <span className="account-muted">{label}</span>
            </span>
          </li>
        ))}
      </ul>
      <nav aria-label="Account" className="account-nav">
        {links.map(({ to, label, Icon, id }) => (
          <NavLink key={to} to={to} data-testid={`sidebar-${id}`}>
            <Icon fontSize="small" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setBadgesOpen(true)} aria-label={`Badges, ${earned} earned`} data-testid="sidebar-badges">
          <EmojiEventsOutlined fontSize="small" aria-hidden="true" />
          Badges
          <span className="account-count" aria-hidden="true">{earned}</span>
        </button>
        <button type="button" onClick={signOut} data-testid="sidebar-sign-out">
          <Logout fontSize="small" aria-hidden="true" />
          Sign out
        </button>
      </nav>
      <BadgesDialog open={badgesOpen} onClose={() => setBadgesOpen(false)} badges={badges} />
    </aside>
  );
}
