import { useState } from 'react';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { AppPage } from '../AppLayout';
import { api } from '../api';
import { BanSelect, ConfirmDialog, ID_PATTERN, ListState, When, Who, durationLabel, useApi, useNotify } from './common';

export default function Bans() {
  const list = useApi('/admin/bans');
  const [notify, snack] = useNotify();
  const [lift, setLift] = useState(null);
  const [id, setId] = useState('');
  const [hours, setHours] = useState(24);
  const [touched, setTouched] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);
  const invalid = !ID_PATTERN.test(id.trim());

  const liftBan = async () => {
    try {
      await api(`/admin/bans/${encodeURIComponent(lift.deviceId)}`, { method: 'DELETE' });
      notify('Ban lifted');
      setLift(null);
      list.reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };
  const ban = async () => {
    try {
      await api('/admin/bans', { method: 'POST', body: { deviceId: id.trim(), hours } });
      notify(`Banned for ${durationLabel(hours)}`);
      setConfirmBan(false);
      setId('');
      setTouched(false);
      list.reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!invalid) setConfirmBan(true);
  };

  return (
    <AppPage title="Bans">
      <section className="app-card admin-card" aria-labelledby="bans-title">
        <div className="app-card-head"><h2 id="bans-title">Active bans</h2></div>
        <ListState state={list} empty="No active bans.">
          {(items) => (
            <div className="admin-table-wrap">
              <Table size="small" aria-label="Active bans">
                <TableHead>
                  <TableRow><TableCell>Who</TableCell><TableCell>Reason</TableCell><TableCell>Ends</TableCell><TableCell><span className="visually-hidden">Actions</span></TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {items.map((b) => (
                    <TableRow key={b.deviceId} data-testid="ban-row">
                      <TableCell><Who user={b.user} id={b.deviceId} /></TableCell>
                      <TableCell>{b.reason || '–'}</TableCell>
                      <TableCell><When at={b.until} /></TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => setLift(b)} aria-label={`Lift ban for ${b.user?.name || b.user?.email || `device ${b.deviceId}`}`} data-testid="ban-lift">Lift ban</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ListState>
      </section>

      <section className="app-card" aria-labelledby="ban-form-title">
        <div className="app-card-head"><h2 id="ban-form-title">Ban a device or user id</h2></div>
        <form className="admin-actions" onSubmit={submit} noValidate data-testid="ban-form">
          <TextField
            size="small"
            label="Device or user id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && invalid}
            helperText={touched && invalid ? 'Enter a device UUID or a 24-character user id.' : ' '}
            inputProps={{ maxLength: 36, spellCheck: false, 'data-testid': 'ban-id' }}
            className="admin-id-input"
          />
          <BanSelect value={hours} onChange={setHours} id="ban-form-duration" />
          <Button type="submit" variant="contained" color="error" disableElevation data-testid="ban-submit">Ban</Button>
        </form>
      </section>

      <ConfirmDialog open={Boolean(lift)} title="Lift this ban?" confirmLabel="Lift ban" danger={false} onConfirm={liftBan} onClose={() => setLift(null)}>
        {lift?.user ? lift.user.name || lift.user.email : `Device ${lift?.deviceId}`} can use video chat and rooms again right away.
      </ConfirmDialog>
      <ConfirmDialog open={confirmBan} title="Ban this id?" confirmLabel="Ban" onConfirm={ban} onClose={() => setConfirmBan(false)}>
        <span className="admin-mono">{id.trim()}</span> will be disconnected and blocked for {durationLabel(hours)}.
      </ConfirmDialog>
      {snack}
    </AppPage>
  );
}
