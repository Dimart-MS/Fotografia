import { useMemo } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// project imports
import Palette from './palette';
import Typography from './typography';
import componentStyleOverrides from './compStyleOverride';
import { STUDIO_CONFIG } from '../config';

// ==============================|| THEME CUSTOMIZATION ||============================== //

export default function ThemeCustomization({ children }) {
  const palette = useMemo(() => Palette(), []);
  const typography = useMemo(() => Typography(), []);
  const components = useMemo(() => componentStyleOverrides(), []);

  const theme = useMemo(
    () =>
      createTheme({
        palette,
        typography,
        shape: {
          borderRadius: STUDIO_CONFIG.defaultBorderRadius
        },
        components
      }),
    [palette, typography, components]
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
