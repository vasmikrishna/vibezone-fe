import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { api } from './api';
import { inviteLink } from './invite';

const canShare = Boolean(navigator.share);

function useInviteLink() {
  const [link, setLink] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    api('/me/invite')
      .then(({ code }) => live && setLink(inviteLink(code)))
      .catch(() => live && setError('Could not load your invite link.'));
    return () => { live = false; };
  }, []);
  return [link, error];
}

// async so a missing navigator.clipboard (insecure origin) rejects instead of throwing.
const copyText = async (text) => navigator.clipboard.writeText(text);

/** Opens the share sheet; closing it is not an error. */
async function shareLink(url) {
  try {
    await navigator.share({ title: 'Vibezone', text: 'Join me on Vibezone', url });
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  }
}

/** Dashboard card: the link, Copy, Share (where supported) and how many friends joined. */
export default function InviteCard({ referrals = 0 }) {
  const [link, error] = useInviteLink();
  const [msg, setMsg] = useState('');
  const say = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };
  const copy = () => copyText(link).then(() => say('Copied'), () => say('Could not copy. Select the link and copy it.'));
  const share = () => shareLink(link).catch(() => say('Could not share the link.'));

  return (
    <section className="app-card" aria-labelledby="dash-invite-title">
      <div className="app-card-head">
        <h2 id="dash-invite-title">Invite friends</h2>
      </div>
      <p>Share your link. When a friend joins you become friends straight away, and you earn a badge once they finish their first call.</p>
      {error ? (
        <p role="alert" className="dash-tip" data-testid="invite-error">{error}</p>
      ) : (
        <>
          <TextField
            className="invite-link"
            label="Your invite link"
            value={link ?? ''}
            size="small"
            fullWidth
            margin="normal"
            slotProps={{ htmlInput: { readOnly: true, onFocus: (e) => e.target.select(), 'data-testid': 'invite-link' } }}
          />
          <div className="invite-actions">
            <Button variant="contained" disableElevation onClick={copy} disabled={!link} data-testid="invite-copy">Copy link</Button>
            {canShare && <Button variant="outlined" onClick={share} disabled={!link} data-testid="invite-share">Share</Button>}
            <span aria-live="polite" data-testid="invite-feedback">{msg}</span>
          </div>
        </>
      )}
      <p className="dash-tip" data-testid="invite-count">{referrals} {referrals === 1 ? 'friend' : 'friends'} joined and had a first call</p>
    </section>
  );
}

/** "Invite a friend" for the empty friends list: shares the link, or copies it where sharing is not supported. */
export function InviteButton({ notify }) {
  const [link, error] = useInviteLink();
  const invite = () => {
    if (!link) return notify(error, 'error');
    (canShare ? shareLink(link) : copyText(link).then(() => notify('Link copied')))
      .catch(() => notify(canShare ? 'Could not share the link.' : 'Could not copy the link.', 'error'));
  };
  return (
    <Button variant="contained" disableElevation onClick={invite} disabled={!link && !error} data-testid="friends-invite">
      Invite a friend
    </Button>
  );
}
