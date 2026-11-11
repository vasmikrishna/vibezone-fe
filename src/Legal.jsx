import { Link } from 'react-router-dom';
import { SiteLayout } from './Layout';

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
    <SiteLayout title="Terms of Use - Vibezone">
    <div className="page legal">
      <h1>Terms of Use</h1>
      <p>
        Vibezone offers 1-to-1 live video calls. In random chat you are matched with a random
        person without an account and can end the call or skip to someone else at any time. In
        private rooms, which need an account, a host talks with each ticket holder in turn.
      </p>
      <h2>18+ only</h2>
      <p>You must be 18 or older to use Vibezone. Do not use it if you are under 18.</p>
      <h2>Accounts</h2>
      <p>
        Private rooms need an account. You log in with your Google account. Before you book or
        create a room you must give your date of birth, which must show you are 18 or older. It
        cannot be changed afterwards. If it shows you are under 18, that account cannot use rooms.
        Keep your Google account secure: anyone who can sign in to it can use your Vibezone account.
      </p>
      <h2>Private rooms</h2>
      <p>
        A host sets a start time, a duration, a time limit per person and a number of free tickets.
        Ticket holders join a queue in the order they enter, from 10 minutes before the start, and
        the host calls each person in turn. Each call ends automatically when its time is up. A host
        can cancel a room or end it early, and you can cancel your booking before the room ends.
        The same rules on content, reporting and blocking apply in rooms. If you or the host block
        or report the other, the call ends, you leave the room and you cannot book or join that
        host&apos;s rooms again.
      </p>
      <h2>Deleting your account</h2>
      <p>
        You can delete your account at any time from your profile. Your bookings are removed and
        rooms you host that have not ended are cancelled.
      </p>
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
      <h2>Recording calls</h2>
      <p>
        Vibezone does not record or store calls. You may record a call only with the Record button
        in the app, and only after the other person allows it there. Both of you see a recording
        indicator the whole time and either of you can stop it. The recording is created and saved
        on the recording person&apos;s device; Vibezone never receives it. You are responsible for
        how you use and share a recording and must follow the law where you and the other person
        live. Recording someone without their consent in the app, for example by screen recording,
        is against these Terms and can be reported.
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
    </div>
    </SiteLayout>
  );
}

export function Privacy() {
  return (
    <SiteLayout title="Privacy Policy - Vibezone">
    <div className="page legal">
      <h1>Privacy Policy</h1>
      <h2>Your video and audio</h2>
      <p>
        Calls are peer-to-peer: video and audio go directly between you and your partner, or
        through a relay server when a direct connection is not possible. Vibezone does not
        record or store calls.
      </p>
      <h2>Recordings made by users</h2>
      <p>
        A user may record a call only after the other person allows it in the app, and both see a
        recording indicator while it runs. The recording, including both people&apos;s video and
        voice, is created and saved only on the recording user&apos;s device. Vibezone never receives
        or stores it; our server only passes on the request, the answer and the stop. Users are
        responsible for how they use and share recordings and must follow the law. Recording without
        consent, such as screen recording, is against the Terms and can be reported.
      </p>
      <h2>Your IP address</h2>
      <p>
        As with any WebRTC call, your IP address is visible to your partner or to the relay
        server that carries the call.
      </p>
      <h2>What we store</h2>
      <p>Random chat needs no account. For it we store:</p>
      <ul>
        <li>a random device id created in your browser</li>
        <li>the display name you enter, only for the duration of the session; it is shown to your partner</li>
        <li>session timestamps</li>
        <li>the tags you enter, only for the duration of the session</li>
        <li>reports you make or receive, including the last text chat lines of that call</li>
        <li>blocks you make</li>
      </ul>
      <h2>Accounts and private rooms</h2>
      <p>If you create an account for private rooms, we also store:</p>
      <ul>
        <li>the email address and Google account id from your Google sign-in, used to log you in; your email is never shown to other people</li>
        <li>the name you choose, which is shown to hosts and the people you talk with</li>
        <li>your date of birth, used only to confirm you are 18 or older</li>
        <li>rooms you create (name, description, times and ticket numbers) and the tickets you book</li>
        <li>reports and blocks made in rooms, including the last text chat lines of that call</li>
      </ul>
      <p>
        If you join through a friend&apos;s invite link, we store who invited you, and the person who invited you sees you in their friends list.
      </p>
      <p>
        You stay logged in with a token saved on your device for up to 30 days; signing out removes it.
      </p>
      <h2>Deleting your account</h2>
      <p>
        Delete your account from your profile at any time. We delete your account, name, date of
        birth, bookings and the blocks you made, and cancel rooms you host that have not ended. Rooms you hosted in the
        past no longer show your name. Reports about you are kept for moderation. If the date of
        birth you gave showed you were under 18, we keep only your Google account id with that flag, so
        it cannot be used for rooms again.
      </p>
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
    </div>
    </SiteLayout>
  );
}
