import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import { Capacitor } from '@capacitor/core';
import { SiteLayout } from './Layout';
import { api, getToken, setToken, safeNext } from './api';

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
  const next = safeNext(useSearchParams()[0].get('next'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (getToken()) return <Navigate to={next} replace />;

  const finish = (token, user) => {
    setToken(token);
    navigate(user.adult && user.name ? next : '/profile', { replace: true });
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
      <section className="section form-page" aria-busy={busy}>
        <h1>Log in</h1>
        {GOOGLE_CLIENT_ID ? (
          <>
            <p className="google-terms">
              By continuing you confirm you are 18 or older and accept the{' '}
              <Link to="/terms" data-testid="login-google-terms-link">Terms</Link> and{' '}
              <Link to="/privacy" data-testid="login-google-privacy-link">Privacy Policy</Link>.
            </p>
            <GoogleButton onCredential={googleSignIn} onError={setError} />
          </>
        ) : (
          <Alert severity="info" data-testid="login-unavailable">Sign-in is not available here yet.</Alert>
        )}
        {error && <Alert severity="error" role="alert" data-testid="login-error">{error}</Alert>}
      </section>
    </SiteLayout>
  );
}
