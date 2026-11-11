import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import WavingHandOutlined from '@mui/icons-material/WavingHandOutlined';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';
import VerifiedOutlined from '@mui/icons-material/VerifiedOutlined';
import LocalFireDepartment from '@mui/icons-material/LocalFireDepartment';
import WhatshotOutlined from '@mui/icons-material/WhatshotOutlined';
import WorkspacePremium from '@mui/icons-material/WorkspacePremium';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import PersonAddAlt1Outlined from '@mui/icons-material/PersonAddAlt1Outlined';
import Diversity3Outlined from '@mui/icons-material/Diversity3Outlined';
import Campaign from '@mui/icons-material/Campaign';

const ICONS = {
  'first-call': [WavingHandOutlined, '#f5a524'],
  regular: [ChatBubbleOutline, '#4f8cff'],
  certified: [VerifiedOutlined, '#2ec4b6'],
  'hot-streak': [LocalFireDepartment, '#ff7a1a'],
  'week-warrior': [WhatshotOutlined, '#e5484d'],
  royalty: [WorkspacePremium, '#f2c94c'],
  'invite-1': [PersonAddAlt1Outlined, '#8f47ff'],
  'invite-5': [Diversity3Outlined, '#e255a1'],
  'invite-25': [Campaign, '#3fb950'],
};

/** Badge icon in its colour; unknown ids get a grey trophy. Decorative unless given a title. */
export function BadgeIcon({ id, title }) {
  const [Icon, color] = ICONS[id] || [EmojiEventsOutlined, '#888'];
  return <Icon sx={{ color }} titleAccess={title} aria-hidden={title ? undefined : true} />;
}

export default function BadgesDialog({ open, onClose, badges = [] }) {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="badges-title" fullWidth maxWidth="sm" scroll="paper" data-testid="badges-dialog">
      <DialogTitle id="badges-title" className="badges-title">Badges</DialogTitle>
      <IconButton aria-label="Close" onClick={onClose} className="badges-close" data-testid="badges-close">
        <CloseIcon />
      </IconButton>
      <DialogContent>
        {badges.length === 0 ? (
          <p>No badges yet.</p>
        ) : (
          <ul className="badge-list">
            {badges.map((b) => (
              <li key={b.id} className={b.earned ? 'badge-row' : 'badge-row badge-locked'} data-testid={`badge-${b.id}`}>
                <BadgeIcon id={b.id} />
                <div>
                  <strong>{b.name}</strong>
                  {!b.earned && <span className="badge-lock-label"> · Locked</span>}
                  <p>{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
