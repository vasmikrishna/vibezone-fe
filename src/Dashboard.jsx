import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { ApiError } from './admin/common';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import MeetingRoomOutlined from '@mui/icons-material/MeetingRoomOutlined';
import { AppPage, useApp } from './AppLayout';
import { BadgeIcon } from './BadgesDialog';
import { isIOS } from './Layout';
import { api, formatDate } from './api';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Dashboard() {
  const { me, openBadges } = useApp();
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setFriends(null);
    api('/rooms')
      .then((list) => setRooms(list.filter((r) => r.booked || r.isHost).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))))
      .catch(setError);
    api('/friends')
      .then((d) => setFriends({ count: d.friends.length, incoming: d.incoming.length }))
      .catch(() => setFriends({ error: true }));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const badges = me?.badges || [];
  const earned = badges.filter((b) => b.earned).length;
  const stats = [
    ['Current streak', `${me?.streak?.count ?? 0} days`, 'stat-streak'],
    ['Best streak', `${me?.streak?.best ?? 0} days`, 'stat-best'],
    ['Video calls', String(me?.calls ?? 0), 'stat-calls'],
    ['Badges earned', `${earned}/${badges.length}`, 'stat-badges'],
  ];

  return (
    <AppPage title="Dashboard">
      <h2 className="dash-greeting" data-testid="dash-greeting">
        {greeting()}{me?.name ? `, ${me.name}` : ''}
      </h2>
      {me && !me.adult && (
        <Alert
          severity="info"
          className="dash-banner"
          action={<Button component={Link} to="/profile" size="small" data-testid="dash-add-dob">Add now</Button>}
          data-testid="dash-adult-needed"
        >
          Add your date of birth to book rooms.
        </Alert>
      )}
      <dl className="dash-stats">
        {stats.map(([label, value, id]) => (
          <div key={id} className="app-card dash-stat" data-testid={id}>
            <dt>{label}</dt>
            <dd>{me ? value : '–'}</dd>
          </div>
        ))}
      </dl>

      <div className="dash-grid">
        <section className="app-card dash-hero" aria-labelledby="dash-start-title">
          {isIOS ? <MeetingRoomOutlined className="dash-hero-icon" aria-hidden="true" /> : <VideocamOutlined className="dash-hero-icon" aria-hidden="true" />}
          <h2 id="dash-start-title">{isIOS ? 'Join a private room' : 'Start a video chat'}</h2>
          <p>{isIOS ? 'Book a seat with a host and talk one-to-one.' : 'Meet another adult who is online right now, face to face.'}</p>
          <Button
            component={Link}
            to={isIOS ? '/rooms' : '/chat'}
            variant="contained"
            size="large"
            disableElevation
            data-testid="dash-start"
          >
            {isIOS ? 'Browse rooms' : 'Start chatting'}
          </Button>
        </section>

        <section className="app-card" aria-labelledby="dash-rooms-title">
          <div className="app-card-head">
            <h2 id="dash-rooms-title">Your upcoming rooms</h2>
            <Button component={Link} to="/rooms" size="small" data-testid="dash-all-rooms">All rooms</Button>
          </div>
          <ApiError error={error} onRetry={load} />
          {rooms && rooms.length === 0 && (
            <div className="dash-empty" data-testid="dash-rooms-empty">
              <p>You have not booked or created any rooms yet.</p>
              <Button component={Link} to="/rooms" variant="outlined" data-testid="dash-browse-rooms">Browse rooms</Button>
            </div>
          )}
          {rooms?.length > 0 && (
            <ul className="dash-rooms">
              {rooms.map((r) => (
                <li key={r.id}>
                  <Link to={`/rooms/${r.id}`} data-testid="dash-room">
                    <strong>{r.name}</strong>
                    <span>{formatDate(r.startsAt)} · {r.isHost ? 'You host' : 'Booked'}{r.status === 'live' ? ' · Live' : ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dash-grid">
      <section className="app-card" aria-labelledby="dash-friends-title">
        <div className="app-card-head">
          <h2 id="dash-friends-title">Friends</h2>
          <Button component={Link} to="/friends" size="small" data-testid="dash-all-friends">All friends</Button>
        </div>
        {friends?.error ? (
          <p role="alert">
            Could not load your friends. <Button size="small" onClick={load} data-testid="dash-friends-retry">Retry</Button>
          </p>
        ) : (
          <>
            <dl className="dash-friends">
              <div data-testid="dash-friends-count">
                <dt>Friends</dt>
                <dd>{friends ? friends.count : '–'}</dd>
              </div>
              <div data-testid="dash-friends-incoming">
                <dt>Pending requests</dt>
                <dd>{friends ? friends.incoming : '–'}</dd>
              </div>
            </dl>
            {friends?.incoming > 0 ? (
              <Button component={Link} to="/friends?tab=requests" variant="contained" disableElevation className="dash-review" data-testid="dash-friends-review">
                Review requests
              </Button>
            ) : (
              <p className="dash-tip">Add friends from a video call when you&apos;re both signed in.</p>
            )}
          </>
        )}
      </section>

      <section className="app-card" aria-labelledby="dash-badges-title">
        <div className="app-card-head">
          <h2 id="dash-badges-title">Badges</h2>
        </div>
        <button type="button" className="dash-badges" onClick={openBadges} aria-label={`Badges, ${earned} of ${badges.length} earned. Show all`} data-testid="dash-badges">
          {badges.map((b) => (
            <span key={b.id} className={b.earned ? 'dash-badge' : 'dash-badge locked'}>
              <BadgeIcon id={b.id} />
            </span>
          ))}
          {badges.length === 0 && <span>No badges yet</span>}
        </button>
        <p className="dash-tip">🔥 Have a video call of at least a minute every day to keep your streak going.</p>
      </section>
      </div>
    </AppPage>
  );
}
