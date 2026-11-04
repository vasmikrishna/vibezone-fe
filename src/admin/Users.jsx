import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { AppPage } from '../AppLayout';
import { api, formatDate } from '../api';
import {
  ApiError, BanSelect, ConfirmDialog, ListState, Loading, Pager, SideDrawer, When,
  durationLabel, rowProps, stop, useApi, useNotify,
} from './common';

const contact = (u) => u.email || u.phone || '';

function StatusChips({ u }) {
  return (
    <span className="admin-chips">
      {u.admin && <Chip size="small" color="secondary" label="Admin" />}
      {u.underage ? <Chip size="small" color="warning" label="Under 18" /> : u.adult ? <Chip size="small" label="Adult" /> : <Chip size="small" variant="outlined" label="No DOB" />}
      {u.bannedUntil && <Chip size="small" color="error" label={`Banned until ${formatDate(u.bannedUntil)}`} />}
    </span>
  );
}

function UserDrawer({ id, onClose, onChanged, notify }) {
  const user = useApi(`/admin/users/${id}`);
  const [hours, setHours] = useState(24);
  const [confirm, setConfirm] = useState(null); // 'ban' | 'lift'
  const u = user.data;

  const act = async () => {
    try {
      if (confirm === 'ban') await api('/admin/bans', { method: 'POST', body: { deviceId: id, hours } });
      else await api(`/admin/bans/${id}`, { method: 'DELETE' });
      notify(confirm === 'ban' ? `Banned for ${durationLabel(hours)}` : 'Ban lifted');
      setConfirm(null);
      user.reload();
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <SideDrawer open onClose={onClose} title={u?.name || 'User'} testid="user-drawer">
      <ApiError error={user.error} onRetry={user.reload} />
      {!u && user.loading && <Loading />}
      {u && (
        <>
          <dl className="admin-details">
            <dt>Name</dt><dd>{u.name || '–'}</dd>
            <dt>Email</dt><dd>{u.email || '–'}</dd>
            <dt>Phone</dt><dd>{u.phone || '–'}</dd>
            <dt>Joined</dt><dd>{formatDate(u.createdAt)}</dd>
            <dt>Calls</dt><dd>{u.calls}</dd>
            <dt>Streak</dt><dd>{u.streak?.count ?? 0} days (best {u.streak?.best ?? 0})</dd>
            <dt>Rooms hosted</dt><dd>{u.rooms}</dd>
            <dt>Status</dt><dd><StatusChips u={u} /></dd>
            <dt>User id</dt><dd className="admin-mono">{u.id}</dd>
          </dl>
          <h3>Recent reports against them ({u.reportsAgainst})</h3>
          {u.recentReports?.length ? (
            <ul className="admin-list" data-testid="user-reports">
              {u.recentReports.map((r) => (
                <li key={r._id}>
                  <Chip size="small" label={r.reason} /> <When at={r.createdAt} /> · {r.status || 'open'}{r.roomId ? ' · Room' : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-muted">No reports.</p>
          )}
          <h3>Ban</h3>
          <div className="admin-actions">
            {u.bannedUntil ? (
              <Button variant="outlined" onClick={() => setConfirm('lift')} data-testid="user-lift-ban">Lift ban</Button>
            ) : (
              <>
                <BanSelect value={hours} onChange={setHours} id="user-ban-duration" />
                <Button variant="outlined" color="error" onClick={() => setConfirm('ban')} disabled={u.admin} data-testid="user-ban">Ban</Button>
              </>
            )}
          </div>
          <ConfirmDialog
            open={Boolean(confirm)}
            title={confirm === 'ban' ? `Ban ${u.name || 'this user'}?` : 'Lift this ban?'}
            confirmLabel={confirm === 'ban' ? 'Ban' : 'Lift ban'}
            danger={confirm === 'ban'}
            onConfirm={act}
            onClose={() => setConfirm(null)}
          >
            {confirm === 'ban' ? `They will be disconnected and blocked for ${durationLabel(hours)}.` : 'They can use video chat and rooms again right away.'}
          </ConfirmDialog>
        </>
      )}
    </SideDrawer>
  );
}

export default function Users() {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [notify, snack] = useNotify();
  const list = useApi(`/admin/users?q=${encodeURIComponent(q)}&page=${page}`);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  return (
    <AppPage title="Users">
      <section className="app-card admin-card">
        <TextField
          type="search"
          size="small"
          label="Search name, email or phone"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputProps={{ maxLength: 100, 'data-testid': 'users-search' }}
          className="admin-search"
        />
        {list.data && <p className="admin-muted" aria-live="polite">{list.data.total} users</p>}
        <ListState state={list} empty={q ? 'No users match this search.' : 'No users yet.'}>
          {(items) => (
            <div className="admin-table-wrap">
              <Table size="small" aria-label="Users">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell><TableCell>Joined</TableCell><TableCell align="right">Calls</TableCell>
                    <TableCell align="right">Streak</TableCell><TableCell align="right">Reports against</TableCell><TableCell>Status</TableCell>
                    <TableCell><span className="visually-hidden">Actions</span></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((u) => (
                    <TableRow key={u.id} {...rowProps(() => setOpenId(u.id), 'user-row')}>
                      <TableCell>
                        <span className="admin-user">
                          <span className="app-avatar" aria-hidden="true">{(u.name || '?').charAt(0).toUpperCase()}</span>
                          <span className="admin-who"><strong>{u.name || 'No name'}</strong><span>{contact(u)}</span></span>
                        </span>
                      </TableCell>
                      <TableCell><When at={u.createdAt} /></TableCell>
                      <TableCell align="right">{u.calls}</TableCell>
                      <TableCell align="right">{u.streak?.count ?? 0}</TableCell>
                      <TableCell align="right">{u.reportsAgainst}</TableCell>
                      <TableCell><StatusChips u={u} /></TableCell>
                      <TableCell>
                        <Button size="small" onClick={stop(() => setOpenId(u.id))} aria-label={`Details for ${u.name || contact(u) || 'user'}`} data-testid="user-details">Details</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ListState>
        {list.data && <Pager page={page} total={list.data.total} onChange={setPage} />}
      </section>
      {openId && <UserDrawer key={openId} id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} notify={notify} />}
      {snack}
    </AppPage>
  );
}
