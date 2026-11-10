import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuIcon from '@mui/icons-material/Menu';
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import MeetingRoomOutlined from '@mui/icons-material/MeetingRoomOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import HelpOutline from '@mui/icons-material/HelpOutline';
import Language from '@mui/icons-material/Language';
import Logout from '@mui/icons-material/Logout';
import Login from '@mui/icons-material/Login';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import PeopleOutline from '@mui/icons-material/PeopleOutline';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import { api, getToken, clearToken } from './api';
import { useFriendsSocket } from './useFriendsSocket';
import { isIOS } from './Layout';
import { usePageTitle } from './usePageTitle';
import BadgesDialog from './BadgesDialog';
import logo from './assets/vibezone-logo.svg';
import './app.css';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const COLLAPSE_KEY = 'vibezoneSidebarCollapsed';
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

const initial = (name) => (name || '?').charAt(0).toUpperCase();
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
/** "3 unread messages, 1 friend request" for the Friends badges; '' when there is nothing. */
const friendsText = (unread, requests) =>
  [unread > 0 && plural(unread, 'unread message'), requests > 0 && plural(requests, 'friend request')].filter(Boolean).join(', ');

/** Signed-out users go to /login and come back here afterwards. */
export function RequireAuth({ admin = false, children }) {
  const { pathname, search } = useLocation();
  const { me } = useApp();
  if (!getToken()) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  if (admin) {
    if (me === undefined) return null; // still loading /api/me
    if (!me?.admin) return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Tooltips only on the icon rail: an empty MUI Tooltip would blank the item's accessible name.
const withTip = (collapsed, title, el) => (collapsed ? <Tooltip title={title} placement="right">{el}</Tooltip> : el);

function NavItem({ to, label, Icon, id, collapsed, onClick, end, count = 0, countText }) {
  return withTip(
    collapsed,
    count > 0 ? `${label}, ${countText}` : label,
    <NavLink to={to} end={end} className="app-nav-item" onClick={onClick} data-testid={`app-nav-${id}`}>
      <Icon fontSize="small" aria-hidden="true" />
      <span className="app-nav-label">{label}</span>
      {count > 0 && (
        <>
          <span className="visually-hidden">, {countText}</span>
          <span className="app-count" aria-hidden="true" data-testid={`app-nav-${id}-count`}>{count}</span>
        </>
      )}
    </NavLink>
  );
}

function BadgesItem({ collapsed, earned, onClick }) {
  return withTip(
    collapsed,
    `Badges, ${earned} earned`,
    <button type="button" className="app-nav-item" onClick={onClick} aria-label={`Badges, ${earned} earned`} data-testid="app-nav-badges">
      <EmojiEventsOutlined fontSize="small" aria-hidden="true" />
      <span className="app-nav-label">Badges</span>
      <span className="app-count" aria-hidden="true">{earned}</span>
    </button>
  );
}

function SidebarContents({ collapsed = false, onNavigate, onToggle }) {
  const { me, openBadges, openUserMenu, friendRequests, unread } = useApp();
  const signedIn = Boolean(getToken());
  const earned = me?.badges?.filter((b) => b.earned).length ?? 0;
  const item = (props) => <NavItem key={props.id} collapsed={collapsed} onClick={onNavigate} {...props} />;
  const groups = [
    ['Main', [
      signedIn && { to: '/dashboard', label: 'Dashboard', Icon: SpaceDashboardOutlined, id: 'dashboard' },
      !isIOS && { to: '/chat', label: 'Video chat', Icon: VideocamOutlined, id: 'chat' },
      { to: '/rooms', label: 'Rooms', Icon: MeetingRoomOutlined, id: 'rooms' },
      signedIn && { to: '/friends', label: 'Friends', Icon: PeopleAltOutlined, id: 'friends', count: friendRequests + unread, countText: friendsText(unread, friendRequests) },
      { to: '/settings', label: 'Settings', Icon: SettingsOutlined, id: 'settings' },
    ]],
    signedIn && ['Account', [
      'badges',
      { to: '/profile', label: 'Profile & settings', Icon: TuneOutlined, id: 'profile' },
    ]],
    me?.admin && ['Admin', [
      { to: '/admin', label: 'Overview', Icon: AdminPanelSettingsOutlined, id: 'admin', end: true },
      { to: '/admin/reports', label: 'Reports', Icon: FlagOutlined, id: 'admin-reports' },
      { to: '/admin/users', label: 'Users', Icon: PeopleOutline, id: 'admin-users' },
      { to: '/admin/bans', label: 'Bans', Icon: BlockOutlined, id: 'admin-bans' },
      { to: '/admin/rooms', label: 'Rooms', Icon: MeetingRoomOutlined, id: 'admin-rooms' },
    ]],
  ].filter(Boolean);

  return (
    <div className={collapsed ? 'app-sidebar-inner collapsed' : 'app-sidebar-inner'}>
      <div className="app-sidebar-top">
        <Link to={signedIn ? '/dashboard' : '/'} className="app-logo" onClick={onNavigate} data-testid="app-logo" aria-label="Vibezone dashboard">
          <img src={logo} alt="" height="28" />
        </Link>
        {onToggle && (
          <IconButton
            className="app-collapse"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            data-testid="app-collapse"
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        )}
      </div>
      <nav className="app-nav" aria-label="App">
        {groups.map(([caption, items]) => (
          <div key={caption} className="app-nav-group" role="group" aria-label={caption}>
            <p className="app-nav-caption" aria-hidden="true">{caption}</p>
            {items.filter(Boolean).map((it) =>
              it === 'badges' ? (
                <BadgesItem key="badges" collapsed={collapsed} earned={earned} onClick={() => { onNavigate?.(); openBadges(); }} />
              ) : item(it)
            )}
          </div>
        ))}
      </nav>
      <div className="app-sidebar-foot">
        {signedIn ? (
          <button
            type="button"
            className="app-user"
            onClick={openUserMenu}
            aria-haspopup="menu"
            aria-label={`Account menu for ${me?.name || 'you'}`}
            data-testid="app-user-card"
          >
            <span className="app-avatar" aria-hidden="true">{me?.photo ? <img className="app-avatar-img" src={me.photo} alt="" /> : initial(me?.name)}</span>
            <span className="app-user-text">
              <strong data-testid="sidebar-name">{me?.name || '…'}</strong>
              <span data-testid="sidebar-streak">🔥 {me?.streak?.count ?? 0}-day streak</span>
            </span>
          </button>
        ) : (
          <Button component={Link} to="/login" variant="contained" disableElevation fullWidth onClick={onNavigate} startIcon={<Login />} aria-label="Log in" data-testid="app-login">
            <span className="app-nav-label">Log in</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Page frame inside the app: sticky top bar with the title and actions, then the content. */
export function AppPage({ title, actions, wide = false, children }) {
  usePageTitle(`${title} - Vibezone`);
  const { me, openDrawer, openUserMenu, friendRequests, unread } = useApp();
  const badge = friendRequests + unread;
  return (
    <>
      <header className="app-topbar">
        <IconButton
          className="app-hamburger"
          onClick={openDrawer}
          aria-label={badge > 0 ? `Open menu, ${friendsText(unread, friendRequests)}` : 'Open menu'}
          data-testid="app-menu"
        >
          <Badge badgeContent={badge} color="error" overlap="circular" data-testid="app-menu-badge">
            <MenuIcon />
          </Badge>
        </IconButton>
        <h1 className="app-title" data-testid="page-title">{title}</h1>
        <div className="app-actions">{actions}</div>
        {getToken() ? (
          <button type="button" className="app-avatar app-topbar-avatar" onClick={openUserMenu} aria-haspopup="menu" aria-label="Account menu" data-testid="app-avatar">
            {me?.photo ? <img className="app-avatar-img" src={me.photo} alt="" /> : initial(me?.name)}
          </button>
        ) : (
          <Button component={Link} to="/login" className="app-topbar-login" data-testid="app-topbar-login">Log in</Button>
        )}
      </header>
      <div className={wide ? 'app-content wide' : 'app-content'}>{children}</div>
    </>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const token = getToken();
  const [me, setMe] = useState(token ? undefined : null);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [friendCounts, setFriendCounts] = useState({ incoming: 0, unread: 0 });
  const { subscribe, sendTyping } = useFriendsSocket(token);

  // Friend requests and unread messages for the badges: on every route change, each minute while visible, and on socket events.
  const refreshFriends = useCallback(() => {
    if (!getToken()) return setFriendCounts({ incoming: 0, unread: 0 });
    const num = (n) => (Number.isFinite(n) ? n : 0);
    api('/friends/count')
      .then((d) => setFriendCounts({ incoming: num(d?.incoming), unread: num(d?.unread) }))
      .catch(() => { /* keep the last count; the badge is a hint */ });
  }, []);
  useEffect(() => subscribe((e) => (e.type === 'message' || e.type === 'read') && refreshFriends()), [subscribe, refreshFriends]);
  useEffect(() => {
    refreshFriends();
  }, [pathname, token, refreshFriends]);
  useEffect(() => {
    if (!token) return undefined;
    const tick = () => document.visibilityState === 'visible' && refreshFriends();
    const timer = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [token, refreshFriends]);

  useEffect(() => {
    if (!token) return setMe(null);
    api('/me')
      .then(setMe)
      .catch((err) => {
        setMe(null);
        if (err.status === 401) navigate('/login', { replace: true });
      });
  }, [token, navigate]);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch { /* storage unavailable: keep it for this visit only */ }
      return !c;
    });
  };
  const closeMenu = () => setMenuAnchor(null);
  const signOut = () => {
    closeMenu();
    clearToken();
    setMe(null);
    navigate('/login', { replace: true });
  };
  const signedIn = Boolean(token);
  const ctx = {
    me,
    setMe,
    friendRequests: friendCounts.incoming,
    unread: friendCounts.unread,
    refreshFriends,
    subscribe,
    sendTyping,
    openDrawer: () => setDrawerOpen(true),
    openBadges: () => setBadgesOpen(true),
    openUserMenu: (e) => setMenuAnchor(e.currentTarget),
  };
  const menuLinks = [
    ['/profile', 'Profile & settings', TuneOutlined, 'profile'],
    ['/settings', 'Settings', SettingsOutlined, 'settings'],
    ['/privacy', 'Privacy & security', LockOutlined, 'privacy'],
    ['/contact', 'Help', HelpOutline, 'help'],
    ['/', 'Back to website', Language, 'website'],
  ];
  const friendsBadge = friendCounts.incoming + friendCounts.unread;
  const tabs = [
    signedIn ? ['/dashboard', 'Home', HomeOutlined, 'home'] : ['/', 'Home', HomeOutlined, 'home'],
    !isIOS && ['/chat', 'Chat', VideocamOutlined, 'chat'],
    ['/rooms', 'Rooms', MeetingRoomOutlined, 'rooms'],
    signedIn ? ['/friends', 'Friends', PeopleAltOutlined, 'friends', friendsBadge] : ['/settings', 'Settings', SettingsOutlined, 'settings'],
    signedIn ? ['/profile', 'Profile', PersonOutline, 'profile'] : ['/login', 'Log in', Login, 'login'],
  ].filter(Boolean);

  return (
    <AppContext.Provider value={ctx}>
      <div className={collapsed ? 'app collapsed' : 'app'}>
        <aside className="app-sidebar" aria-label="Sidebar">
          <SidebarContents collapsed={collapsed} onToggle={toggle} />
        </aside>
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          anchor="left"
          PaperProps={{ className: 'app-drawer' }}
          data-testid="app-drawer"
        >
          <SidebarContents onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
        <main className="app-main" id="main">
          <Outlet />
        </main>
        <nav className="app-tabs" aria-label="Quick links">
          {tabs.map(([to, label, Icon, id, count = 0]) => (
            <NavLink key={id} to={to} end={to === '/'} className="app-tab" data-testid={`tab-${id}`}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {count > 0 && (
                <>
                  <span className="visually-hidden">, {friendsText(friendCounts.unread, friendCounts.incoming)}</span>
                  <span className="app-tab-count" aria-hidden="true" data-testid={`tab-${id}-count`}>{count > 99 ? '99+' : count}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        data-testid="app-user-menu"
      >
        {menuLinks.map(([to, label, Icon, id]) => (
          <MenuItem key={id} component={Link} to={to} onClick={() => { closeMenu(); setDrawerOpen(false); }} data-testid={`user-menu-${id}`}>
            <ListItemIcon><Icon fontSize="small" /></ListItemIcon>
            {label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={signOut} data-testid="sidebar-sign-out">
          <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
      <BadgesDialog open={badgesOpen} onClose={() => setBadgesOpen(false)} badges={me?.badges} />
    </AppContext.Provider>
  );
}
