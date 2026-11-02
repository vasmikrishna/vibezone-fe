import { Link } from 'react-router-dom';

const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;

function Contact() {
  return contactEmail ? (
    <p>Contact: <a href={`mailto:${contactEmail}`} data-testid="legal-contact">{contactEmail}</a></p>
  ) : null;
}

function BackLink() {
  return <p><Link to="/" data-testid="legal-back">Back to Vibezone</Link></p>;
}

export function Terms() {
  return (
    <main className="page legal">
      <h1>Terms of Use</h1>
      <p>
        Vibezone is an anonymous 1-to-1 live video chat. You are matched with a random person
        and can end the call or skip to someone else at any time.
      </p>
      <h2>18+ only</h2>
      <p>You must be 18 or older to use Vibezone. Do not use it if you are under 18.</p>
      <h2>Prohibited content</h2>
      <p>You must not show or share:</p>
      <ul>
        <li>nudity or sexual content</li>
        <li>harassment, threats or hate</li>
        <li>anything involving minors</li>
        <li>illegal content or activity</li>
        <li>spam or advertising</li>
      </ul>
      <h2>Text chat</h2>
      <p>
        During a call you can send text messages to the other person. Messages are filtered and
        some offensive words are replaced with asterisks. The prohibited content rules apply to
        text and display names too.
      </p>
      <h2>Reporting and blocking</h2>
      <p>
        During a call you can report or block the other person. Either action ends the call and
        you will not be matched with that person again.
      </p>
      <h2>Bans</h2>
      <p>
        Devices that receive reports from several different people are automatically banned for
        a limited time.
      </p>
      <h2>No warranty</h2>
      <p>
        Vibezone is provided as is. We cannot see or control what other people show you. Use it at
        your own risk and end any call that makes you uncomfortable.
      </p>
      <Contact />
      <BackLink />
    </main>
  );
}

export function Privacy() {
  return (
    <main className="page legal">
      <h1>Privacy Policy</h1>
      <h2>Your video and audio</h2>
      <p>
        Calls are peer-to-peer: video and audio go directly between you and your partner, or
        through a relay server when a direct connection is not possible. Vibezone does not
        record calls.
      </p>
      <h2>Your IP address</h2>
      <p>
        As with any WebRTC call, your IP address is visible to your partner or to the relay
        server that carries the call.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>a random device id created in your browser (no email or account)</li>
        <li>the display name you enter, only for the duration of the session; it is shown to your partner</li>
        <li>session timestamps</li>
        <li>the tags you enter, only for the duration of the session</li>
        <li>reports you make or receive, including the last text chat lines of that call</li>
        <li>blocks you make</li>
      </ul>
      <h2>Text chat</h2>
      <p>
        Text messages pass through our server, which filters them and forwards them to your
        partner. The last few lines of a call are kept in memory only while the call lasts and
        are deleted when it ends. Chat lines are stored only if a report is filed for that call,
        so moderators can review it.
      </p>
      <p>
        We use this only to match people, enforce the rules and apply bans. We do not use
        analytics or advertising trackers.
      </p>
      <Contact />
      <BackLink />
    </main>
  );
}
