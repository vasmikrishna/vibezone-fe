import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Drawer from '@mui/material/Drawer';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Close from '@mui/icons-material/Close';
import { api, formatDate } from '../api';

export const PAGE_SIZE = 25; // matches the server
export const BAN_DURATIONS = [
  [24, '24 hours'],
  [24 * 7, '7 days'],
  [24 * 30, '30 days'],
  [87600, 'Permanent'],
];
export const ID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{24})$/i;

export const shortId = (id) => (id ? String(id).slice(0, 8) : '');
export const mmss = (s = 0) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
export function relTime(iso) {
  const secs = (new Date(iso).getTime() - Date.now()) / 1000;
  const [unit, size] = UNITS.find(([, s]) => Math.abs(secs) >= s) || ['second', 1];
  return rtf.format(Math.round(secs / size), unit);
}

/** Relative time with the full date on hover and for assistive tech. */
export function When({ at }) {
  if (!at) return '–';
  const full = formatDate(at);
  return <time dateTime={new Date(at).toISOString()} title={full} aria-label={`${relTime(at)}, ${full}`}>{relTime(at)}</time>;
}

/** GET `path` (re-run when it changes); returns { data, error, loading, at (last success), reload }. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return api(path)
      .then((data) => setState({ data, error: null, loading: false, at: new Date() }))
      .catch((error) => setState((s) => ({ ...s, error, loading: false })));
  }, [path]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { ...state, reload };
}

/** Snackbar for success/errors: const [notify, snack] = useNotify(); notify('Saved') / notify(err.message, 'error', action). */
export function useNotify() {
  const [msg, setMsg] = useState(null);
  const notify = useCallback((text, severity = 'success', action = null) => setMsg({ text, severity, action, key: Date.now() }), []);
  const close = (_, reason) => reason !== 'clickaway' && setMsg(null);
  const el = (
    <Snackbar key={msg?.key} open={Boolean(msg)} autoHideDuration={msg?.action ? 10000 : 5000} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      {msg ? (
        <Alert severity={msg.severity} variant="filled" onClose={close} action={msg.action} data-testid="admin-snack">
          {msg.text}
        </Alert>
      ) : <span />}
    </Snackbar>
  );
  return [notify, el];
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="admin-state" role="status" data-testid="admin-loading">
      <CircularProgress size={28} aria-label={label} />
    </div>
  );
}

export function Empty({ children }) {
  return <p className="admin-state" data-testid="admin-empty">{children}</p>;
}

export function ApiError({ error, onRetry }) {
  if (!error) return null;
  if (error.status === 403) {
    return <Alert severity="warning" data-testid="admin-forbidden">You don&apos;t have access to the admin console.</Alert>;
  }
  return (
    <Alert
      severity="error"
      role="alert"
      action={onRetry && <Button color="inherit" size="small" onClick={onRetry} data-testid="admin-retry">Retry</Button>}
      data-testid="admin-error"
    >
      {error.message}
    </Alert>
  );
}

/** Loading / error / empty states around a list; children render when there are rows. */
export function ListState({ state, empty, children }) {
  const { data, error, loading, reload } = state;
  const items = Array.isArray(data) ? data : data?.items;
  if (error) return <ApiError error={error} onRetry={reload} />;
  if (!items && loading) return <Loading />;
  if (!items?.length) return <Empty>{empty}</Empty>;
  return children(items);
}

export function Pager({ page, total, onChange }) {
  const count = Math.ceil(total / PAGE_SIZE);
  if (count <= 1) return null;
  return (
    <Pagination
      className="admin-pager"
      page={page}
      count={count}
      onChange={(_, p) => onChange(p)}
      color="primary"
      getItemAriaLabel={(type, p, selected) => (type === 'page' ? `${selected ? 'Page' : 'Go to page'} ${p}` : `Go to ${type} page`)}
      data-testid="admin-pager"
    />
  );
}

/** Tabs for a status filter; `value` '' means All. counts: { [value]: n } shown when known. */
export function StatusTabs({ value, onChange, options, counts = {}, label }) {
  return (
    <Tabs value={value} onChange={(_, v) => onChange(v)} aria-label={label} variant="scrollable" allowScrollButtonsMobile className="admin-tabs">
      {options.map(([v, text]) => (
        <Tab key={v || 'all'} value={v} label={counts[v] === undefined ? text : `${text} (${counts[v]})`} data-testid={`admin-tab-${v || 'all'}`} />
      ))}
    </Tabs>
  );
}

export function BanSelect({ value, onChange, id = 'ban-duration' }) {
  return (
    <FormControl size="small" className="admin-ban-select">
      <InputLabel id={`${id}-label`}>Ban for</InputLabel>
      <Select labelId={`${id}-label`} id={id} value={value} label="Ban for" onChange={(e) => onChange(Number(e.target.value))} data-testid={id}>
        {BAN_DURATIONS.map(([h, text]) => (
          <MenuItem key={h} value={h} data-testid={`${id}-${h}`}>{text}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export const durationLabel = (hours) => BAN_DURATIONS.find(([h]) => h === hours)?.[1].toLowerCase() || `${hours} hours`;

/** Confirm dialog; onConfirm may return a promise, the button shows busy until it settles. */
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger = true, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} aria-labelledby="admin-confirm-title" data-testid="admin-confirm">
      <DialogTitle id="admin-confirm-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText component="div">{children}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} data-testid="admin-confirm-cancel">Cancel</Button>
        <Button onClick={confirm} disabled={busy} variant="contained" color={danger ? 'error' : 'primary'} disableElevation data-testid="admin-confirm-ok">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Right-side details drawer; full width on phones. */
export function SideDrawer({ open, onClose, title, children, testid }) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: 'admin-drawer', role: 'dialog', 'aria-modal': true, 'aria-label': title }}
      data-testid={testid}
    >
      <div className="admin-drawer-head">
        <h2>{title}</h2>
        <IconButton onClick={onClose} aria-label="Close" data-testid={`${testid}-close`}>
          <Close />
        </IconButton>
      </div>
      <div className="admin-drawer-body">{children}</div>
    </Drawer>
  );
}

/** A user's name and email (or phone), or "Guest device" with a short id. */
export function Who({ user, id }) {
  if (user) {
    return (
      <span className="admin-who">
        <strong>{user.name || 'No name'}</strong>
        <span>{user.email || user.phone || shortId(user.id)}</span>
      </span>
    );
  }
  return (
    <span className="admin-who">
      <strong>Guest device</strong>
      <span title={id}>{shortId(id)}</span>
    </span>
  );
}

/** Rows open details on click; the row's own button is the keyboard path. */
export const rowProps = (onOpen, testid) => ({ hover: true, className: 'admin-row', onClick: onOpen, 'data-testid': testid });
export const stop = (fn) => (e) => {
  e.stopPropagation();
  fn();
};
