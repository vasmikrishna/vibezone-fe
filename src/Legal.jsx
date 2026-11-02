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
        <li>a random device id created in your browser (no name, email or account)</li>
        <li>session timestamps</li>
        <li>the tags you enter, only for the duration of the session</li>
        <li>reports you make or receive</li>
        <li>blocks you make</li>
      </ul>
      <p>
        We use this only to match people, enforce the rules and apply bans. We do not use
        analytics or advertising trackers.
      </p>
      <Contact />
      <BackLink />
    </main>
  );
}
