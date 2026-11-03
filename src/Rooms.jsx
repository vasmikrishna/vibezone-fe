import { useCallback, useEffect, useState } from 'react';
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
import { api, getToken, formatDate } from './api';

const EARLY_MS = 10 * 60 * 1000; // rooms open 10 minutes before they start
const EMPTY = { name: '', description: '', startsAt: '', durationMin: '60', interactionMin: '10', tickets: '10' };

function validate(form) {
  const name = form.name.trim();
  const int = (v, min, max) => Number.isInteger(Number(v)) && v !== '' && Number(v) >= min && Number(v) <= max;
  if (name.length < 3 || name.length > 60) return 'Room name must be 3 to 60 characters.';
  if (form.description.length > 1000) return 'Description can be up to 1000 characters.';
  if (!form.startsAt || !(new Date(form.startsAt).getTime() > Date.now())) return 'Pick a start date and time in the future.';
  if (!int(form.durationMin, 15, 180)) return 'Duration must be 15 to 180 minutes.';
  if (!int(form.interactionMin, 1, 30)) return 'Time per person must be 1 to 30 minutes.';
  if (!int(form.tickets, 1, 50)) return 'Tickets must be 1 to 50.';
  return '';
}

function CreateRoomDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const submit = async (e) => {
    e.preventDefault();
    const invalid = validate(form);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError('');
    try {
      await api('/rooms', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          description: form.description.trim(),
          startsAt: new Date(form.startsAt).toISOString(),
          durationMin: Number(form.durationMin),
          interactionMin: Number(form.interactionMin),
          tickets: Number(form.tickets),
        },
      });
      setForm(EMPTY);
      onCreated();
    } catch (err) {
      setError(err.status === 403 ? 'Add your date of birth in your profile first. Rooms are for adults only.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="create-title" fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle id="create-title">Create a room</DialogTitle>
        <DialogContent>
          <div className="create-grid">
            <TextField label="Room name" required {...field('name')} inputProps={{ maxLength: 60, 'data-testid': 'create-name' }} />
            <TextField
              label="Date and time"
              type="datetime-local"
              required
              {...field('startsAt')}
              InputLabelProps={{ shrink: true }}
              inputProps={{ 'data-testid': 'create-starts' }}
            />
            <TextField
              label="Room duration (minutes)"
              type="number"
              {...field('durationMin')}
              inputProps={{ min: 15, max: 180, 'data-testid': 'create-duration' }}
            />
            <TextField
              label="Time per person (minutes)"
              type="number"
              {...field('interactionMin')}
              inputProps={{ min: 1, max: 30, 'data-testid': 'create-interaction' }}
            />
            <TextField
              label="Number of tickets"
              type="number"
              {...field('tickets')}
              inputProps={{ min: 1, max: 50, 'data-testid': 'create-tickets' }}
            />
            <TextField
              label="Room description"
              multiline
              minRows={2}
              {...field('description')}
              className="create-wide"
              inputProps={{ maxLength: 1000, 'data-testid': 'create-description' }}
            />
          </div>
          {error && <Alert severity="error" role="alert" data-testid="create-error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} data-testid="create-cancel">Cancel</Button>
          <Button type="submit" variant="contained" disableElevation disabled={busy} data-testid="create-submit">Create</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function Rooms() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [now, setNow] = useState(Date.now());
  const token = getToken();

  const fail = useCallback(
    (err) => (err.status === 401 ? navigate('/login', { replace: true }) : setError(err.message)),
    [navigate]
  );
  const load = useCallback(() => api('/rooms').then(setRooms).catch(fail), [fail]);

  useEffect(() => {
    if (!token) return undefined;
    api('/me').then(setUser).catch(fail);
    load();
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [token, load, fail]);

  if (!token) return <Navigate to="/login" replace />;

  const act = async (path, method) => {
    setError('');
    try {
      await api(path, { method });
    } catch (err) {
      if (err.status === 403 && err.message === 'adults only') return setError('Add your date of birth in your profile before booking.');
      fail(err);
    }
    load();
  };

  const adult = Boolean(user?.adult);

  return (
    <SiteLayout title="Rooms - Vibezone" account>
      <section className="section">
        <div className="rooms-head">
          <h1>Private rooms</h1>
          <div className="form-row">
            <Button component={Link} to="/profile" data-testid="rooms-profile">Profile</Button>
            <Button variant="contained" disableElevation disabled={!adult} onClick={() => setCreating(true)} data-testid="rooms-create">
              Create room
            </Button>
          </div>
        </div>
        <p>
          A host talks one-to-one with each ticket holder in turn. Rooms open 10 minutes before they start.
        </p>
        {user && !adult && (
          <Alert severity="info" data-testid="rooms-adult-needed">
            Add your name and date of birth in your <Link to="/profile">profile</Link> to book or create rooms. You must be 18 or older.
          </Alert>
        )}
        {error && <Alert severity="error" role="alert" data-testid="rooms-error">{error}</Alert>}
        {rooms && rooms.length === 0 && <p data-testid="rooms-empty">No upcoming rooms yet.</p>}
        <ul className="room-list">
          {rooms?.map((room) => {
            const open = now >= new Date(room.startsAt).getTime() - EARLY_MS;
            return (
              <li key={room.id} className="card room-card" data-testid="room-card">
                <h2 className="room-name">{room.name}</h2>
                <p className="room-meta">
                  Hosted by {room.hostName || 'Host'} · {formatDate(room.startsAt)}
                  {room.status === 'live' && <strong className="room-live"> · Live</strong>}
                </p>
                <p className="room-meta">
                  {room.durationMin} min · {room.interactionMin} min per person ·{' '}
                  <span data-testid="room-tickets-left">{room.ticketsLeft} of {room.tickets} tickets left</span>
                </p>
                {room.description && <p className="room-description">{room.description}</p>}
                <div className="form-row">
                  {(room.isHost || room.booked) && (
                    <Button
                      component={Link}
                      to={`/rooms/${room.id}`}
                      variant="contained"
                      disableElevation
                      disabled={!open}
                      data-testid="room-join"
                    >
                      {open ? 'Join' : 'Opens 10 min before start'}
                    </Button>
                  )}
                  {room.isHost ? (
                    <Button color="error" onClick={() => setCancelling(room)} data-testid="room-cancel-room">Cancel room</Button>
                  ) : room.booked ? (
                    <Button color="error" onClick={() => act(`/rooms/${room.id}/book`, 'DELETE')} data-testid="room-cancel">
                      Cancel booking
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      disabled={!adult || room.ticketsLeft <= 0}
                      onClick={() => act(`/rooms/${room.id}/book`, 'POST')}
                      data-testid="room-book"
                    >
                      {room.ticketsLeft <= 0 ? 'Sold out' : 'Book'}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <CreateRoomDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />

      <Dialog open={Boolean(cancelling)} onClose={() => setCancelling(null)} aria-labelledby="cancel-title" aria-describedby="cancel-text">
        <DialogTitle id="cancel-title">Cancel this room?</DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-text">
            {cancelling?.name} will be removed and everyone who booked loses their ticket.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelling(null)} data-testid="cancel-room-keep">Keep room</Button>
          <Button
            variant="contained"
            color="error"
            disableElevation
            onClick={() => {
              act(`/rooms/${cancelling.id}`, 'DELETE');
              setCancelling(null);
            }}
            data-testid="cancel-room-confirm"
          >
            Cancel room
          </Button>
        </DialogActions>
      </Dialog>
    </SiteLayout>
  );
}
