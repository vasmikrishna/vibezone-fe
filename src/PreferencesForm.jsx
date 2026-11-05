import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormHelperText from '@mui/material/FormHelperText';
import { usePrefs } from './prefs';
import { supportedFormats } from './recorder';

const PREF_GROUPS = [
  ['layout', 'Screen layout', 'layout', [
    ['focus', 'Focus — partner full screen, you in a corner'],
    ['split', 'Split — partner on top, you below (side by side on desktop)'],
  ]],
  ['recordType', 'Recording — output', 'record', [['video', 'Video and audio'], ['audio', 'Audio only']]],
  ['recordQuality', 'Recording — quality', 'quality', [['low', 'Low (smaller file)'], ['standard', 'Standard'], ['high', 'High']]],
  ['recordFormat', 'Recording — format', 'format', [['auto', 'Automatic'], ['webm', 'WebM'], ['mp4', 'MP4']]],
];

/** Screen layout and recording type, quality and format; saved on this device. */
export default function PreferencesForm() {
  const [prefs, setPref] = usePrefs();
  return (
    <>
      {PREF_GROUPS.map(([key, label, id, options]) => (
        <FormControl key={key} component="fieldset" margin="dense" fullWidth>
          <FormLabel component="legend" id={`pref-${id}-label`}>{label}</FormLabel>
          <RadioGroup
            aria-labelledby={`pref-${id}-label`}
            value={prefs[key]}
            onChange={(e) => setPref(key, e.target.value)}
          >
            {options.map(([value, text]) => {
              const off = key === 'recordFormat' && value !== 'auto' && !supportedFormats[value];
              return (
                <div key={value}>
                  <FormControlLabel
                    value={value}
                    disabled={off}
                    label={text}
                    control={<Radio inputProps={{ 'data-testid': `pref-${id}-${value}` }} />}
                  />
                  {off && <FormHelperText sx={{ mt: -1, ml: 4 }}>Not supported in this browser</FormHelperText>}
                </div>
              );
            })}
          </RadioGroup>
        </FormControl>
      ))}
      <FormHelperText>Recording settings apply the next time you press Record.</FormHelperText>
    </>
  );
}
