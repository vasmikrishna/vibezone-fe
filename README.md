# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Mobile apps (Capacitor)

App id `in.vibezone.app`. Web assets are bundled into the app.

```
# .env.production (gitignored) must contain VITE_SERVER_URL=wss://your-backend
pnpm mobile:sync            # build + cap sync
cd android && ./gradlew assembleDebug   # needs JAVA_HOME (JDK 21) and ANDROID_HOME
npx cap open ios            # build in Xcode
```

**Backend:** `ALLOWED_ORIGINS` must include `capacitor://localhost,https://localhost` (iOS and Android app origins).

Icons/splash: edit `assets/*.svg`, then `pnpm dlx @capacitor/assets generate --iconBackgroundColor '#242424' --splashBackgroundColor '#242424'` (delete the `icons/` and `public/manifest.webmanifest` it also writes). Release steps: `docs/STORE_RELEASE.md`.
