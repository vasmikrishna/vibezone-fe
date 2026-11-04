import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { AppPage, useApp } from './AppLayout';
import { ApiError, ConfirmDialog, Loading, When, useNotify } from './admin/common';
import { isIOS } from './Layout';
import { api } from './api';

const TABS = [
  ['friends', 'Friends'],
  ['requests', 'Requests'],
  ['sent', 'Sent'],
];
const HOW_TO = "Add friends from a video call — when you're both signed in, tap Add friend.";
const EMPTY = {
  friends: 'No friends yet.',
  requests: 'No friend requests right now.',
  sent: 'You have no pending requests.',
};

const displayName = (name) => name || 'Vibezone user';
const sinceDate = (iso) => new Date(iso).toLocaleDateString([], { dateStyle: 'medium' });

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

export default function Friends() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([v]) => v === params.get('tab')) ? params.get('tab') : 'friends';
  const { refreshFriends } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notify, snack] = useNotify();

  const load = useCallback(
    () => api('/friends').then((d) => { setData(d); setError(null); }).catch(setError),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

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
      friends: [{ ...r.from, streak: null, since: new Date().toISOString() }, ...d.friends],
    }),
    `/friends/requests/${r.requestId}/accept`, 'POST', `You and ${displayName(r.from.name)} are now friends.`
  ).then(load); // fills in their streak
  const decline = (r) => act(without('incoming', (x) => x.requestId === r.requestId), `/friends/requests/${r.requestId}/decline`, 'POST', 'Request declined.');
  const cancel = (r) => act(without('outgoing', (x) => x.requestId === r.requestId), `/friends/requests/${r.requestId}`, 'DELETE', 'Request cancelled.');
  const remove = (f) => {
    setRemoving(null);
    act(without('friends', (x) => x.id === f.id), `/friends/${f.id}`, 'DELETE', `Removed ${displayName(f.name)} from your friends.`);
  };

  const counts = data && { friends: data.friends.length, requests: data.incoming.length, sent: data.outgoing.length };
  const lists = data && {
    friends: data.friends.map((f) => (
      <Person
        key={f.id}
        name={f.name}
        testid="friend-card"
        actions={<Button variant="outlined" color="error" onClick={() => setRemoving(f)} aria-label={`Remove ${displayName(f.name)}`} data-testid="friend-remove">Remove</Button>}
      >
        {f.streak ? `🔥 ${f.streak.count}-day streak · ` : ''}Friends since {sinceDate(f.since)}
      </Person>
    )),
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

  return (
    <AppPage title="Friends">
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
      <div role="tabpanel" id="friends-panel" aria-labelledby={`friends-tab-${tab}`}>
        {error && !data && <ApiError error={error} onRetry={load} />}
        {!data && !error && <Loading label="Loading friends" />}
        {lists && (lists[tab].length ? (
          <ul className="friend-list" data-testid={`friends-list-${tab}`}>{lists[tab]}</ul>
        ) : (
          <div className="app-card friend-empty" data-testid="friends-empty">
            <h2>{EMPTY[tab]}</h2>
            <p>{HOW_TO}</p>
            <Button component={Link} to={isIOS ? '/rooms' : '/chat'} variant="outlined" data-testid="friends-start">
              {isIOS ? 'Browse rooms' : 'Start a video chat'}
            </Button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${displayName(removing?.name)}?`}
        confirmLabel="Remove"
        onConfirm={() => remove(removing)}
        onClose={() => setRemoving(null)}
      >
        You can add each other again from a video call.
      </ConfirmDialog>
      {snack}
    </AppPage>
  );
}
