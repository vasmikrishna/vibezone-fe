import { useEffect, useState } from 'react';
import { usePageTitle } from './usePageTitle';
import { Link, NavLink } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Capacitor } from '@capacitor/core';
import { api, getToken } from './api';
import logo from './assets/vibezone-logo.svg';
import './site.css';

// The iOS app offers rooms only; random chat stays on Android and the web.
export const isIOS = Capacitor.getPlatform() === 'ios';

export function StartButton({ testid = 'start-chatting', size = 'medium', onClick }) {
  return (
    <Button component={Link} to={isIOS ? '/rooms' : '/chat'} variant="contained" size={size} disableElevation onClick={onClick} data-testid={testid}>
      {isIOS ? 'Browse rooms' : 'Start chatting'}
    </Button>
  );
}

const LINKS = [['/', 'Home', 'home'], ['/about', 'About', 'about'], ['/contact', 'Contact', 'contact'], ['/rooms', 'Rooms', 'rooms']];

/** Log in + Start chatting, or Open app + avatar when signed in. */
function HeaderActions({ name, signedIn, onClick, suffix = '' }) {
  return signedIn ? (
    <>
      <Button component={Link} to="/dashboard" variant="contained" disableElevation onClick={onClick} data-testid={`nav-open-app${suffix}`}>
        Open app
      </Button>
      <Link to="/profile" className="site-avatar" onClick={onClick} aria-label="Your profile" data-testid={`nav-avatar${suffix}`}>
        {(name || '?').charAt(0).toUpperCase()}
      </Link>
    </>
  ) : (
    <>
      <Link to="/login" className="site-login" onClick={onClick} data-testid={`nav-login${suffix}`}>Log in</Link>
      <StartButton testid={`nav-start${suffix}`} onClick={onClick} />
    </>
  );
}

export function Header() {
  const signedIn = Boolean(getToken());
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    api('/me').then((me) => setName(me?.name || '')).catch(() => {});
  }, [signedIn]);

  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <Link to="/" className="site-logo" data-testid="nav-logo" aria-label="Vibezone home">
        <img src={logo} alt="" height="32" />
      </Link>
      <nav aria-label="Main" className="site-nav">
        {LINKS.map(([to, label, id]) => (
          <NavLink key={id} to={to} end={to === '/'} data-testid={`nav-${id}`}>{label}</NavLink>
        ))}
      </nav>
      <div className="site-actions">
        <HeaderActions name={name} signedIn={signedIn} />
      </div>
      <IconButton className="site-hamburger" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} data-testid="nav-menu">
        <MenuIcon />
      </IconButton>
      <Drawer anchor="right" open={open} onClose={close} PaperProps={{ className: 'site-drawer' }} data-testid="nav-drawer">
        <IconButton className="site-drawer-close" onClick={close} aria-label="Close menu" data-testid="nav-drawer-close">
          <CloseIcon />
        </IconButton>
        <nav aria-label="Main menu" className="site-drawer-nav">
          {LINKS.map(([to, label, id]) => (
            <NavLink key={id} to={to} end={to === '/'} onClick={close} data-testid={`drawer-${id}`}>{label}</NavLink>
          ))}
        </nav>
        <div className="site-drawer-actions">
          <HeaderActions name={name} signedIn={signedIn} onClick={close} suffix="-drawer" />
        </div>
      </Drawer>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <nav aria-label="Footer">
        <Link to="/about" data-testid="footer-about">About</Link>
        <Link to="/contact" data-testid="footer-contact">Contact</Link>
        <Link to="/terms" data-testid="footer-terms">Terms</Link>
        <Link to="/privacy" data-testid="footer-privacy">Privacy</Link>
      </nav>
      <p>Vibezone is for adults aged 18 and over.</p>
    </footer>
  );
}

export function SiteLayout({ title, dark = false, children }) {
  usePageTitle(title);
  return (
    <div className={dark ? 'site site-dark' : 'site'}>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
