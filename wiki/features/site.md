# Feature: marketing site

Routes: `/` home, `/about`, `/contact`, `/chat` (consent gate then video chat), `/terms`, `/privacy`.

- Shared header (Home, About, Contact, Start chatting) and footer (About, Contact, Terms, Privacy) in `src/Layout.jsx`.
- Home sections: hero, About, What do I want today, Why choose us, Features, Join us, FAQ (18+ stated in hero and FAQ).
- Contact shows only `VITE_CONTACT_EMAIL`; no form, phone or address.
- Native Capacitor app redirects `/` to `/chat`.
- Content rules: no partner logos, testimonials, user counts, "#1" claims, pricing or team names.
- Page titles are set per page; every link and button has a `data-testid`.
