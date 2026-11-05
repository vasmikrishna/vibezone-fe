import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import ShuffleOutlined from '@mui/icons-material/ShuffleOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import FiberManualRecordOutlined from '@mui/icons-material/FiberManualRecordOutlined';

export default function Consent({ onAccept }) {
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);

  return (
    <section className="app-card consent" aria-labelledby="consent-title" data-testid="consent">
      <div className="settings-head">
        <span className="settings-head-icon"><VideocamOutlined /></span>
        <div>
          <h2 id="consent-title">Before your first call</h2>
          <p className="hint">Live 1-to-1 video with a random stranger. Adults only.</p>
        </div>
      </div>
      <ul className="consent-list">
        <li>
          <span className="pref-icon"><ShuffleOutlined /></span>
          <span><strong>Random match</strong><small>Press Start and you are paired with whoever is online. Skip any time.</small></span>
        </li>
        <li>
          <span className="pref-icon"><ShieldOutlined /></span>
          <span><strong>Stay safe</strong><small>Block or report anyone with one tap. Be kind and keep it legal.</small></span>
        </li>
        <li>
          <span className="pref-icon"><FiberManualRecordOutlined /></span>
          <span><strong>Calls can be recorded</strong><small>Either person can record a call. Signed-in users are told when the other person records here; the file stays on that person’s device.</small></span>
        </li>
      </ul>
      <div className="consent-checks">
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
      </div>
      <Button
        variant="contained"
        fullWidth
        disableElevation
        size="large"
        disabled={!adult || !terms}
        onClick={onAccept}
        data-testid="consent-continue"
      >
        Continue
      </Button>
    </section>
  );
}
