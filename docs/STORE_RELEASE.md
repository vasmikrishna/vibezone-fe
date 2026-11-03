# Store release

App id `in.vibezone.app`, name Vibezone. Before each release: set `VITE_SERVER_URL` (wss://) in `.env.production`, make sure backend `ALLOWED_ORIGINS` includes `capacitor://localhost,https://localhost`, bump the version, then `pnpm mobile:sync`.

Keep signing keys and passwords out of git (keystore, `.p12`, provisioning profiles).

## Versioning
- Android: `versionCode` (integer, +1 every upload) and `versionName` in `android/app/build.gradle`.
- iOS: Marketing Version and Build number in Xcode (target App → General); the build number must increase per upload.

## Google Play (Android)
1. Create a Play Console developer account (one-off fee). New personal accounts must run a closed test with 12+ testers for 14 days before production access.
2. Create the app: name Vibezone, default language, App, Free, accept policies.
3. Create an upload keystore once (keep it and its passwords backed up outside git):
   `keytool -genkeypair -v -keystore vibezone-upload.jks -alias vibezone -keyalg RSA -keysize 2048 -validity 10000`
4. Sign the bundle: in Android Studio, Build → Generate Signed Bundle → Android App Bundle, pick the keystore, release. Or add a `signingConfigs.release` in `android/app/build.gradle` reading the keystore path and passwords from `~/.gradle/gradle.properties` (not the repo), then `cd android && ./gradlew bundleRelease`. Output: `android/app/build/outputs/bundle/release/app-release.aab`.
5. Play Console → Production (or Closed testing) → Create release → opt in to Play App Signing → upload the `.aab` → add release notes.
6. Complete App content: Privacy policy URL (the hosted `/privacy` page), Ads (no), App access (no login; mention the 18+ consent screen), Content rating, Target audience (18+ only, not for children), Data safety, News app (no), Government app (no).
7. Store listing: short and full description, 512×512 icon, 1024×500 feature graphic, 2–8 phone screenshots, contact email.
8. Submit for review.

### Content rating (IARC questionnaire, 18+ UGC random video chat)
- Category: Social / Communication.
- User-generated content / users can interact or exchange content: Yes.
- Shares user location: No.
- Digital purchases: No. Gambling: No.
- Violence, sexual content, profanity, controlled substances in the app itself: No (content comes from other users; answer the UGC/interaction questions Yes and say it is moderated with Report and Block, bans, and an 18+ gate).
- Expect a mature rating (about 18+/Mature 17+) because of unmoderated live user interaction.

### Data safety form (from the privacy page)
- Collects or shares data: Yes. Data is encrypted in transit: Yes. Users can request deletion: via contact email.
- Collected, not shared, used for app functionality and security (fraud prevention/ban enforcement):
  - Device or other IDs: a random device id (no name, email or account). Required.
  - App activity / other user-generated content: tags (session only), reports and blocks made or received.
  - Session timestamps (diagnostics/app activity).
- Video and audio: streamed live to the chat partner (peer-to-peer, or through a relay server). Not recorded or stored. Declare as "Photos and videos" and "Voice or sound recordings" only if the form counts real-time transmission; mark as not stored, not collected by us, ephemeral processing, optional: No (needed for the app to work).
- IP address is visible to the partner or relay (approximate location/device ID may need declaring if the relay logs it; confirm with the backend).
- No analytics, no advertising, no tracking SDKs. Account creation: none.

## App Store (iOS)
Needs full Xcode on a Mac and an Apple Developer Program membership. The iOS project has not been compiled yet; do a first build and device test before submitting.
1. App Store Connect → My Apps → New App: platform iOS, name Vibezone, bundle id `in.vibezone.app` (register it under Certificates, Identifiers & Profiles first), SKU.
2. `pnpm mobile:sync`, then `npx cap open ios`. Xcode resolves Swift packages on first open.
3. Target App → Signing & Capabilities: tick "Automatically manage signing", choose your Team. Xcode creates the certificate and profile.
4. Set the build target to "Any iOS Device (arm64)", Product → Archive. In Organizer: Distribute App → App Store Connect → Upload.
5. In App Store Connect select the processed build under the version, add export compliance (uses only standard HTTPS/WebRTC encryption → exempt; the plist can set `ITSAppUsesNonExemptEncryption` to false).
6. App Privacy: add the privacy policy URL and answer the data questions (below). Age rating: answer the questionnaire (below). App Review information: notes that the app needs camera/mic, has no login, and describes the Report/Block and 18+ safeguards; supply a contact phone and email.
7. Listing: description, keywords, support URL, screenshots (6.9" and 6.5" iPhone sets at minimum, iPad if supported), then Submit for Review.
8. Guideline 1.2 (UGC) is the usual rejection risk: reviewers expect a way to filter, Report, Block, and a contact. These are present; mention them in the review notes.

### Age rating questionnaire (18+ UGC)
- Unrestricted web access: No. User-generated content / chat with other users: Yes.
- Cartoon/realistic violence, sexual content or nudity, profanity, horror, drugs/alcohol, gambling, medical: None (in-app content).
- Result must be 18+: select the 18+ override if offered / answer the "unmoderated user content" question Yes.

### App Privacy (nutrition label)
- Data linked to the user or device, not used for tracking, for App Functionality only: Identifiers → Device ID (random id); User Content → Other user content (tags, reports).
- Usage Data → Product interaction (session timestamps): app functionality only.
- Camera/microphone: used live for calls; not collected or stored by us.
- Tracking: No. Third-party advertising or analytics: No.
