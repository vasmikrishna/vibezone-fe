# Feature: marketing site

Routes: `/` home, `/about`, `/contact`, `/chat` (consent gate then video chat), `/terms`, `/privacy`.

- Shared header (Home, About, Contact, Start chatting) and footer (About, Contact, Terms, Privacy) in `src/Layout.jsx`. `.site` is a full-height column, so the footer sits at the bottom of short pages.
- Home sections: hero (two call photos), features, How it works, Private rooms with hosts (photo, `rooms-teaser-cta`), streak teaser (photo, `streak-cta`), FAQ, Join us (18+ stated in hero and FAQ).
- Home photos are AI-generated with Stitch (not real users, no names or quotes with them): `src/assets/home-*.webp`, 640px for the hero and 800px for the sections, lazy below the hero, with width and height set so the page does not jump.
- Contact shows only `VITE_CONTACT_EMAIL`; no form, phone or address.
- Native Capacitor app redirects `/` to `/chat`.
- Content rules: no partner logos, testimonials, user counts, "#1" claims, pricing or team names.
- Page titles are set per page; every link and button has a `data-testid`.
