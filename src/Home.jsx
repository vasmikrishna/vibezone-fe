import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import { SiteLayout } from './Layout';
import { getToken } from './api';

const features = [
  ['🎥', 'Random video chat', 'Press Start to meet another adult who is online. Add interest tags to match with people who like the same things.'],
  ['🏠', 'Private rooms with hosts', 'Join small rooms run by a host, or sign in and create your own with a date, time and seat limit.'],
  ['🔥', 'Daily streaks', 'Sign in and have a call of at least a minute each day to grow your streak.'],
  ['🛡️', 'Safety first', 'Report or block anyone in one tap, offensive words in chat are filtered, and Vibezone is 18+ only.'],
];

const steps = [
  ['Allow camera', 'Confirm you are 18 or older and let your browser use your camera and microphone.'],
  ['Get matched', 'We connect you with someone online, preferring people who share your interest tags.'],
  ['Chat, skip or report', 'Talk by video and text. Skip to the next person, or report and block at any time.'],
];

const faqs = [
  ['Is Vibezone free?', 'Yes. You can start a video chat without creating an account or paying.'],
  ['Do I need an account?', 'Not for random video chat. Sign in with your phone number or Google account to keep a daily streak and to book or create private rooms.'],
  ['How do streaks work?', 'When you are signed in, every day with a video call of at least a minute adds one day to your streak. Miss a day and it starts again. Your best streak is kept on your profile.'],
  ['Who can use it?', 'Vibezone is for adults only. You must be 18 or older. You confirm this before your first chat.'],
  ['Are calls recorded?', 'Vibezone never records or stores calls. Video and audio go directly between you and the other person. Either of you can ask to record a call, but recording starts only after the other person taps Allow, both of you see a REC indicator the whole time, and either can stop it. The file is saved only on the recording person’s device; we never receive it. Recording without consent, such as screen recording, is against our Terms and can be reported. Text chat is not stored, except for the recent messages attached to a report.'],
  ['How do I report someone?', 'Tap Report during a call, pick a reason and send it. The call ends. You can also Block a person so you are not matched again.'],
  ['What data do you keep?', 'We keep only what is needed to run matching, streaks, rooms, reports and bans. The Privacy Policy lists exactly what and for how long.'],
];

function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="vcard vcard-back">
        <span className="vcard-avatar" />
        <span className="vcard-bar" />
      </div>
      <div className="vcard vcard-front">
        <span className="vcard-avatar" />
        <span className="vcard-bar" />
      </div>
      <span className="connected-pill"><span className="live-dot" />Connected</span>
    </div>
  );
}

export default function Home() {
  const signedIn = Boolean(getToken());
  return (
    <SiteLayout title="Vibezone - Live video chat with new people" dark>
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Free live video chat · 18+</p>
          <h1 id="hero-title">Meet someone new, <span className="accent">face to face.</span></h1>
          <p className="hero-sub">One tap matches you with another adult for a video chat. No account needed.</p>
          <div className="hero-actions">
            <Button component={Link} to="/chat" variant="contained" size="large" disableElevation className="cta" data-testid="hero-start">
              Start video chat
            </Button>
            <Button component={Link} to="/rooms" variant="outlined" size="large" className="cta cta-ghost" data-testid="hero-rooms">
              Browse rooms
            </Button>
          </div>
        </div>
        <HeroVisual />
      </section>

      <section className="home-section" aria-labelledby="features-title">
        <h2 id="features-title">Everything you need to meet new people</h2>
        <div className="feature-grid">
          {features.map(([icon, title, text]) => (
            <article key={title} className="feature-card">
              <span className="feature-icon" aria-hidden="true">{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol className="steps">
          {steps.map(([title, text], i) => (
            <li key={title} className="step">
              <span className="step-number" aria-hidden="true">{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-section streak-teaser" aria-labelledby="streak-title">
        <div>
          <h2 id="streak-title">Keep your streak alive</h2>
          <p>Have a video call of at least a minute every day and watch your streak grow. Your best run is saved on your profile.</p>
          <Button
            component={Link}
            to={signedIn ? '/chat' : '/login'}
            variant="contained"
            size="large"
            disableElevation
            className="cta"
            data-testid="streak-cta"
          >
            {signedIn ? 'Start today’s call' : 'Sign in to start a streak'}
          </Button>
        </div>
        <span className="flame-chip" aria-hidden="true">🔥 7</span>
      </section>

      <section className="home-section home-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">FAQ</h2>
        {faqs.map(([q, a], i) => (
          <details key={q} className="faq" data-testid={`faq-${i}`}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <section className="home-section home-join" aria-labelledby="join-title">
        <h2 id="join-title">Join us</h2>
        <p>Ready to meet someone new? It takes one tap to start. You must be 18 or older.</p>
        <Button component={Link} to="/chat" variant="contained" size="large" disableElevation className="cta cta-light" data-testid="join-start">
          Start video chat
        </Button>
      </section>
    </SiteLayout>
  );
}
