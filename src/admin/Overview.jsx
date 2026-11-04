import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import useMediaQuery from '@mui/material/useMediaQuery';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Refresh from '@mui/icons-material/Refresh';
import { AppPage } from '../AppLayout';
import { ApiError, ListState, When, Who, mmss, useApi } from './common';

const REFRESH_MS = 30000;
const shortDate = (key) => new Date(`${key}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' });

/** Two-series bar chart in plain SVG, with a visually hidden table of the same numbers. */
function Chart({ series }) {
  const narrow = useMediaQuery('(max-width: 599px)');
  const W = narrow ? 360 : 1000;
  const every = narrow ? 4 : 2; // date label on every Nth bar, always on today
  const H = narrow ? 200 : 260;
  const pad = { l: 32, r: 8, t: 12, b: 28 };
  const max = Math.max(1, ...series.flatMap((d) => [d.calls, d.signups]));
  const slot = (W - pad.l - pad.r) / series.length;
  const bar = Math.max(2, slot / 2 - 4);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const sum = (k) => series.reduce((n, d) => n + d[k], 0);
  const summary = `Last ${series.length} days: ${sum('calls')} calls and ${sum('signups')} signups. Busiest day ${
    shortDate(series.reduce((a, d) => (d.calls > a.calls ? d : a), series[0]).date)
  }.`;
  return (
    <>
      <div className="admin-legend" aria-hidden="true">
        <span><i className="calls" />Calls</span>
        <span><i className="signups" />Signups</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="admin-chart" role="img" aria-label={summary} data-testid="admin-chart">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="grid" />
            <text x={pad.l - 6} y={y(max * f) + 4} textAnchor="end">{Math.round(max * f)}</text>
          </g>
        ))}
        {series.map((d, i) => {
          const x = pad.l + i * slot + slot / 2;
          return (
            <g key={d.date}>
              <rect x={x - bar - 1} y={y(d.calls)} width={bar} height={y(0) - y(d.calls)} rx="2" className="calls" />
              <rect x={x + 1} y={y(d.signups)} width={bar} height={y(0) - y(d.signups)} rx="2" className="signups" />
              {(series.length - 1 - i) % every === 0 && <text x={x} y={H - 8} textAnchor="middle">{shortDate(d.date)}</text>}
            </g>
          );
        })}
      </svg>
      <table className="visually-hidden">
        <caption>Calls and signups per day</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Calls</th><th scope="col">Signups</th></tr></thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.date}><th scope="row">{shortDate(d.date)}</th><td>{d.calls}</td><td>{d.signups}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Kpi({ label, value, sub, to, alert, id }) {
  const body = (
    <>
      <dt>{label}</dt>
      <dd>{value ?? <Skeleton width={60} />}</dd>
      {sub && <dd className="admin-kpi-sub">{sub}</dd>}
    </>
  );
  return (
    <div className={alert ? 'app-card dash-stat admin-kpi alert' : 'app-card dash-stat admin-kpi'} data-testid={id}>
      {to ? <Link to={to} className="admin-kpi-link" data-testid={`${id}-link`}><dl>{body}</dl></Link> : <dl>{body}</dl>}
    </div>
  );
}

export default function Overview() {
  const stats = useApi('/admin/stats');
  const reports = useApi('/admin/reports?status=open');
  const { data: s, at: updated, reload } = stats;
  const reloadReports = reports.reload;

  useEffect(() => {
    const tick = () => !document.hidden && (reload(), reloadReports());
    const t = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [reload, reloadReports]);

  const refresh = () => {
    reload();
    reloadReports();
  };
  const kpis = s && [
    { id: 'kpi-users', label: 'Total users', value: s.users.total, sub: `+${s.users.new7d} this week` },
    { id: 'kpi-online', label: 'Online now', value: s.online.randomChat + s.online.inRooms, sub: `${s.online.inCall} in a call` },
    { id: 'kpi-calls', label: 'Calls today', value: s.calls.today, sub: `${s.calls.last7d} last 7 days · avg ${mmss(s.calls.avgSeconds7d)}` },
    { id: 'kpi-reports', label: 'Open reports', value: s.reports.open, sub: `${s.reports.last24h} in the last 24 h`, to: '/admin/reports', alert: s.reports.open > 0 },
    { id: 'kpi-bans', label: 'Active bans', value: s.bans.active, to: '/admin/bans' },
    { id: 'kpi-rooms', label: 'Upcoming / live rooms', value: `${s.rooms.upcoming} / ${s.rooms.live}`, sub: `${s.rooms.ended7d} ended this week`, to: '/admin/rooms' },
  ];

  return (
    <AppPage title="Admin overview">
      <div className="admin-toolbar">
        {updated && <span className="admin-updated" aria-live="polite" data-testid="admin-updated">Updated {updated.toLocaleTimeString()}</span>}
        <Button onClick={refresh} disabled={stats.loading} startIcon={<Refresh />} size="small" data-testid="admin-refresh">Refresh</Button>
      </div>
      <ApiError error={stats.error} onRetry={reload} />
      {!stats.error && (
        <div className="admin-kpis">
          {(kpis || Array.from({ length: 6 }, (_, i) => ({ id: `kpi-${i}`, label: <Skeleton width={90} /> }))).map((k) => <Kpi key={k.id} {...k} />)}
        </div>
      )}

      {s && (
        <section className="app-card" aria-labelledby="admin-chart-title">
          <div className="app-card-head"><h2 id="admin-chart-title">Calls and signups, last 14 days</h2></div>
          <Chart series={s.series} />
        </section>
      )}

      {stats.error?.status !== 403 && (
        <section className="app-card" aria-labelledby="admin-latest-title">
          <div className="app-card-head">
            <h2 id="admin-latest-title">Latest open reports</h2>
            <Button component={Link} to="/admin/reports" size="small" data-testid="admin-all-reports">All reports</Button>
          </div>
          <ListState state={reports} empty="No open reports. 🎉">
            {(items) => (
              <div className="admin-table-wrap">
                <Table size="small">
                  <TableHead>
                    <TableRow><TableCell>When</TableCell><TableCell>Reason</TableCell><TableCell>Reported</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {items.slice(0, 5).map((r) => (
                      <TableRow key={r._id} data-testid="admin-latest-report">
                        <TableCell><When at={r.createdAt} /></TableCell>
                        <TableCell><Chip size="small" label={r.reason} /></TableCell>
                        <TableCell><Who user={r.reported} id={r.reportedDevice} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ListState>
        </section>
      )}
    </AppPage>
  );
}
