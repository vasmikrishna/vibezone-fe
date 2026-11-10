import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { AppPage, useApp } from './AppLayout';
import { BadgeIcon } from './BadgesDialog';
import { api, clearToken } from './api';
import { Loading } from './admin/common';

const today = () => new Date().toISOString().slice(0, 10);

/** Decodes an image file; createImageBitmap where supported, else an <img> from an object URL. */
const decodeImage = (file) =>
  window.createImageBitmap
    ? createImageBitmap(file)
    : new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
        img.src = url;
      });

/** Centre-crops (cover) the image onto a 192x192 canvas and returns a JPEG data URL. */
async function toAvatar(file) {
  const img = await decodeImage(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 192;
  canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 192, 192);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export default function Profile() {
  const navigate = useNavigate();
  const { me: user, setMe: setUser, openBadges } = useApp();
  const [editedName, setName] = useState(null);
  const name = editedName ?? user?.name ?? '';
  const [editedBio, setBio] = useState(null);
  const bio = editedBio ?? user?.bio ?? '';
  const [photo, setPhoto] = useState(undefined); // undefined = unchanged, null = remove, string = new
  const shownPhoto = photo === undefined ? user?.photo : photo;
  const fileInput = useRef(null);
  const [dob, setDob] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const body = { name: name.trim(), bio: bio.trim(), ...(photo !== undefined && { photo }) };
      if (!user.adult && dob) body.dob = dob;
      const me = await api('/me', { method: 'PATCH', body });
      setUser(me);
      setPhoto(undefined);
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

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same file again fires onChange
    if (!file) return;
    try {
      setPhoto(await toAvatar(file));
      setError('');
    } catch {
      setError('Could not read that image.');
    }
  };

  const signOut = () => {
    clearToken();
    setUser(null);
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
    <AppPage title="Profile & settings">
      <section className="form-page profile-page">
        {user === undefined && <Loading label="Loading profile" />}
        {user && (
          <form className="form" onSubmit={save} noValidate>
            <div className="profile-photo-row">
              <span className="profile-photo app-avatar">
                {shownPhoto
                  ? <img className="app-avatar-img" src={shownPhoto} alt="Your profile photo" data-testid="profile-photo" />
                  : (name || '?').charAt(0).toUpperCase()}
              </span>
              <Button variant="outlined" onClick={() => fileInput.current?.click()} data-testid="profile-photo-change">Change photo</Button>
              {shownPhoto && <Button color="error" onClick={() => setPhoto(null)} data-testid="profile-photo-remove">Remove</Button>}
              <input ref={fileInput} type="file" accept="image/*" className="visually-hidden" tabIndex={-1} aria-hidden="true" onChange={pickPhoto} data-testid="profile-photo-input" />
            </div>
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
              <Button onClick={openBadges} data-testid="profile-badges">See all badges</Button>
            </section>
            <TextField
              label="Name shown to others"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              inputProps={{ maxLength: 30, 'data-testid': 'profile-name' }}
            />
            <TextField
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              multiline
              minRows={2}
              helperText={`${bio.length}/160`}
              inputProps={{ maxLength: 160, 'data-testid': 'profile-bio' }}
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
    </AppPage>
  );
}
