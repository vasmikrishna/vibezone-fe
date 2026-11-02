import { SiteLayout, StartButton } from './Layout';

export default function About() {
  return (
    <SiteLayout title="About - Vibezone">
      <section className="section narrow">
        <h1>About Vibezone</h1>
        <p>
          Vibezone is a community-driven platform that fosters real-time interactions and
          meaningful connections. Our mission is to bring people together through engaging and
          interactive private rooms. We aim to innovate and inspire through our unique approach
          to online interactions.
        </p>
        <p>Vibezone is for adults aged 18 and over.</p>
        <StartButton testid="about-start" />
      </section>
    </SiteLayout>
  );
}
