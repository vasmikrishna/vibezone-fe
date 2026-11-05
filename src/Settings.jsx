import TuneOutlined from '@mui/icons-material/TuneOutlined';
import { AppPage } from './AppLayout';
import PreferencesForm from './PreferencesForm';

export default function Settings() {
  return (
    <AppPage title="Settings">
      <div className="profile-page settings-page">
        <section className="app-card" aria-labelledby="settings-title" data-testid="settings-page">
          <div className="settings-head">
            <span className="settings-head-icon"><TuneOutlined /></span>
            <div>
              <h2 id="settings-title">Call preferences</h2>
              <p className="hint">Saved on this device. They apply to video chat and rooms.</p>
            </div>
          </div>
          <PreferencesForm />
        </section>
      </div>
    </AppPage>
  );
}
