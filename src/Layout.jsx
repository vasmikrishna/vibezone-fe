import { usePageTitle } from './usePageTitle';
import { Link, NavLink } from 'react-router-dom';
import Button from '@mui/material/Button';
import { Capacitor } from '@capacitor/core';
import logo from './assets/vibezone-logo.svg';
import './site.css';

// The iOS app offers rooms only; random chat stays on Android and the web.
export const isIOS = Capacitor.getPlatform() === 'ios';

export function StartButton({ testid = 'start-chatting', size = 'medium' }) {
  return (
    <Button component={Link} to={isIOS ? '/rooms' : '/chat'} variant="contained" size={size} disableElevation data-testid={testid}>
      {isIOS ? 'Browse rooms' : 'Start chatting'}
    </Button>
  );
}

export function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="site-logo" data-testid="nav-logo" aria-label="Vibezone home">
        <img src={logo} alt="" height="32" />
      </Link>
      <nav aria-label="Main" className="site-nav">
        <NavLink to="/" end data-testid="nav-home">Home</NavLink>
        <NavLink to="/about" data-testid="nav-about">About</NavLink>
        <NavLink to="/contact" data-testid="nav-contact">Contact</NavLink>
        <NavLink to="/rooms" data-testid="nav-rooms">Rooms</NavLink>
      </nav>
      <StartButton testid="nav-start" />
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

export function SiteLayout({ title, children }) {
  usePageTitle(title);
  return (
    <div className="site">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
