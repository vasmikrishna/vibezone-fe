import { SiteLayout, StartButton } from './Layout';

const goals = ['Spend a relaxing evening', 'Talk to strangers', 'Meet someone new', 'Enhance my speaking', 'Chat by video and text'];

const reasons = [
  ['Random matching', 'Press Start and you are matched with another person who is online. Add keywords to find people with shared interests.'],
  ['Skip any time', 'Not feeling it? Skip to the next person or end the call with one tap.'],
  ['Built-in safety', 'Report or block anyone, and offensive words in text chat are filtered.'],
];

const features = [
  ['Easy chat', 'Live video with an optional text chat beside it.'],
  ['Match and chat', 'One-to-one calls with a random person.'],
  ['Keywords', 'Add interests to be matched with people who share them.'],
  ['Chat safety', 'Report, block and skip tools in every call.'],
];

const faqs = [
  ['Is Vibezone free?', 'Yes. You can start a video chat without creating an account or paying.'],
  ['Who can use it?', 'Vibezone is for adults only. You must be 18 or older. You confirm this before your first chat.'],
  ['Are calls recorded?', 'No. Video and audio go directly between you and the other person and are not recorded by us. Text chat is not stored either, except for the recent messages attached to a report.'],
  ['How do I report someone?', 'Tap Report during a call, pick a reason and send it. The call ends. You can also Block a person so you are not matched again.'],
  ['What data do you keep?', 'We keep only what is needed to run matching and handle reports and bans. The Privacy Policy lists exactly what and for how long.'],
];

function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 320 240" role="img" aria-label="Two video call windows connected together">
      <rect x="10" y="30" width="170" height="130" rx="16" fill="#EFE6FF" />
      <circle cx="95" cy="80" r="24" fill="#8F47FF" opacity=".85" />
      <path d="M50 150c6-30 26-40 45-40s39 10 45 40z" fill="#8F47FF" opacity=".85" />
      <rect x="140" y="90" width="170" height="130" rx="16" fill="#8F47FF" />
      <circle cx="225" cy="140" r="24" fill="#fff" opacity=".9" />
      <path d="M180 210c6-30 26-40 45-40s39 10 45 40z" fill="#fff" opacity=".9" />
      <circle cx="288" cy="40" r="14" fill="#EFE6FF" />
      <circle cx="40" cy="205" r="10" fill="#EFE6FF" />
    </svg>
  );
}

export default function Home() {
  return (
    <SiteLayout title="Vibezone - Live video chat with new people">
      <section className="section hero" aria-labelledby="hero-title">
        <div>
          <h1 id="hero-title">Live video chat with <span className="accent">new people</span></h1>
          <p>Meet someone new in seconds. Free, no account needed. For adults aged 18 and over.</p>
          <StartButton testid="hero-start" size="large" />
        </div>
        <HeroArt />
      </section>

      <section className="section" aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <p>
          Vibezone is a community-driven platform for real-time conversations. Press Start,
          get matched with another adult, and talk by video and text. Skip, report or block at any time.
        </p>
      </section>

      <section className="section" aria-labelledby="today-title">
        <h2 id="today-title">What do I want today?</h2>
        <ul className="chips">
          {goals.map((g) => <li key={g}>{g}</li>)}
        </ul>
      </section>

      <section className="section" aria-labelledby="why-title">
        <h2 id="why-title">Why choose us?</h2>
        <div className="cards">
          {reasons.map(([t, d]) => (
            <article key={t} className="card"><h3>{t}</h3><p>{d}</p></article>
          ))}
        </div>
      </section>

      <section className="section tint" aria-labelledby="features-title">
        <h2 id="features-title">Features</h2>
        <div className="cards">
          {features.map(([t, d]) => (
            <article key={t} className="card"><h3>{t}</h3><p>{d}</p></article>
          ))}
        </div>
      </section>

      <section className="section join" aria-labelledby="join-title">
        <h2 id="join-title">Join us</h2>
        <p>Ready to meet someone new? It takes one click to start. You must be 18 or older.</p>
        <StartButton testid="join-start" />
      </section>

      <section className="section narrow" aria-labelledby="faq-title">
        <h2 id="faq-title">FAQ</h2>
        {faqs.map(([q, a], i) => (
          <details key={q} className="faq" data-testid={`faq-${i}`}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </SiteLayout>
  );
}
