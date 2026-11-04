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
import {
  BanSelect, ConfirmDialog, ListState, Pager, SideDrawer, StatusTabs, When, Who,
  durationLabel, rowProps, stop, useApi, useNotify,
} from './common';

const TABS = [['open', 'Open'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['', 'All']];
const STATUS_COLOR = { open: 'warning', resolved: 'success', dismissed: 'default' };
const source = (r) => (r.roomId ? 'Room' : 'Random chat');

function ReportDrawer({ report, onClose, onChanged, notify }) {
  const [hours, setHours] = useState(24);
  const [confirming, setConfirming] = useState(false);

  const setStatus = async (status) => {
    try {
      await api(`/admin/reports/${report._id}`, { method: 'PATCH', body: { status } });
      onChanged({ ...report, status });
      notify(`Report marked ${status}`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };
  const ban = async () => {
    try {
      await api('/admin/bans', { method: 'POST', body: { deviceId: report.reportedDevice, hours } });
      setConfirming(false);
      notify(
        `Banned for ${durationLabel(hours)}`,
        'success',
        report.status !== 'resolved' && (
          <Button color="inherit" size="small" onClick={() => setStatus('resolved')} data-testid="report-mark-resolved">Mark resolved</Button>
        )
      );
    } catch (err) {
      notify(err.message, 'error');
    }
  };
  const who = (sender) => (sender === 'reporter' ? 'Reporter' : 'Reported');

  return (
    <SideDrawer open onClose={onClose} title="Report" testid="report-drawer">
      <dl className="admin-details">
        <dt>Reason</dt><dd><Chip size="small" label={report.reason} /></dd>
        <dt>Status</dt><dd><Chip size="small" color={STATUS_COLOR[report.status]} label={report.status} /></dd>
        <dt>When</dt><dd>{formatDate(report.createdAt)}</dd>
        <dt>Source</dt><dd>{source(report)}{report.roomId && <span className="admin-mono"> {report.roomId}</span>}</dd>
        <dt>Reported</dt><dd><Who user={report.reported} id={report.reportedDevice} /><span className="admin-mono">{report.reportedDevice}</span></dd>
        <dt>Reporter</dt><dd><Who user={report.reporter} id={report.reporterDevice} /><span className="admin-mono">{report.reporterDevice}</span></dd>
      </dl>

      <h3>Chat evidence</h3>
      {report.evidence?.length ? (
        <ol className="admin-transcript" aria-label="Chat evidence" data-testid="report-evidence">
          {report.evidence.map((m, i) => (
            <li key={i} className={m.sender}>
              <span className="meta">{who(m.sender)} · <time dateTime={m.at}>{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></span>
              <span className="text">{m.text}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="admin-muted">No chat messages were attached.</p>
      )}

      <h3>Actions</h3>
      <div className="admin-actions">
        {report.status !== 'resolved' && <Button variant="contained" disableElevation onClick={() => setStatus('resolved')} data-testid="report-resolve">Resolve</Button>}
        {report.status !== 'dismissed' && <Button variant="outlined" onClick={() => setStatus('dismissed')} data-testid="report-dismiss">Dismiss</Button>}
        {report.status !== 'open' && <Button variant="outlined" onClick={() => setStatus('open')} data-testid="report-reopen">Reopen</Button>}
      </div>
      <div className="admin-actions">
        <BanSelect value={hours} onChange={setHours} id="report-ban-duration" />
        <Button variant="outlined" color="error" onClick={() => setConfirming(true)} data-testid="report-ban">Ban reported</Button>
      </div>
      <ConfirmDialog open={confirming} title="Ban the reported user?" confirmLabel="Ban" onConfirm={ban} onClose={() => setConfirming(false)}>
        {report.reported ? report.reported.name || report.reported.email : 'This guest device'} will be disconnected and blocked for {durationLabel(hours)}.
      </ConfirmDialog>
    </SideDrawer>
  );
}

export default function Reports() {
  const [tab, setTab] = useState('open');
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState({});
  const [open, setOpen] = useState(null);
  const [notify, snack] = useNotify();
  const list = useApi(`/admin/reports?${tab ? `status=${tab}&` : ''}page=${page}`);
  const { data, reload } = list;

  useEffect(() => {
    if (data) setCounts((c) => ({ ...c, [tab]: data.total }));
  }, [data, tab]);

  const changeTab = (t) => {
    setTab(t);
    setPage(1);
  };
  const changed = (r) => {
    setOpen(r);
    setCounts({});
    reload();
  };

  return (
    <AppPage title="Reports">
      <section className="app-card admin-card">
        <StatusTabs value={tab} onChange={changeTab} options={TABS} counts={counts} label="Report status" />
        <ListState state={list} empty="No reports here.">
          {(items) => (
            <div className="admin-table-wrap">
              <Table size="small" aria-label="Reports">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell><TableCell>Reason</TableCell><TableCell>Reported</TableCell><TableCell>Reporter</TableCell>
                    <TableCell>Source</TableCell><TableCell>Status</TableCell><TableCell><span className="visually-hidden">Actions</span></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r._id} {...rowProps(() => setOpen(r), 'report-row')}>
                      <TableCell><When at={r.createdAt} /></TableCell>
                      <TableCell><Chip size="small" label={r.reason} /></TableCell>
                      <TableCell><Who user={r.reported} id={r.reportedDevice} /></TableCell>
                      <TableCell><Who user={r.reporter} id={r.reporterDevice} /></TableCell>
                      <TableCell>{source(r)}</TableCell>
                      <TableCell><Chip size="small" color={STATUS_COLOR[r.status]} label={r.status} /></TableCell>
                      <TableCell>
                        <Button size="small" onClick={stop(() => setOpen(r))} aria-label={`Review report: ${r.reason}`} data-testid="report-review">Review</Button>
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
      {open && <ReportDrawer key={open._id} report={open} onClose={() => setOpen(null)} onChanged={changed} notify={notify} />}
      {snack}
    </AppPage>
  );
}
