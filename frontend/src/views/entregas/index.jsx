
import { Box, Typography } from '@mui/material';

export default function EntregasView() {
  return (
    <section className="panel">
      <Box>
        <Typography
          variant="h5"
          sx={{ color: '#343B32', fontFamily: 'Georgia, serif' }}
        >
          Entregas de material
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Aquí podrás administrar las entregas de fotografías y videos.
        </Typography>
      </Box>
    </section>
  );
}
