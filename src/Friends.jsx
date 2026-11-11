import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Search from '@mui/icons-material/Search';
import { AppPage, useApp } from './AppLayout';
import { ApiError, ConfirmDialog, Loading, When, relTime, useNotify } from './admin/common';
import { isIOS } from './Layout';
import { api } from './api';
import FriendThread, { Avatar, NotFriends } from './FriendThread';
import { InviteButton } from './InviteCard';

const TABS = [
  ['friends', 'Friends'],
  ['requests', 'Requests'],
  ['sent', 'Sent'],
];
const HOW_TO = "Add friends from a video call — when you're both signed in, tap Add friend. Or invite someone with your link and you're friends as soon as they join.";
const EMPTY = {
  friends: 'No friends yet.',
  requests: 'No friend requests right now.',
  sent: 'You have no pending requests.',
};
const TYPING_MS = 4000;

const displayName = (name) => name || 'Vibezone user';
/** "Online · in a call", "Last seen 2 hours ago", plus the streak. */
const statusLine = (f) => [
  f.online ? `Online${f.inCall ? ' · in a call' : ''}` : f.lastSeen ? `Last seen ${relTime(f.lastSeen)}` : 'Offline',
  f.streak?.count && `🔥 ${f.streak.count}-day streak`,
].filter(Boolean).join(' · ');

