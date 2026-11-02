import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import './index.css'
import App from './App.jsx'

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#8F47FF' } },
  typography: { fontFamily: 'Poppins, system-ui, Helvetica, Arial, sans-serif', button: { textTransform: 'none' } },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
