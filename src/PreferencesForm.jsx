import CropFreeOutlined from '@mui/icons-material/CropFreeOutlined';
import FullscreenOutlined from '@mui/icons-material/FullscreenOutlined';
import SplitscreenOutlined from '@mui/icons-material/SplitscreenOutlined';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import MicOutlined from '@mui/icons-material/MicOutlined';
import HighQualityOutlined from '@mui/icons-material/HighQualityOutlined';
import DataSaverOnOutlined from '@mui/icons-material/DataSaverOnOutlined';
import BalanceOutlined from '@mui/icons-material/BalanceOutlined';
import HdOutlined from '@mui/icons-material/HdOutlined';
import MovieOutlined from '@mui/icons-material/MovieOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import TheatersOutlined from '@mui/icons-material/TheatersOutlined';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { usePrefs } from './prefs';
import { supportedFormats } from './recorder';

const PREF_GROUPS = [
  ['layout', 'Screen layout', 'layout', CropFreeOutlined, [
    ['focus', 'Focus', 'Partner full screen, you in a corner', FullscreenOutlined],
    ['split', 'Split', 'Partner on top, you below (side by side on desktop)', SplitscreenOutlined],
  ]],
  ['recordType', 'Recording output', 'record', VideocamOutlined, [
    ['video', 'Video + audio', 'Records both camera views and voices', VideocamOutlined],
    ['audio', 'Audio only', 'Smaller file, voices only', MicOutlined],
  ]],
  ['recordQuality', 'Recording quality', 'quality', HighQualityOutlined, [
    ['low', 'Low', '640p, smallest file', DataSaverOnOutlined],
    ['standard', 'Standard', '1280p, balanced', BalanceOutlined],
    ['high', 'High', '1920p, largest file', HdOutlined],
  ]],
  ['recordFormat', 'Recording format', 'format', MovieOutlined, [
    ['auto', 'Automatic', 'Best this browser supports', AutoAwesomeOutlined],
    ['webm', 'WebM', 'Works in Chrome and Firefox', TheatersOutlined],
    ['mp4', 'MP4', 'Works in Safari and most players', TheatersOutlined],
  ]],
];

/** Screen layout and recording type, quality and format; saved on this device. */
export default function PreferencesForm() {
  const [prefs, setPref] = usePrefs();
  return (
    <>
      {PREF_GROUPS.map(([key, label, id, GroupIcon, options]) => (
        <fieldset key={key} className="pref-group" data-testid={`pref-group-${id}`}>
          <legend className="pref-legend"><GroupIcon fontSize="small" />{label}</legend>
          <div className="pref-options">
            {options.map(([value, title, sub, Icon]) => {
              const off = key === 'recordFormat' && value !== 'auto' && !supportedFormats[value];
              return (
                <label key={value} className={`pref-card${off ? ' off' : ''}`}>
                  <input
                    type="radio"
                    name={key}
                    value={value}
                    checked={prefs[key] === value}
                    disabled={off}
                    onChange={() => setPref(key, value)}
                    data-testid={`pref-${id}-${value}`}
                  />
                  <span className="pref-icon"><Icon /></span>
                  <span className="pref-text">
                    <strong>{title}</strong>
                    <small>{off ? 'Not supported in this browser' : sub}</small>
                  </span>
                  <CheckCircle className="pref-check" fontSize="small" />
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <p className="hint pref-note">Recording settings apply the next time you press Record.</p>
    </>
  );
}