/** Time of day for today's messages, else a short date. */
const shortWhen = (iso) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { timeStyle: 'short' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function Person({ name, testid, children, actions }) {
  return (
    <li className="app-card friend-card" data-testid={testid}>
      <span className="app-avatar" aria-hidden="true">{displayName(name).charAt(0).toUpperCase()}</span>
      <div className="friend-text">
        <strong data-testid="friend-name">{displayName(name)}</strong>
        <span>{children}</span>
      </div>
      <div className="friend-actions">{actions}</div>
    </li>
  );
}

function FriendRow({ friend: f, typing, selected }) {
  const line = typing ? 'typing…' : f.last ? `${f.last.mine ? 'You: ' : ''}${f.last.text}` : statusLine(f);
  const tone = typing ? ' accent' : !f.last && f.online ? ' online' : '';
  return (
    <li>
      <Link to={`/friends/${f.id}`} className="friend-row" aria-current={selected ? 'page' : undefined} data-testid="friend-card">
        <Avatar name={displayName(f.name)} photo={f.photo} online={f.online} />
        <span className="friend-text">
          <strong data-testid="friend-name">{displayName(f.name)}</strong>
          <span className={`friend-line${tone}`} data-testid="friend-line">{line}</span>
        </span>
        {(f.last || f.unread > 0) && (
          <span className="friend-meta">
            {f.last && <time dateTime={f.last.at}>{shortWhen(f.last.at)}</time>}
            {f.unread > 0 && (
              <span className="friend-unread" aria-label={`${f.unread} unread message${f.unread === 1 ? '' : 's'}`} data-testid="friend-unread">{f.unread}</span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}

export default function Friends() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([v]) => v === params.get('tab')) ? params.get('tab') : 'friends';
  const { refreshFriends, subscribe, sendTyping } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState({});
  const typingTimers = useRef({});
  const [notify, snack] = useNotify();

  const load = useCallback(
    () => api('/friends').then((d) => { setData(d); setError(null); }).catch(setError),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  const setTypingFor = useCallback((from, on) => {
    clearTimeout(typingTimers.current[from]);
    if (on) typingTimers.current[from] = setTimeout(() => setTypingFor(from, false), TYPING_MS);
    setTyping((t) => ({ ...t, [from]: on }));
  }, []);
  useEffect(() => () => Object.values(typingTimers.current).forEach(clearTimeout), []);

  // Live list: new message moves the friend to the top with its preview; read clears my unread; presence moves the dot.
  useEffect(() => subscribe((e) => {
    const mapFriends = (fn) => setData((d) => d && { ...d, friends: d.friends.map(fn) });
    if (e.type === 'reconnect') load();
    else if (e.type === 'typing') setTypingFor(e.from, true);
    else if (e.type === 'presence') mapFriends((f) => (f.id === e.userId ? { ...f, online: e.online, lastSeen: e.lastSeen, inCall: e.online && f.inCall } : f));
    else if (e.type === 'read') mapFriends((f) => (f.id === e.peer ? { ...f, unread: 0 } : f)); // peer is the friend only when I am the reader
    else if (e.type === 'message') {
      const m = e.message;
      setTypingFor(m.from, false);
      setData((d) => {
        const f = d?.friends.find((x) => x.id === m.from || x.id === m.to);
        if (!f) return d;
        const mine = m.to === f.id;
        const next = { ...f, last: { text: m.text, mine, at: m.at }, unread: f.unread + (mine ? 0 : 1) };
        return { ...d, friends: [next, ...d.friends.filter((x) => x !== f)] };
      });
    }
  }), [subscribe, load, setTypingFor]);

  /** Applies `change` at once, then calls the API; on failure rolls back and shows the error. */
  const act = async (change, path, method, done) => {
    const before = data;
    setData(change(data));
    try {
      await api(path, { method });
      notify(done);
      refreshFriends();
    } catch (err) {
      setData(before);
      notify(err.message, 'error');
      load();
    }
  };
  const without = (key, test) => (d) => ({ ...d, [key]: d[key].filter((x) => !test(x)) });

  const accept = (r) => act(
    (d) => ({
      ...without('incoming', (x) => x.requestId === r.requestId)(d),
      friends: [{ ...r.from, streak: null, since: new Date().toISOString(), unread: 0, last: null }, ...d.friends],
    }),
    `/friends/requests/${r.requestId}/accept`, 'POST', `You and ${displayName(r.from.name)} are now friends.`
  ).then(load); // fills in their streak and presence
  const decline = (r) => act(without('incoming', (x) => x.requestId === r.requestId), `/friends/requests/${r.requestId}/decline`, 'POST', 'Request declined.');
  const cancel = (r) => act(without('outgoing', (x) => x.requestId === r.requestId), `/friends/requests/${r.requestId}`, 'DELETE', 'Request cancelled.');
  const remove = (f) => {
    setRemoving(null);
    navigate('/friends');
    act(without('friends', (x) => x.id === f.id), `/friends/${f.id}`, 'DELETE', `Removed ${displayName(f.name)} from your friends.`);
  };
  const markRead = useCallback((friendId) => {
    setData((d) => d && { ...d, friends: d.friends.map((f) => (f.id === friendId ? { ...f, unread: 0 } : f)) });
    refreshFriends();
  }, [refreshFriends]);

  const q = query.trim().toLowerCase();
  const shown = data?.friends.filter((f) => displayName(f.name).toLowerCase().includes(q));
  const counts = data && { friends: data.friends.length, requests: data.incoming.length, sent: data.outgoing.length };
  const lists = data && {
    friends: shown.map((f) => <FriendRow key={f.id} friend={f} typing={typing[f.id]} selected={f.id === id} />),
    requests: data.incoming.map((r) => (
      <Person
        key={r.requestId}
        name={r.from.name}
        testid="friend-request"
        actions={
          <>
            <Button variant="contained" disableElevation onClick={() => accept(r)} aria-label={`Accept ${displayName(r.from.name)}`} data-testid="friend-accept">Accept</Button>
            <Button variant="outlined" onClick={() => decline(r)} aria-label={`Decline ${displayName(r.from.name)}`} data-testid="friend-decline">Decline</Button>
          </>
        }
      >
        Sent you a request <When at={r.createdAt} />
      </Person>
    )),
    sent: data.outgoing.map((r) => (
      <Person
        key={r.requestId}
        name={r.to.name}
        testid="friend-sent"
        actions={<Button variant="outlined" onClick={() => cancel(r)} aria-label={`Cancel request to ${displayName(r.to.name)}`} data-testid="friend-cancel">Cancel</Button>}
      >
        Request sent <When at={r.createdAt} />
      </Person>
    )),
  };
  const friend = id && data?.friends.find((f) => f.id === id);

  let pane = (
    <div className="thread-empty" data-testid="thread-empty">
      <p>Select a friend to start chatting</p>
    </div>
  );
  if (id && friend) {
    pane = (
      <FriendThread
        key={id}
        friend={friend}
        name={displayName(friend.name)}
        status={statusLine(friend)}
        typing={Boolean(typing[id])}
        subscribe={subscribe}
        sendTyping={sendTyping}
        notify={notify}
        onRead={markRead}
        onRemove={() => setRemoving(friend)}
      />
    );
  } else if (id && data) pane = <NotFriends />;
  else if (id) pane = error ? <ApiError error={error} onRetry={load} /> : <Loading label="Loading chat" />;

  return (
    <AppPage title="Friends">
      <div className={id ? 'friends open' : 'friends'}>
        <section className="friends-col" aria-label="Friends">
          <Tabs
            value={tab}
            onChange={(_, v) => setParams(v === 'friends' ? {} : { tab: v }, { replace: true })}
            aria-label="Friends lists"
            variant="fullWidth"
            className="friend-tabs"
          >
            {TABS.map(([v, text]) => (
              <Tab
                key={v}
                value={v}
                id={`friends-tab-${v}`}
                aria-controls="friends-panel"
                label={counts ? `${text} (${counts[v]})` : text}
                data-testid={`friends-tab-${v}`}
              />
            ))}
          </Tabs>
          <div role="tabpanel" id="friends-panel" aria-labelledby={`friends-tab-${tab}`} className="friends-panel">
            {tab === 'friends' && data?.friends.length > 0 && (
              <label className="friend-search">
                <Search fontSize="small" aria-hidden="true" />
                <span className="visually-hidden">Search friends</span>
                <input type="search" placeholder="Search friends" value={query} onChange={(e) => setQuery(e.target.value)} data-testid="friend-search" />
              </label>
            )}
            {error && !data && <ApiError error={error} onRetry={load} />}
            {!data && !error && <Loading label="Loading friends" />}
            {lists && (lists[tab].length ? (
              <ul className="friend-list" data-testid={`friends-list-${tab}`}>{lists[tab]}</ul>
            ) : tab === 'friends' && q && data.friends.length ? (
              <p className="friend-none" data-testid="friends-no-match">No friends match “{query.trim()}”.</p>
            ) : (
              <div className="app-card friend-empty" data-testid="friends-empty">
                <h2>{EMPTY[tab]}</h2>
                <p>{HOW_TO}</p>
                <div className="friend-empty-actions">
                  <Button component={Link} to={isIOS ? '/rooms' : '/chat'} variant="outlined" data-testid="friends-start">
                    {isIOS ? 'Browse rooms' : 'Start a video chat'}
                  </Button>
                  <InviteButton notify={notify} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="friends-pane" aria-label={friend ? `Chat with ${displayName(friend.name)}` : 'Chat'}>{pane}</section>
      </div>
      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${displayName(removing?.name)}?`}
        confirmLabel="Remove"
        onConfirm={() => remove(removing)}
        onClose={() => setRemoving(null)}
      >
        You can add each other again from a video call. Your messages with them are deleted.
      </ConfirmDialog>
      {snack}
    </AppPage>
  );
}
