import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ArrowBack from '@mui/icons-material/ArrowBack';
import MoreVert from '@mui/icons-material/MoreVert';
import Send from '@mui/icons-material/Send';
import Done from '@mui/icons-material/Done';
import DoneAll from '@mui/icons-material/DoneAll';
import { ApiError, Loading } from './admin/common';
import { api } from './api';

const GROUP_MS = 5 * 60 * 1000;
const TYPING_EVERY_MS = 2000;
const MAX_LENGTH = 500;

const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { timeStyle: 'short' });
function dayLabel(iso) {
  const d = new Date(iso);
  const day = new Date();
  if (d.toDateString() === day.toDateString()) return 'Today';
  day.setDate(day.getDate() - 1);
  return d.toDateString() === day.toDateString() ? 'Yesterday' : d.toLocaleDateString([], { dateStyle: 'medium' });
}

/** Day dividers and runs of messages from one sender a few minutes apart. */
function groupMessages(messages) {
  const out = [];
  let prev;
  for (const m of messages) {
    const day = dayLabel(m.at);
    if (!prev || day !== dayLabel(prev.at)) out.push({ day });
    const last = out[out.length - 1];
    if (last.items && prev.from === m.from && new Date(m.at) - new Date(prev.at) < GROUP_MS) last.items.push(m);
    else out.push({ from: m.from, items: [m] });
    prev = m;
  }
  return out;
}

/** Photo or initial with a presence dot (hollow when offline, so colour is not the only cue). */
export function Avatar({ name, photo, online }) {
  return (
    <span className="friend-avatar">
      <span className="app-avatar" aria-hidden="true">
        {photo ? <img className="app-avatar-img" src={photo} alt="" /> : name.charAt(0).toUpperCase()}
      </span>
      <span className={online ? 'friend-dot on' : 'friend-dot'} role="img" aria-label={online ? 'Online' : 'Offline'} data-testid="friend-presence" />
    </span>
  );
}

export function NotFriends() {
  return (
    <div className="thread-empty" data-testid="thread-not-friends">
      <p>You are not friends with this person.</p>
      <Button component={Link} to="/friends" variant="outlined" data-testid="thread-not-friends-back">Back to friends</Button>
    </div>
  );
}

