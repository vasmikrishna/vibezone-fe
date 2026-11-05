import { useState } from 'react';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import { AppPage } from './AppLayout';
import PreferencesForm from './PreferencesForm';
import { usePrefs } from './prefs';

export default function Settings() {
  const [saved, savePrefs] = usePrefs();
  const [draft, setDraft] = useState(saved);
  const [toast, setToast] = useState(false);
  const dirty = Object.keys(draft).some((k) => draft[k] !== saved[k]);
  const save = () => {
    savePrefs(draft);
    setToast(true);
  };
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
          <PreferencesForm value={draft} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
          <div className="settings-actions">
            <Button variant="contained" disableElevation disabled={!dirty} onClick={save} data-testid="settings-save">Save</Button>
          </div>
        </section>
      </div>
      <Snackbar
        open={toast}
        autoHideDuration={2500}
        onClose={() => setToast(false)}
        message="Preferences saved"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        data-testid="settings-saved"
      />
    </AppPage>
  );
}
