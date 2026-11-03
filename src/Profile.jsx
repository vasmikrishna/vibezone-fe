import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { SiteLayout } from './Layout';
import BadgesDialog, { BadgeIcon } from './BadgesDialog';
import { api, getToken, clearToken } from './api';

const today = () => new Date().toISOString().slice(0, 10);

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    api('/me')
      .then((me) => {
        setUser(me);
        setName(me.name);
      })
      .catch((err) => (err.status === 401 ? navigate('/login', { replace: true }) : setError(err.message)));
  }, [token, navigate]);

  if (!token) return <Navigate to="/login" replace />;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const body = { name: name.trim() };
      if (!user.adult && dob) body.dob = dob;
      const me = await api('/me', { method: 'PATCH', body });
      setUser(me);
      setSaved(true);
    } catch (err) {
      if (err.status === 401) return navigate('/login', { replace: true });
      setError(
        err.status === 403
          ? 'You must be 18 or older to book or create rooms.'
          : err.status === 409
            ? 'Your date of birth is already set and cannot be changed.'
            : err.message
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await api('/me', { method: 'DELETE' });
      signOut();
    } catch (err) {
      setConfirmDelete(false);
      setBusy(false);
      if (err.status === 401) return navigate('/login', { replace: true });
      setError(err.message);
    }
  };

  return (
    <SiteLayout title="Profile - Vibezone" account>
      <section className="section form-page">
        <h1>Your profile</h1>
        {user && (
          <form className="form" onSubmit={save} noValidate>
            {user.phone ? (
              <p data-testid="profile-phone">Phone: {user.phone}</p>
            ) : (
              user.email && <p data-testid="profile-email">Email: {user.email}</p>
            )}
            <section className="streak-card" aria-labelledby="streak-title" data-testid="profile-streak">
              <h2 id="streak-title">🔥 Your streak</h2>
              <dl>
                <div><dt>Current</dt><dd data-testid="profile-streak-count">{user.streak?.count ?? 0} days</dd></div>
                <div><dt>Best</dt><dd data-testid="profile-streak-best">{user.streak?.best ?? 0} days</dd></div>
              </dl>
              <p>Have a video call of at least a minute every day to keep your streak.</p>
            </section>
            <section className="badges-row" aria-labelledby="badges-row-title">
              <h2 id="badges-row-title">Your badges</h2>
              <div className="badges-earned" data-testid="profile-badges-earned">
                {user.badges?.some((b) => b.earned)
                  ? user.badges.filter((b) => b.earned).map((b) => <BadgeIcon key={b.id} id={b.id} title={b.name} />)
                  : <p>No badges yet</p>}
              </div>
              <Button onClick={() => setBadgesOpen(true)} data-testid="profile-badges">See all badges</Button>
            </section>
            <TextField
              label="Name shown to others"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              inputProps={{ maxLength: 30, 'data-testid': 'profile-name' }}
            />
            {user.adult ? (
              <p data-testid="profile-adult">Date of birth confirmed: you can book and create rooms.</p>
            ) : (
              <TextField
                label="Date of birth"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                helperText="Needed before you book or create a room. You must be 18 or older, and it cannot be changed later."
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: today(), 'data-testid': 'profile-dob' }}
              />
            )}
            <Button type="submit" variant="contained" disableElevation disabled={busy || !name.trim()} data-testid="profile-save">
              Save
            </Button>
            {saved && <Alert severity="success" data-testid="profile-saved">Saved.</Alert>}
            {user.adult && (
              <Button component={Link} to="/rooms" variant="outlined" data-testid="profile-rooms">Go to rooms</Button>
            )}
          </form>
        )}
        {error && <Alert severity="error" role="alert" data-testid="profile-error">{error}</Alert>}
        <div className="form-row">
          <Button onClick={signOut} data-testid="profile-sign-out">Sign out</Button>
          <Button color="error" onClick={() => setConfirmDelete(true)} disabled={!user} data-testid="profile-delete">
            Delete account
          </Button>
        </div>
      </section>

      <BadgesDialog open={badgesOpen} onClose={() => setBadgesOpen(false)} badges={user?.badges} />
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} aria-labelledby="delete-title" aria-describedby="delete-text">
        <DialogTitle id="delete-title">Delete your account?</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-text">
            This deletes your account and your bookings, and cancels any rooms you host. It cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} data-testid="delete-cancel">Keep account</Button>
          <Button variant="contained" color="error" disableElevation disabled={busy} onClick={deleteAccount} data-testid="delete-confirm">
            Delete account
          </Button>
        </DialogActions>
      </Dialog>
    </SiteLayout>
  );
}
