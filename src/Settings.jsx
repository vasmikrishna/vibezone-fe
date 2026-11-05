import { AppPage } from './AppLayout';
import PreferencesForm from './PreferencesForm';

export default function Settings() {
  return (
    <AppPage title="Settings">
      <div className="profile-page">
        <section className="app-card" aria-labelledby="settings-title" data-testid="settings-page">
          <h2 id="settings-title" className="app-card-head">Call preferences</h2>
          <p className="hint">Saved on this device. They apply to video chat and rooms.</p>
          <PreferencesForm />
        </section>
      </div>
    </AppPage>
  );
}