export default function FriendThread({ friend, name, status, typing, subscribe, sendTyping, notify, onRead, onRemove }) {
  const { id } = friend;
  const [messages, setMessages] = useState(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState(null);
  const [gone, setGone] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(null);
  const scroller = useRef(null);
  const stick = useRef(true);
  const lastTyping = useRef(0);

  // The POST reply and the socket event carry the same message: keep one per id.
  const add = useCallback((list) => setMessages((ms) => {
    const seen = new Set((ms || []).map((m) => m.id));
    return [...(ms || []), ...list.filter((m) => !seen.has(m.id))];
  }), []);

  useEffect(() => {
    const load = () => api(`/friends/${id}/messages`)
      .then((d) => { setMessages(d.messages); setMore(d.more); setError(null); })
      .catch((err) => (err.status === 404 ? setGone(true) : setError(err)));
    load();
    return subscribe((e) => {
      const m = e.message;
      if (e.type === 'reconnect') load();
      else if (e.type === 'message' && (m.from === id || m.to === id)) add([m]);
      // A read receipt covers messages from `peer` to `reader`: mine when the friend read them, theirs when I did (another tab).
      else if (e.type === 'read') setMessages((ms) => ms && ms.map((x) => (x.from === e.peer && x.to === e.reader && !x.readAt ? { ...x, readAt: e.at } : x)));
    });
  }, [id, subscribe, add]);

  // ponytail: native scroll anchoring keeps the view still when older messages are prepended (no Safari < 18.4 support).
  const loadEarlier = () => {
    api(`/friends/${id}/messages?before=${encodeURIComponent(messages[0].at)}`)
      .then((d) => { setMessages((ms) => [...d.messages, ...ms]); setMore(d.more); })
      .catch((err) => notify(err.message, 'error'));
  };

  // Read receipts: when there are unread incoming messages and the page is visible (now or when it becomes visible).
  const unreadIn = Boolean(messages?.some((m) => m.from === id && !m.readAt));
  useEffect(() => {
    if (!unreadIn) return undefined;
    const mark = () => {
      if (document.visibilityState !== 'visible') return;
      const at = new Date().toISOString();
      api(`/friends/${id}/read`, { method: 'POST' })
        .then(() => {
          setMessages((ms) => ms.map((m) => (m.from === id && !m.readAt ? { ...m, readAt: at } : m)));
          onRead(id);
        })
        .catch(() => { /* retried on the next message or visibility change */ });
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [unreadIn, id, onRead]);

  // Stay at the bottom on open and on new messages, unless the reader scrolled up.
  const lastId = messages?.[messages.length - 1]?.id;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lastId, typing]);
  const onScroll = (e) => {
    const el = e.currentTarget;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const onType = (e) => {
    setText(e.target.value);
    if (e.target.value && Date.now() - lastTyping.current > TYPING_EVERY_MS) {
      lastTyping.current = Date.now();
      sendTyping(id);
    }
  };
  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { message } = await api(`/friends/${id}/messages`, { method: 'POST', body: { text: body } });
      stick.current = true;
      add([message]);
      setText('');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  if (gone) return <NotFriends />;

  return (
    <div className="thread" data-testid="thread">
      <header className="thread-head">
        <IconButton component={Link} to="/friends" className="thread-back" aria-label="Back to friends" data-testid="thread-back">
          <ArrowBack />
        </IconButton>
        <Avatar name={name} photo={friend.photo} online={friend.online} />
        <div className="friend-text">
          <strong data-testid="thread-name">{name}</strong>
          <span className={friend.online ? 'friend-line online' : 'friend-line'} data-testid="thread-status">{status}</span>
        </div>
        <IconButton
          onClick={(e) => setMenu(e.currentTarget)}
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={Boolean(menu)}
          data-testid="thread-more"
        >
          <MoreVert />
        </IconButton>
        <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} data-testid="thread-menu">
          <MenuItem onClick={() => { setMenu(null); onRemove(); }} data-testid="friend-remove">Remove friend</MenuItem>
        </Menu>
      </header>
      <div className="thread-scroll" ref={scroller} onScroll={onScroll}>
        {error && <ApiError error={error} />}
        {!messages && !error && <Loading label="Loading messages" />}
        {more && <Button onClick={loadEarlier} className="thread-earlier" data-testid="thread-earlier">Load earlier messages</Button>}
        {messages && !messages.length && <p className="thread-hint" data-testid="thread-no-messages">Say hi to {name}.</p>}
        {messages && (
          <ol className="thread-log" role="log" aria-live="polite" aria-label={`Messages with ${name}`} data-testid="thread-log">
            {groupMessages(messages).map((g) => {
              if (g.day) return <li key={`day-${g.day}`} className="thread-day">{g.day}</li>;
              const mine = g.from !== id;
              const last = g.items[g.items.length - 1];
              return (
                <li key={g.items[0].id} className={mine ? 'thread-group mine' : 'thread-group'}>
                  <span className="visually-hidden">{mine ? 'You' : name}:</span>
                  {g.items.map((m) => <p key={m.id} className="thread-bubble" data-testid="thread-message">{m.text}</p>)}
                  <span className="thread-time">
                    <time dateTime={last.at}>{timeOf(last.at)}</time>
                    {mine && (last.readAt
                      ? <DoneAll className="thread-tick seen" titleAccess="Seen" aria-label="Seen" data-testid="thread-seen" />
                      : <Done className="thread-tick" titleAccess="Delivered" aria-label="Delivered" data-testid="thread-delivered" />)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {typing && (
          <div className="thread-typing" role="status" aria-label={`${name} is typing`} data-testid="thread-typing">
            <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
          </div>
        )}
      </div>
      <form className="thread-compose" onSubmit={send}>
        <input
          type="text"
          value={text}
          onChange={onType}
          maxLength={MAX_LENGTH}
          placeholder={`Message ${name}`}
          aria-label={`Message ${name}`}
          autoComplete="off"
          data-testid="thread-input"
        />
        <IconButton type="submit" className="thread-send" disabled={!text.trim() || sending} aria-label="Send" data-testid="thread-send">
          <Send fontSize="small" />
        </IconButton>
      </form>
    </div>
  );
}
