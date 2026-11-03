import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import logo from './assets/vibezone-logo.svg';

export default function Consent({ onAccept }) {
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);

  return (
    <main className="page consent">
      <img src={logo} className="logo" alt="Vibezone" />
      <h1>Welcome to Vibezone</h1>
      <p>
        Vibezone connects you with a random stranger for a live 1-to-1 video call.
        It is for adults only.
      </p>
      <FormControlLabel
        control={
          <Checkbox checked={adult} onChange={(e) => setAdult(e.target.checked)} data-testid="consent-age" />
        }
        label="I am 18 or older"
      />
      <FormControlLabel
        control={
          <Checkbox checked={terms} onChange={(e) => setTerms(e.target.checked)} data-testid="consent-terms" />
        }
        label={
          <span>
            I accept the <Link to="/terms" data-testid="consent-terms-link">Terms</Link> and{' '}
            <Link to="/privacy" data-testid="consent-privacy-link">Privacy Policy</Link>
          </span>
        }
      />
      <Button variant="contained" disabled={!adult || !terms} onClick={onAccept} data-testid="consent-continue">
        Continue
      </Button>
    </main>
  );
}
