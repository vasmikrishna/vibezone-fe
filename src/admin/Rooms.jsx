import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { AppPage } from '../AppLayout';
import { api, formatDate } from '../api';
import { ConfirmDialog, ListState, Pager, StatusTabs, useApi, useNotify } from './common';

const TABS = [['scheduled', 'Scheduled'], ['ended', 'Ended'], ['cancelled', 'Cancelled'], ['', 'All']];
const minutes = (r) => Math.round((new Date(r.endsAt) - new Date(r.startsAt)) / 60000);

export default function AdminRooms() {
  const [tab, setTab] = useState('scheduled');
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState({});
  const [cancel, setCancel] = useState(null);
  const [notify, snack] = useNotify();
  const list = useApi(`/admin/rooms?${tab ? `status=${tab}&` : ''}page=${page}`);
  const { data, reload } = list;

  useEffect(() => {
    if (data) setCounts((c) => ({ ...c, [tab]: data.total }));
  }, [data, tab]);

  const doCancel = async () => {
    try {
      await api(`/admin/rooms/${cancel.id}/cancel`, { method: 'POST' });
      notify('Room cancelled');
      setCancel(null);
      setCounts({});
      reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <AppPage title="Rooms">
      <section className="app-card admin-card">
        <StatusTabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} options={TABS} counts={counts} label="Room status" />
        <ListState state={list} empty="No rooms here.">
          {(items) => (
            <div className="admin-table-wrap">
              <Table size="small" aria-label="Rooms">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell><TableCell>Host</TableCell><TableCell>Starts</TableCell><TableCell align="right">Duration</TableCell>
                    <TableCell align="right">Seats sold</TableCell><TableCell>Status</TableCell><TableCell><span className="visually-hidden">Actions</span></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id} data-testid="room-row">
                      <TableCell><strong>{r.name}</strong></TableCell>
                      <TableCell>{r.hostName || '–'}</TableCell>
                      <TableCell>{formatDate(r.startsAt)}</TableCell>
                      <TableCell align="right">{minutes(r)} min</TableCell>
                      <TableCell align="right">{r.sold}/{r.seats}</TableCell>
                      <TableCell>
                        {r.live ? <Chip size="small" color="error" label="Live" /> : <Chip size="small" label={r.status} color={r.status === 'scheduled' ? 'primary' : 'default'} variant={r.status === 'scheduled' ? 'outlined' : 'filled'} />}
                      </TableCell>
                      <TableCell>
                        {r.status === 'scheduled' && (
                          <Button size="small" color="error" onClick={() => setCancel(r)} aria-label={`Cancel room ${r.name}`} data-testid="room-cancel">Cancel room</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ListState>
        {data && <Pager page={page} total={data.total} onChange={setPage} />}
      </section>
      <ConfirmDialog open={Boolean(cancel)} title={`Cancel "${cancel?.name}"?`} confirmLabel="Cancel room" onConfirm={doCancel} onClose={() => setCancel(null)}>
        {cancel?.sold ? `${cancel.sold} booked ${cancel.sold === 1 ? 'guest' : 'guests'} will lose their seat. ` : ''}This cannot be undone.
      </ConfirmDialog>
      {snack}
    </AppPage>
  );
}
