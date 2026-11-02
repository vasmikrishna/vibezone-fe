import { SiteLayout } from './Layout';

const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;

export default function Contact() {
  return (
    <SiteLayout title="Contact - Vibezone">
      <section className="section narrow">
        <h1>Contact us</h1>
        <p>Questions, feedback or a report that could not be sent in the app? Send us an email.</p>
        {contactEmail && (
          <p>
            <a href={`mailto:${contactEmail}`} data-testid="contact-email">{contactEmail}</a>
          </p>
        )}
      </section>
    </SiteLayout>
  );
}
