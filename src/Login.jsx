import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import { Capacitor } from '@capacitor/core';
import { SiteLayout } from './Layout';
import { api, getToken, setToken } from './api';

const PHONE = /^\+[1-9]\d{7,14}$/; // E.164, as the server checks
const RESEND_SECONDS = 30;
const GOOGLE_CLIENT_ID = Capacitor.isNativePlatform() ? '' : import.meta.env.VITE_GOOGLE_CLIENT_ID;

let gsiScript;
// Loads Google Identity Services once per page.
function loadGoogle() {
  gsiScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      gsiScript = undefined;
      reject(new Error('Could not load Google sign-in.'));
    };
    document.head.appendChild(script);
  });
  return gsiScript;
}

function GoogleButton({ onCredential, onError }) {
  const ref = useRef(null);
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  useEffect(() => {
    let cancelled = false;
    loadGoogle()
      .then(() => {
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => handlers.current.onCredential(credential),
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill',
        });
      })
      .catch((err) => !cancelled && handlers.current.onError(err.message));
    return () => { cancelled = true; };
  }, []);

  return <div ref={ref} className="google-button" data-testid="login-google" />;
}

export default function Login() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('+91');
  const [number, setNumber] = useState('');
  const [terms, setTerms] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  if (getToken()) return <Navigate to="/rooms" replace />;

  const phone = `${country.trim()}${number.replace(/[\s-]/g, '')}`;

  const finish = (token, user) => {
    setToken(token);
    navigate(user.adult && user.name ? '/rooms' : '/profile', { replace: true });
  };

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!PHONE.test(phone)) return setError('Enter a valid phone number with its country code.');
    setBusy(true);
    setError('');
    try {
      await api('/auth/otp', { method: 'POST', body: { phone } });
      setSentTo(phone);
      setCode('');
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(err.status === 429 ? 'Too many codes requested. Try again later.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api('/auth/verify', { method: 'POST', body: { phone: sentTo, code } });
      finish(token, user);
    } catch (err) {
      setError(err.status === 401 ? 'That code is wrong or has expired.' : err.message);
      setBusy(false);
    }
  };

  const googleSignIn = async (credential) => {
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api('/auth/google', { method: 'POST', body: { credential } });
      finish(token, user);
    } catch (err) {
      setError(err.status === 503 ? 'Google sign-in is not available right now.' : err.message);
      setBusy(false);
    }
  };

  return (
    <SiteLayout title="Log in - Vibezone">
      <section className="section form-page">
        <h1>Log in</h1>
        {GOOGLE_CLIENT_ID && !sentTo && (
          <>
            <p className="google-terms">
              By continuing you confirm you are 18 or older and accept the{' '}
              <Link to="/terms" data-testid="login-google-terms-link">Terms</Link> and{' '}
              <Link to="/privacy" data-testid="login-google-privacy-link">Privacy Policy</Link>.
            </p>
            <GoogleButton onCredential={googleSignIn} onError={setError} />
            <p className="divider" role="separator"><span>or use your phone number</span></p>
          </>
        )}
        {!sentTo ? (
          <form className="form" onSubmit={sendCode} noValidate>
            <p>We send a 6 digit code to your phone. Your number is never shown to other people.</p>
            <div className="phone-row">
              <TextField
                label="Code"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                inputProps={{ inputMode: 'tel', maxLength: 4, 'data-testid': 'login-country' }}
                className="phone-country"
              />
              <TextField
                label="Phone number"
                type="tel"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                autoComplete="tel-national"
                inputProps={{ maxLength: 15, 'data-testid': 'login-phone' }}
                fullWidth
              />
            </div>
            <FormControlLabel
              control={<Checkbox checked={terms} onChange={(e) => setTerms(e.target.checked)} data-testid="login-terms" />}
              label={
                <span>
                  I am 18 or older and accept the <Link to="/terms" data-testid="login-terms-link">Terms</Link> and{' '}
                  <Link to="/privacy" data-testid="login-privacy-link">Privacy Policy</Link>
                </span>
              }
            />
            <Button type="submit" variant="contained" disableElevation disabled={!terms || !number || busy} data-testid="login-send">
              Send code
            </Button>
          </form>
        ) : (
          <form className="form" onSubmit={verify} noValidate>
            <p>Enter the code sent to {sentTo}.</p>
            <TextField
              label="6 digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
              inputProps={{ inputMode: 'numeric', 'data-testid': 'login-code' }}
              autoFocus
            />
            <Button type="submit" variant="contained" disableElevation disabled={code.length !== 6 || busy} data-testid="login-verify">
              Verify
            </Button>
            <div className="form-row">
              <Button onClick={() => sendCode()} disabled={wait > 0 || busy} data-testid="login-resend">
                {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
              </Button>
              <Button onClick={() => { setSentTo(''); setError(''); }} data-testid="login-change-number">
                Change number
              </Button>
            </div>
          </form>
        )}
        {error && <Alert severity="error" role="alert" data-testid="login-error">{error}</Alert>}
      </section>
    </SiteLayout>
  );
}
